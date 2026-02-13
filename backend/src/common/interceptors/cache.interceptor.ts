import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../redis/cache.service';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const CACHE_TAGS_METADATA = 'cache_tags';

/**
 * Cache interceptor - automatically caches HTTP responses
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
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

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get cache metadata from decorator
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const cacheTTL =
      this.reflector.get<number>(CACHE_TTL_METADATA, handler) || 30;
    const cacheTags =
      this.reflector.get<string[]>(CACHE_TAGS_METADATA, handler) || [];

    // If no cache key specified, skip caching
    if (!cacheKey) {
      return next.handle();
    }

    // Build cache key with user context
    const user = request.user;
    const companyId = user?.companyId || 'public';
    const userId = user?.userId || 'anonymous';
    const fullCacheKey = `${cacheKey}:company:${companyId}:user:${userId}:${request.url}`;

    // Try to get from cache
    const cached = await this.cacheService.get(fullCacheKey);
    if (cached) {
      return of(cached);
    }

    // Cache miss - execute handler and cache result
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(fullCacheKey, response, {
          ttl: cacheTTL,
          tags: cacheTags,
        });
      }),
    );
  }
}
