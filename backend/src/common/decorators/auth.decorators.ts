import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permission.guard';
import { Roles } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/guards/permission.guard';
import { Permission } from '../permissions';

/**
 * Simple authentication - just JWT validation
 * Use for endpoints that require any authenticated user
 */
export function Authenticated() {
  return applyDecorators(UseGuards(JwtAuthGuard), ApiBearerAuth());
}

/**
 * BOSS-only access
 * Use for endpoints that only company owners can access
 */
export function BossOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('BOSS'),
    ApiBearerAuth(),
  );
}

/**
 * Employee with specific permissions
 * Use for endpoints that employees can access if they have the right permissions
 * @param permissions - Required permissions
 */
export function EmployeeWithPermissions(...permissions: Permission[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, PermissionsGuard),
    RequirePermissions(...permissions),
    ApiBearerAuth(),
  );
}

/**
 * BOSS or Employee with permissions
 * Use for endpoints accessible by BOSS or employees with specific permissions
 * @param permissions - Required permissions for employees (BOSS always has access)
 */
export function BossOrPermissions(...permissions: Permission[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard),
    Roles('BOSS', 'EMPLOYEE'),
    RequirePermissions(...permissions),
    ApiBearerAuth(),
  );
}
