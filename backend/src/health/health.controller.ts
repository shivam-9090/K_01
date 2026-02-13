import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { CacheService } from '../redis/cache.service';
import { BossOnly } from '../common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private cacheService: CacheService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Comprehensive health check: database, disk, memory',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () =>
        this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
    ]);
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Kubernetes liveness probe - always returns healthy if app is running',
  })
  @ApiResponse({ status: 200, description: 'App is alive' })
  @HealthCheck()
  liveness() {
    // Kubernetes liveness probe - basic health check
    return this.health.check([]);
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Kubernetes readiness probe - checks if ready to accept traffic',
  })
  @ApiResponse({ status: 200, description: 'App is ready' })
  @ApiResponse({ status: 503, description: 'App is not ready' })
  @HealthCheck()
  readiness() {
    // Kubernetes readiness probe - check if ready to accept traffic
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Cache statistics',
    description: 'Get Redis cache hit/miss ratio and performance metrics',
  })
  @ApiResponse({ status: 200, description: 'Cache stats retrieved' })
  getCacheStats() {
    return {
      success: true,
      stats: this.cacheService.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('cache/reset')
  @BossOnly()
  @ApiOperation({
    summary: 'Reset cache statistics',
    description: 'Reset cache hit/miss counters (BOSS only)',
  })
  @ApiResponse({ status: 200, description: 'Cache stats reset' })
  resetCacheStats() {
    this.cacheService.resetStats();
    return {
      success: true,
      message: 'Cache statistics reset',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('cache/clear')
  @BossOnly()
  @ApiOperation({
    summary: 'Clear all cache',
    description: 'Delete all cached data (BOSS only)',
  })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    await this.cacheService.clear();
    return {
      success: true,
      message: 'All cache cleared',
      timestamp: new Date().toISOString(),
    };
  }
}
