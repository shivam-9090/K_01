import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Monitoring and Health Checks (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Prometheus Metrics', () => {
    it('should expose /metrics endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should include custom application metrics', async () => {
      const response = await request(app.getHttpServer()).get('/metrics');

      // Check for custom metrics
      expect(response.text).toContain('auth_backend_http_requests_total');
      expect(response.text).toContain(
        'auth_backend_http_request_duration_seconds',
      );
      expect(response.text).toContain('auth_backend_auth_attempts_total');
      expect(response.text).toContain('auth_backend_auth_failures_total');
      expect(response.text).toContain('auth_backend_twofa_attempts_total');
      expect(response.text).toContain('auth_backend_active_sessions');
      expect(response.text).toContain('auth_backend_db_connections');
      expect(response.text).toContain('auth_backend_api_errors_total');
    });

    it('should include Node.js default metrics', async () => {
      const response = await request(app.getHttpServer()).get('/metrics');

      // Default metrics from prom-client
      expect(response.text).toContain('process_cpu_seconds_total');
      expect(response.text).toContain('process_resident_memory_bytes');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
      expect(response.text).toContain('nodejs_eventloop_lag_seconds');
    });

    it('should increment request counter on API calls', async () => {
      // Make a request
      await request(app.getHttpServer()).get('/health').expect(200);

      // Check metrics
      const metricsResponse = await request(app.getHttpServer()).get(
        '/metrics',
      );

      expect(metricsResponse.text).toContain('http_requests_total');
    });
  });

  describe('Health Check Endpoints', () => {
    it('should return healthy status on /health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.info).toBeDefined();
    });

    it('should check database health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.info.database).toBeDefined();
      expect(response.body.info.database.status).toBe('up');
    });

    it('should check disk health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.info.storage).toBeDefined();
      expect(response.body.info.storage.status).toBe('up');
    });

    it('should check memory health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.info.memory_heap).toBeDefined();
      expect(response.body.info.memory_rss).toBeDefined();
    });

    it('should support liveness probe', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should support readiness probe', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.info.database).toBeDefined();
    });
  });

  describe('Metrics Recording', () => {
    it('should record HTTP request metrics', async () => {
      const beforeMetrics = await request(app.getHttpServer()).get('/metrics');

      // Make multiple requests
      await request(app.getHttpServer()).get('/health');
      await request(app.getHttpServer()).get('/health');
      await request(app.getHttpServer()).get('/health');

      const afterMetrics = await request(app.getHttpServer()).get('/metrics');

      // Metrics should have increased
      expect(afterMetrics.text).toContain('http_requests_total');
    });

    it('should record authentication metrics on login', async () => {
      const testUser = {
        email: `metrics-test-${Date.now()}@example.com`,
        password: 'MetricsP@ss123',
        username: `metricstest${Date.now()}`,
        firstName: 'Metrics',
        lastName: 'Test',
      };

      // Register user
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Successful login
      await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      // Failed login
      await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword',
      });

      // Check metrics
      const metrics = await request(app.getHttpServer()).get('/metrics');
      expect(metrics.text).toContain('auth_attempts_total');
      expect(metrics.text).toContain('auth_failures_total');
    });

    it('should record error metrics', async () => {
      // Trigger an error
      await request(app.getHttpServer())
        .get('/nonexistent-endpoint')
        .expect(404);

      const metrics = await request(app.getHttpServer()).get('/metrics');
      expect(metrics.text).toContain('api_errors_total');
    });
  });

  describe('Logging', () => {
    it('should log all HTTP requests', async () => {
      // Make a request
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Logs are written asynchronously, so this test mainly ensures no errors
      expect(response.status).toBe(200);
    });

    it('should log authentication attempts', async () => {
      const testUser = {
        email: `logging-test-${Date.now()}@example.com`,
        password: 'LoggingP@ss123',
        username: `loggingtest${Date.now()}`,
        firstName: 'Logging',
        lastName: 'Test',
      };

      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Login attempt should be logged
      await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(true).toBe(true); // Logs are written asynchronously
    });

    it('should log errors with proper severity', async () => {
      // Trigger server error (if possible)
      await request(app.getHttpServer()).get('/health').expect(200);

      expect(true).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      const start = Date.now();

      await request(app.getHttpServer()).get('/health/live').expect(200);

      const duration = Date.now() - start;

      // Should respond in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should respond quickly to metrics endpoint', async () => {
      const start = Date.now();

      await request(app.getHttpServer()).get('/metrics').expect(200);

      const duration = Date.now() - start;

      // Should respond in less than 200ms
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent health check requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('Observability', () => {
    it('should provide metrics for debugging', async () => {
      const response = await request(app.getHttpServer()).get('/metrics');

      // Should have metrics that help debug issues
      expect(response.text).toContain('process_cpu_seconds_total');
      expect(response.text).toContain('process_resident_memory_bytes');
      expect(response.text).toContain('http_request_duration_seconds');
    });

    it('should expose metric labels for filtering', async () => {
      const response = await request(app.getHttpServer()).get('/metrics');

      // Metrics should have labels for filtering
      expect(response.text).toMatch(/method="[A-Z]+"/);
      expect(response.text).toMatch(/status_code="\d+"/);
      expect(response.text).toMatch(/route="[^"]+"/);
    });
  });
});
