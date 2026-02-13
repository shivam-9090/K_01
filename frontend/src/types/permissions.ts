/**
 * Frontend Permission System Types
 * Mirrors backend permission structure for consistent UI
 */

export enum Permission {
  // PROJECT PERMISSIONS
  CAN_CREATE_PROJECT = "canCreateProject",
  CAN_UPDATE_PROJECT = "canUpdateProject",
  CAN_DELETE_PROJECT = "canDeleteProject",
  CAN_VIEW_ALL_PROJECTS = "canViewAllProjects",

  // TASK PERMISSIONS (Unified - any task permission gives full access)
  CAN_VIEW_ALL_TASKS = "canViewAllTasks",

  // EMPLOYEE MANAGEMENT PERMISSIONS
  CAN_CREATE_EMPLOYEE = "canCreateEmployee",
  CAN_UPDATE_EMPLOYEE = "canUpdateEmployee",
  CAN_DELETE_EMPLOYEE = "canDeleteEmployee",
  CAN_VIEW_ALL_EMPLOYEES = "canViewAllEmployees",
  CAN_MANAGE_PERMISSIONS = "canManagePermissions",

  // TEAM PERMISSIONS
  CAN_CREATE_TEAM = "canCreateTeam",
  CAN_UPDATE_TEAM = "canUpdateTeam",
  CAN_DELETE_TEAM = "canDeleteTeam",
  CAN_VIEW_ALL_TEAMS = "canViewAllTeams",

  // ADVANCED PERMISSIONS
  CAN_VIEW_AUDIT_LOGS = "canViewAuditLogs",
  CAN_VIEW_ALL_SESSIONS = "canViewAllSessions",
  CAN_MANAGE_2FA = "canManage2FA",
}

export interface PermissionInfo {
  key: Permission;
  label: string;
  description: string;
  icon: string;
  dangerous?: boolean;
}

export interface PermissionCategory {
  category: string;
  description: string;
  permissions: PermissionInfo[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: "Project Management",
    description: "Control over project lifecycle",
    permissions: [
      {
        key: Permission.CAN_CREATE_PROJECT,
        label: "Create Projects",
        description: "Can create new projects",
        icon: "📁",
      },
      {
        key: Permission.CAN_UPDATE_PROJECT,
        label: "Update Projects",
        description: "Can edit project details and settings",
        icon: "✏️",
      },
      {
        key: Permission.CAN_DELETE_PROJECT,
        label: "Delete Projects",
        description: "Can permanently delete projects",
        icon: "🗑️",
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_PROJECTS,
        label: "View All Projects",
        description: "Can see all company projects (not just assigned)",
        icon: "👁️",
      },
    ],
  },
  {
    category: "Task Management",
    description: "Control over task operations",
    permissions: [
      {
        key: Permission.CAN_VIEW_ALL_TASKS,
        label: "Task Permission",
        description:
          "Full access to all task operations (create, update, delete, complete, verify, view all)",
        icon: "📋",
      },
    ],
  },
  {
    category: "Employee Management",
    description: "Control over employee accounts and permissions",
    permissions: [
      {
        key: Permission.CAN_CREATE_EMPLOYEE,
        label: "Create Employees",
        description: "Can invite and create new employee accounts",
        icon: "👤",
      },
      {
        key: Permission.CAN_UPDATE_EMPLOYEE,
        label: "Update Employees",
        description: "Can edit employee details and skills",
        icon: "✏️",
      },
      {
        key: Permission.CAN_DELETE_EMPLOYEE,
        label: "Delete Employees",
        description: "Can remove employee accounts",
        icon: "🚫",
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_EMPLOYEES,
        label: "View All Employees",
        description: "Can see all employees in company",
        icon: "👥",
      },
      {
        key: Permission.CAN_MANAGE_PERMISSIONS,
        label: "Manage Permissions",
        description: "Can grant/revoke permissions to other employees",
        icon: "🔑",
        dangerous: true,
      },
    ],
  },
  {
    category: "Team Management",
    description: "Control over team operations",
    permissions: [
      {
        key: Permission.CAN_CREATE_TEAM,
        label: "Create Teams",
        description: "Can create new teams",
        icon: "🏢",
      },
      {
        key: Permission.CAN_UPDATE_TEAM,
        label: "Update Teams",
        description: "Can edit team details and members",
        icon: "📝",
      },
      {
        key: Permission.CAN_DELETE_TEAM,
        label: "Delete Teams",
        description: "Can permanently delete teams",
        icon: "🗑️",
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_TEAMS,
        label: "View All Teams",
        description: "Can see all company teams",
        icon: "👁️",
      },
    ],
  },
  {
    category: "Advanced Access",
    description: "High-level system access",
    permissions: [
      {
        key: Permission.CAN_VIEW_AUDIT_LOGS,
        label: "View Audit Logs",
        description: "Can view audit logs of all users",
        icon: "📜",
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_SESSIONS,
        label: "View All Sessions",
        description: "Can view active sessions of all users",
        icon: "🔐",
        dangerous: true,
      },
      {
        key: Permission.CAN_MANAGE_2FA,
        label: "Manage 2FA",
        description: "Can enable/disable 2FA for own account",
        icon: "🔒",
      },
    ],
  },
];

// Export all permissions as a flat array
export const ALL_PERMISSIONS: PermissionInfo[] = PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
);

export const PERMISSION_PRESETS = {
  TEAM_LEADER: {
    name: "Team Leader",
    description: "Can manage tasks and view team members",
    permissions: [
      Permission.CAN_VIEW_ALL_TASKS,
      Permission.CAN_VIEW_ALL_EMPLOYEES,
      Permission.CAN_VIEW_ALL_PROJECTS,
    ],
  },
  PROJECT_MANAGER: {
    name: "Project Manager",
    description: "Full project and task management capabilities",
    permissions: [
      Permission.CAN_CREATE_PROJECT,
      Permission.CAN_UPDATE_PROJECT,
      Permission.CAN_VIEW_ALL_PROJECTS,
      Permission.CAN_VIEW_ALL_TASKS,
      Permission.CAN_VIEW_ALL_EMPLOYEES,
      Permission.CAN_CREATE_TEAM,
      Permission.CAN_UPDATE_TEAM,
    ],
  },
  HR_MANAGER: {
    name: "HR Manager",
    description: "Employee management and monitoring",
    permissions: [
      Permission.CAN_CREATE_EMPLOYEE,
      Permission.CAN_UPDATE_EMPLOYEE,
      Permission.CAN_VIEW_ALL_EMPLOYEES,
      Permission.CAN_VIEW_AUDIT_LOGS,
      Permission.CAN_VIEW_ALL_SESSIONS,
    ],
  },
  SENIOR_DEVELOPER: {
    name: "Senior Developer",
    description: "Enhanced task management without approvals",
    permissions: [
      Permission.CAN_VIEW_ALL_TASKS,
      Permission.CAN_VIEW_ALL_PROJECTS,
    ],
  },
};
