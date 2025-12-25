import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Put,
  Body,
  Delete,
  Query,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('me/audit-logs')
  async getMyAuditLogs(
    @Request() req,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    return this.usersService.getUserAuditLogs(req.user.userId, skip, take);
  }

  @Get('me/sessions')
  async getMySessions(@Request() req) {
    return this.usersService.getUserSessions(req.user.userId);
  }

  @Delete('me/sessions/:sessionId')
  async revokeSession(@Param('sessionId') sessionId: string) {
    return this.usersService.revokeSession(sessionId);
  }

  @Delete('me/sessions')
  async revokeAllSessions(@Request() req) {
    return this.usersService.revokeAllSessions(req.user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Get()
  async getAllUsers(
    @Query('skip') skip = 0,
    @Query('take') take = 10,
  ) {
    return this.usersService.getAllUsers(skip, take);
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.updateUserRole(id, role);
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Patch(':id/deactivate')
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Patch(':id/activate')
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Get(':id/audit-logs')
  async getUserAuditLogs(
    @Param('id') id: string,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    return this.usersService.getUserAuditLogs(id, skip, take);
  }

  @UseGuards(RolesGuard)
  @Roles('BOSS')
  @Get(':id/sessions')
  async getUserSessions(@Param('id') id: string) {
    return this.usersService.getUserSessions(id);
  }
}
