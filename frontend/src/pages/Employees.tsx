import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEmployees, useCreateEmployee } from "../hooks/useEmployees";
import { usePagination } from "../hooks/usePagination";
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
} from "../schemas/validation";
import { usePermissions } from "../hooks/usePermissions";
import { TeamsTab } from "../components/TeamsTab";
import { ManagePermissionsTab } from "../components/ManagePermissionsTab";
import { PermissionsMatrix } from "../components/PermissionsMatrix";
import { AccessDenied } from "../components/AccessDenied";
import { DataTable } from "../components/employees/data-table";
import { columns } from "../components/employees/columns";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { ReusablePagination } from "../components/ReusablePagination";

const SKILLS_OPTIONS = [
  "React",
  "Vue",
  "Angular",
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "Tailwind",
  "Next.js",
  "Vite",
  "Node.js",
  "Python",
  "Django",
  "Express",
  "NestJS",
  "Java",
  "Spring Boot",
  "PHP",
  "Laravel",
  ".NET",
  "TensorFlow",
  "PyTorch",
  "Machine Learning",
  "Data Science",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "React Native",
  "Flutter",
  "Swift",
  "Kotlin",
  "iOS",
  "Android",
  "Jest",
  "Cypress",
  "Selenium",
  "PostgreSQL",
  "MongoDB",
  "MySQL",
  "Redis",
  "Figma",
  "Adobe XD",
  "UI Design",
  "UX Design",
];

const Employees: React.FC = () => {
  const permissions = usePermissions();

  // Determine the first available tab based on permissions
  const getDefaultTab = () => {
    if (permissions.canViewAllEmployees) return "employees";
    if (permissions.canViewAllTeams) return "teams";
    if (permissions.isBoss && permissions.canManagePermissions) return "manage";
    return "employees"; // Fallback
  };

  const [activeTab, setActiveTab] = useState<
    "employees" | "teams" | "manage" | "viewPermissions"
  >(getDefaultTab());
  const [showModal, setShowModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showModal) setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  // Update active tab if current tab is not accessible
  useEffect(() => {
    if (activeTab === "employees" && !permissions.canViewAllEmployees) {
      setActiveTab(getDefaultTab());
    } else if (activeTab === "teams" && !permissions.canViewAllTeams) {
      setActiveTab(getDefaultTab());
    } else if (
      activeTab === "manage" &&
      (!permissions.isBoss || !permissions.canManagePermissions)
    ) {
      setActiveTab(getDefaultTab());
    } else if (
      activeTab === "viewPermissions" &&
      (!permissions.isBoss || !permissions.canViewAllEmployees)
    ) {
      setActiveTab(getDefaultTab());
    }
  }, [permissions, activeTab]);

  const {
    currentPage,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    setCurrentPage,
  } = usePagination({
    totalItems: 100, // This logic in Employees.tsx seems flawed anyway as totalItems changes
    itemsPerPage: 20,
  });

  const { data: employees, isLoading } = useEmployees(currentPage, 20);
  const createMutation = useCreateEmployee();

  // If we have employees data, use its meta for accurate pagination
  const totalPages = employees?.meta?.totalPages || 1;
  const setPage = (page: number) => {
    // The usePagination hook doesn't expose setPage directly in this file
    // But we need to update page state to trigger re-fetch
    // We might need to refactor usePagination usage here
    // OR we can just bypass usePagination hook state if possible
    // Wait, usePagination returns currentPage state.
    // Let's modify usePagination line to expose setCurrentPage or similar.
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      skills: [],
    },
  });

  // Log errors whenever they change
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
    }
  }, [errors]);

  // Sync selectedSkills with form state
  React.useEffect(() => {
    setValue("skills", selectedSkills);
  }, [selectedSkills, setValue]);

  const onSubmit = async (data: CreateEmployeeInput) => {
    try {
      await createMutation.mutateAsync(data);
      reset();
      setSelectedSkills([]);
      setShowModal(false);
    } catch (error: any) {
      alert(
        `Failed to create employee: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  // Check if user has ANY employee-related permission
  const hasAnyEmployeePermission =
    permissions.canViewAllEmployees ||
    permissions.canViewAllTeams ||
    permissions.canManagePermissions;

  if (!hasAnyEmployeePermission) {
    return (
      <AccessDenied
        requiredPermission="canViewAllEmployees OR canViewAllTeams OR canManagePermissions"
        message="You need permission to view the employee management page."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Employee Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and teams
          </p>
        </div>
        {activeTab === "employees" && permissions.canCreateEmployee && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition font-medium flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {permissions.canViewAllEmployees && (
            <button
              onClick={() => setActiveTab("employees")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "employees"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Employees
            </button>
          )}
          {permissions.canViewAllTeams && (
            <button
              onClick={() => setActiveTab("teams")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "teams"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Teams
            </button>
          )}
          {permissions.isBoss && permissions.canManagePermissions && (
            <button
              onClick={() => setActiveTab("manage")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "manage"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Manage Permissions
            </button>
          )}
          {permissions.isBoss && permissions.canViewAllEmployees && (
            <button
              onClick={() => setActiveTab("viewPermissions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "viewPermissions"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              View Permissions
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "employees" && permissions.canViewAllEmployees ? (
        <>
          <div className="bg-background rounded-lg shadow-md overflow-hidden border">
            <DataTable columns={columns} data={employees?.employees || []} />
          </div>

          {/* Server-side Pagination Controls */}
          {employees?.meta?.totalPages > 1 && (
            <ReusablePagination
              currentPage={currentPage}
              totalPages={employees?.meta?.totalPages || 1}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}

          {/* Create Employee Modal */}
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
                  <h2 className="text-xl font-bold">Add New Employee</h2>
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
                  onSubmit={handleSubmit(onSubmit, (errors) => {
                    alert(
                      "Please check all required fields:\n" +
                        Object.entries(errors)
                          .map(([key, val]) => `${key}: ${val.message}`)
                          .join("\n"),
                    );
                  })}
                  className="p-6 space-y-4 overflow-y-auto"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <input
                      type="text"
                      {...register("name")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="John Smith"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <input
                      type="email"
                      {...register("email")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="employee@company.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password *</label>
                    <input
                      type="password"
                      {...register("password")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Must include upper, lower, number, symbol"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Min 8 characters with uppercase, lowercase, number &
                      special character
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Skills * (Select at least one)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SKILLS_OPTIONS.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                            selectedSkills.includes(skill)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted text-muted-foreground border-input",
                          )}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                    {selectedSkills.length === 0 && (
                      <p className="text-sm text-destructive">
                        At least one skill is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Achievements</label>
                    <textarea
                      {...register("achievements")}
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      placeholder="Notable achievements"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowModal(false);
                        reset();
                        setSelectedSkills([]);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || selectedSkills.length === 0
                      }
                      className="flex-1"
                    >
                      {createMutation.isPending ? "Adding..." : "Add Employee"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : activeTab === "teams" && permissions.canViewAllTeams ? (
        <TeamsTab />
      ) : activeTab === "manage" &&
        permissions.isBoss &&
        permissions.canManagePermissions ? (
        <ManagePermissionsTab />
      ) : activeTab === "viewPermissions" &&
        permissions.isBoss &&
        permissions.canViewAllEmployees ? (
        <PermissionsMatrix />
      ) : (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">No content available</p>
        </div>
      )}
    </div>
  );
};

export default Employees;
