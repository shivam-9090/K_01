import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { taskService } from "../services/task.service";
import { queryKeys } from "../lib/query-client";
import { CreateTaskInput, UpdateTaskInput } from "../schemas/validation";

export const useTasks = (
  page: number = 1,
  limit: number = 10,
  sort?: string,
  filter?: string,
  search?: string,
) => {
  return useQuery({
    queryKey: queryKeys.tasks.all({ page, limit, sort, filter, search }),
    queryFn: () => taskService.getAll(page, limit, sort, filter, search),
    placeholderData: keepPreviousData,
  });
};

export const useTask = (id: string) => {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => taskService.getById(id),
    enabled: !!id,
  });
};

export const useTasksByStatus = (status: string) => {
  return useQuery({
    queryKey: queryKeys.tasks.byStatus(status),
    queryFn: () => taskService.getByStatus(status),
    enabled: !!status,
  });
};

export const useTasksByProject = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.tasks.byProject(projectId),
    queryFn: () => taskService.getByProject(projectId),
    enabled: !!projectId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => taskService.create(data),
    onSuccess: () => {
      toast.success("Task Created", {
        description: "New task successfully assigned.",
      });
      // Invalidate all tasks queries (matches all variations)
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      taskService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success("Task Updated", {
        description: "Task details updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(variables.id),
      });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.delete(id),
    onSuccess: () => {
      toast.success("Task Deleted", {
        description: "The task has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.refetchQueries({ queryKey: ["tasks"] });
    },
  });
};
