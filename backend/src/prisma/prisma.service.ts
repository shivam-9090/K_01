import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);
  private slowQueryThreshold = 500; // milliseconds

  constructor(
    @Inject('MetricsService') private metricsService?: any, // Optional injection to avoid circular dependency
  ) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.setupQueryLogging();
  }

  private setupQueryLogging() {
    // @ts-ignore - Prisma types don't expose $on properly
    this.$on('query', (e: any) => {
      const duration = e.duration;
      const query = e.query;
      const params = e.params;

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        this.logger.warn(
          `Slow Query Detected (${duration}ms): ${query} | Params: ${params}`,
        );

        // Increment slow query counter if metrics service is available
        if (this.metricsService?.incrementSlowQueryCounter) {
          this.metricsService.incrementSlowQueryCounter();
        }
      }

      // Record query duration histogram if metrics service is available
      if (this.metricsService?.recordQueryDuration) {
        this.metricsService.recordQueryDuration(duration / 1000); // Convert to seconds
      }
    });

    // @ts-ignore
    this.$on('error', (e: any) => {
      this.logger.error(`Database Error: ${e.message}`, e.target);
    });

    // @ts-ignore
    this.$on('warn', (e: any) => {
      this.logger.warn(`Database Warning: ${e.message}`);
    });
  }

  async onModuleInit() {
    // Apply schema to database using db push (doesn't require migrations)
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'pipe' });
    } catch (_e) {
      // Schema already applied or other error
    }
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
