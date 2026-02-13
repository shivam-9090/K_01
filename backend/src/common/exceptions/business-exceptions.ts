import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

/**
 * Centralized business exception factory
 * Provides consistent error messages across the application
 */
export class BusinessExceptions {
  // User-related exceptions
  static userNotFound(userId?: string): NotFoundException {
    return new NotFoundException(
      userId ? `User with ID ${userId} not found` : 'User not found',
    );
  }

  static userAlreadyExists(email: string): ConflictException {
    return new ConflictException(`User with email ${email} already exists`);
  }

  static userNotActive(): ForbiddenException {
    return new ForbiddenException('User account is not active');
  }

  // Company-related exceptions
  static noCompany(): ForbiddenException {
    return new ForbiddenException(
      'User must belong to a company to perform this action',
    );
  }

  static companyNotFound(companyId?: string): NotFoundException {
    return new NotFoundException(
      companyId
        ? `Company with ID ${companyId} not found`
        : 'Company not found',
    );
  }

  static resourceNotInCompany(
    resourceType: string = 'Resource',
  ): ForbiddenException {
    return new ForbiddenException(
      `${resourceType} does not belong to your company`,
    );
  }

  // Role and permission exceptions
  static bossOnly(): ForbiddenException {
    return new ForbiddenException(
      'Only company owners (BOSS) can perform this action',
    );
  }

  static insufficientPermissions(action?: string): ForbiddenException {
    return new ForbiddenException(
      action
        ? `You don't have permission to ${action}`
        : 'Insufficient permissions to perform this action',
    );
  }

  // Resource-related exceptions
  static projectNotFound(projectId?: string): NotFoundException {
    return new NotFoundException(
      projectId
        ? `Project with ID ${projectId} not found`
        : 'Project not found',
    );
  }

  static taskNotFound(taskId?: string): NotFoundException {
    return new NotFoundException(
      taskId ? `Task with ID ${taskId} not found` : 'Task not found',
    );
  }

  static teamNotFound(teamId?: string): NotFoundException {
    return new NotFoundException(
      teamId ? `Team with ID ${teamId} not found` : 'Team not found',
    );
  }

  static employeeNotFound(employeeId?: string): NotFoundException {
    return new NotFoundException(
      employeeId
        ? `Employee with ID ${employeeId} not found`
        : 'Employee not found',
    );
  }

  // Authentication exceptions
  static invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid credentials');
  }

  static invalidToken(): UnauthorizedException {
    return new UnauthorizedException('Invalid or expired token');
  }

  static sessionExpired(): UnauthorizedException {
    return new UnauthorizedException('Session expired, please login again');
  }

  // 2FA exceptions
  static invalid2FACode(): BadRequestException {
    return new BadRequestException('Invalid 2FA code');
  }

  static twoFANotEnabled(): BadRequestException {
    return new BadRequestException('2FA is not enabled for this user');
  }

  static twoFAAlreadyEnabled(): ConflictException {
    return new ConflictException('2FA is already enabled for this user');
  }

  // Validation exceptions
  static invalidInput(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static requiredField(fieldName: string): BadRequestException {
    return new BadRequestException(`${fieldName} is required`);
  }

  // Generic exceptions
  static operationFailed(
    operation: string,
    reason?: string,
  ): BadRequestException {
    return new BadRequestException(
      reason ? `${operation} failed: ${reason}` : `${operation} failed`,
    );
  }

  static resourceAlreadyExists(
    resourceType: string,
    identifier: string,
  ): ConflictException {
    return new ConflictException(
      `${resourceType} with ${identifier} already exists`,
    );
  }
}
