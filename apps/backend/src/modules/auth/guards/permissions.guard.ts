import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Get user with roles and permissions
    const userWithPermissions = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        roles: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!userWithPermissions) {
      return false;
    }

    // Extract all permissions from user's roles
    const userPermissions = userWithPermissions.roles.flatMap(role =>
      role.permissions.map(permission => `${permission.resource}:${permission.action}`)
    );

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }
}
