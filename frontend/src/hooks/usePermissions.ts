import { useAuthStore } from "../context/AuthContext";
import type { User } from "../types";

/**
 * Custom hook to check user permissions
 * BOSS always has all permissions
 * EMPLOYEE permissions are checked against their permission fields
 */
export const usePermissions = () => {
  const { user, isLoading } = useAuthStore();

  // Helper function to check if user has a specific permission
  const hasPermission = (permission: keyof User): boolean => {
    if (!user) return false;

    // BOSS always has all permissions
    if (user.role === "BOSS") return true;

    // Check employee permission
    return Boolean(user[permission]);
  };

  // Helper to check multiple permissions (user needs ALL of them)
  const hasAllPermissions = (...permissions: Array<keyof User>): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  // Helper to check multiple permissions (user needs ANY of them)
  const hasAnyPermission = (...permissions: Array<keyof User>): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  // Helper to check if user has ANY task permission (means they can do everything with tasks)
  const hasAnyTaskPermission = () => {
    if (!user) return false;
    if (user.role === "BOSS") return true;

    return Boolean(
      user.canCreateTask ||
      user.canUpdateTask ||
      user.canDeleteTask ||
      user.canCompleteTask ||
      user.canVerifyTask ||
      user.canViewAllTasks ||
      user.canViewOverdueTasks,
    );
  };

  const hasTaskPermission = hasAnyTaskPermission();

  return {
    user,
    isLoading,
    isBoss: user?.role === "BOSS",
    isEmployee: user?.role === "EMPLOYEE",
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,

    // Unified task permission - if user has ANY task permission, they can do EVERYTHING
    hasTaskPermission,

    // Project permissions
    canCreateProject: hasPermission("canCreateProject"),
    canUpdateProject: hasPermission("canUpdateProject"),
    canDeleteProject: hasPermission("canDeleteProject"),
    canViewAllProjects: hasPermission("canViewAllProjects"),

    // Task permissions - all unified under hasTaskPermission
    canCreateTask: hasTaskPermission,
    canUpdateTask: hasTaskPermission,
    canDeleteTask: hasTaskPermission,
    canCompleteTask: hasTaskPermission,
    canVerifyTask: hasTaskPermission,
    canViewAllTasks: hasTaskPermission,
    canViewOverdueTasks: hasTaskPermission,

    // Employee permissions
    canCreateEmployee: hasPermission("canCreateEmployee"),
    canUpdateEmployee: hasPermission("canUpdateEmployee"),
    canDeleteEmployee: hasPermission("canDeleteEmployee"),
    canViewAllEmployees: hasPermission("canViewAllEmployees"),
    canManagePermissions: hasPermission("canManagePermissions"),

    // Team permissions
    canCreateTeam: hasPermission("canCreateTeam"),
    canUpdateTeam: hasPermission("canUpdateTeam"),
    canDeleteTeam: hasPermission("canDeleteTeam"),
    canViewAllTeams: hasPermission("canViewAllTeams"),

    // Advanced permissions
    canViewAuditLogs: hasPermission("canViewAuditLogs"),
    canViewAllSessions: hasPermission("canViewAllSessions"),
    canManage2FA: hasPermission("canManage2FA"),
  };
};
