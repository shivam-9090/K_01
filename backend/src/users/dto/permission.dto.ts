import {
  IsArray,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Permission } from '../../common/permissions';

/**
 * DTO for bulk permission assignment
 * Allows selecting permissions first, then employees
 */
export class BulkAssignPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds: string[]; // List of employee IDs to grant permissions to

  @IsArray()
  @IsString({ each: true })
  permissions: Permission[]; // List of permissions to grant

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean; // If true, replace all existing permissions; if false, add to existing
}

/**
 * DTO for updating individual permission
 */
export class UpdatePermissionDto {
  @IsString()
  permission: Permission;

  @IsBoolean()
  enabled: boolean;
}

/**
 * DTO for batch permission updates (array of permission changes)
 */
export class BatchUpdatePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePermissionDto)
  updates: UpdatePermissionDto[];
}

/**
 * Response DTO for permission operations
 */
export interface PermissionOperationResult {
  success: boolean;
  message: string;
  employeesUpdated: number;
  permissionsGranted: number;
  errors?: string[];
}

/**
 * DTO for permission preset application
 */
export class ApplyPresetDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds: string[];

  @IsString()
  presetName:
    | 'TEAM_LEADER'
    | 'PROJECT_MANAGER'
    | 'HR_MANAGER'
    | 'SENIOR_DEVELOPER';

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
