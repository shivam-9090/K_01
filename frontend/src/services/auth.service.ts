import { api } from "./api";
import { LoginRequest, RegisterRequest, AuthResponse } from "../types";

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  async getProfile() {
    const response = await api.get("/users/me/profile");
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const response = await api.patch("/users/me/password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  async updateProfile(name?: string, avatarUrl?: string) {
    const response = await api.patch("/users/me/profile", { name, avatarUrl });
    return response.data;
  },

  async uploadAvatar(formData: FormData) {
    const response = await api.post("/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async updateCompanyName(companyName: string) {
    const response = await api.patch("/users/me/company-name", { companyName });
    return response.data;
  },

  // GitHub OAuth methods
  async getGitHubAuthUrl() {
    const response = await api.get("/auth/github/url");
    return response.data.url;
  },

  async linkGitHubAccount(code: string) {
    const response = await api.post("/auth/github/link", { code });
    return response.data;
  },

  async unlinkGitHubAccount() {
    const response = await api.post("/auth/github/unlink");
    return response.data;
  },

  async getGitHubRepositories() {
    const response = await api.get("/auth/github/repositories");
    return response.data;
  },

  async getRepositoryCommits(
    repoFullName: string,
    branch?: string,
    author?: string,
  ) {
    try {
      const params = new URLSearchParams({ repo: repoFullName });
      if (branch) params.append("branch", branch);
      if (author) params.append("author", author);

      const response = await api.get(
        `/auth/github/commits?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getRepositoryBranches(repoFullName: string) {
    try {
      const params = new URLSearchParams({ repo: repoFullName });
      const response = await api.get(
        `/auth/github/branches?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getCommitBySha(repoFullName: string, sha: string) {
    try {
      const params = new URLSearchParams({ repo: repoFullName });
      const response = await api.get(
        `/auth/github/commit/${sha}?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
