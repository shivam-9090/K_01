import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLogCleanupService } from './audit-log-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [AuditLogCleanupService],
  exports: [AuditLogCleanupService],
})
export class AuditLogCleanupModule {}
