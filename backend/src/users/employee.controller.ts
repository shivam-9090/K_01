import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BOSS') // All employee routes are BOSS-only
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  // Create new employee
  @Post()
  async createEmployee(@Request() req, @Body() createDto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(req.user.userId, createDto);
  }

  // Get all employees for the company
  @Get()
  async getEmployees(
    @Request() req,
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    return this.employeeService.getEmployees(req.user.userId, +skip, +take);
  }

  // Get single employee details
  @Get(':id')
  async getEmployee(@Request() req, @Param('id') employeeId: string) {
    return this.employeeService.getEmployee(req.user.userId, employeeId);
  }

  // Update employee
  @Put(':id')
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
  async deleteEmployee(@Request() req, @Param('id') employeeId: string) {
    return this.employeeService.deleteEmployee(req.user.userId, employeeId);
  }
}
