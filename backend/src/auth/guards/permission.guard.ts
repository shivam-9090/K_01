import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // BOSS always has all permissions
    if (user.role === 'BOSS') {
      return true;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some(
      (permission) => user[permission] === true,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have the required permissions to access this resource',
      );
    }

    return true;
  }
}
