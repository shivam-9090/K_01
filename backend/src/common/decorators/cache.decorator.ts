import { SetMetadata } from '@nestjs/common';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_TAGS_METADATA,
} from '../interceptors/cache.interceptor';

/**
 * Cache decorator - marks endpoint for automatic caching
 * @param key Cache key prefix
 * @param ttl Cache TTL in seconds (default: 30)
 * @param tags Tags for cache invalidation
 *
 * @example
 * @CacheResponse('projects:list', 60, ['projects'])
 * @Get()
 * async getAllProjects() { ... }
 */
export const CacheResponse = (key: string, ttl = 30, tags: string[] = []) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TAGS_METADATA, tags)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Cache invalidation decorator - marks endpoint to invalidate cache
 * @param tags Tags to invalidate
 *
 * @example
 * @InvalidateCache(['projects', 'tasks'])
 * @Post()
 * async createProject() { ... }
 */
export const InvalidateCache = (tags: string[]) => {
  return SetMetadata('invalidate_cache_tags', tags);
};
