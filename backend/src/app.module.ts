import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TwoFAModule } from './2fa/2fa.module';
import { EmailModule } from './email/email.module';
import { MetricsModule } from './common/monitoring/metrics.module';
import { HealthModule } from './health/health.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RedisModule } from './redis/redis.module';
// import { AuditLogCleanupModule } from './common/audit-log-cleanup.module'; // TODO: Re-enable after installing @nestjs/schedule

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(process.env.THROTTLE_TTL || '60000'),
          limit: parseInt(process.env.THROTTLE_LIMIT || '10'),
        },
      ],
      // Note: For distributed rate limiting with Redis, use a custom storage implementation
      // See: https://github.com/nestjs/throttler#customization
    }),
    WinstonModule.forRoot({
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, trace, ...meta }) => {
                const metaStr = Object.keys(meta).length
                  ? JSON.stringify(meta)
                  : '';
                return `${timestamp} [${context || 'App'}] ${level}: ${message} ${metaStr}${trace ? '\n' + trace : ''}`;
              },
            ),
          ),
        }),
        // Error log - only errors
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        // Combined log - all logs
        new winston.transports.DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Access log - HTTP requests only
        new winston.transports.DailyRotateFile({
          filename: 'logs/access-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '7d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Audit log - security-sensitive actions
        new winston.transports.DailyRotateFile({
          filename: 'logs/audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d', // Keep audit logs for 90 days
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    MetricsModule,
    HealthModule,
    RedisModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    TwoFAModule,
    EmailModule,
    QueueModule,
    StorageModule,
    SearchModule,
    ProjectsModule,
    TasksModule,
    TeamsModule,
    ChatModule,
    AiModule,
    DashboardModule,
    // AuditLogCleanupModule, // TODO: Re-enable after installing @nestjs/schedule in Docker
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
