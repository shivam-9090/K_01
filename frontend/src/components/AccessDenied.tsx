import React from "react";

interface AccessDeniedProps {
  requiredPermission?: string;
  requiredPermissions?: string[];
  message?: string;
  showContactInfo?: boolean;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredPermission,
  requiredPermissions,
  message,
  showContactInfo = true,
}) => {
  const getPermissionLabel = (permission: string): string => {
    const labels: { [key: string]: string } = {
      canViewAllEmployees: "View All Employees",
      canViewAllProjects: "View All Projects",
      canViewAllTasks: "View All Tasks",
      canCreateProject: "Create Projects",
      canUpdateProject: "Update Projects",
      canDeleteProject: "Delete Projects",
      canCreateTask: "Create Tasks",
      canUpdateTask: "Update Tasks",
      canDeleteTask: "Delete Tasks",
      canCompleteTask: "Complete Tasks",
      canVerifyTask: "Verify Tasks",
      canViewOverdueTasks: "View Overdue Tasks",
      canCreateEmployee: "Create Employees",
      canUpdateEmployee: "Update Employees",
      canDeleteEmployee: "Delete Employees",
      canManagePermissions: "Manage Permissions",
      canCreateTeam: "Create Teams",
      canUpdateTeam: "Update Teams",
      canDeleteTeam: "Delete Teams",
      canViewAllTeams: "View All Teams",
      canViewAuditLogs: "View Audit Logs",
      canViewAllSessions: "View All Sessions",
      canManage2FA: "Manage 2FA",
    };
    return labels[permission] || permission;
  };

  const getResourceIcon = () => {
    if (requiredPermission || requiredPermissions) {
      if (
        requiredPermission?.includes("Employee") ||
        requiredPermissions?.some((p) => p.includes("Employee"))
      ) {
        return "👥";
      }
      if (
        requiredPermission?.includes("Project") ||
        requiredPermissions?.some((p) => p.includes("Project"))
      ) {
        return "📊";
      }
      if (
        requiredPermission?.includes("Task") ||
        requiredPermissions?.some((p) => p.includes("Task"))
      ) {
        return "✓";
      }
      if (
        requiredPermission?.includes("Team") ||
        requiredPermissions?.some((p) => p.includes("Team"))
      ) {
        return "👥";
      }
    }
    return "🔒";
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-red-500">
          {/* Icon */}
          <div className="text-6xl text-center mb-4">{getResourceIcon()}</div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">
            {message || "You don't have permission to access this resource."}
          </p>

          {/* Required Permissions */}
          {(requiredPermission || requiredPermissions) && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    Required Permission{requiredPermissions ? "s" : ""}:
                  </p>
                  <ul className="space-y-1">
                    {requiredPermission && (
                      <li className="text-sm text-red-700 font-medium">
                        • {getPermissionLabel(requiredPermission)}
                      </li>
                    )}
                    {requiredPermissions &&
                      requiredPermissions.map((perm) => (
                        <li
                          key={perm}
                          className="text-sm text-red-700 font-medium"
                        >
                          • {getPermissionLabel(perm)}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {showContactInfo && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    Need Access?
                  </p>
                  <p className="text-sm text-blue-700">
                    Contact your <strong>company owner</strong> to request this
                    permission. They can grant you access through the Employees
                    → Manage Permissions page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Go Back
            </button>

            <a
              href="/dashboard"
              className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-center"
            >
              Go to Dashboard
            </a>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            You can still access:{" "}
            <a href="/tasks" className="text-blue-600 hover:underline">
              Your Tasks
            </a>
            {" • "}
            <a href="/profile" className="text-blue-600 hover:underline">
              Your Profile
            </a>
            {" • "}
            <a href="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
