import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(companyId: string, userId: string, role: string) {
    const isBoss = role === 'BOSS';

    const [
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalEmployees,
    ] = await Promise.all([
      // Total Projects
      this.prisma.project.count({
        where: {
          companyId,
          // If employee, only count projects they have tasks in?
          // For now, simple count or filter if strictly needed.
          // Based on instructions: "Only projects that have tasks assigned to them"
          ...(isBoss
            ? {}
            : {
                tasks: {
                  some: {
                    assignedToIds: { has: userId },
                  },
                },
              }),
        },
      }),

      // Total Tasks
      this.prisma.task.count({
        where: {
          companyId,
          ...(isBoss ? {} : { assignedToIds: { has: userId } }),
        },
      }),

      // Completed Tasks
      this.prisma.task.count({
        where: {
          companyId,
          status: 'completed',
          ...(isBoss ? {} : { assignedToIds: { has: userId } }),
        },
      }),

      // Pending Tasks
      this.prisma.task.count({
        where: {
          companyId,
          status: 'pending',
          ...(isBoss ? {} : { assignedToIds: { has: userId } }),
        },
      }),

      // Total Employees (Only BOSS usually needs this number, but safe to show total company size)
      this.prisma.user.count({
        where: {
          companyId,
          role: 'EMPLOYEE',
        },
      }),
    ]);

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalEmployees,
    };
  }

  async getChartData(companyId: string, userId: string, role: string) {
    // Get stats for last 6 months
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(startOfCurrentMonth);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    // Use raw query or aggregate logic if needed, but simple findMany is okay for now
    const tasks = await this.prisma.task.findMany({
      where: {
        companyId,
        startDate: {
          gte: sixMonthsAgo,
        },
        // Role check
        ...(role === 'BOSS' ? {} : { assignedToIds: { has: userId } }),
      },
      select: {
        id: true,
        startDate: true,
        status: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Initialize map with last 6 months in order
    const result = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const name = monthNames[d.getMonth()];
      result.push({ name, tasks: 0, completed: 0 });
    }

    // Populate data
    for (const task of tasks) {
      const taskMonth = task.startDate.getMonth();
      const monthName = monthNames[taskMonth];

      // Find the entry in result array
      const entry = result.find((r) => r.name === monthName);
      if (entry) {
        entry.tasks++;
        if (task.status === 'completed') {
          entry.completed++;
        }
      }
    }

    return result;
  }
}
