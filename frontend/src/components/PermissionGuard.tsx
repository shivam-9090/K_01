import React from "react";
import { usePermissions } from "../hooks/usePermissions";
import { AccessDenied } from "./AccessDenied";

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean; // If true, user needs ALL permissions; if false, needs ANY
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * PermissionGuard Component
 *
 * Wraps components that require specific permissions.
 * Shows loading state while checking permissions.
 * Shows AccessDenied if user lacks required permissions.
 * Renders children if user has required permissions.
 *
 * Usage:
 * <PermissionGuard requiredPermission="canViewAllEmployees">
 *   <EmployeesList />
 * </PermissionGuard>
 *
 * <PermissionGuard requiredPermissions={["canUpdateEmployee", "canViewAllEmployees"]} requireAll={false}>
 *   <EmployeeDetail />
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
  loadingComponent,
}) => {
  const permissions = usePermissions();

  // Show loading state
  if (permissions.isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      )
    );
  }

  // BOSS always has access
  if (permissions.isBoss) {
    return <>{children}</>;
  }

  // Check single permission
  if (requiredPermission) {
    const hasAccess = permissions.hasPermission(
      requiredPermission as keyof typeof permissions.user,
    );

    if (!hasAccess) {
      return (
        fallback || (
          <AccessDenied
            requiredPermission={requiredPermission}
            message={`You need the ${requiredPermission} permission to access this feature.`}
          />
        )
      );
    }
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? permissions.hasAllPermissions(
          ...(requiredPermissions as Array<keyof typeof permissions.user>),
        )
      : permissions.hasAnyPermission(
          ...(requiredPermissions as Array<keyof typeof permissions.user>),
        );

    if (!hasAccess) {
      return (
        fallback || (
          <AccessDenied
            requiredPermissions={requiredPermissions}
            message={
              requireAll
                ? "You need all of the following permissions to access this feature."
                : "You need at least one of the following permissions to access this feature."
            }
          />
        )
      );
    }
  }

  // User has required permissions
  return <>{children}</>;
};

/**
 * PermissionButton Component
 *
 * Conditionally renders a button based on permissions.
 * Shows disabled state or hides button if user lacks permission.
 */
export const PermissionButton: React.FC<{
  requiredPermission: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  hideIfNoPermission?: boolean;
  showTooltip?: boolean;
}> = ({
  requiredPermission,
  onClick,
  children,
  className = "",
  hideIfNoPermission = false,
  showTooltip = true,
}) => {
  const permissions = usePermissions();

  const hasPermission = permissions.hasPermission(
    requiredPermission as keyof typeof permissions.user,
  );

  // Hide button completely if configured
  if (!hasPermission && hideIfNoPermission) {
    return null;
  }

  // Show disabled button with tooltip
  if (!hasPermission) {
    return (
      <div className="relative group inline-block">
        <button
          disabled
          className={`${className} opacity-50 cursor-not-allowed`}
          title={
            showTooltip
              ? `You need ${requiredPermission} permission`
              : undefined
          }
        >
          {children}
        </button>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Permission required: {requiredPermission}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show enabled button
  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
};
