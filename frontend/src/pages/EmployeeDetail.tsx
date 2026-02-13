import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../services/employee.service";
import { taskService } from "../services/task.service";
import { usePermissions } from "../hooks/usePermissions";
import { AccessDenied } from "../components/AccessDenied";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Briefcase,
  Award,
  Edit2,
  Save,
  X,
  Mail,
  Shield,
  Activity,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CardFooter } from "@/components/ui/card";

import { Task } from "@/types";

const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [attendance, setAttendance] = useState(0);

  // Fetch employee details
  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeeService.getById(id!),
    enabled: !!id,
  });

  // Fetch employee tasks
  const { data: tasks } = useQuery({
    queryKey: ["employee-tasks", id],
    queryFn: async () => {
      // Fetch a larger batch of tasks to filter client-side since backend filtering by assignee isn't exposed yet
      const response = await taskService.getAll(1, 100);
      const allTasks = response.data || [];
      // Filter to only show tasks assigned to THIS specific employee
      return allTasks.filter((task: Task) => task.assignedToIds?.includes(id!));
    },
    enabled: !!id,
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (newAttendance: number) => {
      return employeeService.updateAttendance(id!, newAttendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      setEditMode(false);
    },
  });

  React.useEffect(() => {
    if (employee) {
      setAttendance(employee.attendance || 0);
    }
  }, [employee]);

  if (!permissions.canViewAllEmployees && !permissions.canUpdateEmployee) {
    return (
      <AccessDenied
        requiredPermissions={["canViewAllEmployees", "canUpdateEmployee"]}
        message="You need at least one of the following permissions to view employee details."
      />
    );
  }

  if (loadingEmployee) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Employee not found</p>
          <Button onClick={() => navigate("/employees")} variant="outline">
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const completedTasks =
    tasks?.filter((t: Task) => t.status === "completed").length || 0;
  const pendingTasks =
    tasks?.filter(
      (t: Task) => t.status === "pending" || t.status === "in_progress",
    ).length || 0;

  // Calculate missed tasks more accurately
  const missedTasks =
    tasks?.filter((t: Task) => {
      if (t.status === "completed") return false;
      // Note: Task interface uses closeDate for due date usually
      const dueDate = t.closeDate;
      if (!dueDate) return false;
      return new Date(dueDate) < new Date();
    }).length || 0;

  const totalTasks = tasks?.length || 0;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projects = tasks
    ? [...new Set(tasks.map((t: Task) => t.projectId).filter(Boolean))]
    : [];
  const liveProjects = projects.length;

  // Chart Data Preparation
  const radarChartData = [
    { month: "January", points: 186, fill: "var(--color-points)" },
    { month: "February", points: 305, fill: "var(--color-points)" },
    { month: "March", points: 237, fill: "var(--color-points)" },
    { month: "April", points: 273, fill: "var(--color-points)" },
    { month: "May", points: 209, fill: "var(--color-points)" },
    { month: "June", points: 214, fill: "var(--color-points)" },
  ];

  const radarChartConfig = {
    points: {
      label: "Points",
      color: "hsl(217, 91%, 60%)", // Blue
    },
  } satisfies ChartConfig;

  // Pie chart data derived from real stats
  const pieChartData = [
    {
      status: "completed",
      count: completedTasks,
      fill: "var(--color-completed)",
    },
    {
      status: "pending",
      count: pendingTasks,
      fill: "var(--color-pending)",
    },
    {
      status: "missed",
      count: missedTasks,
      fill: "var(--color-missed)",
    },
  ];

  // If no data, provide a placeholder or it will just be empty
  if (totalTasks === 0) {
    // Optional: Handle empty state if needed
  }

  const pieChartConfig = {
    count: {
      label: "Tasks",
    },
    completed: {
      label: "Completed",
      color: "hsl(142, 71%, 45%)", // Green
    },
    pending: {
      label: "Pending",
      color: "hsl(45, 93%, 47%)", // Yellow
    },
    missed: {
      label: "Missed",
      color: "hsl(0, 84%, 60%)", // Red
    },
  } satisfies ChartConfig;

  // Mock Achievements Logic
  const hasPerfectAttendance = (employee.attendance || 0) > 30;
  const isTopPerformer = completionRate > 80 && totalTasks > 5;
  const isVeteran = totalTasks > 50;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/employees")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-border">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {employee.name?.charAt(0).toUpperCase() ||
                    employee.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  {employee.name || employee.email?.split("@")[0]}
                  <Badge
                    variant={employee.isActive ? "default" : "secondary"}
                    className={cn(
                      "ml-2 text-xs font-medium px-2 py-0.5",
                      employee.isActive
                        ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20"
                        : "bg-gray-500/15 text-gray-600",
                    )}
                  >
                    {employee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {employee.email}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="flex items-center gap-1.5 uppercase text-xs font-semibold tracking-wider">
                    <Shield className="h-3.5 w-3.5" />
                    {employee.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Grid: Stats & Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Task Statistics */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Task Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Completed
                  </span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {completedTasks}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" /> Pending
                  </span>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {pendingTasks}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" /> Missed
                  </span>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">
                    {missedTasks}
                  </span>
                </div>

                <Separator />
                <div className="flex justify-between items-center pt-1 px-1">
                  <span className="text-sm text-muted-foreground">
                    Total Assigned
                  </span>
                  <span className="text-lg font-bold">{totalTasks}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Attendance
                </CardTitle>
                {!editMode && permissions.canUpdateEmployee && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditMode(true)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={attendance}
                        onChange={(e) => setAttendance(Number(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          updateAttendanceMutation.mutate(attendance)
                        }
                        disabled={updateAttendanceMutation.isPending}
                      >
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        onClick={() => {
                          setEditMode(false);
                          setAttendance(employee.attendance || 0);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <div className="text-5xl font-bold text-primary mb-1 tracking-tighter">
                      {employee.attendance || 0}
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      Days Present
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Performance Analytics */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Performance Analytics
                </CardTitle>
                <CardDescription>Task completion breakdown</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center gap-8">
                {/* Overall Completion Rate */}
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2 tracking-tighter">
                    {completionRate}%
                  </div>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                    Completion Rate
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">
                        {completedTasks} tasks
                      </span>
                    </div>
                    <Progress
                      value={
                        totalTasks ? (completedTasks / totalTasks) * 100 : 0
                      }
                      className="h-2 bg-muted/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="font-medium">{pendingTasks} tasks</span>
                    </div>
                    <Progress
                      value={totalTasks ? (pendingTasks / totalTasks) * 100 : 0}
                      className="h-2 bg-muted/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Missed</span>
                      <span className="font-medium">{missedTasks} tasks</span>
                    </div>
                    <Progress
                      value={totalTasks ? (missedTasks / totalTasks) * 100 : 0}
                      className="h-2 bg-muted/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Achievements & Projects */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasPerfectAttendance && (
                  <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="p-2 bg-green-500 rounded-full text-white">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400">
                        Perfect Attendance
                      </h4>
                      <p className="text-xs text-green-600/80 dark:text-green-400/80">
                        30+ days present
                      </p>
                    </div>
                  </div>
                )}

                {isTopPerformer && (
                  <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="p-2 bg-blue-500 rounded-full text-white">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                        Top Performer
                      </h4>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                        80%+ completion rate
                      </p>
                    </div>
                  </div>
                )}

                {isVeteran && (
                  <div className="flex items-center gap-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="p-2 bg-purple-500 rounded-full text-white">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400">
                        Elite Contributor
                      </h4>
                      <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
                        50+ tasks completed
                      </p>
                    </div>
                  </div>
                )}

                {!hasPerfectAttendance && !isTopPerformer && !isVeteran && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No badges earned yet.</p>
                    <p className="text-xs mt-1">Consistency is key!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {employee.skills && employee.skills.length > 0 ? (
                    employee.skills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No skills listed.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-500" />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Active Projects
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-base px-2"
                    >
                      {liveProjects}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar Chart: Progression */}
          <Card>
            <CardHeader className="items-center pb-4">
              <CardTitle>Performance Progression</CardTitle>
              <CardDescription>
                Showing monthly performance scores
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
              <ChartContainer
                config={radarChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <RadarChart data={radarChartData}>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <PolarAngleAxis dataKey="month" />
                  <PolarGrid />
                  <Radar
                    dataKey="points"
                    fill="var(--color-points)"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 leading-none font-medium">
                Trending up by 5.2% this month{" "}
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="text-muted-foreground flex items-center gap-2 leading-none">
                January - June 2024
              </div>
            </CardFooter>
          </Card>

          {/* Pie Chart: Task Distribution */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>Task Distribution</CardTitle>
              <CardDescription>Overall task status breakdown</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={pieChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={pieChartData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="leading-none text-muted-foreground">
                Showing total tasks distribution
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Bottom Section: Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-1">
                {tasks.slice(0, 5).map((task: Task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors border-b last:border-0 border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          task.status === "completed"
                            ? "bg-green-500"
                            : task.status === "in_progress"
                              ? "bg-blue-500"
                              : "bg-yellow-500",
                        )}
                      />
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.project?.title || "Unknown Project"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "outline"
                          : task.priority === "High"
                            ? "destructive"
                            : task.status === "in_progress"
                              ? "default"
                              : "secondary"
                      }
                      className={cn(
                        "text-xs capitalize",
                        task.status === "completed" &&
                          "border-green-500 text-green-600 bg-green-500/10",
                      )}
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="link"
                      className="text-xs text-muted-foreground"
                      onClick={() => navigate("/tasks")}
                    >
                      View all {tasks.length} tasks
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No tasks assigned to this employee.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDetail;
