import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserFromRequest {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

/**
 * Custom decorator to extract current user from request
 * @example
 * @Get()
 * async getProfile(@CurrentUser() user: UserFromRequest) {
 *   return user;
 * }
 *
 * @example
 * @Get()
 * async getProfile(@CurrentUser('userId') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserFromRequest | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
