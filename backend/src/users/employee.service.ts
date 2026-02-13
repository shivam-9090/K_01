import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import {
  BulkAssignPermissionsDto,
  ApplyPresetDto,
  PermissionOperationResult,
} from './dto/permission.dto';
import {
  Permission,
  PERMISSION_PRESETS,
  ALL_PERMISSIONS,
} from '../common/permissions';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  // Add new employee
  async createEmployee(userId: string, createDto: CreateEmployeeDto) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true, company: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get company - only BOSS can create employees
    if (user.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can add employees');
    }

    if (!user.ownedCompanies || user.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = user.ownedCompanies[0];

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    // Create employee
    const employee = await this.prisma.user.create({
      data: {
        email: createDto.email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        companyId: company.id,
        createdBy: userId,
        skills: createDto.skills || [],
        achievements: createDto.achievements,
        attendance: createDto.attendance || 0,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        skills: true,
        achievements: true,
        attendance: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log in company audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId: company.id,
        action: 'EMPLOYEE_CREATED',
        resource: 'employee',
        performedBy: userId,
        metadata: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
        }),
      },
    });

    return {
      success: true,
      message: 'Employee created successfully',
      employee,
    };
  }

  // Get all employees for a company
  async getEmployees(userId: string, skip = 0, take = 20) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true, company: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get company - either owned by BOSS or employee's company
    let company;
    if (user.role === 'BOSS') {
      if (!user.ownedCompanies || user.ownedCompanies.length === 0) {
        throw new BadRequestException('No company found for this user');
      }
      company = user.ownedCompanies[0];
    } else {
      if (!user.company) {
        throw new BadRequestException('Employee not assigned to any company');
      }
      company = user.company;
    }

    // Get employees belonging to this company
    const [employees, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          companyId: company.id,
          role: 'EMPLOYEE',
        },
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          mobile: true,
          skills: true,
          achievements: true,
          attendance: true,
          isActive: true,
          // All permission fields
          canCreateProject: true,
          canUpdateProject: true,
          canDeleteProject: true,
          canViewAllProjects: true,
          canCreateTask: true,
          canUpdateTask: true,
          canDeleteTask: true,
          canCompleteTask: true,
          canVerifyTask: true,
          canViewAllTasks: true,
          canViewOverdueTasks: true,
          canCreateEmployee: true,
          canUpdateEmployee: true,
          canDeleteEmployee: true,
          canViewAllEmployees: true,
          canManagePermissions: true,
          canCreateTeam: true,
          canUpdateTeam: true,
          canDeleteTeam: true,
          canViewAllTeams: true,
          canViewAuditLogs: true,
          canViewAllSessions: true,
          canManage2FA: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          companyId: company.id,
          role: 'EMPLOYEE',
        },
      }),
    ]);

    return {
      employees,
      total,
      skip,
      take,
      company: {
        id: company.id,
        name: company.name,
      },
    };
  }

  // Get single employee details
  async getEmployee(userId: string, employeeId: string) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true, company: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get company - either owned by BOSS or employee's company
    let company;
    if (user.role === 'BOSS') {
      if (!user.ownedCompanies || user.ownedCompanies.length === 0) {
        throw new BadRequestException('No company found for this user');
      }
      company = user.ownedCompanies[0];
    } else {
      if (!user.company) {
        throw new BadRequestException('Employee not assigned to any company');
      }
      company = user.company;
    }

    // Get employee
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: company.id,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        email: true,
        mobile: true,
        skills: true,
        achievements: true,
        attendance: true,
        isActive: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }

    return employee;
  }

  // Update employee
  async updateEmployee(
    userId: string,
    employeeId: string,
    updateDto: UpdateEmployeeDto,
  ) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true, company: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get company
    let company;
    if (user.role === 'BOSS') {
      if (!user.ownedCompanies || user.ownedCompanies.length === 0) {
        throw new BadRequestException('No company found for this user');
      }
      company = user.ownedCompanies[0];
    } else {
      if (!user.company) {
        throw new BadRequestException('Employee not assigned to any company');
      }
      company = user.company;
    }

    // Check if employee exists and belongs to company
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: company.id,
        role: 'EMPLOYEE',
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (updateDto.email) {
      // Check if email already exists for another user
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateDto.email },
      });

      if (existingUser && existingUser.id !== employeeId) {
        throw new BadRequestException('Email already exists');
      }

      updateData.email = updateDto.email;
    }

    if (updateDto.password) {
      updateData.password = await bcrypt.hash(updateDto.password, 10);
    }

    if (updateDto.skills !== undefined) {
      updateData.skills = updateDto.skills;
    }

    if (updateDto.achievements !== undefined) {
      updateData.achievements = updateDto.achievements;
    }

    if (updateDto.attendance !== undefined) {
      updateData.attendance = updateDto.attendance;
    }

    // Update employee
    const updatedEmployee = await this.prisma.user.update({
      where: { id: employeeId },
      data: updateData,
      select: {
        id: true,
        email: true,
        mobile: true,
        skills: true,
        achievements: true,
        attendance: true,
        isActive: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log in company audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId: company.id,
        action: 'EMPLOYEE_UPDATED',
        resource: 'employee',
        performedBy: userId,
        metadata: JSON.stringify({
          employeeId: updatedEmployee.id,
          updatedFields: Object.keys(updateData),
        }),
      },
    });

    return {
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee,
    };
  }

  // Delete/Deactivate employee (BOSS only)
  async deleteEmployee(userId: string, employeeId: string) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true },
    });

    if (!user || user.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can remove employees');
    }

    if (!user.ownedCompanies || user.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = user.ownedCompanies[0];

    // Check if employee exists and belongs to company
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: company.id,
        role: 'EMPLOYEE',
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }

    // Soft delete - deactivate instead of deleting
    await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        isActive: false,
        companyId: null, // Remove from company
      },
    });

    // Log in company audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId: company.id,
        action: 'EMPLOYEE_REMOVED',
        resource: 'employee',
        performedBy: userId,
        metadata: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
        }),
      },
    });

    return {
      success: true,
      message: 'Employee removed successfully',
    };
  }

  // Update employee permissions (BOSS only)
  async updatePermissions(
    userId: string,
    employeeId: string,
    permissions: { canCompleteTask?: boolean; canVerifyTask?: boolean },
  ) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true },
    });

    if (!user || user.role !== 'BOSS') {
      throw new ForbiddenException(
        'Only company owners can update employee permissions',
      );
    }

    if (!user.ownedCompanies || user.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = user.ownedCompanies[0];

    // Check if employee exists and belongs to company
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: company.id,
        role: 'EMPLOYEE',
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }

    // Update permissions
    const updatedEmployee = await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        canCompleteTask: permissions.canCompleteTask,
        canVerifyTask: permissions.canVerifyTask,
      },
      select: {
        id: true,
        email: true,
        name: true,
        skills: true,
        canCompleteTask: true,
        canVerifyTask: true,
        isActive: true,
      },
    });

    // Log in company audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId: company.id,
        action: 'EMPLOYEE_PERMISSIONS_UPDATED',
        resource: 'employee',
        performedBy: userId,
        metadata: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
          permissions,
        }),
      },
    });
    return updatedEmployee;
  }

  // Update employee attendance (BOSS only)
  async updateAttendance(
    userId: string,
    employeeId: string,
    attendance: number,
  ) {
    // Get boss user with company
    const boss = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can update attendance');
    }

    if (!boss.ownedCompanies || boss.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = boss.ownedCompanies[0];

    // Verify employee belongs to company
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: company.id,
        role: 'EMPLOYEE',
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }

    // Update attendance
    const updatedEmployee = await this.prisma.user.update({
      where: { id: employeeId },
      data: { attendance },
      select: {
        id: true,
        email: true,
        name: true,
        skills: true,
        attendance: true,
        isActive: true,
      },
    });

    // Log in company audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId: company.id,
        action: 'EMPLOYEE_ATTENDANCE_UPDATED',
        resource: 'employee',
        performedBy: userId,
        metadata: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
          attendance,
        }),
      },
    });

    return updatedEmployee;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   *                  BULK PERMISSION MANAGEMENT METHODS
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * Bulk assign permissions to multiple employees
   * BOSS or employee with canManagePermissions can use this
   */
  async bulkAssignPermissions(
    performerId: string,
    bulkDto: BulkAssignPermissionsDto,
  ): Promise<PermissionOperationResult> {
    // Verify performer has permission
    const performer = await this.prisma.user.findUnique({
      where: { id: performerId },
      include: { ownedCompanies: true },
    });

    if (!performer) {
      throw new NotFoundException('User not found');
    }

    // Check if BOSS or has canManagePermissions
    const isBoss = performer.role === 'BOSS';
    const canManage = performer.canManagePermissions;

    if (!isBoss && !canManage) {
      throw new ForbiddenException(
        'Only BOSS or users with canManagePermissions can manage permissions',
      );
    }

    const companyId = isBoss
      ? performer.ownedCompanies[0]?.id
      : performer.companyId;

    if (!companyId) {
      throw new BadRequestException('No company associated with user');
    }

    // Validate all employees belong to the same company
    const employees = await this.prisma.user.findMany({
      where: {
        id: { in: bulkDto.employeeIds },
        companyId,
        role: 'EMPLOYEE',
      },
    });

    if (employees.length !== bulkDto.employeeIds.length) {
      throw new BadRequestException(
        'One or more employees not found or do not belong to your company',
      );
    }

    // Validate permissions
    const validPermissions = ALL_PERMISSIONS.map((p) => p.key);
    const invalidPermissions = bulkDto.permissions.filter(
      (p) => !validPermissions.includes(p),
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}`,
      );
    }

    // Build update data
    const permissionUpdates: Record<string, boolean> = {};

    if (bulkDto.overwrite) {
      // Reset all permissions first
      validPermissions.forEach((perm) => {
        permissionUpdates[perm] = false;
      });
    }

    // Set specified permissions to true
    bulkDto.permissions.forEach((perm) => {
      permissionUpdates[perm] = true;
    });

    // Update all employees
    const errors: string[] = [];
    let successCount = 0;

    for (const employee of employees) {
      try {
        await this.prisma.user.update({
          where: { id: employee.id },
          data: permissionUpdates,
        });
        successCount++;
      } catch (error) {
        errors.push(`Failed to update ${employee.email}: ${error.message}`);
      }
    }

    // Log in company audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId,
        action: 'BULK_PERMISSIONS_ASSIGNED',
        resource: 'employee',
        performedBy: performerId,
        metadata: JSON.stringify({
          employeeIds: bulkDto.employeeIds,
          permissions: bulkDto.permissions,
          overwrite: bulkDto.overwrite,
          successCount,
          totalCount: bulkDto.employeeIds.length,
        }),
      },
    });

    return {
      success: errors.length === 0,
      message: `Successfully updated ${successCount} out of ${bulkDto.employeeIds.length} employees`,
      employeesUpdated: successCount,
      permissionsGranted: bulkDto.permissions.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Apply a permission preset to employees
   */
  async applyPreset(
    performerId: string,
    presetDto: ApplyPresetDto,
  ): Promise<PermissionOperationResult> {
    const permissions = PERMISSION_PRESETS[presetDto.presetName];

    if (!permissions) {
      throw new BadRequestException(`Unknown preset: ${presetDto.presetName}`);
    }

    return this.bulkAssignPermissions(performerId, {
      employeeIds: presetDto.employeeIds,
      permissions,
      overwrite: presetDto.overwrite,
    });
  }

  /**
   * Get all permissions for an employee
   */
  async getEmployeePermissions(userId: string, employeeId: string) {
    const boss = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only BOSS can view employee permissions');
    }

    const companyId = boss.ownedCompanies[0]?.id;
    if (!companyId) {
      throw new BadRequestException('No company found');
    }

    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId,
        role: 'EMPLOYEE',
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Extract all permission fields
    const permissions: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((perm) => {
      permissions[perm.key] = employee[perm.key] || false;
    });

    return {
      employeeId: employee.id,
      email: employee.email,
      name: employee.name,
      permissions,
    };
  }

  /**
   * Remove all permissions from an employee
   */
  async revokeAllPermissions(userId: string, employeeId: string) {
    const boss = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only BOSS can revoke employee permissions');
    }

    const companyId = boss.ownedCompanies[0]?.id;
    if (!companyId) {
      throw new BadRequestException('No company found');
    }

    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId,
        role: 'EMPLOYEE',
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Set all permissions to false
    const permissionUpdates: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((perm) => {
      permissionUpdates[perm.key] = false;
    });

    await this.prisma.user.update({
      where: { id: employeeId },
      data: permissionUpdates,
    });

    // Log audit
    await this.prisma.companyAuditLog.create({
      data: {
        companyId,
        action: 'ALL_PERMISSIONS_REVOKED',
        resource: 'employee',
        performedBy: userId,
        metadata: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
        }),
      },
    });

    return {
      success: true,
      message: 'All permissions revoked successfully',
    };
  }
}
