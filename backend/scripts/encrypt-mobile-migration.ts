import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; // Adjust path if needed
import { PrismaService } from '../src/prisma/prisma.service';
import { EncryptionService } from '../src/common/encryption.service';
import { Logger } from '@nestjs/common';

async function migrate() {
  const logger = new Logger('MobileEncryptionMigration');
  logger.log('Starting mobile number encryption migration...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const encryptionService = app.get(EncryptionService);

  try {
    const users = await prisma.user.findMany({
      where: {
        mobile: {
          not: null,
        },
      },
    });

    logger.log(`Found ${users.length} users with mobile numbers.`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      if (!user.mobile) continue;

      // Check if already encrypted (heuristic: length > 20 and looks like hex)
      // Deterministic encryption (AES-256-CBC) output is hex string
      // IV (16 bytes = 32 hex chars) + Ciphertext (min 1 block = 16 bytes = 32 hex chars)
      // So minimum length is 64 chars.
      // Mobile numbers are typically < 20 chars.
      if (user.mobile.length >= 64 && /^[0-9a-f]+$/i.test(user.mobile)) {
        // Likely already encrypted
        // Try decrypting to verify
        const decrypted = encryptionService.decryptDeterministic(user.mobile);
        if (decrypted !== user.mobile) {
          // It decrypts to something else, so it is encrypted
          skippedCount++;
          continue;
        }
      }

      try {
        const encrypted = encryptionService.encryptDeterministic(user.mobile);
        await prisma.user.update({
          where: { id: user.id },
          data: { mobile: encrypted },
        });
        updatedCount++;
        if (updatedCount % 100 === 0) {
          logger.log(`Progress: ${updatedCount} users updated...`);
        }
      } catch (err) {
        logger.error(`Failed to update user ${user.id}: ${err.message}`);
        errorCount++;
      }
    }

    logger.log('Migration completed.');
    logger.log(`Updated: ${updatedCount}`);
    logger.log(`Skipped (already encrypted): ${skippedCount}`);
    logger.log(`Errors: ${errorCount}`);
  } catch (error) {
    logger.error('Migration failed', error);
  } finally {
    await app.close();
  }
}

migrate();
