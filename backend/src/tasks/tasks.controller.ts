import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SuggestEmployeesDto,
} from './dto/task.dto';
import {
  Authenticated,
  BossOnly,
  CurrentUser,
  UserFromRequest,
} from '../common/decorators';
import {
  CacheResponse,
  InvalidateCache,
} from '../common/decorators/cache.decorator';
import { HttpCacheInterceptor } from '../common/interceptors/cache.interceptor';
import { CacheInvalidationInterceptor } from '../common/interceptors/cache-invalidation.interceptor';

@ApiTags('Tasks')
@Controller('tasks')
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Create a new task
   * - BOSS can create tasks
   * - EMPLOYEE with canCompleteTask permission can create tasks
   * POST /tasks
   */
  @Post()
  @Authenticated()
  @InvalidateCache(['tasks', 'projects'])
  @ApiOperation({
    summary: 'Create task',
    description:
      'BOSS or EMPLOYEE with permission can create tasks. Supports assigning to multiple employees.',
  })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;

    // If employee, check if they have canCompleteTask permission
    if (role === 'EMPLOYEE') {
      const hasPermission = await this.tasksService.checkEmployeePermission(
        userId,
        'canCompleteTask',
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to create tasks',
        );
      }
    }

    return this.tasksService.createTask(createTaskDto, companyId, userId);
  }

  /**
   * Get all tasks
   * - BOSS sees all company tasks
   * - EMPLOYEE sees only assigned tasks
   * GET /tasks
   */
  @Get()
  @Authenticated()
  @CacheResponse('tasks:list', 45, ['tasks'])
  @ApiOperation({
    summary: 'Get all tasks',
    description:
      'BOSS sees all tasks, EMPLOYEE sees only assigned tasks. Supports pagination.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async getAllTasks(
    @CurrentUser() user: UserFromRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sort') sort?: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
  ) {
    const { companyId, userId, role } = user;
    // Cap pagination limit at 100 to prevent DoS
    const limitNum = Math.min(parseInt(limit) || 10, 100);
    return this.tasksService.getAllTasks(
      companyId,
      userId,
      role,
      parseInt(page),
      limitNum,
      sort,
      filter,
      search,
    );
  }

  /**
   * Get overdue tasks (BOSS only)
   * GET /tasks/overdue
   */
  @Get('overdue')
  @BossOnly()
  @CacheResponse('tasks:overdue', 60, ['tasks'])
  async getOverdueTasks(@CurrentUser('companyId') companyId: string) {
    return this.tasksService.getOverdueTasks(companyId);
  }

  /**
   * Get suggested employees for task assignment
   * Smart sorting based on task type and skills
   * - BOSS can always access
   * - EMPLOYEE can access (needed for task creation)
   * GET /tasks/suggest-employees?taskType=frontend&searchQuery=john
   */
  @Get('suggest-employees')
  @Authenticated()
  @CacheResponse('tasks:suggest-employees', 120, ['employees'])
  async suggestEmployees(
    @Query() suggestDto: SuggestEmployeesDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    // No permission check - all authenticated users can view employee suggestions
    return this.tasksService.suggestEmployees(suggestDto, companyId);
  }

  /**
   * Get tasks by status
   * GET /tasks/status/:status
   */
  @Get('status/:status')
  @Authenticated()
  @CacheResponse('tasks:by-status', 60, ['tasks'])
  async getTasksByStatus(
    @Param('status') status: string,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;
    return this.tasksService.getTasksByStatus(status, companyId, userId, role);
  }

  /**
   * Get tasks by project
   * GET /tasks/project/:projectId
   */
  @Get('project/:projectId')
  @Authenticated()
  @CacheResponse('tasks:by-project', 60, ['tasks', 'projects'])
  async getTasksByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;
    return this.tasksService.getTasksByProject(
      projectId,
      companyId,
      userId,
      role,
    );
  }

  /**
   * Get task by ID
   * GET /tasks/:id
   */
  @Get(':id')
  @Authenticated()
  @CacheResponse('tasks:detail', 90, ['tasks'])
  async getTaskById(
    @Param('id') id: string,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;
    return this.tasksService.getTaskById(id, companyId, userId, role);
  }

  /**
   * Update task (BOSS only)
   * PUT /tasks/:id
   */
  @Put(':id')
  @BossOnly()
  @InvalidateCache(['tasks', 'projects'])
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;
    return this.tasksService.updateTask(
      id,
      updateTaskDto,
      companyId,
      userId,
      role,
    );
  }

  /**
   * Mark task as complete by employee
   * PUT /tasks/:id/complete
   */
  @Put(':id/complete')
  @Authenticated()
  @InvalidateCache(['tasks', 'projects', 'performance'])
  async completeTask(
    @Param('id') id: string,
    @Body()
    body: {
      completionCommitSha?: string;
      completionCommitUrl?: string;
      completionCommitMessage?: string;
    },
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;
    return this.tasksService.completeTaskByEmployee(
      id,
      companyId,
      userId,
      role,
      body.completionCommitSha,
      body.completionCommitUrl,
      body.completionCommitMessage,
    );
  }

  /**
   * Verify and approve task completion
   * - BOSS can verify
   * - EMPLOYEE with canVerifyTask permission can verify
   * PUT /tasks/:id/verify
   */
  @Put(':id/verify')
  @Authenticated()
  @InvalidateCache(['tasks', 'projects', 'performance'])
  async verifyTask(
    @Param('id') id: string,
    @CurrentUser() user: UserFromRequest,
  ) {
    const { companyId, userId, role } = user;

    // If employee, check if they have canVerifyTask permission
    if (role === 'EMPLOYEE') {
      const hasPermission = await this.tasksService.checkEmployeePermission(
        userId,
        'canVerifyTask',
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to verify tasks',
        );
      }
    }

    return this.tasksService.verifyTaskByBoss(id, companyId, userId);
  }

  /**
   * Delete task (BOSS only)
   * DELETE /tasks/:id
   */
  @Delete(':id')
  @BossOnly()
  @InvalidateCache(['tasks', 'projects'])
  async deleteTask(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.tasksService.deleteTask(id, companyId);
  }
}
