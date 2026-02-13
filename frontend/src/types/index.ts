// Type definitions for the application

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "BOSS" | "EMPLOYEE";
  companyId?: string;
  mobile?: string;
  skills?: string[];
  achievements?: string;
  attendance?: number;
  isActive: boolean;
  isTwoFAEnabled?: boolean;
  lastLogin?: string;
  githubUsername?: string;
  githubAccessToken?: string;

  // PROJECT PERMISSIONS
  canCreateProject?: boolean;
  canUpdateProject?: boolean;
  canDeleteProject?: boolean;
  canViewAllProjects?: boolean;

  // TASK PERMISSIONS
  canCreateTask?: boolean;
  canUpdateTask?: boolean;
  canDeleteTask?: boolean;
  canCompleteTask?: boolean;
  canVerifyTask?: boolean;
  canViewAllTasks?: boolean;
  canViewOverdueTasks?: boolean;

  // EMPLOYEE MANAGEMENT PERMISSIONS
  canCreateEmployee?: boolean;
  canUpdateEmployee?: boolean;
  canDeleteEmployee?: boolean;
  canViewAllEmployees?: boolean;
  canManagePermissions?: boolean;

  // TEAM PERMISSIONS
  canCreateTeam?: boolean;
  canUpdateTeam?: boolean;
  canDeleteTeam?: boolean;
  canViewAllTeams?: boolean;

  // ADVANCED PERMISSIONS
  canViewAuditLogs?: boolean;
  canViewAllSessions?: boolean;
  canManage2FA?: boolean;

  // GitHub OAuth fields
  githubId?: string;
  githubUsername?: string;
  githubAvatarUrl?: string;
  githubName?: string;
  githubBio?: string;
  githubUrl?: string;
  githubBlog?: string;
  githubLocation?: string;
  githubCompany?: string;
  githubPublicRepos?: number;
  githubFollowers?: number;
  githubFollowing?: number;

  company?: {
    id: string;
    name: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName: string;
  mobile?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  source?: string;
  startDate: string;
  closeDate?: string;
  status: string;
  companyId: string;
  createdById: string;
  githubRepoName?: string;
  githubRepoUrl?: string;
  githubRepoBranch?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  defaultBranch: string;
  private: boolean;
  language?: string;
  stars: number;
  forks: number;
  updatedAt: string;
}

export interface Employee {
  id: string;
  email: string;
  mobile?: string;
  skills: string[];
  achievements?: string;
  attendance: number;
  isActive: boolean;
  createdAt: string;
  company?: {
    id: string;
    name: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  closeDate?: string;
  taskType: string;
  status: string;
  priority: string;
  projectId: string;
  companyId: string;
  createdById: string;
  assignedToIds: string[];
  completedById?: string;
  completedAt?: string;
  completionCommitSha?: string;
  completionCommitUrl?: string;
  completionCommitMessage?: string;
  verifiedByBossId?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    title: string;
    status: string;
    githubRepoName?: string;
    githubRepoBranch?: string;
  };
  assignedEmployees?: Employee[];
}

export interface CreateProjectDto {
  title: string;
  description?: string;
  source?: string;
  startDate: string;
  closeDate?: string;
}

export interface CreateEmployeeDto {
  name: string;
  email: string;
  password: string;
  skills?: string[];
  achievements?: string;
  attendance?: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  startDate: string;
  closeDate?: string;
  taskType: string;
  priority?: string;
  projectId: string;
  assignedToIds: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  startDate?: string;
  closeDate?: string;
  taskType?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  assignedToIds?: string[];
}

export interface SuggestEmployeesDto {
  taskType: string;
  searchQuery?: string;
}

export interface EmployeeSuggestion extends Employee {
  matchScore: "high" | "low";
  matchingSkills: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  private: boolean;
  language?: string | null;
  stars?: number;
  forks?: number;
  updatedAt?: string;
}
