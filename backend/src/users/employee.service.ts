import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  // Add new employee (BOSS only)
  async createEmployee(bossId: string, createDto: CreateEmployeeDto) {
    // Get boss user with company
    const boss = await this.prisma.user.findUnique({
      where: { id: bossId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can add employees');
    }

    if (!boss.ownedCompanies || boss.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = boss.ownedCompanies[0];

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
        createdBy: bossId,
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
        performedBy: bossId,
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

  // Get all employees for a company (BOSS only)
  async getEmployees(bossId: string, skip = 0, take = 20) {
    // Get boss user with company
    const boss = await this.prisma.user.findUnique({
      where: { id: bossId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can view employees');
    }

    if (!boss.ownedCompanies || boss.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = boss.ownedCompanies[0];

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
          mobile: true,
          skills: true,
          achievements: true,
          attendance: true,
          isActive: true,
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

  // Get single employee details (BOSS only)
  async getEmployee(bossId: string, employeeId: string) {
    // Get boss user with company
    const boss = await this.prisma.user.findUnique({
      where: { id: bossId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException(
        'Only company owners can view employee details',
      );
    }

    if (!boss.ownedCompanies || boss.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = boss.ownedCompanies[0];

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

  // Update employee (BOSS only)
  async updateEmployee(
    bossId: string,
    employeeId: string,
    updateDto: UpdateEmployeeDto,
  ) {
    // Get boss user with company
    const boss = await this.prisma.user.findUnique({
      where: { id: bossId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can update employees');
    }

    if (!boss.ownedCompanies || boss.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = boss.ownedCompanies[0];

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
        performedBy: bossId,
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
  async deleteEmployee(bossId: string, employeeId: string) {
    // Get boss user with company
    const boss = await this.prisma.user.findUnique({
      where: { id: bossId },
      include: { ownedCompanies: true },
    });

    if (!boss || boss.role !== 'BOSS') {
      throw new ForbiddenException('Only company owners can remove employees');
    }

    if (!boss.ownedCompanies || boss.ownedCompanies.length === 0) {
      throw new BadRequestException('No company found for this user');
    }

    const company = boss.ownedCompanies[0];

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
        performedBy: bossId,
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
}
