import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TwoFAService } from './2fa.service';
import { TwoFAController } from './2fa.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule, JwtModule.register({
    secret: process.env.JWT_SECRET,
  })],
  controllers: [TwoFAController],
  providers: [TwoFAService],
  exports: [TwoFAService],
})
export class TwoFAModule {}
