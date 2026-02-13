import { api } from "./api";

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalEmployees?: number;
}

export interface ChartData {
  name: string;
  tasks: number;
  completed: number;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>("/dashboard/stats");
    return response.data;
  },

  getChartData: async (): Promise<ChartData[]> => {
    const response = await api.get<ChartData[]>("/dashboard/chart");
    return response.data;
  },
};
