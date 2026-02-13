import { api } from "./api";
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  SuggestEmployeesDto,
  EmployeeSuggestion,
  PaginatedResponse,
} from "../types";

export const taskService = {
  async getAll(
    page: number = 1,
    limit: number = 10,
    sort?: string,
    filter?: string,
    search?: string,
  ) {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (sort) params.append("sort", sort);
    if (filter) params.append("filter", filter);
    if (search) params.append("search", search);

    const response = await api.get<PaginatedResponse<Task>>(
      `/tasks?${params.toString()}`,
    );
    return response.data;
  },

  async getOverdue() {
    const response = await api.get<Task[]>("/tasks/overdue");
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async create(data: CreateTaskDto) {
    const response = await api.post("/tasks", data);
    return response.data;
  },

  async update(id: string, data: UpdateTaskDto) {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  async getByStatus(status: string) {
    const response = await api.get<Task[]>(`/tasks/by-status/${status}`);
    return response.data;
  },

  async getByProject(projectId: string) {
    const response = await api.get<Task[]>(`/tasks/by-project/${projectId}`);
    return response.data;
  },

  async suggestEmployees(
    params: SuggestEmployeesDto,
  ): Promise<EmployeeSuggestion[]> {
    const response = await api.get<EmployeeSuggestion[]>(
      "/tasks/suggest-employees",
      { params },
    );
    return response.data;
  },

  async completeTask(id: string) {
    const response = await api.put(`/tasks/${id}`, {
      status: "completed",
    });
    return response.data;
  },

  async completeTaskByEmployee(
    id: string,
    commitSha?: string,
    commitUrl?: string,
    commitMessage?: string,
  ) {
    const response = await api.put(`/tasks/${id}/complete`, {
      completionCommitSha: commitSha,
      completionCommitUrl: commitUrl,
      completionCommitMessage: commitMessage,
    });
    return response.data;
  },

  async verifyTaskByBoss(id: string) {
    const response = await api.put(`/tasks/${id}/verify`);
    return response.data;
  },
};
