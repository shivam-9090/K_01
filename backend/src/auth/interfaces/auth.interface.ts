export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  companyId?: string; // Add companyId for company-scoped authorization
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isTwoFAEnabled: boolean;
    mobile?: string;
    companyId?: string;
    isActive: boolean;
    lastLogin?: Date;
    name?: string;
    githubId?: string;
    githubUsername?: string;
    githubAvatarUrl?: string;
    githubProfileUrl?: string;
    githubBio?: string;
    githubLocation?: string;
    githubCompany?: string;
    githubReposCount?: number;
    // Permission fields
    canCreateProject?: boolean;
    canUpdateProject?: boolean;
    canDeleteProject?: boolean;
    canViewAllProjects?: boolean;
    canCreateTask?: boolean;
    canUpdateTask?: boolean;
    canDeleteTask?: boolean;
    canCompleteTask?: boolean;
    canVerifyTask?: boolean;
    canViewAllTasks?: boolean;
    canViewOverdueTasks?: boolean;
    canCreateEmployee?: boolean;
    canUpdateEmployee?: boolean;
    canDeleteEmployee?: boolean;
    canViewAllEmployees?: boolean;
    canManagePermissions?: boolean;
    canCreateTeam?: boolean;
    canUpdateTeam?: boolean;
    canDeleteTeam?: boolean;
    canViewAllTeams?: boolean;
    canViewAuditLogs?: boolean;
    canViewAllSessions?: boolean;
    canManage2FA?: boolean;
    company?: {
      id: string;
      name: string;
      ownerId: string;
    };
  };
}

export interface TwoFAAuthResponse {
  token: string; // temporary token for 2FA verification
  requiresTwoFA: boolean;
}
