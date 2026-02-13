/**
 * Comprehensive Permission System for K_01 Task Management
 *
 * This file defines all granular permissions that BOSS can grant to employees.
 * These permissions allow delegation of authority to managers, team leaders, etc.
 */

export enum Permission {
  // PROJECT PERMISSIONS
  CAN_CREATE_PROJECT = 'canCreateProject',
  CAN_UPDATE_PROJECT = 'canUpdateProject',
  CAN_DELETE_PROJECT = 'canDeleteProject',
  CAN_VIEW_ALL_PROJECTS = 'canViewAllProjects',

  // TASK PERMISSIONS
  CAN_CREATE_TASK = 'canCreateTask',
  CAN_UPDATE_TASK = 'canUpdateTask',
  CAN_DELETE_TASK = 'canDeleteTask',
  CAN_COMPLETE_TASK = 'canCompleteTask',
  CAN_VERIFY_TASK = 'canVerifyTask',
  CAN_VIEW_ALL_TASKS = 'canViewAllTasks',
  CAN_VIEW_OVERDUE_TASKS = 'canViewOverdueTasks',

  // EMPLOYEE MANAGEMENT PERMISSIONS
  CAN_CREATE_EMPLOYEE = 'canCreateEmployee',
  CAN_UPDATE_EMPLOYEE = 'canUpdateEmployee',
  CAN_DELETE_EMPLOYEE = 'canDeleteEmployee',
  CAN_VIEW_ALL_EMPLOYEES = 'canViewAllEmployees',
  CAN_MANAGE_PERMISSIONS = 'canManagePermissions',

  // TEAM PERMISSIONS
  CAN_CREATE_TEAM = 'canCreateTeam',
  CAN_UPDATE_TEAM = 'canUpdateTeam',
  CAN_DELETE_TEAM = 'canDeleteTeam',
  CAN_VIEW_ALL_TEAMS = 'canViewAllTeams',

  // ADVANCED PERMISSIONS
  CAN_VIEW_AUDIT_LOGS = 'canViewAuditLogs',
  CAN_VIEW_ALL_SESSIONS = 'canViewAllSessions',
  CAN_MANAGE_2FA = 'canManage2FA',
}

export interface PermissionCategory {
  category: string;
  description: string;
  permissions: PermissionInfo[];
}

export interface PermissionInfo {
  key: Permission;
  label: string;
  description: string;
  icon: string;
  dangerous?: boolean; // Flags permissions that grant significant power
}

/**
 * Categorized permissions for UI display
 */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: 'Project Management',
    description: 'Control over project lifecycle',
    permissions: [
      {
        key: Permission.CAN_CREATE_PROJECT,
        label: 'Create Projects',
        description: 'Can create new projects',
        icon: '📁',
      },
      {
        key: Permission.CAN_UPDATE_PROJECT,
        label: 'Update Projects',
        description: 'Can edit project details and settings',
        icon: '✏️',
      },
      {
        key: Permission.CAN_DELETE_PROJECT,
        label: 'Delete Projects',
        description: 'Can permanently delete projects',
        icon: '🗑️',
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_PROJECTS,
        label: 'View All Projects',
        description: 'Can see all company projects (not just assigned)',
        icon: '👁️',
      },
    ],
  },
  {
    category: 'Task Management',
    description: 'Control over task operations',
    permissions: [
      {
        key: Permission.CAN_CREATE_TASK,
        label: 'Create Tasks',
        description: 'Can create new tasks',
        icon: '➕',
      },
      {
        key: Permission.CAN_UPDATE_TASK,
        label: 'Update Tasks',
        description: 'Can edit task details, reassign, change priority',
        icon: '📝',
      },
      {
        key: Permission.CAN_DELETE_TASK,
        label: 'Delete Tasks',
        description: 'Can permanently delete tasks',
        icon: '❌',
        dangerous: true,
      },
      {
        key: Permission.CAN_COMPLETE_TASK,
        label: 'Complete Tasks (No Verification)',
        description: 'Can mark tasks as complete without BOSS approval',
        icon: '✅',
      },
      {
        key: Permission.CAN_VERIFY_TASK,
        label: 'Verify Tasks',
        description: 'Can approve/verify completed tasks',
        icon: '✔️',
      },
      {
        key: Permission.CAN_VIEW_ALL_TASKS,
        label: 'View All Tasks',
        description: 'Can see all company tasks (not just assigned)',
        icon: '📋',
      },
      {
        key: Permission.CAN_VIEW_OVERDUE_TASKS,
        label: 'View Overdue Report',
        description: 'Can access overdue tasks dashboard',
        icon: '⚠️',
      },
    ],
  },
  {
    category: 'Employee Management',
    description: 'Control over employee accounts and permissions',
    permissions: [
      {
        key: Permission.CAN_CREATE_EMPLOYEE,
        label: 'Create Employees',
        description: 'Can invite and create new employee accounts',
        icon: '👤',
      },
      {
        key: Permission.CAN_UPDATE_EMPLOYEE,
        label: 'Update Employees',
        description: 'Can edit employee details and skills',
        icon: '✏️',
      },
      {
        key: Permission.CAN_DELETE_EMPLOYEE,
        label: 'Delete Employees',
        description: 'Can remove employee accounts',
        icon: '🚫',
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_EMPLOYEES,
        label: 'View All Employees',
        description: 'Can see all employees in company',
        icon: '👥',
      },
      {
        key: Permission.CAN_MANAGE_PERMISSIONS,
        label: 'Manage Permissions',
        description: 'Can grant/revoke permissions to other employees',
        icon: '🔑',
        dangerous: true,
      },
    ],
  },
  {
    category: 'Team Management',
    description: 'Control over team operations',
    permissions: [
      {
        key: Permission.CAN_CREATE_TEAM,
        label: 'Create Teams',
        description: 'Can create new teams',
        icon: '🏢',
      },
      {
        key: Permission.CAN_UPDATE_TEAM,
        label: 'Update Teams',
        description: 'Can edit team details and members',
        icon: '📝',
      },
      {
        key: Permission.CAN_DELETE_TEAM,
        label: 'Delete Teams',
        description: 'Can permanently delete teams',
        icon: '🗑️',
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_TEAMS,
        label: 'View All Teams',
        description: 'Can see all company teams',
        icon: '👁️',
      },
    ],
  },
  {
    category: 'Advanced Access',
    description: 'High-level system access',
    permissions: [
      {
        key: Permission.CAN_VIEW_AUDIT_LOGS,
        label: 'View Audit Logs',
        description: 'Can view audit logs of all users',
        icon: '📜',
        dangerous: true,
      },
      {
        key: Permission.CAN_VIEW_ALL_SESSIONS,
        label: 'View All Sessions',
        description: 'Can view active sessions of all users',
        icon: '🔐',
        dangerous: true,
      },
      {
        key: Permission.CAN_MANAGE_2FA,
        label: 'Manage 2FA',
        description: 'Can enable/disable 2FA for own account',
        icon: '🔒',
      },
    ],
  },
];

