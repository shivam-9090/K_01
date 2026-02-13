import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SuggestEmployeesDto,
} from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if employee has a specific permission
   */
  async checkEmployeePermission(
    userId: string,
    permission:
      | 'canCompleteTask'
      | 'canVerifyTask'
      | 'canCreateTask'
      | 'canUpdateTask'
      | 'canDeleteTask',
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        canManageAllTaskPermissions: true,
        canCompleteTask: true,
        canVerifyTask: true,
        canCreateTask: true,
        canUpdateTask: true,
        canDeleteTask: true,
      },
    });

    // If user has master permission, grant all task permissions
    if (user?.canManageAllTaskPermissions) {
      return true;
    }

    return user?.[permission] || false;
  }

  /**
   * Create a new task
   * - BOSS can create tasks
   * - EMPLOYEE with canCompleteTask permission can create tasks
   */
  async createTask(
    createTaskDto: CreateTaskDto,
    companyId: string,
    createdById: string,
  ) {
    const {
      title,
      description,
      startDate,
      closeDate,
      taskType,
      priority,
      projectId,
      assignedToIds,
    } = createTaskDto;

    // Validate project belongs to the company
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found or does not belong to your company',
      );
    }

    // Validate all assigned employees belong to the company
    const employees = await this.prisma.user.findMany({
      where: {
        id: { in: assignedToIds },
        companyId,
        role: 'EMPLOYEE',
      },
    });

    if (employees.length !== assignedToIds.length) {
      throw new BadRequestException(
        'One or more assigned employees not found or do not belong to your company',
      );
    }

    // Validate dates
    if (closeDate) {
      const start = new Date(startDate);
      const close = new Date(closeDate);
      if (close < start) {
        throw new BadRequestException('Close date cannot be before start date');
      }
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        closeDate: closeDate ? new Date(closeDate) : null,
        taskType,
        priority: priority || 'medium',
        projectId,
        companyId,
        createdById,
        assignedToIds,
      },
    });

    // Fetch complete task with relations
    return this.getTaskById(task.id, companyId);
  }

  /**
   * Get all tasks for a company
   * - BOSS sees all tasks
   * - EMPLOYEE with canCompleteTask permission sees all tasks
   * - EMPLOYEE without permission sees only tasks assigned to them
   */
  async getAllTasks(
    companyId: string,
    userId: string,
    role: string,
    page: number = 1,
    limit: number = 10,
    sort?: string,
    filter?: string,
    search?: string,
  ) {
    const where: any = { companyId };

    // Apply filters
    if (filter === 'completed') {
      where.status = 'completed';
    } else if (filter === 'overdue') {
      where.AND = [
        { closeDate: { not: null, lt: new Date() } },
        { status: { notIn: ['completed', 'cancelled'] } },
      ];
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If employee, check if they have canViewAllTasks or master task permission
    if (role === 'EMPLOYEE') {
      const employee = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { canViewAllTasks: true, canManageAllTaskPermissions: true },
      });

      // Only filter to assigned tasks if employee doesn't have viewing permissions
      if (
        !employee?.canViewAllTasks &&
        !employee?.canManageAllTaskPermissions
      ) {
        where.assignedToIds = {
          has: userId,
        };
      }
    }

    // Define sorting
    let orderBy: any = [{ priority: 'desc' }, { createdAt: 'desc' }];
    if (sort === 'oldest') {
      orderBy = [{ createdAt: 'asc' }];
    } else if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    }

    const total = await this.prisma.task.count({ where });

    const tasks = await this.prisma.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            githubRepoName: true,
            githubRepoBranch: true,
          },
        },
      },
      orderBy,
    });

    // Fetch assigned employees for each task
    const now = new Date();
    const tasksWithEmployees = await Promise.all(
      tasks.map(async (task) => {
        const assignedEmployees = await this.prisma.user.findMany({
          where: {
            id: { in: task.assignedToIds },
          },
          select: {
            id: true,
            email: true,
            name: true,
            skills: true,
          },
        });

        // Add overdue flag
        const isOverdue =
          task.closeDate &&
          task.closeDate < now &&
          task.status !== 'completed' &&
          task.status !== 'cancelled';

        return {
          ...task,
          assignedEmployees,
          isOverdue,
        };
      }),
    );

    return {
      data: tasksWithEmployees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get overdue tasks (BOSS only)
   */
  async getOverdueTasks(companyId: string) {
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        companyId,
        closeDate: { not: null, lt: now },
        status: { notIn: ['completed', 'cancelled'] },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            githubRepoName: true,
            githubRepoBranch: true,
          },
        },
      },
      orderBy: { closeDate: 'asc' },
    });

    // Fetch assigned employees for each task
    const tasksWithEmployees = await Promise.all(
      tasks.map(async (task) => {
        const assignedEmployees = await this.prisma.user.findMany({
          where: {
            id: { in: task.assignedToIds },
          },
          select: {
            id: true,
            email: true,
            name: true,
            skills: true,
          },
        });

        return {
          ...task,
          assignedEmployees,
          isOverdue: true,
        };
      }),
    );

    return tasksWithEmployees;
  }

  /**
   * Get task by ID
   */
  async getTaskById(
    taskId: string,
    companyId: string,
    userId?: string,
    role?: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        companyId,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            startDate: true,
            closeDate: true,
            githubRepoName: true,
            githubRepoBranch: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // If employee, verify they are assigned to this task
    if (role === 'EMPLOYEE' && userId && !task.assignedToIds.includes(userId)) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    // Fetch assigned employees
    const assignedEmployees = await this.prisma.user.findMany({
      where: {
        id: { in: task.assignedToIds },
      },
      select: {
        id: true,
        email: true,
        skills: true,
      },
    });

    // Fetch creator
    const creator = await this.prisma.user.findUnique({
      where: { id: task.createdById },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return {
      ...task,
      assignedEmployees,
      createdBy: creator,
    };
  }

  /**
   * Update task (BOSS only or assigned EMPLOYEE can update status)
   */
  async updateTask(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    companyId: string,
    userId?: string,
    userRole?: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        companyId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const {
      title,
      description,
      startDate,
      closeDate,
      taskType,
      status,
      priority,
      projectId,
      assignedToIds,
    } = updateTaskDto;

    // Validate project if provided
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
      });

      if (!project) {
        throw new NotFoundException(
          'Project not found or does not belong to your company',
        );
      }
    }

    // Validate assigned employees if provided
    if (assignedToIds) {
      const employees = await this.prisma.user.findMany({
        where: {
          id: { in: assignedToIds },
          companyId,
          role: 'EMPLOYEE',
        },
      });

      if (employees.length !== assignedToIds.length) {
        throw new BadRequestException(
          'One or more assigned employees not found or do not belong to your company',
        );
      }
    }

    // Validate dates
    if (startDate || closeDate) {
      const start = new Date(startDate || task.startDate);
      const close = closeDate ? new Date(closeDate) : task.closeDate;
      if (close && close < start) {
        throw new BadRequestException('Close date cannot be before start date');
      }
    }

    // Track completion
    const updateData: any = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(closeDate !== undefined && {
        closeDate: closeDate ? new Date(closeDate) : null,
      }),
      ...(taskType && { taskType }),
      ...(priority && { priority }),
      ...(projectId && { projectId }),
      ...(assignedToIds && { assignedToIds }),
    };

    // If status is being changed to 'completed', track who completed it and when
    if (status === 'completed' && task.status !== 'completed') {
      updateData.status = 'completed';
      updateData.completedById = userId;
      updateData.completedAt = new Date();
    } else if (status && status !== task.status) {
      updateData.status = status;
      // If reverting from completed, clear completion tracking
      if (task.status === 'completed' && status !== 'completed') {
        updateData.completedById = null;
        updateData.completedAt = null;
      }
    }

    // Update task
    await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return this.getTaskById(taskId, companyId);
  }

  /**
   * Delete task (BOSS only)
   */
  async deleteTask(taskId: string, companyId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        companyId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return { message: 'Task deleted successfully' };
  }

  /**
   * Get tasks by project
   */
  async getTasksByProject(
    projectId: string,
    companyId: string,
    userId: string,
    role: string,
  ) {
    // Verify project belongs to company
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const where: any = {
      projectId,
      companyId,
    };

    // If employee, filter to only assigned tasks
    if (role === 'EMPLOYEE') {
      where.assignedToIds = {
        has: userId,
      };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            githubRepoName: true,
            githubRepoBranch: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Fetch assigned employees for each task
    const tasksWithEmployees = await Promise.all(
      tasks.map(async (task) => {
        const assignedEmployees = await this.prisma.user.findMany({
          where: {
            id: { in: task.assignedToIds },
          },
          select: {
            id: true,
            email: true,
            skills: true,
          },
        });

        return {
          ...task,
          assignedEmployees,
        };
      }),
    );

    return tasksWithEmployees;
  }

  /**
   * Smart employee suggestion based on task type and skills
   * Uses sorting algorithm to prioritize matching skills
   */
  async suggestEmployees(suggestDto: SuggestEmployeesDto, companyId: string) {
    const { taskType, searchQuery } = suggestDto;

    // Get all employees in the company
    let employees = await this.prisma.user.findMany({
      where: {
        companyId,
        role: 'EMPLOYEE',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        skills: true,
      },
    });

    // Filter by search query if provided
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      employees = employees.filter((emp) =>
        emp.email.toLowerCase().includes(query),
      );
    }

    // Sort employees by skill match
    // Algorithm: Employees with matching skills appear first
    const sortedEmployees = employees.sort((a, b) => {
      const aHasSkill = a.skills.some(
        (skill) =>
          skill.toLowerCase().includes(taskType.toLowerCase()) ||
          taskType.toLowerCase().includes(skill.toLowerCase()),
      );
      const bHasSkill = b.skills.some(
        (skill) =>
          skill.toLowerCase().includes(taskType.toLowerCase()) ||
          taskType.toLowerCase().includes(skill.toLowerCase()),
      );

      // Employees with matching skills come first
      if (aHasSkill && !bHasSkill) return -1;
      if (!aHasSkill && bHasSkill) return 1;

      // Secondary sort: by number of total skills (more skilled first)
      return b.skills.length - a.skills.length;
    });

    // Add match score for frontend display
    const employeesWithScore = sortedEmployees.map((emp) => {
      const hasMatchingSkill = emp.skills.some(
        (skill) =>
          skill.toLowerCase().includes(taskType.toLowerCase()) ||
          taskType.toLowerCase().includes(skill.toLowerCase()),
      );

      return {
        ...emp,
        matchScore: hasMatchingSkill ? 'high' : 'low',
        matchingSkills: emp.skills.filter(
          (skill) =>
            skill.toLowerCase().includes(taskType.toLowerCase()) ||
            taskType.toLowerCase().includes(skill.toLowerCase()),
        ),
      };
    });

    return employeesWithScore;
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(
    status: string,
    companyId: string,
    userId: string,
    role: string,
  ) {
    const where: any = {
      status,
      companyId,
    };

    // If employee, filter to only assigned tasks
    if (role === 'EMPLOYEE') {
      where.assignedToIds = {
        has: userId,
      };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            githubRepoName: true,
            githubRepoBranch: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Fetch assigned employees for each task
    const tasksWithEmployees = await Promise.all(
      tasks.map(async (task) => {
        const assignedEmployees = await this.prisma.user.findMany({
          where: {
            id: { in: task.assignedToIds },
          },
          select: {
            id: true,
            email: true,
            skills: true,
          },
        });

        return {
          ...task,
          assignedEmployees,
        };
      }),
    );

    return tasksWithEmployees;
  }

  /**
   * Employee marks task as complete (pending verification)
   */
  async completeTaskByEmployee(
    taskId: string,
    companyId: string,
    userId: string,
    role: string,
    completionCommitSha?: string,
    completionCommitUrl?: string,
    completionCommitMessage?: string,
  ) {
    // Get task and verify employee is assigned
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        companyId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if employee is assigned to this task
    if (!task.assignedToIds.includes(userId)) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    // Update task status to pending_verification
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'pending_verification',
        completedById: userId,
        completedAt: new Date(),
        completionCommitSha,
        completionCommitUrl,
        completionCommitMessage,
      },
    });

    return {
      success: true,
      message: 'Task marked as complete. Waiting for boss verification.',
      task: updatedTask,
    };
  }

  /**
   * Boss verifies and approves task completion
   */
  async verifyTaskByBoss(taskId: string, companyId: string, bossId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        companyId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== 'pending_verification') {
      throw new BadRequestException(
        'Task is not pending verification. Current status: ' + task.status,
      );
    }

    // Update task to completed and verified
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        verifiedByBossId: bossId,
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Task verified and marked as completed.',
      task: updatedTask,
    };
  }
}
