import { api } from "./api";
import { CreateProjectDto } from "../types";

export const projectService = {
  async getAll() {
    const response = await api.get("/projects");
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async getProjectById(id: string) {
    const response = await api.get(`/projects/${id}/details`);
    return response.data;
  },

  async create(data: CreateProjectDto) {
    const response = await api.post("/projects", data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateProjectDto>) {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  async getByStatus(status: string) {
    const response = await api.get(`/projects/by-status/${status}`);
    return response.data;
  },
};
