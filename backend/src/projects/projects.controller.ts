import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  BossOnly,
  Authenticated,
  CurrentUser,
  UserFromRequest,
} from '../common/decorators';
import {
  CacheResponse,
  InvalidateCache,
} from '../common/decorators/cache.decorator';
import { HttpCacheInterceptor } from '../common/interceptors/cache.interceptor';
import { CacheInvalidationInterceptor } from '../common/interceptors/cache-invalidation.interceptor';

@ApiTags('Projects')
@Controller('projects')
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  // BOSS only - Create project
  @Post()
  @BossOnly()
  @InvalidateCache(['projects'])
  @ApiOperation({
    summary: 'Create project',
    description: 'Create new project with GitHub integration (BOSS only)',
  })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 403, description: 'Only BOSS can create projects' })
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser('userId') bossId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.createProject(
      createProjectDto,
      bossId,
      companyId,
    );
  }

  // Get all projects for company
  // BOSS sees all projects, EMPLOYEE sees only projects with assigned tasks
  @Get()
  @Authenticated()
  @CacheResponse('projects:list', 60, ['projects'])
  @ApiOperation({
    summary: 'Get all projects',
    description: 'BOSS sees all projects, EMPLOYEE sees only assigned projects',
  })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async getAllProjects(@CurrentUser() user: UserFromRequest) {
    const { companyId, userId, role } = user;

    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
        projects: [],
      };
    }

    return this.projectsService.getAllProjects(companyId, userId, role);
  }

  // Get projects by status
  @Get('status/:status')
  @Authenticated()
  @CacheResponse('projects:by-status', 60, ['projects'])
  async getProjectsByStatus(
    @Param('status') status: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
        projects: [],
      };
    }

    return this.projectsService.getProjectsByStatus(companyId, status);
  }

  // Get single project
  @Get(':id')
  @Authenticated()
  @CacheResponse('projects:detail', 90, ['projects'])
  async getProjectById(
    @Param('id') projectId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.getProjectById(projectId, companyId);
  }

  // Get project with tasks details
  // BOSS sees all tasks, EMPLOYEE sees only tasks assigned to them
  @Get(':id/details')
  @Authenticated()
  @CacheResponse('projects:with-tasks', 45, ['projects', 'tasks'])
  async getProjectDetails(
    @Param('id') projectId: string,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;

    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.getProjectWithTasks(
      projectId,
      companyId,
      userId,
      role,
    );
  }

  // BOSS only - Update project
  @Put(':id')
  @BossOnly()
  @InvalidateCache(['projects'])
  async updateProject(
    @Param('id') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.updateProject(
      projectId,
      updateProjectDto,
      companyId,
    );
  }

  // BOSS only - Delete project
  @Delete(':id')
  @BossOnly()
  @InvalidateCache(['projects', 'tasks'])
  async deleteProject(
    @Param('id') projectId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.deleteProject(projectId, companyId);
  }

  // Get project analytics and tracking
  @Get(':id/analytics')
  @CacheResponse('projects:analytics', 120, ['projects', 'analytics'])
  async getProjectAnalytics(@Param('id') projectId: string, @Req() req) {
    const companyId = req.user.companyId;

    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.getProjectAnalytics(projectId, companyId);
  }

  // Get project task timeline
  @Get(':id/timeline')
  @CacheResponse('projects:timeline', 90, ['projects', 'tasks'])
  async getProjectTaskTimeline(@Param('id') projectId: string, @Req() req) {
    const companyId = req.user.companyId;

    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.getProjectTaskTimeline(projectId, companyId);
  }

  // Get employee performance in project
  @Get(':id/performance')
  @CacheResponse('projects:performance', 120, ['projects', 'performance'])
  async getProjectEmployeePerformance(
    @Param('id') projectId: string,
    @Req() req,
  ) {
    const companyId = req.user.companyId;

    if (!companyId) {
      return {
        success: false,
        message: 'No company associated with this user',
      };
    }

    return this.projectsService.getProjectEmployeePerformance(
      projectId,
      companyId,
    );
  }
}
