import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      retry: 1, // Retry once on failure
      refetchOnWindowFocus: true, // Refetch on window focus to ensure fresh data
      refetchOnReconnect: true,
      refetchOnMount: true, // Always refetch on mount to ensure fresh data
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});

// Query Keys for consistent cache management
export const queryKeys = {
  auth: {
    user: ["auth", "user"] as const,
    profile: ["auth", "profile"] as const,
  },
  projects: {
    all: ["projects"] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  employees: {
    all: (page?: number) => ["employees", { page }] as const,
    detail: (id: string) => ["employees", id] as const,
    suggestions: (taskType: string, search?: string) =>
      ["employees", "suggestions", { taskType, search }] as const,
  },
  tasks: {
    all: (filters?: any) => ["tasks", filters] as const,
    detail: (id: string) => ["tasks", id] as const,
    byStatus: (status: string) => ["tasks", "status", status] as const,
    byProject: (projectId: string) => ["tasks", "project", projectId] as const,
  },
};