/**
 * Get all available permissions as a flat array
 */
export const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(
  (category) => category.permissions,
);

/**
 * Get permission label by key
 */
export function getPermissionLabel(permission: Permission): string {
  const perm = ALL_PERMISSIONS.find((p) => p.key === permission);
  return perm?.label || permission;
}

/**
 * Get permission info by key
 */
export function getPermissionInfo(
  permission: Permission,
): PermissionInfo | undefined {
  return ALL_PERMISSIONS.find((p) => p.key === permission);
}

/**
 * Check if a permission is dangerous (grants significant power)
 */
export function isDangerousPermission(permission: Permission): boolean {
  const perm = ALL_PERMISSIONS.find((p) => p.key === permission);
  return perm?.dangerous || false;
}

/**
 * Permission presets for common roles
 */
export const PERMISSION_PRESETS = {
  TEAM_LEADER: [
    Permission.CAN_VIEW_ALL_TASKS,
    Permission.CAN_CREATE_TASK,
    Permission.CAN_UPDATE_TASK,
    Permission.CAN_VERIFY_TASK,
    Permission.CAN_VIEW_ALL_EMPLOYEES,
    Permission.CAN_VIEW_ALL_PROJECTS,
  ],
  PROJECT_MANAGER: [
    Permission.CAN_CREATE_PROJECT,
    Permission.CAN_UPDATE_PROJECT,
    Permission.CAN_VIEW_ALL_PROJECTS,
    Permission.CAN_CREATE_TASK,
    Permission.CAN_UPDATE_TASK,
    Permission.CAN_DELETE_TASK,
    Permission.CAN_VIEW_ALL_TASKS,
    Permission.CAN_VIEW_OVERDUE_TASKS,
    Permission.CAN_VIEW_ALL_EMPLOYEES,
    Permission.CAN_CREATE_TEAM,
    Permission.CAN_UPDATE_TEAM,
  ],
  HR_MANAGER: [
    Permission.CAN_CREATE_EMPLOYEE,
    Permission.CAN_UPDATE_EMPLOYEE,
    Permission.CAN_VIEW_ALL_EMPLOYEES,
    Permission.CAN_VIEW_AUDIT_LOGS,
    Permission.CAN_VIEW_ALL_SESSIONS,
  ],
  SENIOR_DEVELOPER: [
    Permission.CAN_CREATE_TASK,
    Permission.CAN_COMPLETE_TASK,
    Permission.CAN_VIEW_ALL_TASKS,
    Permission.CAN_VIEW_ALL_PROJECTS,
  ],
};

/**
 * Get preset permissions by role name
 */
export function getPresetPermissions(
  presetName: keyof typeof PERMISSION_PRESETS,
): Permission[] {
  return PERMISSION_PRESETS[presetName] || [];
}
