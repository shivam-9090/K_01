import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const permissions = usePermissions();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const handleLogout = async () => {
    setShowLogoutAlert(true);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-card shadow-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/dashboard"
            className="text-xl font-bold text-primary hover:text-primary/90 transition"
          >
            Task Management
          </Link>

          <div className="flex items-center space-x-1">
            <Link
              to="/dashboard"
              className={`px-4 py-2 rounded-lg font-medium transition ${
                isActive("/dashboard")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Dashboard
            </Link>

            {permissions.canViewAllProjects && (
              <Link
                to="/projects"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive("/projects")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Projects
              </Link>
            )}

            {(permissions.canViewAllEmployees ||
              permissions.canViewAllTeams ||
              permissions.canManagePermissions) && (
              <Link
                to="/employees"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive("/employees")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Employees
              </Link>
            )}

            <Link
              to="/tasks"
              className={`px-4 py-2 rounded-lg font-medium transition ${
                isActive("/tasks")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {permissions.isBoss ? "Tasks" : "Daily Tasks"}
            </Link>

            {permissions.isEmployee && !permissions.canViewAllProjects && (
              <Link
                to="/projects"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive("/projects")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                My Projects
              </Link>
            )}

            <Link
              to="/profile"
              className={`px-4 py-2 rounded-lg font-medium transition ${
                isActive("/profile")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Profile
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await logout();
                setShowLogoutAlert(false);
              }}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};
