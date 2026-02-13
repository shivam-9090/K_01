import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  IsArray,
  IsEnum,
  MinLength,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export enum TaskType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  AI_ML = 'ai/ml',
  DEVOPS = 'devops',
  MOBILE = 'mobile',
  TESTING = 'testing',
  DATABASE = 'database',
  UI_UX = 'ui/ux',
  OTHER = 'other',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Task title must be at least 3 characters long' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsISO8601({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @IsNotEmpty()
  startDate: string;

  @IsISO8601({}, { message: 'Close date must be a valid ISO 8601 date string' })
  @IsOptional()
  closeDate?: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(TaskType, {
    message:
      'Task type must be one of: frontend, backend, ai/ml, devops, mobile, testing, database, ui/ux, other',
  })
  taskType: string;

  @IsString()
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'Priority must be one of: low, medium, high, urgent',
  })
  priority?: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'At least one employee must be assigned to the task',
  })
  @IsString({ each: true })
  assignedToIds: string[];
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Task title must be at least 3 characters long' })
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsISO8601({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @IsOptional()
  startDate?: string;

  @IsISO8601({}, { message: 'Close date must be a valid ISO 8601 date string' })
  @IsOptional()
  closeDate?: string;

  @IsString()
  @IsOptional()
  @IsEnum(TaskType, {
    message:
      'Task type must be one of: frontend, backend, ai/ml, devops, mobile, testing, database, ui/ux, other',
  })
  taskType?: string;

  @IsString()
  @IsOptional()
  @IsEnum(TaskStatus, {
    message:
      'Status must be one of: pending, in_progress, completed, cancelled',
  })
  status?: string;

  @IsString()
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'Priority must be one of: low, medium, high, urgent',
  })
  priority?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1, {
    message: 'At least one employee must be assigned to the task',
  })
  @IsString({ each: true })
  assignedToIds?: string[];

  @IsString()
  @IsOptional()
  completionCommitSha?: string;

  @IsString()
  @IsOptional()
  completionCommitUrl?: string;

  @IsString()
  @IsOptional()
  completionCommitMessage?: string;
}

export class SuggestEmployeesDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(TaskType, {
    message:
      'Task type must be one of: frontend, backend, ai/ml, devops, mobile, testing, database, ui/ux, other',
  })
  taskType: string;

  @IsString()
  @IsOptional()
  searchQuery?: string;
}
