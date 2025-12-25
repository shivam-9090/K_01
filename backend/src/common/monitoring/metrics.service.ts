import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    public httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,
    @InjectMetric('auth_attempts_total')
    public authAttemptsTotal: Counter<string>,
    @InjectMetric('auth_failures_total')
    public authFailuresTotal: Counter<string>,
    @InjectMetric('twofa_attempts_total')
    public twofaAttemptsTotal: Counter<string>,
    @InjectMetric('twofa_failures_total')
    public twofaFailuresTotal: Counter<string>,
    @InjectMetric('active_sessions') public activeSessions: Gauge<string>,
    @InjectMetric('db_connections') public dbConnections: Gauge<string>,
    @InjectMetric('api_errors_total') public apiErrorsTotal: Counter<string>,
  ) {}

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      duration / 1000, // Convert to seconds
    );
  }

  recordAuthAttempt(success: boolean, reason?: string) {
    this.authAttemptsTotal.inc({ status: success ? 'success' : 'failure' });

    if (!success) {
      this.authFailuresTotal.inc({ reason: reason || 'unknown' });
    }
  }

  record2FAAttempt(success: boolean, type: 'totp' | 'backup') {
    this.twofaAttemptsTotal.inc({
      type,
      status: success ? 'success' : 'failure',
    });

    if (!success) {
      this.twofaFailuresTotal.inc({ type });
    }
  }

  recordError(endpoint: string, errorType: string) {
    this.apiErrorsTotal.inc({
      endpoint,
      error_type: errorType,
    });
  }

  updateActiveSessions(count: number) {
    this.activeSessions.set(count);
  }

  updateDbConnections(count: number) {
    this.dbConnections.set(count);
  }
}
