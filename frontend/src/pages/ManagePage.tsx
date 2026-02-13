import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../context/AuthContext";
import { employeeService } from "../services/employee.service";

interface Employee {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  canCompleteTask: boolean;
  canVerifyTask: boolean;
  isActive: boolean;
}

export const ManagePage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.getAllEmployees(),
    enabled: user?.role === "BOSS",
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({
      employeeId,
      permissions,
    }: {
      employeeId: string;
      permissions: { canCompleteTask?: boolean; canVerifyTask?: boolean };
    }) => employeeService.updatePermissions(employeeId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const handleTogglePermission = (
    employeeId: string,
    permission: "canCompleteTask" | "canVerifyTask",
    currentValue: boolean
  ) => {
    updatePermissionsMutation.mutate({
      employeeId,
      permissions: { [permission]: !currentValue },
    });
  };

  const filteredEmployees = employees?.filter(
    (emp: Employee) =>
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Employees</h1>
          <p className="text-gray-600 mt-2">
            Grant special permissions to employees
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <input
            type="text"
            placeholder="Search employees by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Permissions Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Permissions Guide:
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              <strong>Can Complete Task:</strong> Employee can mark tasks as
              complete without waiting for BOSS approval
            </li>
            <li>
              <strong>Can Verify Task:</strong> Employee can verify and approve
              completed tasks (like a BOSS)
            </li>
          </ul>
        </div>

        {/* Employees List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading employees...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Can Complete Tasks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Can Verify Tasks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees?.map((employee: Employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {employee.skills.length > 0 ? (
                          employee.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">
                            No skills
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() =>
                          handleTogglePermission(
                            employee.id,
                            "canCompleteTask",
                            employee.canCompleteTask
                          )
                        }
                        disabled={updatePermissionsMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          employee.canCompleteTask
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            employee.canCompleteTask
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() =>
                          handleTogglePermission(
                            employee.id,
                            "canVerifyTask",
                            employee.canVerifyTask
                          )
                        }
                        disabled={updatePermissionsMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          employee.canVerifyTask
                            ? "bg-green-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            employee.canVerifyTask
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          employee.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEmployees?.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
