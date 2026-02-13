import React from "react";
import { usePermissions } from "../hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

export const EmptyPermissionsState: React.FC = () => {
  const permissions = usePermissions();

  // Check if user has any permissions
  const hasAnyPermission =
    permissions.canCreateProject ||
    permissions.canUpdateProject ||
    permissions.canDeleteProject ||
    permissions.canViewAllProjects ||
    permissions.canCreateTask ||
    permissions.canUpdateTask ||
    permissions.canDeleteTask ||
    permissions.canCompleteTask ||
    permissions.canVerifyTask ||
    permissions.canViewAllTasks ||
    permissions.canViewOverdueTasks ||
    permissions.canCreateEmployee ||
    permissions.canUpdateEmployee ||
    permissions.canDeleteEmployee ||
    permissions.canViewAllEmployees ||
    permissions.canManagePermissions ||
    permissions.canCreateTeam ||
    permissions.canUpdateTeam ||
    permissions.canDeleteTeam ||
    permissions.canViewAllTeams ||
    permissions.canViewAuditLogs ||
    permissions.canViewAllSessions ||
    permissions.canManage2FA;

  // Don't show for BOSS or if user has permissions
  if (permissions.isBoss || hasAnyPermission) {
    return null;
  }

  return (
    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 border-l-4 border-l-blue-500 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <ShieldAlert className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Limited Access - No Special Permissions Granted
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                You currently have basic employee access. Here's what you can
                do:
              </p>
            </div>

            <ul className="grid gap-2 text-blue-800 dark:text-blue-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                View and complete tasks assigned to you
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                View projects where you have assigned tasks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                Update your profile and settings
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                View your dashboard and employee information
              </li>
            </ul>

            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Need more access?</strong> Contact your company owner
                  to request additional permissions. They can grant you
                  permissions like creating projects, managing tasks, viewing
                  all employees, and more.
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
