import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 30)
  prefix?: string; // Cache key prefix
  tags?: string[]; // Tags for cache invalidation
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 30; // 30 seconds default
  private hits = 0;
  private misses = 0;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get cached value or execute function if cache miss
   * @param key Cache key
   * @param fetchFn Function to execute on cache miss
   * @param options Cache options
   * @returns Cached or fresh data
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, prefix = 'cache', tags = [] } = options;
    const cacheKey = this.buildKey(prefix, key);

    try {
      // Try to get from cache
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.hits++;
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Cache miss - fetch fresh data
      this.misses++;
      this.logger.debug(`Cache MISS: ${cacheKey}`);
      const data = await fetchFn();

      // Store in cache
      await this.redisService.set(cacheKey, JSON.stringify(data), ttl);

      // Store tags for invalidation
      if (tags.length > 0) {
        await this.storeTags(cacheKey, tags, ttl);
      }

      return data;
    } catch (error) {
      this.logger.error(`Cache error for key ${cacheKey}:`, error);
      // On cache error, fetch fresh data without caching
      return fetchFn();
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache options
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const { ttl = this.DEFAULT_TTL, prefix = 'cache', tags = [] } = options;
    const cacheKey = this.buildKey(prefix, key);

    try {
      await this.redisService.set(cacheKey, JSON.stringify(value), ttl);

      if (tags.length > 0) {
        await this.storeTags(cacheKey, tags, ttl);
      }

      this.logger.debug(`Cache SET: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${cacheKey}:`, error);
    }
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @param prefix Cache key prefix
   * @returns Cached value or null
   */
  async get<T>(key: string, prefix = 'cache'): Promise<T | null> {
    const cacheKey = this.buildKey(prefix, key);

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.hits++;
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }

      this.misses++;
      this.logger.debug(`Cache MISS: ${cacheKey}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Delete cache entry
   * @param key Cache key
   * @param prefix Cache key prefix
   */
  async delete(key: string, prefix = 'cache'): Promise<void> {
    const cacheKey = this.buildKey(prefix, key);

    try {
      await this.redisService.del(cacheKey);
      this.logger.debug(`Cache DELETE: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${cacheKey}:`, error);
    }
  }

  /**
   * Invalidate cache by tag(s)
   * @param tags Tags to invalidate
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const keysToDelete = new Set<string>();

      for (const tag of tags) {
        const tagKey = this.buildKey('tag', tag);
        const cached = await this.redisService.get(tagKey);

        if (cached) {
          const cacheKeys = JSON.parse(cached) as string[];
          cacheKeys.forEach((key) => keysToDelete.add(key));
        }

        // Delete tag key itself
        await this.redisService.del(tagKey);
      }

      // Delete all associated cache keys
      for (const key of keysToDelete) {
        await this.redisService.del(key);
      }

      this.logger.debug(
        `Cache INVALIDATED by tags [${tags.join(', ')}]: ${keysToDelete.size} keys deleted`,
      );
    } catch (error) {
      this.logger.error(`Cache invalidation error for tags ${tags}:`, error);
    }
  }

  /**
   * Invalidate cache by pattern
   * @param pattern Key pattern (e.g., 'projects:*')
   * @param prefix Cache key prefix
   */
  async invalidateByPattern(pattern: string, prefix = 'cache'): Promise<void> {
    try {
      const fullPattern = this.buildKey(prefix, pattern);
      const keys = await this.redisService.keys(fullPattern);

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redisService.del(key)));
        this.logger.debug(
          `Cache INVALIDATED by pattern ${fullPattern}: ${keys.length} keys deleted`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Cache invalidation error for pattern ${pattern}:`,
        error,
      );
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.invalidateByPattern('*');
      this.logger.warn('Cache CLEARED: All cache keys deleted');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache hit ratio and counts
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? ((this.hits / total) * 100).toFixed(2) : '0';

    return {
      hits: this.hits,
      misses: this.misses,
      total,
      hitRatio: `${hitRatio}%`,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.hits = 0;
    this.misses = 0;
    this.logger.debug('Cache stats reset');
  }

  /**
   * Build cache key with prefix
   * @param prefix Key prefix
   * @param key Original key
   * @returns Full cache key
   */
  private buildKey(prefix: string, key: string): string {
    return `${prefix}:${key}`;
  }

  /**
   * Store cache key tags for invalidation
   * @param cacheKey Cache key
   * @param tags Tags array
   * @param ttl Time to live
   */
  private async storeTags(
    cacheKey: string,
    tags: string[],
    ttl: number,
  ): Promise<void> {
    for (const tag of tags) {
      const tagKey = this.buildKey('tag', tag);
      const cached = await this.redisService.get(tagKey);

      let cacheKeys: string[] = [];
      if (cached) {
        cacheKeys = JSON.parse(cached);
      }

      if (!cacheKeys.includes(cacheKey)) {
        cacheKeys.push(cacheKey);
      }

      await this.redisService.set(tagKey, JSON.stringify(cacheKeys), ttl * 2); // Tags live 2x longer
    }
  }
}
