import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestFilterDto } from './dto/request-filter.dto';
import { AssignRequestDto } from './dto/assign-request.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { Prisma, Request, RequestStatus, Priority } from '@prisma/client';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  // Request Management
  async createRequest(createRequestDto: CreateRequestDto, requesterId: string): Promise<Request> {
    const request = await this.prisma.request.create({
      data: {
        ...createRequestDto,
        requesterId,
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                assetTag: true,
              },
            },
          },
        },
      },
    });

    // Create initial workflow step if this is a complex request
    if (createRequestDto.type === 'EQUIPMENT_REQUEST' || createRequestDto.type === 'MAINTENANCE_REQUEST') {
      await this.createInitialWorkflowSteps(request.id);
    }

    // Create audit log
    await this.createAuditLog({
      action: 'REQUEST_CREATED',
      resourceId: request.id,
      resource: 'Request',
      newValues: { title: request.title, type: request.type, priority: request.priority },
      userId: requesterId,
    });

    return request;
  }

  async updateRequest(id: string, updateRequestDto: UpdateRequestDto, userId: string): Promise<Request> {
    const existingRequest = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      throw new NotFoundException('Request not found');
    }

    const oldValues = {
      title: existingRequest.title,
      description: existingRequest.description,
      priority: existingRequest.priority,
      status: existingRequest.status,
    };

    const request = await this.prisma.request.update({
      where: { id },
      data: {
        ...updateRequestDto,
        updatedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                assetTag: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'REQUEST_UPDATED',
      resourceId: id,
      resource: 'Request',
      oldValues,
      newValues: updateRequestDto,
      userId,
    });

    return request;
  }

  async deleteRequest(id: string, userId: string): Promise<void> {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status === RequestStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete request that is in progress');
    }

    await this.prisma.request.delete({
      where: { id },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'REQUEST_DELETED',
      resourceId: id,
      resource: 'Request',
      oldValues: { title: request.title, status: request.status },
      userId,
    });
  }

  async getRequests(filterDto: RequestFilterDto, userId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      type,
      assigneeId,
      requesterId,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: Prisma.RequestWhereInput = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(type && { type }),
      ...(assigneeId && { assigneeId }),
      ...(requesterId && { requesterId }),
      ...(department && { department }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        include: {
          requester: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          assignee: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          category: true,
          _count: {
            select: {
              comments: true,
              assets: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.request.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getRequestById(id: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                assetTag: true,
                status: true,
              },
            },
          },
        },
        workflow: {
          orderBy: { stepOrder: 'asc' },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  // Request Assignment
  async assignRequest(id: string, assignRequestDto: AssignRequestDto, userId: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const updatedRequest = await this.prisma.request.update({
      where: { id },
      data: {
        assigneeId: assignRequestDto.assigneeId,
        status: RequestStatus.IN_PROGRESS,
        updatedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'REQUEST_ASSIGNED',
      resourceId: id,
      resource: 'Request',
      oldValues: { assigneeId: request.assigneeId },
      newValues: { assigneeId: assignRequestDto.assigneeId },
      userId,
    });

    // TODO: Send notification to assignee

    return updatedRequest;
  }

  async updateRequestStatus(id: string, status: RequestStatus, userId: string, notes?: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const updatedRequest = await this.prisma.request.update({
      where: { id },
      data: {
        status,
        ...(status === RequestStatus.COMPLETED && { closedAt: new Date() }),
        updatedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
      },
    });

    // Add comment if notes provided
    if (notes) {
      await this.addComment(id, { content: `Status updated to ${status}: ${notes}` }, userId);
    }

    // Create audit log
    await this.createAuditLog({
      action: 'REQUEST_STATUS_UPDATED',
      resourceId: id,
      resource: 'Request',
      oldValues: { status: request.status },
      newValues: { status, notes },
      userId,
    });

    return updatedRequest;
  }

  // Comments
  async addComment(requestId: string, addCommentDto: AddCommentDto, userId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: addCommentDto.content,
        authorId: userId,
        requestId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return comment;
  }

  async getComments(requestId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { requestId },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where: { requestId } }),
    ]);

    return {
      data: comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Workflow Management
  async updateWorkflowStep(requestId: string, stepId: string, data: any, userId: string) {
    const step = await this.prisma.workflowStep.findFirst({
      where: {
        id: stepId,
        requestId,
      },
    });

    if (!step) {
      throw new NotFoundException('Workflow step not found');
    }

    const updatedStep = await this.prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        ...data,
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    // Check if all steps are completed to update request status
    const allSteps = await this.prisma.workflowStep.findMany({
      where: { requestId },
    });

    const allCompleted = allSteps.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');
    if (allCompleted) {
      await this.updateRequestStatus(requestId, RequestStatus.COMPLETED, userId, 'All workflow steps completed');
    }

    return updatedStep;
  }

  // Analytics
  async getRequestStats(userId?: string) {
    const where = userId ? { requesterId: userId } : {};

    const [
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      highPriorityRequests,
      overdue,
    ] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.count({ where: { ...where, status: RequestStatus.PENDING } }),
      this.prisma.request.count({ where: { ...where, status: RequestStatus.IN_PROGRESS } }),
      this.prisma.request.count({ where: { ...where, status: RequestStatus.COMPLETED } }),
      this.prisma.request.count({ where: { ...where, priority: Priority.HIGH } }),
      this.prisma.request.count({
        where: {
          ...where,
          status: { not: RequestStatus.COMPLETED },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      highPriorityRequests,
      overdue,
    };
  }

  // Helper methods
  private async createInitialWorkflowSteps(requestId: string) {
    const defaultSteps = [
      { stepOrder: 1, name: 'Initial Review', description: 'Review request details and requirements' },
      { stepOrder: 2, name: 'Approval', description: 'Approve or reject the request' },
      { stepOrder: 3, name: 'Implementation', description: 'Implement the requested changes' },
      { stepOrder: 4, name: 'Testing', description: 'Test the implementation' },
      { stepOrder: 5, name: 'Completion', description: 'Finalize and close the request' },
    ];

    await this.prisma.workflowStep.createMany({
      data: defaultSteps.map(step => ({
        ...step,
        requestId,
      })),
    });
  }

  private async createAuditLog(data: {
    action: string;
    resourceId: string;
    resource: string;
    oldValues?: any;
    newValues?: any;
    userId: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        userId: data.userId,
      },
    });
  }
}
