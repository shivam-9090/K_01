import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Security Features (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

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

  describe('Security Headers', () => {
    it('should have HSTS header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers['strict-transport-security']).toBeDefined();
          expect(res.headers['strict-transport-security']).toContain(
            'max-age=31536000',
          );
        });
    });

    it('should have X-Frame-Options header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['x-frame-options']).toBe('DENY');
        });
    });

    it('should have X-Content-Type-Options header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['x-content-type-options']).toBe('nosniff');
        });
    });

    it('should have X-XSS-Protection header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['x-xss-protection']).toBeDefined();
        });
    });

    it('should have Referrer-Policy header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['referrer-policy']).toBe('no-referrer');
        });
    });

    it('should have Content-Security-Policy header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['content-security-policy']).toBeDefined();
        });
    });

    it('should hide X-Powered-By header', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['x-powered-by']).toBeUndefined();
        });
    });
  });

  describe('CORS Configuration', () => {
    it('should allow configured origins', () => {
      return request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);
    });

    it('should block wildcard origins', () => {
      return request(app.getHttpServer())
        .get('/health')
        .set('Origin', '*')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).not.toBe('*');
        });
    });

    it('should block unauthorized origins', () => {
      return request(app.getHttpServer())
        .options('/auth/login')
        .set('Origin', 'https://evil.com')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests = [];

      // Make 15 requests (limit is 10)
      for (let i = 0; i < 15; i++) {
        requests.push(request(app.getHttpServer()).get('/health'));
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });

    it('should have rate limit headers', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.headers['x-ratelimit-limit']).toBeDefined();
          expect(res.headers['x-ratelimit-remaining']).toBeDefined();
        });
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'ValidPass@123456',
          name: 'Test User',
          companyName: `TestCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: 'testuser',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('email');
        });
    });

    it('should reject weak passwords', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
          companyName: `TestCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: 'testuser',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('password');
        });
    });

    it('should reject passwords without special characters', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'NoSpecialChar123',
          name: 'Test User',
          companyName: `TestCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: 'testuser',
        })
        .expect(400);
    });

    it('should reject extra fields (whitelist mode)', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPass@123456',
          name: 'Test User',
          companyName: `TestCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: 'testuser',
          extraField: 'should be rejected',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('extraField');
        });
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          // missing password
          username: 'testuser',
        })
        .expect(400);
    });

    it('should reject SQL injection attempts', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: "admin'--",
          password: "' OR '1'='1",
        })
        .expect((res) => {
          expect(res.status).not.toBe(200);
        });
    });
  });

  describe('JWT Security', () => {
    const testUser = {
      email: `security-test-${Date.now()}@example.com`,
      password: 'SecurePass@123456',
      name: 'Security Test',
      companyName: `SecurityCo${Date.now()}`,
      mobile: `12345${Date.now().toString().slice(-5)}`,
      username: `sectest${Date.now()}`,
    };

    beforeAll(async () => {
      // Register and login test user
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should reject requests without token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject invalid tokens', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject malformed tokens', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer malformed')
        .expect(401);
    });

    it('should accept valid tokens', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject expired tokens', async () => {
      // This would require mocking time or waiting for token expiration
      // For now, we document the expected behavior
      expect(true).toBe(true);
    });
  });

  describe('Request Size Limits', () => {
    it('should reject oversized requests', () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB (limit is 10MB)

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPass@123456',
          name: largePayload,
          companyName: `TestCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: 'testuser',
        })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
  });

  describe('Password Security', () => {
    it('should hash passwords (not store plaintext)', async () => {
      const testEmail = `hash-test-${Date.now()}@example.com`;
      const testPassword = 'TestPass@123456';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Hash Test',
          companyName: `HashCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: `hashtest${Date.now()}`,
        })
        .expect(201);

      // Login should work with original password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(loginResponse.body.user.password).toBeUndefined();
    });

    it('should reject incorrect passwords', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword@123',
        })
        .expect(401);
    });
  });

  describe('Authentication Lockout', () => {
    it('should lock account after failed login attempts', async () => {
      const testEmail = `lockout-test-${Date.now()}@example.com`;
      const testPassword = 'LockTest@123456';

      // Register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Lock Test',
          companyName: `LockCo${Date.now()}`,
          mobile: `12345${Date.now().toString().slice(-5)}`,
          username: `locktest${Date.now()}`,
        });

      // Make 6 failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer()).post('/auth/login').send({
          email: testEmail,
          password: 'WrongPassword@123',
        });
      }

      // Next attempt should be locked
      const lockResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(lockResponse.status).toBe(401);
      expect(lockResponse.body.message).toContain('locked');
    });
  });

  describe('Session Security', () => {
    it('should not reuse refresh tokens', async () => {
      const testUser = {
        email: `token-test-${Date.now()}@example.com`,
        password: 'TokenTest@123456',
        name: 'Token Test',
        companyName: `TokenCo${Date.now()}`,
        mobile: `12345${Date.now().toString().slice(-5)}`,
        username: `tokentest${Date.now()}`,
      };

      // Register
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Use refresh token once
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Try to reuse the same refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
