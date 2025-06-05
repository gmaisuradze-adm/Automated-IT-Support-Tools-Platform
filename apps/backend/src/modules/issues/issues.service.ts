import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueFilterDto } from './dto/issue-filter.dto';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { Prisma, Issue, IssueStatus, IssueType, Priority } from '@prisma/client';

@Injectable()
export class IssuesService {
  constructor(private prisma: PrismaService) {}

  // Issue Management
  async createIssue(createIssueDto: CreateIssueDto, reporterId: string): Promise<Issue> {
    const issue = await this.prisma.issue.create({
      data: {
        ...createIssueDto,
        reporterId,
        labels: createIssueDto.labels || [],
      },
      include: {
        reporter: {
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
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_CREATED',
      resourceId: issue.id,
      resource: 'Issue',
      newValues: { title: issue.title, type: issue.type, priority: issue.priority },
      userId: reporterId,
    });

    return issue;
  }

  async updateIssue(id: string, updateIssueDto: UpdateIssueDto, userId: string): Promise<Issue> {
    const existingIssue = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!existingIssue) {
      throw new NotFoundException('Issue not found');
    }

    const oldValues = {
      title: existingIssue.title,
      description: existingIssue.description,
      priority: existingIssue.priority,
      status: existingIssue.status,
      labels: existingIssue.labels,
    };

    const issue = await this.prisma.issue.update({
      where: { id },
      data: {
        ...updateIssueDto,
        ...(updateIssueDto.labels && { labels: updateIssueDto.labels }),
        updatedAt: new Date(),
      },
      include: {
        reporter: {
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
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_UPDATED',
      resourceId: id,
      resource: 'Issue',
      oldValues,
      newValues: updateIssueDto,
      userId,
    });

    return issue;
  }

  async deleteIssue(id: string, userId: string): Promise<void> {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    if (issue.status === IssueStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete issue that is in progress');
    }

    await this.prisma.issue.delete({
      where: { id },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_DELETED',
      resourceId: id,
      resource: 'Issue',
      oldValues: { title: issue.title, status: issue.status },
      userId,
    });
  }

  async getIssues(filterDto: IssueFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      type,
      assigneeId,
      reporterId,
      labels,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: Prisma.IssueWhereInput = {
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
      ...(reporterId && { reporterId }),
      ...(labels && labels.length > 0 && {
        labels: {
          hasSome: labels,
        },
      }),
    };

    const [issues, total] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        skip,
        take: limit,
        include: {
          reporter: {
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
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      data: issues,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getIssueById(id: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: {
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
        releases: {
          include: {
            release: {
              select: {
                id: true,
                version: true,
                title: true,
                releaseDate: true,
              },
            },
          },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  // Issue Assignment
  async assignIssue(id: string, assignIssueDto: AssignIssueDto, userId: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const updatedIssue = await this.prisma.issue.update({
      where: { id },
      data: {
        assigneeId: assignIssueDto.assigneeId,
        status: IssueStatus.IN_PROGRESS,
        updatedAt: new Date(),
      },
      include: {
        reporter: {
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
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_ASSIGNED',
      resourceId: id,
      resource: 'Issue',
      oldValues: { assigneeId: issue.assigneeId },
      newValues: { assigneeId: assignIssueDto.assigneeId },
      userId,
    });

    return updatedIssue;
  }

  async updateIssueStatus(id: string, status: IssueStatus, userId: string, notes?: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const updatedIssue = await this.prisma.issue.update({
      where: { id },
      data: {
        status,
        ...(status === IssueStatus.CLOSED && { closedAt: new Date() }),
        updatedAt: new Date(),
      },
      include: {
        reporter: {
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
      },
    });

    // Add comment if notes provided
    if (notes) {
      await this.addComment(id, { content: `Status updated to ${status}: ${notes}` }, userId);
    }

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_STATUS_UPDATED',
      resourceId: id,
      resource: 'Issue',
      oldValues: { status: issue.status },
      newValues: { status, notes },
      userId,
    });

    return updatedIssue;
  }

  // Comments
  async addComment(issueId: string, addCommentDto: AddCommentDto, userId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: addCommentDto.content,
        authorId: userId,
        issueId,
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

  async getComments(issueId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { issueId },
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
      this.prisma.comment.count({ where: { issueId } }),
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

  // Labels
  async addLabel(issueId: string, label: string, userId: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const labels = [...new Set([...issue.labels, label])]; // Prevent duplicates

    const updatedIssue = await this.prisma.issue.update({
      where: { id: issueId },
      data: { labels },
      include: {
        reporter: {
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
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_LABEL_ADDED',
      resourceId: issueId,
      resource: 'Issue',
      oldValues: { labels: issue.labels },
      newValues: { labels, addedLabel: label },
      userId,
    });

    return updatedIssue;
  }

  async removeLabel(issueId: string, label: string, userId: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const labels = issue.labels.filter(l => l !== label);

    const updatedIssue = await this.prisma.issue.update({
      where: { id: issueId },
      data: { labels },
      include: {
        reporter: {
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
      },
    });

    // Create audit log
    await this.createAuditLog({
      action: 'ISSUE_LABEL_REMOVED',
      resourceId: issueId,
      resource: 'Issue',
      oldValues: { labels: issue.labels },
      newValues: { labels, removedLabel: label },
      userId,
    });

    return updatedIssue;
  }

  // Analytics
  async getIssueStats(userId?: string) {
    const where = userId ? { reporterId: userId } : {};

    const [
      totalIssues,
      openIssues,
      inProgressIssues,
      resolvedIssues,
      closedIssues,
      highPriorityIssues,
      bugCount,
      featureRequestCount,
    ] = await Promise.all([
      this.prisma.issue.count({ where }),
      this.prisma.issue.count({ where: { ...where, status: IssueStatus.OPEN } }),
      this.prisma.issue.count({ where: { ...where, status: IssueStatus.IN_PROGRESS } }),
      this.prisma.issue.count({ where: { ...where, status: IssueStatus.RESOLVED } }),
      this.prisma.issue.count({ where: { ...where, status: IssueStatus.CLOSED } }),
      this.prisma.issue.count({ where: { ...where, priority: Priority.HIGH } }),
      this.prisma.issue.count({ where: { ...where, type: IssueType.BUG } }),
      this.prisma.issue.count({ where: { ...where, type: IssueType.FEATURE_REQUEST } }),
    ]);

    return {
      totalIssues,
      openIssues,
      inProgressIssues,
      resolvedIssues,
      closedIssues,
      highPriorityIssues,
      bugCount,
      featureRequestCount,
    };
  }

  async getIssuesByLabel() {
    const issues = await this.prisma.issue.findMany({
      select: {
        labels: true,
      },
    });

    const labelCounts = issues.reduce((acc, issue) => {
      issue.labels.forEach(label => {
        acc[label] = (acc[label] || 0) + 1;
      });
      return acc;
    }, {});

    return Object.entries(labelCounts).map(([label, count]) => ({
      label,
      count,
    }));
  }

  // Helper methods
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
