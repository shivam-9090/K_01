import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'auth_backend_',
        },
      },
    }),
  ],
  providers: [
    MetricsService,
    // HTTP Metrics
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    // Auth Metrics
    makeCounterProvider({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: 'auth_failures_total',
      help: 'Total number of failed authentication attempts',
      labelNames: ['reason'],
    }),
    // 2FA Metrics
    makeCounterProvider({
      name: 'twofa_attempts_total',
      help: 'Total number of 2FA attempts',
      labelNames: ['type', 'status'],
    }),
    makeCounterProvider({
      name: 'twofa_failures_total',
      help: 'Total number of failed 2FA attempts',
      labelNames: ['type'],
    }),
    // System Metrics
    makeGaugeProvider({
      name: 'active_sessions',
      help: 'Number of active user sessions',
    }),
    makeGaugeProvider({
      name: 'db_connections',
      help: 'Number of active database connections',
    }),
    // Error Metrics
    makeCounterProvider({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['endpoint', 'error_type'],
    }),
  ],
  exports: [MetricsService, PrometheusModule],
})
export class MetricsModule {}
