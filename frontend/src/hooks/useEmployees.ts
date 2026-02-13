import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { employeeService } from "../services/employee.service";
import { queryKeys } from "../lib/query-client";
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "../schemas/validation";

export const useEmployees = (page = 1, take = 20) => {
  return useQuery({
    queryKey: queryKeys.employees.all(page),
    queryFn: () => employeeService.getAll((page - 1) * take, take),
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeeService.getById(id),
    enabled: !!id,
  });
};

export const useSuggestEmployees = (taskType: string, searchQuery?: string) => {
  return useQuery({
    queryKey: queryKeys.employees.suggestions(taskType, searchQuery),
    queryFn: () => employeeService.suggest(taskType, searchQuery),
    enabled: !!taskType,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => employeeService.create(data),
    onSuccess: () => {
      toast.success("Employee Created", {
        description: "New team member added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.refetchQueries({ queryKey: ["employees"] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeInput }) =>
      employeeService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success("Employee Updated", {
        description: "Employee details updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(variables.id),
      });
      queryClient.refetchQueries({ queryKey: ["employees"] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => {
      toast.success("Employee Remove", {
        description: "Employee removed from the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.refetchQueries({ queryKey: ["employees"] });
    },
  });
};
