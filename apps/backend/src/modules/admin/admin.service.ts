import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { Prisma, User, Role, Permission, AuditLog } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // User Management
  async createUser(createUserDto: CreateUserDto, adminId: string): Promise<User> {
    const { password, roleIds, ...userData } = createUserDto;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with roles
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        roles: {
          connect: roleIds?.map(id => ({ id })) || [],
        },
      },
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: 'CREATE_USER',
      resourceType: 'USER',
      resourceId: user.id,
      details: { email: user.email, roles: roleIds },
    });

    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, adminId: string): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const { password, roleIds, ...userData } = updateUserDto;
    
    const updateData: Prisma.UserUpdateInput = {
      ...userData,
    };

    // Update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update roles if provided
    if (roleIds !== undefined) {
      updateData.roles = {
        set: roleIds.map(id => ({ id })),
      };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: 'UPDATE_USER',
      resourceType: 'USER',
      resourceId: user.id,
      details: { 
        changes: Object.keys(userData),
        rolesChanged: roleIds !== undefined,
        passwordChanged: !!password,
      },
    });

    return user;
  }

  async deleteUser(id: string, adminId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is trying to delete themselves
    if (id === adminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: 'DELETE_USER',
      resourceType: 'USER',
      resourceId: id,
      details: { email: user.email },
    });
  }

  async getAllUsers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Role Management
  async createRole(name: string, description: string, permissionIds: string[], adminId: string): Promise<Role> {
    const role = await this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          connect: permissionIds.map(id => ({ id })),
        },
      },
      include: {
        permissions: true,
      },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'CREATE_ROLE',
      resourceType: 'ROLE',
      resourceId: role.id,
      details: { name, permissions: permissionIds },
    });

    return role;
  }

  async updateRole(id: string, name: string, description: string, permissionIds: string[], adminId: string): Promise<Role> {
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions: {
          set: permissionIds.map(id => ({ id })),
        },
      },
      include: {
        permissions: true,
      },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'UPDATE_ROLE',
      resourceType: 'ROLE',
      resourceId: role.id,
      details: { name, permissions: permissionIds },
    });

    return role;
  }

  async deleteRole(id: string, adminId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if role is assigned to users
    if (role.users.length > 0) {
      throw new ForbiddenException('Cannot delete role that is assigned to users');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'DELETE_ROLE',
      resourceType: 'ROLE',
      resourceId: id,
      details: { name: role.name },
    });
  }

  async getAllRoles(): Promise<Role[]> {
    return this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  // System Settings
  async getSystemSettings(): Promise<any> {
    const settings = await this.prisma.systemSetting.findMany();
    
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }

  async updateSystemSettings(settingsDto: SystemSettingsDto, adminId: string): Promise<any> {
    const updates = Object.entries(settingsDto).map(([key, value]) =>
      this.prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    );

    await Promise.all(updates);

    await this.createAuditLog({
      userId: adminId,
      action: 'UPDATE_SYSTEM_SETTINGS',
      resourceType: 'SYSTEM_SETTINGS',
      resourceId: 'global',
      details: { settings: Object.keys(settingsDto) },
    });

    return this.getSystemSettings();
  }

  // Audit Logs
  async getAuditLogs(filterDto: AuditLogFilterDto) {
    const { page = 1, limit = 50, userId, action, resourceType, startDate, endDate } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(userId && { userId }),
      ...(action && { action }),
      ...(resourceType && { resourceType }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      },
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
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
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Statistics
  async getDashboardStats() {
    const [
      totalUsers,
      totalRoles,
      totalPermissions,
      activeUsers,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalRoles,
      totalPermissions,
      activeUsers,
      recentAuditLogs,
    };
  }

  // Helper method to create audit logs
  private async createAuditLog(data: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: any;
  }): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        details: data.details ? JSON.stringify(data.details) : null,
      },
    });
  }
}
