import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFilterDto } from './dto/asset-filter.dto';
import { MaintenanceScheduleDto } from './dto/maintenance-schedule.dto';
import { Prisma, Asset, AssetStatus, MaintenanceSchedule } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Asset Management
  async createAsset(createAssetDto: CreateAssetDto, userId: string): Promise<Asset> {
    // Generate asset tag if not provided
    const assetTag = createAssetDto.assetTag || await this.generateAssetTag(createAssetDto.categoryId);

    const asset = await this.prisma.asset.create({
      data: {
        ...createAssetDto,
        assetTag,
        createdById: userId,
      },
      include: {
        category: true,
        location: true,
        assignedTo: true,
        createdBy: true,
      },
    });

    // Create audit log
    await this.createAssetAuditLog({
      assetId: asset.id,
      userId,
      action: 'CREATED',
      details: { assetTag: asset.assetTag, name: asset.name },
    });

    return asset;
  }

  async updateAsset(id: string, updateAssetDto: UpdateAssetDto, userId: string): Promise<Asset> {
    const existingAsset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      throw new NotFoundException('Asset not found');
    }

    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...updateAssetDto,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        location: true,
        assignedTo: true,
        createdBy: true,
      },
    });

    // Create audit log
    await this.createAssetAuditLog({
      assetId: asset.id,
      userId,
      action: 'UPDATED',
      details: { changes: Object.keys(updateAssetDto) },
    });

    return asset;
  }

  async deleteAsset(id: string, userId: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check if asset is assigned
    if (asset.assignedToId) {
      throw new BadRequestException('Cannot delete an assigned asset');
    }

    await this.prisma.asset.delete({
      where: { id },
    });

    // Create audit log
    await this.createAssetAuditLog({
      assetId: id,
      userId,
      action: 'DELETED',
      details: { assetTag: asset.assetTag, name: asset.name },
    });
  }

  async getAssets(filterDto: AssetFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      locationId,
      status,
      assignedToId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { assetTag: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(locationId && { locationId }),
      ...(status && { status }),
      ...(assignedToId && { assignedToId }),
    };

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          location: true,
          assignedTo: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAssetById(id: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenanceSchedules: {
          include: {
            assignedTo: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  // Asset Assignment
  async assignAsset(assetId: string, assignedToId: string, userId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException('Asset is not available for assignment');
    }

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedToId,
        status: AssetStatus.ASSIGNED,
        assignedAt: new Date(),
      },
      include: {
        category: true,
        location: true,
        assignedTo: {
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
    await this.createAssetAuditLog({
      assetId,
      userId,
      action: 'ASSIGNED',
      details: { assignedToId },
    });

    return updatedAsset;
  }

  async unassignAsset(assetId: string, userId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const updatedAsset = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedToId: null,
        status: AssetStatus.AVAILABLE,
        assignedAt: null,
      },
      include: {
        category: true,
        location: true,
      },
    });

    // Create audit log
    await this.createAssetAuditLog({
      assetId,
      userId,
      action: 'UNASSIGNED',
      details: { previousAssignedToId: asset.assignedToId },
    });

    return updatedAsset;
  }

  // Maintenance Scheduling
  async scheduleMainenance(maintenanceDto: MaintenanceScheduleDto, userId: string): Promise<MaintenanceSchedule> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: maintenanceDto.assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const maintenance = await this.prisma.maintenanceSchedule.create({
      data: {
        ...maintenanceDto,
        createdById: userId,
      },
      include: {
        asset: true,
        assignedTo: {
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
    await this.createAssetAuditLog({
      assetId: maintenanceDto.assetId,
      userId,
      action: 'MAINTENANCE_SCHEDULED',
      details: { 
        maintenanceId: maintenance.id,
        scheduledDate: maintenance.scheduledDate,
        type: maintenance.type,
      },
    });

    return maintenance;
  }

  async getMaintenanceSchedules(assetId?: string, upcoming?: boolean) {
    const where: Prisma.MaintenanceScheduleWhereInput = {
      ...(assetId && { assetId }),
      ...(upcoming && {
        scheduledDate: {
          gte: new Date(),
        },
        status: 'SCHEDULED',
      }),
    };

    return this.prisma.maintenanceSchedule.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetTag: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  // Categories and Locations
  async getCategories() {
    return this.prisma.assetCategory.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getLocations() {
    return this.prisma.location.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Analytics
  async getInventoryStats() {
    const [
      totalAssets,
      availableAssets,
      assignedAssets,
      maintenanceAssets,
      retiredAssets,
      upcomingMaintenance,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: AssetStatus.AVAILABLE } }),
      this.prisma.asset.count({ where: { status: AssetStatus.ASSIGNED } }),
      this.prisma.asset.count({ where: { status: AssetStatus.MAINTENANCE } }),
      this.prisma.asset.count({ where: { status: AssetStatus.RETIRED } }),
      this.prisma.maintenanceSchedule.count({
        where: {
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
          },
          status: 'SCHEDULED',
        },
      }),
    ]);

    return {
      totalAssets,
      availableAssets,
      assignedAssets,
      maintenanceAssets,
      retiredAssets,
      upcomingMaintenance,
    };
  }

  async getAssetsByCategory() {
    const categories = await this.prisma.assetCategory.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      count: category._count.assets,
    }));
  }

  // Helper methods
  private async generateAssetTag(categoryId: string): Promise<string> {
    const category = await this.prisma.assetCategory.findUnique({
      where: { id: categoryId },
    });

    const prefix = category?.name?.substring(0, 3).toUpperCase() || 'AST';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');

    return `${prefix}-${timestamp}-${random}`;
  }

  private async createAssetAuditLog(data: {
    assetId: string;
    userId: string;
    action: string;
    details?: any;
  }) {
    return this.prisma.assetAuditLog.create({
      data: {
        ...data,
        details: data.details ? JSON.stringify(data.details) : null,
      },
    });
  }
}
