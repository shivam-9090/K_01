import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { employeeService } from "../services/employee.service";
import { PERMISSION_CATEGORIES, ALL_PERMISSIONS } from "../types/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Search,
  Filter,
  Users,
  Shield,
  Check,
  X,
  Calculator,
  PieChart,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/utils";

interface EmployeeWithPermissions {
  id: string;
  email: string;
  name: string | null;
  [key: string]: any;
}

export const PermissionsMatrix: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch employees with all their permissions
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["all-employees-permissions"],
    queryFn: async () => {
      const result = await employeeService.getAllEmployees();
      return Array.isArray(result) ? result : result?.employees || [];
    },
    staleTime: 30000,
  });

  const employees: EmployeeWithPermissions[] = employeesData || [];

  // Filter employees by search
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get permissions to display based on selected category
  const getPermissionsToShow = () => {
    if (selectedCategory === "all") {
      return ALL_PERMISSIONS;
    }
    const category = PERMISSION_CATEGORIES.find(
      (cat) => cat.category === selectedCategory,
    );
    return category ? category.permissions : [];
  };

  const permissionsToShow = getPermissionsToShow();

  // Count how many permissions each employee has
  const getPermissionCount = (employee: EmployeeWithPermissions) => {
    return ALL_PERMISSIONS.filter((perm) => employee[perm.key] === true).length;
  };

  // Count how many employees have each permission
  const getPermissionUsage = (permissionKey: string) => {
    return employees.filter((emp) => emp[permissionKey] === true).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Current Permission Assignments
        </h2>
        <p className="text-muted-foreground mt-1">
          View which employees have which permissions across the organization.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Search Employees
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Filter by Category
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9 appearance-none"
                >
                  <option value="all">
                    All Permissions ({ALL_PERMISSIONS.length})
                  </option>
                  {PERMISSION_CATEGORIES.map((category) => (
                    <option key={category.category} value={category.category}>
                      {category.category} ({category.permissions.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Permissions
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.length > 0
                ? Math.round(
                    employees.reduce(
                      (acc, emp) => acc + getPermissionCount(emp),
                      0,
                    ) / employees.length,
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per employee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Permissions
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ALL_PERMISSIONS.length}</div>
            <p className="text-xs text-muted-foreground">Available in system</p>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 [&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky left-0 bg-background z-20 min-w-[200px]">
                  Employee
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                  Total
                </th>
                {permissionsToShow.map((perm) => (
                  <th
                    key={perm.key}
                    className="h-12 px-4 text-center align-middle font-medium text-muted-foreground min-w-[100px]"
                    title={perm.description}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="whitespace-nowrap">{perm.label}</span>
                      <span className="text-[10px] font-normal opacity-70">
                        {getPermissionUsage(perm.key)} users
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={permissionsToShow.length + 2}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                      <p>No employees found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const permCount = getPermissionCount(employee);
                  return (
                    <tr
                      key={employee.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle sticky left-0 bg-card z-10 font-medium">
                        <div>
                          <p className="text-foreground">
                            {employee.name || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employee.email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-center">
                        <Badge
                          variant={
                            permCount === 0
                              ? "secondary"
                              : permCount < 5
                                ? "outline"
                                : "default"
                          }
                          className="rounded-full px-2"
                        >
                          {permCount}
                        </Badge>
                      </td>
                      {permissionsToShow.map((perm) => (
                        <td
                          key={perm.key}
                          className="p-4 align-middle text-center"
                        >
                          {employee[perm.key] ? (
                            <div className="flex justify-center">
                              <Check className="h-5 w-5 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="h-4 w-4 text-muted-foreground/20" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
