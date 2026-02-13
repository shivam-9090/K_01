import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from "../hooks/useProjects";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "../schemas/validation";
import { useAuthStore } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { Spinner } from "../components/ui/spinner";
import teamService from "../services/team.service";
import { authService } from "../services/auth.service";
import type { GitHubRepository } from "../types";
import { format } from "date-fns";

// Shadcn UI Components
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { CustomCalendar as Calendar } from "../components/ui/custom-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "../components/ui/card";
import {
  Eye,
  Edit2,
  Trash2,
  Users,
  Github,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "../lib/utils";

// Helper for date formatting
const formatDate = (dateString: string | Date) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Projects: React.FC = () => {
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(
    null,
  );

  const { data: projects, isLoading, error } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const updateMutation = useUpdateProject();

  // Fetch teams for selection
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => teamService.getAllTeams(),
    enabled: permissions.canViewAllTeams || permissions.isBoss,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      startDate: new Date().toISOString().split("T")[0], // Default to today
    },
  });

  // Edit form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    control: controlEdit,
    formState: { errors: editErrors },
    reset: resetEdit,
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });

  // Handle Escape key to close modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showModal) setShowModal(false);
        if (showEditModal) {
          setShowEditModal(false);
          setEditingProject(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, showEditModal]);

  const fetchGithubRepos = async () => {
    try {
      setLoadingRepos(true);
      const repos = await authService.getGitHubRepositories();
      setGithubRepos(repos || []); // Ensure array
    } catch (error) {
      setGithubRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      const projectData = {
        ...data,
        teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
        githubRepoName: selectedRepo?.fullName,
        githubRepoUrl: selectedRepo?.url,
        githubRepoBranch: selectedRepo?.defaultBranch,
      };
      await createMutation.mutateAsync(projectData);
      reset();
      setShowModal(false);
      setSelectedRepo(null);
      setSelectedTeamIds([]);
    } catch (error) {}
  };

  const onUpdate = async (data: CreateProjectInput) => {
    if (!editingProject) return;

    try {
      const projectData = {
        ...data,
        teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
        githubRepoName: selectedRepo?.fullName,
        githubRepoUrl: selectedRepo?.url,
        githubRepoBranch: selectedRepo?.defaultBranch,
      };
      await updateMutation.mutateAsync({
        id: editingProject.id,
        data: projectData,
      });
      setShowEditModal(false);
      setEditingProject(null);
      resetEdit();
    } catch (error) {}
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"; // Usually primary color
      case "completed":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-lg">
        Error loading projects. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {permissions.isBoss ? "Projects" : "My Projects"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {permissions.canViewAllProjects
              ? "Manage and track all company projects"
              : "Projects assigned to you"}
          </p>
        </div>
        {permissions.canCreateProject && (
          <Button
            onClick={() => {
              reset({
                title: "",
                description: "",
                source: "",
                startDate: new Date().toISOString().split("T")[0],
                closeDate: "",
              });
              setSelectedTeamIds([]);
              setSelectedRepo(null);
              setShowModal(true);
            }}
            size="lg"
            className="shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.projects?.map((project: any) => (
          <Card
            key={project.id}
            className="flex flex-col h-full hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
          >
            {/* Decorative gradient blob */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                  <CardTitle
                    className="text-xl line-clamp-1"
                    title={project.title}
                  >
                    {project.title}
                  </CardTitle>
                  <div className="h-5 flex items-center text-xs text-muted-foreground">
                    {project.githubRepoName && (
                      <>
                        <Github className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {project.githubRepoName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant={getStatusVariant(project.status)}>
                  {project.status}
                </Badge>
              </div>

              <div className="h-10">
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-6">
              {/* Teams List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Teams
                </p>
                <div className="h-6 flex items-center">
                  {project.teams && project.teams.length > 0 ? (
                    <div className="flex gap-2 overflow-hidden w-full">
                      {project.teams.map((team: any) => (
                        <Badge
                          key={team.team?.id || team.teamId || team.id}
                          variant="secondary"
                          className="font-normal whitespace-nowrap flex-shrink-0"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {team.team?.name || team.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No teams assigned
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Timeline
                </p>
                <div className="flex items-center text-sm">
                  <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                  <span>
                    {project.startDate ? formatDate(project.startDate) : "TBD"}
                    {project.closeDate
                      ? ` - ${formatDate(project.closeDate)}`
                      : ""}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 border-t bg-muted/40 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/projects/${project.id}`);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>

              {permissions.canUpdateProject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProject(project);
                    resetEdit({
                      title: project.title,
                      description: project.description,
                      status: project.status,
                      startDate: project.startDate
                        ? new Date(project.startDate)
                            .toISOString()
                            .split("T")[0]
                        : undefined,
                      closeDate: project.closeDate
                        ? new Date(project.closeDate)
                            .toISOString()
                            .split("T")[0]
                        : undefined,
                    });
                    setSelectedTeamIds(
                      project.teams
                        ?.map((t: any) => t.team?.id || t.teamId || t.id)
                        .filter(Boolean) || [],
                    );
                    setSelectedRepo(
                      project.githubRepoName
                        ? ({
                            fullName: project.githubRepoName,
                            // Provide minimal mock required for selection matching and UI
                            id: 0,
                            name: project.githubRepoName,
                            url: project.githubRepoUrl || "",
                            defaultBranch: project.githubRepoBranch || "",
                            description: null,
                            private: false,
                          } as any)
                        : null,
                    );
                    setShowEditModal(true);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}

              {permissions.canDeleteProject && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-shrink-0 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-card border text-card-foreground rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/20 flex-shrink-0">
              <h2 className="text-xl font-bold">Create New Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Title</label>
                <input
                  type="text"
                  {...register("title")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Website Redesign"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Brief description of the project..."
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium">Start Date</label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value + "T00:00:00"), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            selected={
                              field.value
                                ? new Date(field.value + "T00:00:00")
                                : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                            disabled={(date) => date < new Date("1900-01-01")}
                            fromYear={2000}
                            toYear={2100}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium">
                    Close Date (Opt)
                  </label>
                  <Controller
                    control={control}
                    name="closeDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value + "T00:00:00"), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            selected={
                              field.value
                                ? new Date(field.value + "T00:00:00")
                                : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                            disabled={(date) => date < new Date("1900-01-01")}
                            fromYear={2000}
                            toYear={2100}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </div>

              {/* GitHub Repo Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  GitHub Repository (Optional)
                </label>
                {!user?.githubUsername ? (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border">
                    Connect your GitHub account in profile settings to link
                    repositories.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!githubRepos.length && !loadingRepos && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchGithubRepos}
                        className="w-full"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        Load Repositories
                      </Button>
                    )}

                    {loadingRepos && (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        <Spinner className="w-4 h-4 inline mr-2" /> Loading...
                      </div>
                    )}

                    {githubRepos.length > 0 && (
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => {
                          const repo = githubRepos.find(
                            (r) => r.fullName === e.target.value,
                          );
                          setSelectedRepo(repo || null);
                        }}
                        value={selectedRepo?.fullName || ""}
                      >
                        <option value="">Select a repository...</option>
                        {githubRepos.map((repo) => (
                          <option key={repo.id} value={repo.fullName}>
                            {repo.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Team Selection */}
              {(permissions.canViewAllTeams || permissions.isBoss) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign Teams</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 border rounded-lg bg-muted/20">
                    {teams?.map((team: any) => (
                      <label
                        key={team.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          value={team.id}
                          checked={selectedTeamIds.includes(team.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamIds([...selectedTeamIds, team.id]);
                            } else {
                              setSelectedTeamIds(
                                selectedTeamIds.filter((id) => id !== team.id),
                              );
                            }
                          }}
                          className="rounded border-primary text-primary focus:ring-ring h-4 w-4"
                        />
                        <span className="text-sm font-medium">{team.name}</span>
                      </label>
                    ))}
                    {!teams?.length && (
                      <p className="text-sm text-muted-foreground italic">
                        No teams available
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-2" />
                  ) : null}
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => {
            setShowEditModal(false);
            setEditingProject(null);
          }}
        >
          <div
            className="bg-card border text-card-foreground rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/20 flex-shrink-0">
              <h2 className="text-xl font-bold">Edit Project</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmitEdit(onUpdate)}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Title</label>
                <input
                  type="text"
                  {...registerEdit("title")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {editErrors.title && (
                  <p className="text-sm text-destructive">
                    {editErrors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  {...registerEdit("description")}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
                {editErrors.description && (
                  <p className="text-sm text-destructive">
                    {editErrors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium">Start Date</label>
                  <Controller
                    control={controlEdit}
                    name="startDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value + "T00:00:00"), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            selected={
                              field.value
                                ? new Date(field.value + "T00:00:00")
                                : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                            disabled={(date) => date < new Date("1900-01-01")}
                            fromYear={2000}
                            toYear={2100}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {editErrors.startDate && (
                    <p className="text-sm text-destructive">
                      {editErrors.startDate?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium">
                    Close Date (Opt)
                  </label>
                  <Controller
                    control={controlEdit}
                    name="closeDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value + "T00:00:00"), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            selected={
                              field.value
                                ? new Date(field.value + "T00:00:00")
                                : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                            disabled={(date) => date < new Date("1900-01-01")}
                            fromYear={2000}
                            toYear={2100}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  {...registerEdit("status")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* GitHub Repo Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  GitHub Repository (Optional)
                </label>
                {!user?.githubUsername ? (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border">
                    Connect your GitHub account in profile settings to link
                    repositories.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!githubRepos.length && !loadingRepos && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchGithubRepos}
                        className="w-full"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        Load Repositories
                      </Button>
                    )}

                    {loadingRepos && (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        <Spinner className="w-4 h-4 inline mr-2" /> Loading...
                      </div>
                    )}

                    {(githubRepos.length > 0 || selectedRepo) && (
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => {
                          const repo = githubRepos.find(
                            (r) => r.fullName === e.target.value,
                          );
                          setSelectedRepo(repo || null);
                        }}
                        value={selectedRepo?.fullName || ""}
                      >
                        <option value="">Select a repository...</option>
                        {githubRepos.map((repo) => (
                          <option key={repo.id} value={repo.fullName}>
                            {repo.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Team Selection */}
              {(permissions.canViewAllTeams || permissions.isBoss) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign Teams</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 border rounded-lg bg-muted/20">
                    {teams?.map((team: any) => (
                      <label
                        key={team.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          value={team.id}
                          checked={selectedTeamIds.includes(team.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamIds([...selectedTeamIds, team.id]);
                            } else {
                              setSelectedTeamIds(
                                selectedTeamIds.filter((id) => id !== team.id),
                              );
                            }
                          }}
                          className="rounded border-primary text-primary focus:ring-ring h-4 w-4"
                        />
                        <span className="text-sm font-medium">{team.name}</span>
                      </label>
                    ))}
                    {!teams?.length && (
                      <p className="text-sm text-muted-foreground italic">
                        No teams available
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
