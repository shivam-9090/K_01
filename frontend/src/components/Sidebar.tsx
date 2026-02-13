import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
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

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const permissions = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const handleLogout = async () => {
    setShowLogoutAlert(true);
  };

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({
    to,
    icon: Icon,
    label,
    onClick,
  }: {
    to: string;
    icon: any;
    label: string;
    onClick?: () => void;
  }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={onClick}
        title={isCollapsed ? label : ""}
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
          active
            ? "bg-white text-black font-medium"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        } ${isCollapsed ? "justify-center" : ""}`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${active ? "text-black" : "text-current"}`}
        />
        {!isCollapsed && (
          <span
            className={`truncate ${active ? "text-black" : "text-current"}`}
          >
            {label}
          </span>
        )}
      </Link>
    );
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={toggleSidebar}>
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-[#09090b] border-r border-zinc-800 transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Header Section with Toggle */}
        <div className="p-4 flex items-center justify-between mb-4">
          <div
            className={`flex items-center ${isCollapsed ? "justify-center w-full" : "gap-3"}`}
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold tracking-tight text-white truncate">
                K_01
              </span>
            )}
          </div>

          {/* Collapse Toggle (Desktop) - Moved to Top Right */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button (Centred when collapsed) */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center mb-6">
            <button
              onClick={toggleCollapse}
              className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col h-full px-3 pb-4">
          <div className="space-y-1 flex-1">
            <NavItem
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              onClick={() => setIsOpen(false)}
            />

            {(permissions.canViewAllProjects ||
              (permissions.isEmployee && !permissions.canViewAllProjects)) && (
              <NavItem
                to="/projects"
                icon={FolderKanban}
                label={
                  permissions.canViewAllProjects ? "Projects" : "My Projects"
                }
                onClick={() => setIsOpen(false)}
              />
            )}

            {(permissions.canViewAllEmployees ||
              permissions.canViewAllTeams ||
              permissions.canManagePermissions) && (
              <NavItem
                to="/employees"
                icon={Users}
                label="Employees"
                onClick={() => setIsOpen(false)}
              />
            )}

            <NavItem
              to="/tasks"
              icon={CheckSquare}
              label={permissions.isBoss ? "Tasks" : "Daily Tasks"}
              onClick={() => setIsOpen(false)}
            />
          </div>

          {/* Footer Divider */}
          <div className="my-4 h-px bg-zinc-800" />

          {/* User Profile Section */}
          <div className="space-y-1">
            <NavItem
              to="/profile"
              icon={UserCircle}
              label="Profile"
              onClick={() => setIsOpen(false)}
            />

            <button
              onClick={handleLogout}
              title={isCollapsed ? "Logout" : ""}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${isCollapsed ? "justify-center" : ""}`}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>

            <div
              className={`mt-4 flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-2"}`}
            >
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium shrink-0 text-white border border-zinc-700">
                {user?.email?.[0].toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-white truncate">
                    {user?.email}
                  </span>
                  <span className="text-xs text-zinc-500 truncate capitalize">
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Alert Dialog */}
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
    </>
  );
};
