import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AuditProcessor } from './processors/audit.processor';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notification' },
      { name: 'audit' },
    ),
    EmailModule,
  ],
  providers: [
    QueueService,
    EmailProcessor,
    NotificationProcessor,
    AuditProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
