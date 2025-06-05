import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
  }

  async onModuleInit() {
    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (event: any) => {
        this.logger.debug(`Query: ${event.query}`);
        this.logger.debug(`Params: ${event.params}`);
        this.logger.debug(`Duration: ${event.duration}ms`);
      });
    }

    this.$on('error', (event: any) => {
      this.logger.error('Database Error:', event);
    });

    this.$on('warn', (event: any) => {
      this.logger.warn('Database Warning:', event);
    });

    this.$on('info', (event: any) => {
      this.logger.log('Database Info:', event);
    });

    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Delete all records in reverse order of dependencies
    await this.$transaction([
      this.auditLog.deleteMany(),
      this.notification.deleteMany(),
      this.comment.deleteMany(),
      this.releaseIssue.deleteMany(),
      this.release.deleteMany(),
      this.issue.deleteMany(),
      this.workflowStep.deleteMany(),
      this.requestAsset.deleteMany(),
      this.request.deleteMany(),
      this.maintenanceRecord.deleteMany(),
      this.transaction.deleteMany(),
      this.asset.deleteMany(),
      this.category.deleteMany(),
      this.userSession.deleteMany(),
      this.rolePermission.deleteMany(),
      this.userRole.deleteMany(),
      this.permission.deleteMany(),
      this.role.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
