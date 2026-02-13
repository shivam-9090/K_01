import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WebhookController } from './webhook.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';
import { GitHubOAuthService } from './github-oauth.service';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    QueueModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '3600s' },
    }),
  ],
  controllers: [AuthController, WebhookController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    GitHubOAuthService,
    EncryptionService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
