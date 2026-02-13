import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Acquire a distributed lock using SET NX
   * @param key Lock key
   * @param ttlSeconds TTL in seconds
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release a distributed lock
   * @param key Lock key
   */
  async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Get value by key
   * @param key Redis key
   * @returns Value or null
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set value with optional TTL
   * @param key Redis key
   * @param value Value to store
   * @param ttlSeconds Optional TTL in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete key
   * @param key Redis key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Increment counter
   * @param key Redis key
   * @returns New value after increment
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Get keys matching pattern
   * @param pattern Key pattern (e.g., 'user:*')
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Count keys matching pattern
   * @param pattern Key pattern
   * @returns Number of matching keys
   */
  async countKeys(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    return keys.length;
  }
}
