import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useDashboardStats } from "../hooks/useDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CheckSquare,
  Users,
  User,
  Building2,
  Shield,
  CalendarCheck,
} from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back,{" "}
            <span className="font-semibold text-foreground">{user?.email}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <DashboardCharts />

        {/* Projects Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {isLoading ? "..." : stats?.totalProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground mb-4 h-10">
              {permissions.canViewAllProjects
                ? "Manage your company projects"
                : permissions.isEmployee
                  ? "View projects with your assigned tasks"
                  : "Project management"}
            </p>
            {(permissions.canViewAllProjects ||
              (permissions.isEmployee && !permissions.canViewAllProjects)) && (
              <Button asChild className="w-full" variant="outline">
                <Link
                  to={
                    permissions.canViewAllProjects
                      ? "/projects"
                      : "/my-projects"
                  }
                >
                  View Projects
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {isLoading ? "..." : stats?.totalTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mb-4 h-10">
              {permissions.isBoss
                ? "Manage and assign tasks"
                : permissions.canViewAllTasks
                  ? "View and manage all company tasks"
                  : "View your assigned tasks"}
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/tasks">View Tasks</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Employees Card */}
        {permissions.canViewAllEmployees && (
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {isLoading ? "..." : stats?.totalEmployees || 0}
              </div>
              <p className="text-xs text-muted-foreground mb-4 h-10">
                {permissions.canCreateEmployee ||
                permissions.canUpdateEmployee ||
                permissions.canDeleteEmployee
                  ? "Manage team members"
                  : "View team members"}
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link to="/employees">View Employees</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">Profile</div>
            <p className="text-xs text-muted-foreground mb-4 h-10">
              Update your profile settings
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/profile">View Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {permissions.isBoss && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <span className="text-muted-foreground w-32">Company:</span>
              <span className="font-medium text-foreground">
                {user?.company?.name || "N/A"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground w-32">Role:</span>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {user?.role}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground w-32">Status:</span>
              <span className="inline-block px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                Active
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {permissions.isEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-muted-foreground block mb-2">Skills:</span>
              <div className="flex flex-wrap gap-2">
                {user?.skills && user.skills.length > 0 ? (
                  user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium border border-border"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No skills added
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground w-32">Attendance:</span>
              <span className="flex items-center gap-2 font-medium text-foreground">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                {user?.attendance || 0} days
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
