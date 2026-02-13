import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../services/employee.service";
import {
  PERMISSION_CATEGORIES,
  PERMISSION_PRESETS,
  Permission,
} from "../types/permissions";
import { PermissionChangeNotification } from "./PermissionChangeNotification";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Shield,
  User,
  Users,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../lib/utils";

interface Employee {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  isActive: boolean;
}

type Step = 1 | 2 | 3;

export const ManagePermissionsTab: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    [],
  );
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "Project Management",
  ]);
  const [showNotification, setShowNotification] = useState(false);
  const [updatedEmployeeName, setUpdatedEmployeeName] = useState<string>("");

  // Fetch employees
  const {
    data: employeesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const result = await employeeService.getAllEmployees();
      return result;
    },
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
  });

  // Handle different response structures
  let employees: Employee[] = [];
  if (Array.isArray(employeesData)) {
    // If response is directly an array
    employees = employeesData;
  } else if (
    employeesData?.employees &&
    Array.isArray(employeesData.employees)
  ) {
    // If response has employees property
    employees = employeesData.employees;
  }

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: (data: {
      employeeIds: string[];
      permissions: Permission[];
      overwrite: boolean;
    }) => employeeService.bulkAssignPermissions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });

      // Get employee name for notification
      const employeeName =
        selectedEmployees.length === 1
          ? employees.find((emp) => emp.id === selectedEmployees[0])?.email ||
            "Employee"
          : `${selectedEmployees.length} employees`;

      setUpdatedEmployeeName(employeeName);
      setShowNotification(true);

      setSelectedPermissions([]);
      setSelectedEmployees([]);
      setCurrentStep(1);
    },
    onError: (error: any) => {
      alert(`Failed to assign permissions: ${error.message}`);
    },
  });

  // Handlers
  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const selectPreset = (presetKey: keyof typeof PERMISSION_PRESETS) => {
    const preset = PERMISSION_PRESETS[presetKey];
    setSelectedPermissions(preset.permissions);
  };

  const handleApply = () => {
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee");
      return;
    }
    if (selectedPermissions.length === 0) {
      alert("Please select at least one permission");
      return;
    }

    bulkAssignMutation.mutate({
      employeeIds: selectedEmployees,
      permissions: selectedPermissions,
      overwrite: overwriteMode,
    });
  };

  const filteredEmployees = employees.filter(
    (emp: Employee) =>
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const StepIndicator = ({
    step,
    label,
    current,
  }: {
    step: number;
    label: string;
    current: number;
  }) => {
    const isActive = current >= step;
    const isCurrent = current === step;
    return (
      <div
        className={cn(
          "flex items-center",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
            isCurrent &&
              "ring-2 ring-ring ring-offset-2 ring-offset-background",
          )}
        >
          {step}
        </div>
        <span
          className={cn(
            "ml-2 font-medium hidden sm:block",
            isCurrent && "font-bold",
          )}
        >
          {label}
        </span>
      </div>
    );
  };

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Step 1: Select Permissions
        </CardTitle>
        <CardDescription>
          Choose a preset or select individual permissions to assign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Presets */}
        <div>
          <h3 className="text-sm font-medium mb-3">Quick Presets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
              <div
                key={key}
                onClick={() =>
                  selectPreset(key as keyof typeof PERMISSION_PRESETS)
                }
                className="cursor-pointer group relative overflow-hidden rounded-lg border bg-background p-4 hover:border-primary hover:bg-accent hover:text-accent-foreground transition-all"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">
                    {preset.permissions.length} permissions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Individual Permissions</h3>
          <div className="space-y-3">
            {PERMISSION_CATEGORIES.map((category) => {
              const isExpanded = expandedCategories.includes(category.category);
              return (
                <div
                  key={category.category}
                  className="border rounded-lg overflow-hidden bg-background"
                >
                  <button
                    onClick={() => toggleCategory(category.category)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">
                        {category.category}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {category.description}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-muted/20 grid grid-cols-1 md:grid-cols-2 gap-3 border-t">
                      {category.permissions.map((perm) => {
                        const isSelected = selectedPermissions.includes(
                          perm.key,
                        );
                        return (
                          <div
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className={cn(
                              "flex items-start p-3 rounded-md border cursor-pointer transition-all",
                              isSelected
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "border-transparent bg-background hover:bg-accent hover:text-accent-foreground",
                              perm.dangerous &&
                                "border-destructive/30 hover:border-destructive/50",
                            )}
                          >
                            <span className="text-xl mr-3">{perm.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-sm truncate">
                                  {perm.label}
                                </span>
                                {perm.dangerous && (
                                  <Badge
                                    variant="destructive"
                                    className="h-4 px-1 text-[10px]"
                                  >
                                    DANGEROUS
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {perm.description}
                              </p>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              className="mt-1 ml-2"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <div className="text-sm text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedPermissions.length}
          </span>{" "}
          permissions
        </div>
        <Button
          onClick={() => setCurrentStep(2)}
          disabled={selectedPermissions.length === 0}
        >
          Next: Select Employees
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Step 2: Select Employees
        </CardTitle>
        <CardDescription>
          Search and select the employees to assign permissions to.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-2 text-sm">
              Loading employees...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-destructive">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <p className="font-medium">Failed to load employees</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["all-employees"] })
              }
            >
              Retry
            </Button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No employees match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEmployees.map((employee: Employee) => {
              const isSelected = selectedEmployees.includes(employee.id);
              return (
                <div
                  key={employee.id}
                  onClick={() => toggleEmployee(employee.id)}
                  className={cn(
                    "flex items-start p-3 rounded-md border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-input bg-card hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {employee.name || "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {employee.email}
                    </div>
                    {employee.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {employee.skills.slice(0, 2).map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-[10px] px-1 py-0 h-4 font-normal"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {employee.skills.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4 font-normal"
                          >
                            +{employee.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Checkbox checked={isSelected} className="ml-2 mt-1" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-sm text-muted-foreground hidden sm:block">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedEmployees.length}
          </span>{" "}
          employees
        </div>
        <Button
          onClick={() => setCurrentStep(3)}
          disabled={selectedEmployees.length === 0}
        >
          Next: Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5" />
          Step 3: Review and Apply
        </CardTitle>
        <CardDescription>
          Review your selections and apply permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Permissions List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b text-sm font-medium">
              Selected Permissions ({selectedPermissions.length})
            </div>
            <div className="p-2 max-h-60 overflow-y-auto bg-background space-y-1">
              {selectedPermissions.map((permKey) => {
                const perm = PERMISSION_CATEGORIES.flatMap(
                  (cat) => cat.permissions,
                ).find((p) => p.key === permKey);
                return perm ? (
                  <div
                    key={permKey}
                    className="text-xs flex items-center gap-2 p-2 rounded bg-accent/50 text-accent-foreground"
                  >
                    <span className="text-base">{perm.icon}</span>
                    <span>{perm.label}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Employees List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b text-sm font-medium">
              Selected Employees ({selectedEmployees.length})
            </div>
            <div className="p-2 max-h-60 overflow-y-auto bg-background space-y-1">
              {selectedEmployees.map((empId) => {
                const emp = employees.find((e: Employee) => e.id === empId);
                return emp ? (
                  <div
                    key={empId}
                    className="text-xs p-2 rounded bg-accent/50 text-accent-foreground"
                  >
                    <div className="font-medium">{emp.name || "N/A"}</div>
                    <div className="text-muted-foreground">{emp.email}</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-lg border bg-amber-500/10 border-amber-500/20">
          <Checkbox
            id="overwrite"
            checked={overwriteMode}
            onCheckedChange={(checked) => setOverwriteMode(checked === true)}
            className="mt-1"
          />
          <div className="space-y-1">
            <label
              htmlFor="overwrite"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Overwrite Existing Permissions
            </label>
            <p className="text-xs text-muted-foreground">
              If checked, this will{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                remove all existing permissions
              </span>{" "}
              and replace them with the selection above. If unchecked, new
              permissions will be added to existing ones.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className={"flex justify-between border-t pt-6"}>
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleApply} disabled={bulkAssignMutation.isPending}>
          {bulkAssignMutation.isPending ? "Applying..." : "Apply Permissions"}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PermissionChangeNotification
        show={showNotification}
        onClose={() => setShowNotification(false)}
        employeeName={updatedEmployeeName}
      />

      {/* Stepper */}
      <div className="flex items-center justify-between px-4 sm:px-12 w-full">
        <StepIndicator
          step={1}
          label="Select Permissions"
          current={currentStep}
        />
        <div
          className={cn(
            "flex-1 h-0.5 mx-4 transition-colors",
            currentStep >= 2 ? "bg-primary" : "bg-muted",
          )}
        ></div>
        <StepIndicator
          step={2}
          label="Select Employees"
          current={currentStep}
        />
        <div
          className={cn(
            "flex-1 h-0.5 mx-4 transition-colors",
            currentStep >= 3 ? "bg-primary" : "bg-muted",
          )}
        ></div>
        <StepIndicator step={3} label="Review & Apply" current={currentStep} />
      </div>

      <div className="min-h-[500px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};
