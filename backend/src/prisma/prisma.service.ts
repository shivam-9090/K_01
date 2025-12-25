import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
  }

  async onModuleInit() {
    // Apply schema to database using db push (doesn't require migrations)
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'pipe' });
    } catch (e) {
      // Schema already applied or other error
      console.log(
        'DB schema initialization (db push) completed or already applied',
      );
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
