"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useDeleteEmployee } from "@/hooks/useEmployees";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ActionsCell = ({ row }: { row: any }) => {
  const employee = row.original;
  const permissions = usePermissions();
  const deleteMutation = useDeleteEmployee();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(employee.email)}
        >
          Copy Email
        </DropdownMenuItem>
        {(permissions.canUpdateEmployee || permissions.isBoss) && (
          <DropdownMenuItem
            onClick={() => navigate(`/employees/${employee.id}`)}
          >
            View Details
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {permissions.canDeleteEmployee && (
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => {
              if (confirm("Are you sure you want to delete this employee?")) {
                deleteMutation.mutate(employee.id);
              }
            }}
          >
            Delete Employee
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  skills: string[];
  attendance: number;
  isActive: boolean;
};

export const columns: ColumnDef<Employee>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-foreground hover:bg-muted"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-foreground hover:bg-muted"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "skills",
    header: "Skills",
    cell: ({ row }) => {
      const skills = (row.getValue("skills") as string[]) || [];
      return (
        <div className="flex flex-wrap gap-1">
          {skills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300"
            >
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <Badge variant="outline">+{skills.length - 3}</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "attendance",
    header: "Attendance",
    cell: ({ row }) => {
      return <div>{row.getValue("attendance") || 0} days</div>;
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <span
          className={`px-2 py-1 text-xs rounded-full font-medium ${
            isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];
