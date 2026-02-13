import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBoss?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireBoss = false,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireBoss && user?.role !== "BOSS") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            This page is only accessible to BOSS users.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
