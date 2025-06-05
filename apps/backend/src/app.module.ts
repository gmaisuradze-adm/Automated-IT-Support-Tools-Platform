import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { redisStore } from 'cache-manager-redis-store';

// Core modules
import { DatabaseModule } from './shared/database/database.module';
import { LoggerModule } from './shared/logger/logger.module';
import { HealthModule } from './shared/health/health.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { RequestsModule } from './modules/requests/requests.module';
import { IssuesModule } from './modules/issues/issues.module';
import { VersionsModule } from './modules/versions/versions.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // requests per ttl
      },
    ]),

    // Caching
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
        });
        return {
          store: () => store,
          ttl: 300, // 5 minutes default TTL
        };
      },
    }),

    // Scheduling for automated tasks
    ScheduleModule.forRoot(),

    // Event system for decoupled communication
    EventEmitterModule.forRoot(),

    // Core modules
    DatabaseModule,
    LoggerModule,
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    AdminModule,
    InventoryModule,
    WarehouseModule,
    RequestsModule,
    IssuesModule,
    VersionsModule,
  ],
})
export class AppModule {}
