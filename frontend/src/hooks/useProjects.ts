import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectService } from "../services/project.service";
import { queryKeys } from "../lib/query-client";
import { CreateProjectInput, UpdateProjectInput } from "../schemas/validation";

export const useProjects = () => {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => projectService.getAll(),
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectService.getById(id),
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectService.create(data),
    onSuccess: () => {
      toast.success("Project Created", {
        description: "The project has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.refetchQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      projectService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success("Project Updated", {
        description: "The project has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });
      queryClient.refetchQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => {
      toast.success("Project Deleted", {
        description: "The project has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.refetchQueries({ queryKey: queryKeys.projects.all });
    },
  });
};
