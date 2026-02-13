import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@ApiTags('Teams')
@ApiBearerAuth('JWT-auth')
@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  // BOSS only - Create team
  @Post()
  @ApiOperation({ summary: 'Create team', description: 'Create new team (BOSS only)' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @Roles('BOSS')
  async createTeam(@Body() createTeamDto: CreateTeamDto, @Request() req: any) {
    const { userId, companyId } = req.user;
    return this.teamsService.createTeam(createTeamDto, userId, companyId);
  }

  // Get all teams for company
  @Get()
  @ApiOperation({ summary: 'Get all teams', description: 'Retrieve all teams for company' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  async getAllTeams(@Request() req: any) {
    const { companyId } = req.user;
    return this.teamsService.getAllTeams(companyId);
  }

  // Get suggested employees for team based on team type
  @Get('suggest-employees')
  @Roles('BOSS')
  async suggestEmployees(
    @Query('teamType') teamType: string,
    @Query('searchQuery') searchQuery: string,
    @Request() req: any,
  ) {
    const { companyId } = req.user;
    return this.teamsService.suggestEmployees(teamType, searchQuery, companyId);
  }

  // Get single team
  @Get(':id')
  async getTeamById(@Param('id') teamId: string, @Request() req: any) {
    const { companyId } = req.user;
    return this.teamsService.getTeamById(teamId, companyId);
  }

  // BOSS only - Update team
  @Put(':id')
  @Roles('BOSS')
  async updateTeam(
    @Param('id') teamId: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Request() req: any,
  ) {
    const { companyId } = req.user;
    return this.teamsService.updateTeam(teamId, updateTeamDto, companyId);
  }

  // BOSS only - Delete team
  @Delete(':id')
  @Roles('BOSS')
  async deleteTeam(@Param('id') teamId: string, @Request() req: any) {
    const { companyId } = req.user;
    return this.teamsService.deleteTeam(teamId, companyId);
  }
}
