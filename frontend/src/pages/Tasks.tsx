import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTasks, useCreateTask, useDeleteTask } from "../hooks/useTasks";
import { useProjects } from "../hooks/useProjects";
import { useSuggestEmployees } from "../hooks/useEmployees";
import { useDebounce } from "../hooks/useDebounce";
import { createTaskSchema, type CreateTaskInput } from "../schemas/validation";
import { ReusablePagination } from "../components/ReusablePagination";
import { useAuthStore } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { Spinner } from "../components/ui/spinner";
import { CustomCalendar as Calendar } from "../components/ui/custom-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ListTodo,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Map,
  GitCommit,
  Clock,
  Briefcase,
  User,
} from "lucide-react";
import { cn } from "../lib/utils";
import { taskService } from "../services/task.service";
import { CommitSelectorModal } from "../components/CommitSelectorModal";
import { TaskRoadmapView } from "../components/TaskRoadmapView";
import type { Task } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Label } from "../components/ui/label";

const TASK_TYPES = [
  "frontend",
  "backend",
  "ai/ml",
  "devops",
  "mobile",
  "testing",
  "database",
  "ui/ux",
  "other",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const PAGE_SIZES = [10, 20, 50, 100];

const Tasks: React.FC = () => {
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Filter & Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const debouncedSearch = useDebounce(search, 500);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showRoadmapView, setShowRoadmapView] = useState(false);
  const [selectedTaskForCommit, setSelectedTaskForCommit] =
    useState<Task | null>(null);
  const [selectedTaskForRoadmap, setSelectedTaskForRoadmap] =
    useState<Task | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Create Task Form State
  const [createTaskType, setCreateTaskType] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300);

  // Data Fetching
  const {
    data: taskResponse,
    isLoading,
    isPreviousData,
  } = useTasks(
    page,
    limit,
    sortBy,
    filterBy === "all" ? undefined : filterBy,
    debouncedSearch,
  );

  const tasks = taskResponse?.data || [];
  const meta = taskResponse?.meta;

  const { data: projects } = useProjects();
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();

  const { data: suggestedEmployees } = useSuggestEmployees(
    createTaskType,
    debouncedEmployeeSearch,
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
  });

  const watchedTaskType = watch("taskType");

  useEffect(() => {
    setCreateTaskType(watchedTaskType);
  }, [watchedTaskType]);

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) => {
      if (prev.includes(employeeId)) {
        return [];
      }
      return [employeeId];
    });
  };

  const onSubmit = (data: CreateTaskInput) => {
    if (selectedEmployees.length !== 1) {
      return; // Validation handled in UI
    }

    createMutation.mutate(
      {
        ...data,
        assignedToIds: selectedEmployees,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          reset();
          setSelectedEmployees([]);
        },
      },
    );
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
          >
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
          >
            In Progress
          </Badge>
        );
      case "pending_verification":
        return (
          <Badge
            variant="secondary"
            className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
          >
            Review
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="secondary"
            className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
          >
            Pending
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent:
        "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
      high: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900",
      medium:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
      low: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[priority]}`}>
        {priority}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track project tasks efficiently.
          </p>
        </div>
        {permissions.canCreateTask && (
          <Button
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
          <Select
            value={filterBy}
            onValueChange={(value) => {
              setFilterBy(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or create a new task.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tasks.map((task: Task) => (
            <Card
              key={task.id}
              className="group hover:shadow-md transition-shadow relative flex flex-col h-full"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono px-1.5 py-0 h-5 truncate max-w-[100px]"
                  >
                    {task.taskType}
                  </Badge>
                  {getPriorityBadge(task.priority)}
                </div>
                <CardTitle className="leading-tight mt-2 line-clamp-2 min-h-[3rem] text-lg">
                  {task.title}
                </CardTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span
                    className="truncate max-w-[150px]"
                    title={task.project?.title || "No Project"}
                  >
                    {task.project?.title || "No Project"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[3.75rem]">
                  {task.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  {getStatusBadge(task.status)}
                  {(task as any).isOverdue && (
                    <span
                      className="flex items-center text-xs font-bold text-destructive"
                      title="Overdue"
                    >
                      <Clock className="h-3 w-3 mr-1" /> Overdue
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center border-t bg-muted/5 mt-auto h-12 rounded-b-xl">
                <div className="flex items-center -space-x-2">
                  {task.assignedEmployees?.slice(0, 3).map((emp: any) => (
                    <Avatar
                      key={emp.id}
                      className="h-6 w-6 border-2 border-background"
                      title={emp.name || emp.email}
                    >
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {emp.name?.[0]?.toUpperCase() ||
                          emp.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {(task.assignedEmployees?.length || 0) > 3 && (
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      +{(task.assignedEmployees?.length || 0) - 3}
                    </div>
                  )}
                  {(!task.assignedEmployees ||
                    task.assignedEmployees.length === 0) && (
                    <span className="text-[10px] text-muted-foreground italic pl-1">
                      Unassigned
                    </span>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-blue-600"
                    title="View Roadmap"
                    onClick={() => {
                      setSelectedTaskForRoadmap(task);
                      setShowRoadmapView(true);
                    }}
                  >
                    <Map className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {permissions.canCompleteTask &&
                        task.status !== "completed" && (
                          <DropdownMenuItem
                            onClick={() => {
                              if (
                                task.project?.githubRepoName &&
                                user?.githubUsername
                              ) {
                                setSelectedTaskForCommit(task);
                                setShowCommitModal(true);
                              } else {
                                taskService
                                  .completeTaskByEmployee(task.id)
                                  .then(() => {
                                    queryClient.invalidateQueries({
                                      queryKey: ["tasks"],
                                    });
                                  });
                              }
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />{" "}
                            Complete
                          </DropdownMenuItem>
                        )}
                      {permissions.canDeleteTask && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure?"))
                              deleteMutation.mutate(task.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      )}
                      {task.project?.githubRepoName && (
                        <DropdownMenuItem disabled>
                          <GitCommit className="mr-2 h-4 w-4" /> GitHub Linked
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {meta && meta.totalPages > 1 && (
        <ReusablePagination
          currentPage={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          isPreviousData={isPreviousData}
        />
      )}

      {/* Create Task Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new task for your team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="E.g., Design Home Page"
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register("description")}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="Describe the task requirements..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Type</Label>
                <Controller
                  control={control}
                  name="taskType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.taskType && (
                  <p className="text-sm text-destructive">
                    {errors.taskType.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.projects?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && (
                <p className="text-sm text-destructive">
                  {errors.projectId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(
                              date ? format(date, "yyyy-MM-dd") : "",
                            )
                          }
                          initialFocus
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

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Controller
                  control={control}
                  name="closeDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(
                              date ? format(date, "yyyy-MM-dd") : "",
                            )
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign to Employee</Label>
              <div className="rounded-md border p-4 bg-muted/20">
                <Input
                  placeholder="Search employees by name or skill..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="mb-3"
                />
                <div className="h-[120px] overflow-y-auto space-y-1">
                  {suggestedEmployees?.length ? (
                    suggestedEmployees.map((emp: any) => (
                      <div
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors",
                          selectedEmployees.includes(emp.id)
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted",
                        )}
                      >
                        <div className="flex flex-col">
                          <span>{emp.name || emp.email}</span>
                          <span className="text-xs text-muted-foreground">
                            {emp.skills?.slice(0, 3).join(", ")}
                          </span>
                        </div>
                        {selectedEmployees.includes(emp.id) && (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No employees found.
                    </div>
                  )}
                </div>
                {selectedEmployees.length !== 1 && (
                  <p className="text-xs text-destructive mt-2">
                    Please select exactly one employee.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || selectedEmployees.length !== 1
                }
              >
                {createMutation.isPending && (
                  <Spinner className="mr-2 h-4 w-4" />
                )}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Commit Modal & Roadmap View */}
      {showCommitModal && selectedTaskForCommit && (
        <CommitSelectorModal
          isOpen={showCommitModal}
          onClose={() => {
            setShowCommitModal(false);
            setSelectedTaskForCommit(null);
          }}
          onSelectCommit={async (commit) => {
            await taskService.completeTaskByEmployee(
              selectedTaskForCommit.id,
              commit.sha,
              commit.url,
              commit.message,
            );
            setShowCommitModal(false);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }}
          repoFullName={selectedTaskForCommit.project?.githubRepoName || ""}
          branch={selectedTaskForCommit.project?.githubRepoBranch}
          employeeGithubUsername={user?.githubUsername || ""}
        />
      )}

      {showRoadmapView && selectedTaskForRoadmap && (
        <TaskRoadmapView
          task={selectedTaskForRoadmap}
          onClose={() => {
            setShowRoadmapView(false);
            setSelectedTaskForRoadmap(null);
          }}
        />
      )}
    </div>
  );
};

export default Tasks;
