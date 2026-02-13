import { z } from "zod";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  mobile: z.string().optional(),
});

// Project Schemas
export const createProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  source: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  closeDate: z.string().optional(),
  teamId: z.string().optional(), // Keep for backward compatibility
  teamIds: z.array(z.string()).optional(), // New: support multiple teams
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// Employee Schemas
export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  achievements: z.string().optional(),
  attendance: z.number().min(0).optional(),
});

export const updateEmployeeSchema = z.object({
  skills: z.array(z.string()).optional(),
  achievements: z.string().optional(),
  attendance: z.number().min(0).optional(),
});

// Task Schemas
export const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  closeDate: z.string().optional(),
  taskType: z.enum([
    "frontend",
    "backend",
    "ai/ml",
    "devops",
    "mobile",
    "testing",
    "database",
    "ui/ux",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectId: z.string().min(1, "Project is required"),
  assignedToIds: z
    .array(z.string())
    .min(1, "At least one employee must be assigned"),
});

export const updateTaskSchema = createTaskSchema.partial();

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
