import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MetricsModule } from '../common/monitoring/metrics.module';
import { MetricsService } from '../common/monitoring/metrics.service';

@Module({
  imports: [MetricsModule],
  providers: [
    PrismaService,
    {
      provide: 'MetricsService',
      useExisting: MetricsService,
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
