import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../redis/cache.service';
import { Reflector } from '@nestjs/core';

/**
 * Cache invalidation interceptor - automatically invalidates cache on mutation operations
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Only invalidate on mutation methods (POST, PUT, PATCH, DELETE)
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutationMethods.includes(request.method)) {
      return next.handle();
    }

    // Get invalidation tags from decorator
    const invalidateTags = this.reflector.get<string[]>(
      'invalidate_cache_tags',
      handler,
    );

    if (!invalidateTags || invalidateTags.length === 0) {
      return next.handle();
    }

    // Execute handler first, then invalidate cache on success
    return next.handle().pipe(
      tap(async () => {
        await this.cacheService.invalidateByTags(invalidateTags);
      }),
    );
  }
}
