import React, { useState } from "react";
import { usePermissions } from "../hooks/usePermissions";

export const PermissionBadge: React.FC = () => {
  const permissions = usePermissions();
  const [isExpanded, setIsExpanded] = useState(false);

  if (permissions.isBoss) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm font-medium shadow-md">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z"
            clipRule="evenodd"
          />
        </svg>
        <span>BOSS - Full Access</span>
      </div>
    );
  }

  // Count active permissions for employee
  const activePermissions = [
    permissions.canCreateProject && "Create Project",
    permissions.canUpdateProject && "Update Project",
    permissions.canDeleteProject && "Delete Project",
    permissions.canViewAllProjects && "View All Projects",
    permissions.canCreateTask && "Create Task",
    permissions.canUpdateTask && "Update Task",
    permissions.canDeleteTask && "Delete Task",
    permissions.canCompleteTask && "Complete Task",
    permissions.canVerifyTask && "Verify Task",
    permissions.canViewAllTasks && "View All Tasks",
    permissions.canViewOverdueTasks && "View Overdue Tasks",
    permissions.canCreateEmployee && "Create Employee",
    permissions.canUpdateEmployee && "Update Employee",
    permissions.canDeleteEmployee && "Delete Employee",
    permissions.canViewAllEmployees && "View All Employees",
    permissions.canManagePermissions && "Manage Permissions",
    permissions.canCreateTeam && "Create Team",
    permissions.canUpdateTeam && "Update Team",
    permissions.canDeleteTeam && "Delete Team",
    permissions.canViewAllTeams && "View All Teams",
    permissions.canViewAuditLogs && "View Audit Logs",
    permissions.canViewAllSessions && "View All Sessions",
    permissions.canManage2FA && "Manage 2FA",
  ].filter(Boolean);

  const permissionCount = activePermissions.length;

  if (permissionCount === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>No Permissions</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>
          {permissionCount} Active Permission{permissionCount !== 1 ? "s" : ""}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Your Active Permissions
          </h3>
          <div className="space-y-2">
            {activePermissions.map((permission, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-2 rounded-lg"
              >
                <svg
                  className="w-4 h-4 text-green-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{permission}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
