import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../auth/guards/permission.guard';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { BulkAssignPermissionsDto, ApplyPresetDto } from './dto/permission.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  // Create new employee
  @Post()
  @RequirePermissions('canCreateEmployee')
  async createEmployee(@Request() req, @Body() createDto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(req.user.userId, createDto);
  }

  // Get all employees for the company
  @Get()
  @RequirePermissions('canViewAllEmployees')
  async getEmployees(
    @Request() req,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    // Cap take parameter at 100 to prevent DoS attacks
    const limitedTake = Math.min(+take, 100);
    return this.employeeService.getEmployees(
      req.user.userId,
      +skip,
      limitedTake,
    );
  }

  // Get single employee details
  @Get(':id')
  @RequirePermissions('canViewAllEmployees', 'canUpdateEmployee')
  async getEmployee(@Request() req, @Param('id') employeeId: string) {
    return this.employeeService.getEmployee(req.user.userId, employeeId);
  }

  // Update employee
  @Put(':id')
  @RequirePermissions('canUpdateEmployee')
  async updateEmployee(
    @Request() req,
    @Param('id') employeeId: string,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(
      req.user.userId,
      employeeId,
      updateDto,
    );
  }

  // Delete/Remove employee
  @Delete(':id')
  @RequirePermissions('canDeleteEmployee')
  async deleteEmployee(@Request() req, @Param('id') employeeId: string) {
    return this.employeeService.deleteEmployee(req.user.userId, employeeId);
  }

  // Update employee permissions
  @Patch(':id/permissions')
  @RequirePermissions('canManagePermissions')
  async updatePermissions(
    @Request() req,
    @Param('id') employeeId: string,
    @Body() permissions: { canCompleteTask?: boolean; canVerifyTask?: boolean },
  ) {
    const result = await this.employeeService.updatePermissions(
      req.user.userId,
      employeeId,
      permissions,
    );
    return result;
  }

  // Update employee attendance
  @Patch(':id/attendance')
  @RequirePermissions('canUpdateEmployee')
  async updateAttendance(
    @Request() req,
    @Param('id') employeeId: string,
    @Body() body: { attendance: number },
  ) {
    return this.employeeService.updateAttendance(
      req.user.userId,
      employeeId,
      body.attendance,
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   *              BULK PERMISSION MANAGEMENT ENDPOINTS
   * ═══════════════════════════════════════════════════════════════
   */

  // Bulk assign permissions to multiple employees
  @Post('permissions/bulk-assign')
  @RequirePermissions('canManagePermissions')
  async bulkAssignPermissions(
    @Request() req,
    @Body() bulkDto: BulkAssignPermissionsDto,
  ) {
    return this.employeeService.bulkAssignPermissions(req.user.userId, bulkDto);
  }

  // Apply permission preset to employees
  @Post('permissions/apply-preset')
  @RequirePermissions('canManagePermissions')
  async applyPreset(@Request() req, @Body() presetDto: ApplyPresetDto) {
    return this.employeeService.applyPreset(req.user.userId, presetDto);
  }

  // Get all permissions for an employee
  @Get(':id/permissions/all')
  @RequirePermissions('canViewAllEmployees', 'canManagePermissions')
  async getEmployeePermissions(
    @Request() req,
    @Param('id') employeeId: string,
  ) {
    return this.employeeService.getEmployeePermissions(
      req.user.userId,
      employeeId,
    );
  }

  // Revoke all permissions from an employee
  @Delete(':id/permissions/all')
  @RequirePermissions('canManagePermissions')
  async revokeAllPermissions(@Request() req, @Param('id') employeeId: string) {
    return this.employeeService.revokeAllPermissions(
      req.user.userId,
      employeeId,
    );
  }
}
