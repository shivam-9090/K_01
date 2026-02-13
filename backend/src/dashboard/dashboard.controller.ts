import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
  })
  async getStats(@Request() req: any) {
    const { companyId, userId, role } = req.user;
    return this.dashboardService.getStats(companyId, userId, role);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Get dashboard chart data' })
  @ApiResponse({
    status: 200,
    description: 'Chart data retrieved successfully',
  })
  async getChartData(@Request() req: any) {
    const { companyId, userId, role } = req.user;
    return this.dashboardService.getChartData(companyId, userId, role);
  }
}
