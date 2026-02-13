import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard.service";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardService.getStats,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useDashboardChart = () => {
  return useQuery({
    queryKey: ["dashboard", "chart"],
    queryFn: dashboardService.getChartData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
