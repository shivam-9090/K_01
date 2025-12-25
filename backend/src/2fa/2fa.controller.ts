import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { TwoFAService } from './2fa.service';
import {
  Enable2FaDto,
  Verify2FaDto,
  Disable2FaDto,
  Verify2FaLoginDto,
} from './dto/2fa.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('2fa')
export class TwoFAController {
  constructor(private twoFAService: TwoFAService) {}

  @Get('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BOSS')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async generateSecret(@Request() req) {
    return this.twoFAService.generateSecret(req.user.email);
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BOSS')
  @HttpCode(HttpStatus.OK)
  async enableTwoFA(@Request() req, @Body() dto: Enable2FaDto) {
    const client = this.extractClient(req);
    return this.twoFAService.enableTwoFA(
      req.user.userId,
      dto.secret,
      dto.code,
      dto.password,
      client,
    );
  }

  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async verifyTwoFALogin(@Body() dto: Verify2FaLoginDto, @Request() req) {
    return this.twoFAService.verify2FALogin(
      dto.token,
      dto.code,
      this.extractClient(req),
    );
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BOSS')
  @HttpCode(HttpStatus.OK)
  async disableTwoFA(@Request() req, @Body() dto: Disable2FaDto) {
    const client = this.extractClient(req);
    return this.twoFAService.disableTwoFA(
      req.user.userId,
      dto.code,
      dto.password,
      client,
    );
  }

  @Post('regenerate-backup-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BOSS')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@Request() req, @Body('code') code: string) {
    return this.twoFAService.regenerateBackupCodes(
      req.user.userId,
      code,
      this.extractClient(req),
    );
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BOSS')
  async getTwoFAStatus(@Request() req) {
    // Only BOSS can check their 2FA status (enforced by @Roles guard)
    return {
      isTwoFAEnabled: req.user.isTwoFAEnabled || false,
    };
  }

  private extractClient(req: any) {
    return {
      ip:
        req?.ip ||
        req?.headers?.['x-forwarded-for'] ||
        req?.connection?.remoteAddress ||
        req?.socket?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    };
  }
}
