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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
import { IpAddressValidator } from '../common/validators/ip-address.validator';

@ApiTags('2FA')
@Controller('2fa')
export class TwoFAController {
  constructor(private twoFAService: TwoFAService) {}

  @Get('generate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate 2FA secret',
    description: 'Generate TOTP secret and QR code (BOSS only)',
  })
  @ApiResponse({ status: 200, description: 'QR code and secret generated' })
  @ApiResponse({ status: 403, description: 'Only BOSS can enable 2FA' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BOSS')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  async generateSecret(@Request() req) {
    return this.twoFAService.generateSecret(req.user.email);
  }

  @Post('enable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Enable 2FA',
    description:
      'Activate 2FA with verification code. Returns 10 backup codes.',
  })
  @ApiResponse({
    status: 200,
    description: '2FA enabled successfully with backup codes',
  })
  @ApiResponse({ status: 400, description: 'Invalid code' })
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
  @ApiOperation({
    summary: 'Verify 2FA login',
    description: 'Complete 2FA login with TOTP code or backup code',
  })
  @ApiResponse({
    status: 200,
    description: '2FA verified, JWT tokens returned',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  @ApiResponse({
    status: 429,
    description: 'Rate limited (1 attempt per minute)',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Disable 2FA',
    description: 'Turn off 2FA (requires verification code and password)',
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid code or password' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description: 'Generate new set of 10 backup codes (invalidates old ones)',
  })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
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
    // M-2 Fix: Use IP validator for IPv4/IPv6 validation and proxy support
    const ipAddress = IpAddressValidator.extractFromRequest(req);

    return {
      ip: ipAddress,
      userAgent: req?.headers?.['user-agent'],
    };
  }
}
