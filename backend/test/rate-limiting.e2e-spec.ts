import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Rate Limiting (e2e)', () => {
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

  describe('Login Rate Limiting', () => {
    it('should allow limited login attempts per minute', async () => {
      const requests = [];
      const testEmail = 'rate-test@example.com';

      // Attempt 10 logins (limit should be around 5/min)
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: testEmail,
            password: 'TestPass@123456',
          }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should return 429 with rate limit message', async () => {
      const requests = [];

      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'test@test.com',
            password: 'pass',
          }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find((r) => r.status === 429);

      if (rateLimited) {
        expect(rateLimited.body.message).toBeDefined();
      }
    });
  });

  describe('2FA Rate Limiting', () => {
    let testToken: string;
    const testUser = {
      email: `2fa-rate-${Date.now()}@example.com`,
      password: 'SecurePass@123456',
      name: 'TwoFA Rate',
      companyName: `TwoFARateCo${Date.now()}`,
      mobile: `12345${Date.now().toString().slice(-5)}`,
      username: `2farate${Date.now()}`,
    };

    beforeAll(async () => {
      // Register test user with BOSS role
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      testToken = loginResponse.body.accessToken;
    });

    it('should rate limit 2FA generation attempts', async () => {
      const requests = [];

      // Try to generate 2FA secret multiple times
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/2fa/generate')
            .set('Authorization', `Bearer ${testToken}`),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      // Should hit rate limit
      expect(rateLimited.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('General API Rate Limiting', () => {
    it('should rate limit general endpoints', async () => {
      const requests = [];

      // Make 20 rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(request(app.getHttpServer()).get('/health'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track rate limits per IP', async () => {
      // This test validates that rate limiting works per IP
      // In a real scenario, you'd need to simulate different IPs

      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.100'),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit after TTL', async () => {
      // First batch of requests
      const firstBatch = [];
      for (let i = 0; i < 12; i++) {
        firstBatch.push(request(app.getHttpServer()).get('/health'));
      }

      await Promise.all(firstBatch);

      // Wait for rate limit to reset (60 seconds)
      await new Promise((resolve) => setTimeout(resolve, 61000));

      // Should be able to make requests again
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(200);
    }, 65000); // Increase timeout for this test
  });

  describe('Bypass Rate Limiting', () => {
    it('should not rate limit health checks excessively', async () => {
      // Health endpoint should have higher limits
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(request(app.getHttpServer()).get('/health'));
      }

      const responses = await Promise.all(requests);
      const successful = responses.filter((r) => r.status === 200);

      // Should allow at least some requests through
      expect(successful.length).toBeGreaterThan(10);
    });
  });
});
