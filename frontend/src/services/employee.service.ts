import { api } from "./api";
import { CreateEmployeeDto } from "../types";

export const employeeService = {
  async getAll(skip = 0, take = 20) {
    const response = await api.get(`/employees?skip=${skip}&take=${take}`);
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  async create(data: CreateEmployeeDto) {
    const response = await api.post("/employees", data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateEmployeeDto>) {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },

  async searchBySkills(skills: string[]) {
    const response = await api.post("/employees/search-by-skills", { skills });
    return response.data;
  },

  async suggest(taskType: string, searchQuery?: string) {
    const params = new URLSearchParams();
    if (taskType) params.append("taskType", taskType);
    if (searchQuery) params.append("searchQuery", searchQuery);

    // Always fetch from backend, ensure no mock data simulation
    const response = await api.get(
      `/tasks/suggest-employees?${params.toString()}`,
    );
    return response.data;
  },

  async getAllEmployees() {
    const response = await api.get("/employees");
    // Backend returns { employees, total, skip, take }
    // Always ensure we return an array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data?.employees && Array.isArray(response.data.employees)) {
      return response.data.employees;
    }
    return [];
  },

  async updatePermissions(
    employeeId: string,
    permissions: { canCompleteTask?: boolean; canVerifyTask?: boolean },
  ) {
    try {
      const response = await api.patch(
        `/employees/${employeeId}/permissions`,
        permissions,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateAttendance(id: string, attendance: number) {
    const response = await api.patch(`/employees/${id}/attendance`, {
      attendance,
    });
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════
  //           BULK PERMISSION MANAGEMENT METHODS
  // ═══════════════════════════════════════════════════════════════

  async bulkAssignPermissions(data: {
    employeeIds: string[];
    permissions: string[];
    overwrite?: boolean;
  }) {
    const response = await api.post("/employees/permissions/bulk-assign", data);
    return response.data;
  },

  async applyPreset(data: {
    employeeIds: string[];
    presetName: string;
    overwrite?: boolean;
  }) {
    const response = await api.post(
      "/employees/permissions/apply-preset",
      data,
    );
    return response.data;
  },

  async getEmployeePermissions(employeeId: string) {
    const response = await api.get(`/employees/${employeeId}/permissions/all`);
    return response.data;
  },

  async revokeAllPermissions(employeeId: string) {
    const response = await api.delete(
      `/employees/${employeeId}/permissions/all`,
    );
    return response.data;
  },
};
