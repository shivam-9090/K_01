import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectService } from "../services/project.service";
import { ProjectChat } from "../components/ProjectChat";
import { CommitsTabNew as CommitsTab } from "../components/CommitsTabNew";
import { format, addMonths, subMonths, isSameMonth } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layout,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.getProjectById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Button>
      </div>
    );
  }

  const startDate = new Date(project.startDate);
  const endDate = project.closeDate ? new Date(project.closeDate) : null;

  const calculateProgress = () => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completed = project.tasks.filter(
      (t: any) => t.status === "completed",
    ).length;
    return Math.round((completed / project.tasks.length) * 100);
  };

  const statusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "text-red-500 bg-red-500/10";
      case "medium":
        return "text-orange-500 bg-orange-500/10";
      case "low":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-zinc-500 bg-zinc-500/10";
    }
  };

  // Filter tasks for the timeline based on current month
  const timelineTasks =
    project.tasks
      ?.filter((task: any) => {
        const taskDate = new Date(task.startDate);
        return isSameMonth(taskDate, currentMonth);
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ) || [];

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="pl-0 hover:bg-transparent hover:text-primary mb-2"
            onClick={() => navigate("/projects")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {project.title}
            </h1>
            <Badge
              variant={statusVariant(project.status) as any}
              className="capitalize px-3 py-1"
            >
              {project.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground">Project Details & Timeline</p>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="details">Project Details</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="chat">Team Chat</TabsTrigger>
        </TabsList>

        {/* Project Details Tab */}
        <TabsContent value="details" className="space-y-8">
          {/* Top Overview Card */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </span>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary/70" />
                    <span className="font-semibold">
                      {format(startDate, "MM/dd/yyyy")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    End Date
                  </span>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary/70" />
                    <span className="font-semibold">
                      {endDate ? format(endDate, "MM/dd/yyyy") : "Ongoing"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Tasks
                  </span>
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary/70" />
                    <span className="font-semibold text-2xl">
                      {project.tasks?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm font-bold">
                      {calculateProgress()}%
                    </span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>
              </div>

              <Separator className="my-8" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-3">
                  <span className="text-sm font-medium text-muted-foreground block">
                    Description
                  </span>
                  <p className="text-base leading-relaxed text-foreground/90">
                    {project.description ||
                      "No description provided for this project."}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-sm font-medium text-muted-foreground block">
                    Source
                  </span>
                  <div className="bg-muted/50 p-3 rounded-md border border-border/50 text-sm font-medium inline-block">
                    {project.source || "Internal Request"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Tasks Section */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 bg-muted/20 border-b">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">
                  Project Timeline & Tasks
                </CardTitle>
                <div className="h-4 w-px bg-border mx-2" />
                <span className="text-sm text-muted-foreground font-normal">
                  {timelineTasks.length} tasks in {format(currentMonth, "MMMM")}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-background rounded-md border shadow-sm p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {timelineTasks.length > 0 ? (
                <div className="relative">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-24 top-0 bottom-0 w-px bg-border/60 hidden md:block" />

                  <div className="flex flex-col">
                    {timelineTasks.map((task: any) => {
                      const taskDate = new Date(task.startDate);
                      return (
                        <div
                          key={task.id}
                          className="group flex flex-col md:flex-row hover:bg-muted/30 transition-colors border-b last:border-0 relative"
                        >
                          {/* Date Column */}
                          <div className="md:w-24 p-4 md:py-6 flex md:flex-col items-center md:items-end justify-start gap-1 md:gap-0 md:pr-6 text-muted-foreground shrink-0">
                            <span className="text-2xl font-bold text-foreground">
                              {format(taskDate, "dd")}
                            </span>
                            <span className="text-xs uppercase tracking-wider font-medium">
                              {format(taskDate, "EEE")}
                            </span>
                          </div>

                          {/* Timeline Dot */}
                          <div className="hidden md:flex absolute left-24 top-8 -translate-x-1/2 items-center justify-center w-3 h-3 rounded-full border-2 border-background bg-primary z-10 shadow-sm group-hover:scale-125 transition-transform" />

                          {/* Task Content */}
                          <div className="flex-1 p-4 md:py-6 md:pl-8">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <h3 className="font-semibold text-base group-hover:text-primary transition-colors flex items-center gap-2">
                                  {task.title}
                                  {task.status === "completed" && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  )}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 md:w-3/4">
                                  {task.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs font-normal",
                                      getPriorityColor(task.priority),
                                    )}
                                  >
                                    {task.priority || "Normal"} Priority
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-normal lowercase bg-secondary/50"
                                  >
                                    {task.taskType}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.closeDate
                                      ? `Due ${format(new Date(task.closeDate), "MMM dd")}`
                                      : "No deadline"}
                                  </span>
                                </div>
                              </div>

                              {/* Assignees */}
                              <div className="flex -space-x-2 shrink-0">
                                {task.assignedTo?.map(
                                  (assignee: any, i: number) => (
                                    <Avatar
                                      key={i}
                                      className="h-8 w-8 border-2 border-background ring-1 ring-border/20"
                                    >
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {assignee.name?.[0] || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <CalendarIcon className="h-8 w-8 opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">
                    No tasks scheduled
                  </h3>
                  <p className="text-sm max-w-xs mt-1">
                    There are no tasks scheduled for{" "}
                    {format(currentMonth, "MMMM yyyy")}. Try checking other
                    months.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commits">
          <CommitsTab
            repoFullName={project.githubRepoName || ""}
            branch={project.githubRepoBranch || undefined}
          />
        </TabsContent>

        <TabsContent value="chat">
          <ProjectChat projectId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
