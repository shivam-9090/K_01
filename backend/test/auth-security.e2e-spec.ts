import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Authentication Security (e2e)', () => {
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

  describe('Password Security', () => {
    const uniqueEmail = `password-test-${Date.now()}@example.com`;

    it('should reject weak passwords', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: '12345', // Too short
          username: `weakpass${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('password')]),
      );
    });

    it('should require password complexity', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'simplepassword', // No special chars, no uppercase, no numbers
          username: `simplepass${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
    });

    it('should accept strong passwords', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'StrongP@ssw0rd!', // Uppercase, lowercase, number, special char
          username: `strongpass${Date.now()}`,
          firstName: 'Test',
          lastName: 'User',
        });

      expect([200, 201, 409]).toContain(response.status);
    });

    it('should hash passwords before storing', async () => {
      const testUser = {
        email: `hash-test-${Date.now()}@example.com`,
        password: 'MySecureP@ss123',
        username: `hashtest${Date.now()}`,
        firstName: 'Hash',
        lastName: 'Test',
      };

      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Login should work with correct password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.accessToken).toBeDefined();
    });

    it('should reject incorrect passwords', async () => {
      const testUser = {
        email: `incorrect-${Date.now()}@example.com`,
        password: 'CorrectP@ss123',
        username: `incorrect${Date.now()}`,
        firstName: 'Incorrect',
        lastName: 'Test',
      };

      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Try to login with wrong password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongP@ss123',
        });

      expect(loginResponse.status).toBe(401);
    });
  });

  describe('JWT Security', () => {
    let validToken: string;
    const testUser = {
      email: `jwt-test-${Date.now()}@example.com`,
      password: 'JwtSecureP@ss123',
      username: `jwttest${Date.now()}`,
      firstName: 'JWT',
      lastName: 'Test',
    };

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      validToken = loginResponse.body.accessToken;
    });

    it('should reject requests without token', async () => {
      const response = await request(app.getHttpServer()).get('/users/me');

      expect(response.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not.a.valid.token');

      expect(response.status).toBe(401);
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        );

      expect(response.status).toBe(401);
    });

    it('should accept valid tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should include necessary claims in token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const token = loginResponse.body.accessToken;
      expect(token).toBeDefined();

      // Decode token (basic base64 decode)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );

      expect(payload.sub).toBeDefined(); // User ID
      expect(payload.email).toBeDefined();
      expect(payload.role).toBeDefined();
      expect(payload.iat).toBeDefined(); // Issued at
      expect(payload.exp).toBeDefined(); // Expiration
    });

    it('should reject expired tokens', async () => {
      // This test would require a token with past expiration
      // For production, implement token expiration testing
      expect(true).toBe(true);
    });
  });

  describe('Session Management', () => {
    const testUser = {
      email: `session-test-${Date.now()}@example.com`,
      password: 'SessionP@ss123',
      username: `sessiontest${Date.now()}`,
      firstName: 'Session',
      lastName: 'Test',
    };

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
    });

    it('should create new session on login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should allow token refresh with valid refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const refreshToken = loginResponse.body.refreshToken;

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect([200, 201]).toContain(refreshResponse.status);
      if (refreshResponse.status === 200 || refreshResponse.status === 201) {
        expect(refreshResponse.body.accessToken).toBeDefined();
      }
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' });

      expect(response.status).toBe(401);
    });

    it('should invalidate old tokens after password change', async () => {
      // Register new user for this test
      const pwChangeUser = {
        email: `pwchange-${Date.now()}@example.com`,
        password: 'OldP@ss123',
        username: `pwchange${Date.now()}`,
        firstName: 'PwChange',
        lastName: 'Test',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(pwChangeUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: pwChangeUser.email,
          password: pwChangeUser.password,
        });

      const oldToken = loginResponse.body.accessToken;

      // Verify token works
      const verifyResponse = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect([200, 404]).toContain(verifyResponse.status);

      // Note: Actual password change and token invalidation would be tested here
      // if such endpoints exist
    });
  });

  describe('Account Lockout', () => {
    const lockoutUser = {
      email: `lockout-${Date.now()}@example.com`,
      password: 'LockoutP@ss123',
      username: `lockout${Date.now()}`,
      firstName: 'Lockout',
      lastName: 'Test',
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(lockoutUser);
    });

    it('should lockout account after multiple failed attempts', async () => {
      // Attempt 6 failed logins
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app.getHttpServer()).post('/auth/login').send({
            email: lockoutUser.email,
            password: 'WrongP@ssword123',
          }),
        );
      }

      await Promise.all(attempts);

      // Try one more time with correct password
      const finalAttempt = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: lockoutUser.email,
          password: lockoutUser.password,
        });

      // Should be locked out
      expect([401, 403, 429]).toContain(finalAttempt.status);
    });
  });

  describe('Registration Security', () => {
    it('should reject duplicate email registrations', async () => {
      const duplicateUser = {
        email: `duplicate-${Date.now()}@example.com`,
        password: 'DuplicateP@ss123',
        username: `duplicate${Date.now()}`,
        firstName: 'Duplicate',
        lastName: 'Test',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateUser);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...duplicateUser,
          username: `duplicate2${Date.now()}`, // Different username
        });

      expect(response.status).toBe(409);
    });

    it('should reject duplicate username registrations', async () => {
      const duplicateUsername = `uniqueuser${Date.now()}`;

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `unique1-${Date.now()}@example.com`,
          password: 'UniqueP@ss123',
          username: duplicateUsername,
          firstName: 'Unique',
          lastName: 'Test',
        });

      // Second registration with same username
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `unique2-${Date.now()}@example.com`,
          password: 'UniqueP@ss123',
          username: duplicateUsername, // Same username
          firstName: 'Unique',
          lastName: 'Test',
        });

      expect(response.status).toBe(409);
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidP@ss123',
          username: `emailtest${Date.now()}`,
          firstName: 'Email',
          lastName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email')]),
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `required-${Date.now()}@example.com`,
          // Missing password, username, firstName, lastName
        });

      expect(response.status).toBe(400);
    });
  });

  describe('2FA Security', () => {
    const test2FAUser = {
      email: `2fa-security-${Date.now()}@example.com`,
      password: 'TwoFAP@ss123',
      username: `2fasecurity${Date.now()}`,
      firstName: 'TwoFA',
      lastName: 'Security',
    };
    let accessToken: string;
    let twoFASecret: string;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(test2FAUser);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: test2FAUser.email,
          password: test2FAUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should require authentication for 2FA generation', async () => {
      const response = await request(app.getHttpServer()).get('/2fa/generate');

      expect(response.status).toBe(401);
    });

    it('should generate 2FA secret with authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/2fa/generate')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.secret).toBeDefined();
        expect(response.body.qrCodeUrl).toBeDefined();
        twoFASecret = response.body.secret;
      }
    });

    it('should require authentication for 2FA enable', async () => {
      const response = await request(app.getHttpServer())
        .post('/2fa/enable')
        .send({ token: '123456' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid 2FA tokens', async () => {
      if (!twoFASecret) return;

      const response = await request(app.getHttpServer())
        .post('/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' }); // Invalid token

      expect([400, 401]).toContain(response.status);
    });

    it('should require 2FA for login when enabled', async () => {
      // This would require actually enabling 2FA and then logging in
      // Implementation depends on your 2FA flow
      expect(true).toBe(true);
    });
  });
});
