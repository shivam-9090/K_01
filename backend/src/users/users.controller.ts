import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  Delete,
  Query,
  Patch,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Authenticated, BossOnly, CurrentUser } from '../common/decorators';
import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

// DTO for updating company name
class UpdateCompanyNameDto {
  @IsString()
  @MinLength(2)
  companyName: string;
}

// DTO for changing password
class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/]).{8,}$/,
    { message: 'Password must include upper, lower, number, and symbol' },
  )
  newPassword: string;
}

// DTO for updating profile
class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @Authenticated()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns authenticated user details',
  })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getCurrentUser(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('me/profile')
  @Authenticated()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns detailed user profile with company info',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me/company-name')
  @BossOnly()
  async updateCompanyName(
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdateCompanyNameDto,
  ) {
    return this.usersService.updateCompanyName(userId, updateDto.companyName);
  }

  @Patch('me/password')
  @Authenticated()
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Patch('me/profile')
  @Authenticated()
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      userId,
      updateDto.name,
      updateDto.avatarUrl,
    );
  }

  @Get('me/audit-logs')
  @Authenticated()
  async getMyAuditLogs(
    @CurrentUser('userId') userId: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    // For own audit logs, userId and requestingUserId are the same
    const skipNum = Number(skip) || 0;
    const takeNum = Number(take) || 20;
    return this.usersService.getUserAuditLogs(userId, userId, skipNum, takeNum);
  }

  @Get('me/sessions')
  @Authenticated()
  async getMySessions(@CurrentUser('userId') userId: string) {
    return this.usersService.getUserSessions(userId);
  }

  @Delete('me/sessions/:sessionId')
  @Authenticated()
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.usersService.revokeSession(sessionId, userId);
  }

  @Delete('me/sessions')
  @Authenticated()
  async revokeAllSessions(@CurrentUser('userId') userId: string) {
    return this.usersService.revokeAllSessions(userId);
  }

  @Get()
  @BossOnly()
  async getAllUsers(@Query('skip') skip = 0, @Query('take') take = 10) {
    return this.usersService.getAllUsers(skip, take);
  }

  @Get(':id')
  @BossOnly()
  async getUser(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Prevent cross-company access (IDOR protection)
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Cannot access users from other companies');
    }
    return user;
  }

  @Patch(':id/role')
  @BossOnly()
  async updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.updateUserRole(id, role);
  }

  @Patch(':id/deactivate')
  @BossOnly()
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Patch(':id/activate')
  @BossOnly()
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Get(':id/audit-logs')
  @BossOnly()
  async getUserAuditLogs(
    @Param('id') id: string,
    @CurrentUser('userId') requestingUserId: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    return this.usersService.getUserAuditLogs(id, requestingUserId, skip, take);
  }

  @Get(':id/sessions')
  @BossOnly()
  async getUserSessions(@Param('id') id: string) {
    return this.usersService.getUserSessions(id);
  }
}
