import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(
    createProjectDto: CreateProjectDto,
    bossId: string,
    companyId: string,
  ) {
    // Validate dates
    const startDate = new Date(createProjectDto.startDate);
    const closeDate = createProjectDto.closeDate
      ? new Date(createProjectDto.closeDate)
      : null;

    if (closeDate && closeDate < startDate) {
      throw new BadRequestException('Close date cannot be before start date');
    }

    if (createProjectDto.teamIds && createProjectDto.teamIds.length > 0) {
      const validTeams = await this.prisma.team.findMany({
        where: {
          id: { in: createProjectDto.teamIds },
          companyId,
        },
        select: { id: true },
      });

      if (validTeams.length !== createProjectDto.teamIds.length) {
        throw new BadRequestException(
          'One or more selected teams are invalid for this company',
        );
      }
    }

    const project = await this.prisma.project.create({
      data: {
        title: createProjectDto.title,
        description: createProjectDto.description,
        source: createProjectDto.source,
        startDate,
        closeDate,
        companyId,
        createdById: bossId,
        githubRepoName: createProjectDto.githubRepoName,
        githubRepoUrl: createProjectDto.githubRepoUrl,
        githubRepoBranch: createProjectDto.githubRepoBranch || 'main',
        teams:
          createProjectDto.teamIds && createProjectDto.teamIds.length > 0
            ? {
                create: createProjectDto.teamIds.map((teamId) => ({
                  teamId: teamId,
                })),
              }
            : undefined,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                teamType: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Project created successfully',
      project,
    };
  }

  async getAllProjects(companyId: string, userId?: string, role?: string) {
    // If EMPLOYEE, only show projects where they have assigned tasks
    if (role === 'EMPLOYEE' && userId) {
      // First, get all tasks assigned to this employee
      const employeeTasks = await this.prisma.task.findMany({
        where: {
          companyId,
          assignedToIds: {
            has: userId,
          },
        },
        select: {
          projectId: true,
        },
      });

      // Get unique project IDs
      const projectIds = [
        ...new Set(employeeTasks.map((task) => task.projectId)),
      ];

      // Fetch only these projects
      const projects = await this.prisma.project.findMany({
        where: {
          companyId,
          id: { in: projectIds },
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          teams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  teamType: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        count: projects.length,
        projects,
      };
    }

    // BOSS sees all projects
    const projects = await this.prisma.project.findMany({
      where: { companyId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                teamType: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      count: projects.length,
      projects,
    };
  }

  async getProjectById(projectId: string, companyId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                teamType: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      success: true,
      project,
    };
  }

  async getProjectWithTasks(
    projectId: string,
    companyId: string,
    userId?: string,
    role?: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                teamType: true,
              },
            },
          },
        },
        tasks: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Filter tasks for employees - only show tasks assigned to them
    let filteredTasks = project.tasks;
    if (role === 'EMPLOYEE' && userId) {
      filteredTasks = project.tasks.filter(
        (task) => task.assignedToIds && task.assignedToIds.includes(userId),
      );
    }

    // Fetch assigned users for each task
    const tasksWithAssignees = await Promise.all(
      filteredTasks.map(async (task) => {
        if (task.assignedToIds && task.assignedToIds.length > 0) {
          const assignedUsers = await this.prisma.user.findMany({
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
            assignedTo: assignedUsers,
          };
        }
        return {
          ...task,
          assignedTo: [],
        };
      }),
    );

    return {
      ...project,
      tasks: tasksWithAssignees,
    };
  }

  async updateProject(
    projectId: string,
    updateProjectDto: UpdateProjectDto,
    companyId: string,
  ) {
    // Check if project exists and belongs to company
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    // Validate dates if provided
    const updateData: any = {
      ...updateProjectDto,
    };

    // Remove teamIds from updateData as we'll handle it separately
    delete updateData.teamIds;

    if (updateProjectDto.startDate) {
      updateData.startDate = new Date(updateProjectDto.startDate);
    }

    if (updateProjectDto.closeDate) {
      updateData.closeDate = new Date(updateProjectDto.closeDate);
    }

    // Check date validity
    if (updateData.startDate && updateData.closeDate) {
      if (updateData.closeDate < updateData.startDate) {
        throw new BadRequestException('Close date cannot be before start date');
      }
    } else if (updateData.closeDate && existingProject.startDate) {
      if (new Date(updateData.closeDate) < existingProject.startDate) {
        throw new BadRequestException('Close date cannot be before start date');
      }
    } else if (updateData.startDate && existingProject.closeDate) {
      if (existingProject.closeDate < new Date(updateData.startDate)) {
        throw new BadRequestException('Start date cannot be after close date');
      }
    }

    // Handle teams update separately
    if (updateProjectDto.teamIds !== undefined) {
      if (updateProjectDto.teamIds.length > 0) {
        const validTeams = await this.prisma.team.findMany({
          where: {
            id: { in: updateProjectDto.teamIds },
            companyId,
          },
          select: { id: true },
        });

        if (validTeams.length !== updateProjectDto.teamIds.length) {
          throw new BadRequestException(
            'One or more selected teams are invalid for this company',
          );
        }
      }

      // Delete existing team associations
      await this.prisma.projectTeam.deleteMany({
        where: { projectId },
      });

      // Create new team associations if teamIds provided
      if (updateProjectDto.teamIds && updateProjectDto.teamIds.length > 0) {
        await this.prisma.projectTeam.createMany({
          data: updateProjectDto.teamIds.map((teamId) => ({
            projectId,
            teamId,
          })),
        });
      }
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                teamType: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Project updated successfully',
      project,
    };
  }

  async deleteProject(projectId: string, companyId: string) {
    // Check if project exists and belongs to company
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }

  async getProjectsByStatus(companyId: string, status: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        companyId,
        status,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return {
      success: true,
      count: projects.length,
      projects,
    };
  }

  /**
   * Get comprehensive project analytics and tracking
   */
  async getProjectAnalytics(projectId: string, companyId: string) {
    // Verify project exists and belongs to company
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all tasks for this project
    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        companyId,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === 'in_progress',
    ).length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const cancelledTasks = tasks.filter((t) => t.status === 'cancelled').length;

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Task type distribution
    const tasksByType = tasks.reduce(
      (acc, task) => {
        acc[task.taskType] = (acc[task.taskType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Priority distribution
    const tasksByPriority = tasks.reduce(
      (acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get all unique employees who worked on this project
    const allAssignedIds = new Set<string>();
    tasks.forEach((task) => {
      task.assignedToIds.forEach((id) => allAssignedIds.add(id));
    });

    const employees = await this.prisma.user.findMany({
      where: {
        id: { in: Array.from(allAssignedIds) },
        companyId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        skills: true,
      },
    });

    // Calculate employee contributions
    const employeeContributions = employees.map((emp) => {
      const assignedTasks = tasks.filter((t) =>
        t.assignedToIds.includes(emp.id),
      );
      const completedByEmployee = tasks.filter(
        (t) => t.completedById === emp.id,
      );

      return {
        employee: emp,
        assignedTasksCount: assignedTasks.length,
        completedTasksCount: completedByEmployee.length,
        completionRate:
          assignedTasks.length > 0
            ? Math.round(
                (completedByEmployee.length / assignedTasks.length) * 100,
              )
            : 0,
      };
    });

    // Get recent task activities (last 10 completed tasks)
    const recentCompletions = tasks
      .filter((t) => t.status === 'completed' && t.completedAt)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    // Get employees who completed tasks
    const completerIds = recentCompletions
      .map((t) => t.completedById)
      .filter((id): id is string => id !== null);

    const completers = await this.prisma.user.findMany({
      where: {
        id: { in: completerIds },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const completersMap = new Map(completers.map((c) => [c.id, c]));

    const taskHistory = recentCompletions.map((task) => ({
      taskId: task.id,
      title: task.title,
      taskType: task.taskType,
      priority: task.priority,
      completedAt: task.completedAt,
      completedBy: task.completedById
        ? completersMap.get(task.completedById)
        : null,
    }));

    // Calculate timeline
    const now = new Date();
    const projectStart = new Date(project.startDate);
    const projectEnd = project.closeDate ? new Date(project.closeDate) : null;

    let daysElapsed = 0;
    let totalDays = 0;
    let timelinePercentage = 0;

    if (projectEnd) {
      daysElapsed = Math.floor(
        (now.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      totalDays = Math.floor(
        (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      timelinePercentage =
        totalDays > 0
          ? Math.min(Math.round((daysElapsed / totalDays) * 100), 100)
          : 0;
    }

    return {
      success: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        source: project.source,
        status: project.status,
        startDate: project.startDate,
        closeDate: project.closeDate,
        company: project.company,
      },
      statistics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        cancelledTasks,
        completionPercentage,
      },
      timeline: {
        startDate: project.startDate,
        closeDate: project.closeDate,
        daysElapsed,
        totalDays: totalDays > 0 ? totalDays : null,
        timelinePercentage,
      },
      distribution: {
        byType: tasksByType,
        byPriority: tasksByPriority,
      },
      employeeContributions: employeeContributions.sort(
        (a, b) => b.completedTasksCount - a.completedTasksCount,
      ),
      recentActivity: taskHistory,
    };
  }

  /**
   * Get task timeline for a project (all task history)
   */
  async getProjectTaskTimeline(projectId: string, companyId: string) {
    // Verify project exists
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all tasks with full details
    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        companyId,
      },
      orderBy: [
        { status: 'asc' }, // completed first
        { createdAt: 'desc' },
      ],
    });

    // Get all involved employees
    const allEmployeeIds = new Set<string>();
    tasks.forEach((task) => {
      task.assignedToIds.forEach((id) => allEmployeeIds.add(id));
      if (task.completedById) {
        allEmployeeIds.add(task.completedById);
      }
    });

    const employees = await this.prisma.user.findMany({
      where: {
        id: { in: Array.from(allEmployeeIds) },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Build timeline
    const timeline = tasks.map((task) => {
      const assignedEmployees = task.assignedToIds
        .map((id) => employeeMap.get(id))
        .filter((e) => e !== undefined);

      const completedBy = task.completedById
        ? employeeMap.get(task.completedById)
        : null;

      return {
        taskId: task.id,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        status: task.status,
        priority: task.priority,
        startDate: task.startDate,
        closeDate: task.closeDate,
        assignedTo: assignedEmployees,
        completedBy,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    });

    // Group by status
    const groupedTimeline = {
      completed: timeline.filter((t) => t.status === 'completed'),
      inProgress: timeline.filter((t) => t.status === 'in_progress'),
      pending: timeline.filter((t) => t.status === 'pending'),
      cancelled: timeline.filter((t) => t.status === 'cancelled'),
    };

    return {
      success: true,
      project: {
        id: project.id,
        title: project.title,
      },
      timeline,
      groupedTimeline,
      totalTasks: tasks.length,
    };
  }

  /**
   * Get employee performance in a project
   */
  async getProjectEmployeePerformance(projectId: string, companyId: string) {
    // Verify project exists
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        companyId,
      },
    });

    // Get unique employee IDs
    const employeeIds = new Set<string>();
    tasks.forEach((task) => {
      task.assignedToIds.forEach((id) => employeeIds.add(id));
    });

    const employees = await this.prisma.user.findMany({
      where: {
        id: { in: Array.from(employeeIds) },
        companyId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        skills: true,
      },
    });

    // Calculate detailed performance for each employee
    const performance = employees.map((emp) => {
      // Tasks assigned to this employee
      const assignedTasks = tasks.filter((t) =>
        t.assignedToIds.includes(emp.id),
      );

      // Tasks completed by this employee
      const completedTasks = tasks.filter((t) => t.completedById === emp.id);

      // Tasks by status
      const completed = assignedTasks.filter(
        (t) => t.status === 'completed',
      ).length;
      const inProgress = assignedTasks.filter(
        (t) => t.status === 'in_progress',
      ).length;
      const pending = assignedTasks.filter(
        (t) => t.status === 'pending',
      ).length;
      const cancelled = assignedTasks.filter(
        (t) => t.status === 'cancelled',
      ).length;

      // Tasks by type
      const tasksByType = assignedTasks.reduce(
        (acc, task) => {
          acc[task.taskType] = (acc[task.taskType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Tasks by priority
      const tasksByPriority = assignedTasks.reduce(
        (acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        employee: {
          id: emp.id,
          email: emp.email,
          skills: emp.skills,
        },
        stats: {
          totalAssigned: assignedTasks.length,
          completed,
          inProgress,
          pending,
          cancelled,
          completedByThisEmployee: completedTasks.length,
          completionRate:
            assignedTasks.length > 0
              ? Math.round((completed / assignedTasks.length) * 100)
              : 0,
        },
        distribution: {
          byType: tasksByType,
          byPriority: tasksByPriority,
        },
      };
    });

    return {
      success: true,
      project: {
        id: project.id,
        title: project.title,
      },
      employeePerformance: performance.sort(
        (a, b) =>
          b.stats.completedByThisEmployee - a.stats.completedByThisEmployee,
      ),
      totalEmployees: employees.length,
    };
  }
}
