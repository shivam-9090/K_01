import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../context/AuthContext";
import { employeeService } from "../services/employee.service";
import {
  PERMISSION_CATEGORIES,
  PERMISSION_PRESETS,
  Permission,
} from "../types/permissions";

interface Employee {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  isActive: boolean;
}

type Step = 1 | 2 | 3;

export const ManagePermissionsPage: React.FC = () => {
  const { user } = useAuthStore();
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

  // Fetch employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.getAllEmployees(),
    enabled: user?.role === "BOSS",
  });

  const employees = employeesData?.employees || [];

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: (data: {
      employeeIds: string[];
      permissions: Permission[];
      overwrite: boolean;
    }) => employeeService.bulkAssignPermissions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Reset state
      setSelectedPermissions([]);
      setSelectedEmployees([]);
      setCurrentStep(1);
      alert("Permissions assigned successfully!");
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

  if (user?.role !== "BOSS") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only BOSS can access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔑 Manage Permissions
          </h1>
          <p className="text-gray-600">
            Grant granular permissions to employees - Team Leaders, Managers,
            etc.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center ${currentStep >= 1 ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
              >
                1
              </div>
              <span className="ml-3 font-semibold">Select Permissions</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-300">
              <div
                className={`h-full ${currentStep >= 2 ? "bg-blue-600" : "bg-gray-300"}`}
                style={{ width: currentStep >= 2 ? "100%" : "0%" }}
              />
            </div>
            <div
              className={`flex items-center ${currentStep >= 2 ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
              >
                2
              </div>
              <span className="ml-3 font-semibold">Select Employees</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-300">
              <div
                className={`h-full ${currentStep >= 3 ? "bg-blue-600" : "bg-gray-300"}`}
                style={{ width: currentStep >= 3 ? "100%" : "0%" }}
              />
            </div>
            <div
              className={`flex items-center ${currentStep >= 3 ? "text-blue-600" : "text-gray-400"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
              >
                3
              </div>
              <span className="ml-3 font-semibold">Review & Apply</span>
            </div>
          </div>
        </div>

        {/* Step 1: Select Permissions */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">
              Step 1: Select Permissions
            </h2>

            {/* Preset Buttons */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Quick Presets:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() =>
                      selectPreset(key as keyof typeof PERMISSION_PRESETS)
                    }
                    className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-xs mt-1 opacity-90">
                      {preset.permissions.length} permissions
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">
                Or select individual permissions:
              </h3>

              {PERMISSION_CATEGORIES.map((category) => {
                const isExpanded = expandedCategories.includes(
                  category.category,
                );
                return (
                  <div
                    key={category.category}
                    className="mb-4 border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategory(category.category)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-left">
                          {category.category}
                        </div>
                        <div className="text-sm text-gray-600 text-left">
                          {category.description}
                        </div>
                      </div>
                      <span className="text-2xl">{isExpanded ? "▼" : "▶"}</span>
                    </button>

                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.permissions.map((perm) => {
                          const isSelected = selectedPermissions.includes(
                            perm.key,
                          );
                          return (
                            <div
                              key={perm.key}
                              onClick={() => togglePermission(perm.key)}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-gray-200 hover:border-blue-300"
                              } ${perm.dangerous ? "border-red-300" : ""}`}
                            >
                              <div className="flex items-start">
                                <span className="text-2xl mr-3">
                                  {perm.icon}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <div className="font-semibold">
                                      {perm.label}
                                    </div>
                                    {perm.dangerous && (
                                      <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                        DANGEROUS
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {perm.description}
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="ml-2"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Selected:{" "}
                <span className="font-bold">{selectedPermissions.length}</span>{" "}
                permissions
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={selectedPermissions.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Next: Select Employees →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Employees */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">
              Step 2: Select Employees
            </h2>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search employees by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Employee List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee: Employee) => {
                  const isSelected = selectedEmployees.includes(employee.id);
                  return (
                    <div
                      key={employee.id}
                      onClick={() => toggleEmployee(employee.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {employee.name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-600">
                            {employee.email}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {employee.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="ml-2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                ← Back
              </button>
              <div className="text-sm text-gray-600">
                Selected:{" "}
                <span className="font-bold">{selectedEmployees.length}</span>{" "}
                employees
              </div>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={selectedEmployees.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Next: Review & Apply →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Apply */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Step 3: Review & Apply</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Permissions Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  📋 Selected Permissions ({selectedPermissions.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedPermissions.map((permKey) => {
                    const perm = PERMISSION_CATEGORIES.flatMap(
                      (c) => c.permissions,
                    ).find((p) => p.key === permKey);
                    return (
                      perm && (
                        <div
                          key={permKey}
                          className="flex items-center p-2 bg-gray-50 rounded"
                        >
                          <span className="mr-2">{perm.icon}</span>
                          <span className="text-sm">{perm.label}</span>
                        </div>
                      )
                    );
                  })}
                </div>
              </div>

              {/* Employees Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  👥 Selected Employees ({selectedEmployees.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedEmployees.map((empId) => {
                    const emp = employees.find((e: Employee) => e.id === empId);
                    return (
                      emp && (
                        <div
                          key={empId}
                          className="p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="font-semibold">
                            {emp.name || "N/A"}
                          </div>
                          <div className="text-gray-600">{emp.email}</div>
                        </div>
                      )
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Overwrite Mode */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteMode}
                  onChange={(e) => setOverwriteMode(e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <div className="font-semibold">
                    Overwrite Existing Permissions
                  </div>
                  <div className="text-sm text-gray-600">
                    If checked, will replace ALL existing permissions with
                    selected ones. If unchecked, will add to existing
                    permissions.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={handleApply}
                disabled={bulkAssignMutation.isPending}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
              >
                {bulkAssignMutation.isPending
                  ? "Applying..."
                  : "✓ Apply Permissions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
