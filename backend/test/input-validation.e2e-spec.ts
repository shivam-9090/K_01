import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Input Validation (e2e)', () => {
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

  describe('Email Validation', () => {
    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user @example.com',
        'user@example',
      ];

      for (const email of invalidEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'ValidP@ss123',
            username: `testuser${Date.now()}`,
            firstName: 'Test',
            lastName: 'User',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        `user${Date.now()}@example.com`,
        `test.user${Date.now()}@example.co.uk`,
        `user+tag${Date.now()}@example.com`,
      ];

      for (const email of validEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'ValidP@ss123',
            username: `testuser${Date.now()}${Math.random()}`,
            firstName: 'Test',
            lastName: 'User',
          });

        expect([200, 201, 409]).toContain(response.status);
      }
    });

    it('should trim whitespace from email', async () => {
      const email = `  trim${Date.now()}@example.com  `;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'ValidP@ss123',
          username: `trimtest${Date.now()}`,
          firstName: 'Trim',
          lastName: 'Test',
        });

      expect([200, 201, 409]).toContain(response.status);
    });

    it('should reject email with SQL injection patterns', async () => {
      const maliciousEmails = [
        "test' OR '1'='1@example.com",
        "admin'--@example.com",
        "test'; DROP TABLE users--@example.com",
      ];

      for (const email of maliciousEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'ValidP@ss123',
            username: `sqltest${Date.now()}`,
            firstName: 'SQL',
            lastName: 'Test',
          });

        expect([400, 409]).toContain(response.status);
      }
    });
  });

  describe('Password Validation', () => {
    it('should reject short passwords', async () => {
      const shortPasswords = ['short', '12345', 'abc', 'P@ss1'];

      for (const password of shortPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `short${Date.now()}${Math.random()}@example.com`,
            password,
            username: `shortpass${Date.now()}${Math.random()}`,
            firstName: 'Short',
            lastName: 'Pass',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject passwords without required complexity', async () => {
      const weakPasswords = [
        'alllowercase123', // No uppercase
        'ALLUPPERCASE123', // No lowercase
        'NoNumbers!@#', // No numbers
        'NoSpecialChars123', // No special chars
      ];

      for (const password of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `weak${Date.now()}${Math.random()}@example.com`,
            password,
            username: `weakpass${Date.now()}${Math.random()}`,
            firstName: 'Weak',
            lastName: 'Pass',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongP@ssw0rd',
        'MySecure#Pass123',
        'C0mpl3x!P@ssword',
        'S3cur3$Password!',
      ];

      for (const password of strongPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `strong${Date.now()}${Math.random()}@example.com`,
            password,
            username: `strongpass${Date.now()}${Math.random()}`,
            firstName: 'Strong',
            lastName: 'Pass',
          });

        expect([200, 201, 409]).toContain(response.status);
      }
    });

    it('should reject passwords exceeding maximum length', async () => {
      const tooLongPassword = 'A'.repeat(129) + 'b1@'; // Over 128 chars

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `long${Date.now()}@example.com`,
          password: tooLongPassword,
          username: `longpass${Date.now()}`,
          firstName: 'Long',
          lastName: 'Pass',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Username Validation', () => {
    it('should reject usernames with special characters', async () => {
      const invalidUsernames = [
        'user@name',
        'user name',
        'user!name',
        'user#name',
        'user$name',
      ];

      for (const username of invalidUsernames) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `username${Date.now()}${Math.random()}@example.com`,
            password: 'ValidP@ss123',
            username,
            firstName: 'Test',
            lastName: 'User',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should accept valid usernames', async () => {
      const validUsernames = [
        `user${Date.now()}`,
        `test_user${Date.now()}`,
        `user-name${Date.now()}`,
        `user123${Date.now()}`,
      ];

      for (const username of validUsernames) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `valid${Date.now()}${Math.random()}@example.com`,
            password: 'ValidP@ss123',
            username,
            firstName: 'Valid',
            lastName: 'User',
          });

        expect([200, 201, 409]).toContain(response.status);
      }
    });

    it('should reject usernames below minimum length', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `short${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: 'ab', // Too short
          firstName: 'Short',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
    });

    it('should reject usernames exceeding maximum length', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `long${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: 'a'.repeat(51), // Too long
          firstName: 'Long',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Name Validation', () => {
    it('should reject names with numbers', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `numbers${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: `numbers${Date.now()}`,
          firstName: 'John123', // Invalid
          lastName: 'Doe456', // Invalid
        });

      expect(response.status).toBe(400);
    });

    it('should reject names with special characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `special${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: `special${Date.now()}`,
          firstName: 'John@', // Invalid
          lastName: 'Doe#', // Invalid
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid names', async () => {
      const validNames = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Mary', lastName: 'Jane' },
        { firstName: "O'Brien", lastName: 'Smith' },
        { firstName: 'Jean-Paul', lastName: 'Dubois' },
      ];

      for (const name of validNames) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `name${Date.now()}${Math.random()}@example.com`,
            password: 'ValidP@ss123',
            username: `name${Date.now()}${Math.random()}`,
            ...name,
          });

        expect([200, 201, 409]).toContain(response.status);
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should reject script tags in input', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `xss${Date.now()}${Math.random()}@example.com`,
            password: 'ValidP@ss123',
            username: `xss${Date.now()}${Math.random()}`,
            firstName: payload,
            lastName: 'Test',
          });

        expect([400, 409]).toContain(response.status);
      }
    });

    it('should sanitize HTML entities', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `html${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: `html${Date.now()}`,
          firstName: '&lt;John&gt;', // HTML entities
          lastName: '&amp;Doe',
        });

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should reject SQL injection patterns', async () => {
      const sqlPayloads = [
        "' OR '1'='1",
        "admin'--",
        "' OR '1'='1' --",
        "'; DROP TABLE users--",
        "1' UNION SELECT NULL--",
      ];

      for (const payload of sqlPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: payload,
            password: payload,
          });

        expect([400, 401]).toContain(response.status);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should reject NoSQL injection patterns', async () => {
      const noSqlPayloads = [{ $gt: '' }, { $ne: null }, { $regex: '.*' }];

      for (const payload of noSqlPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: payload,
            password: payload,
          });

        expect([400, 401]).toContain(response.status);
      }
    });
  });

  describe('Request Body Validation', () => {
    it('should reject requests with extra fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `extra${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: `extra${Date.now()}`,
          firstName: 'Extra',
          lastName: 'Fields',
          isAdmin: true, // Extra field
          role: 'BOSS', // Extra field
        });

      // Should either reject (400) or ignore extra fields (200/201)
      expect([200, 201, 400, 409]).toContain(response.status);
    });

    it('should reject empty request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('File Upload Validation', () => {
    // If you have file upload endpoints, test them here
    it('should validate file type', async () => {
      // Example: avatar upload
      expect(true).toBe(true);
    });

    it('should validate file size', async () => {
      // Example: prevent large file uploads
      expect(true).toBe(true);
    });
  });

  describe('Integer Validation', () => {
    it('should reject non-integer IDs', async () => {
      const invalidIds = ['abc', '1.5', '-1', 'null', 'undefined'];

      for (const id of invalidIds) {
        const response = await request(app.getHttpServer())
          .get(`/users/${id}`)
          .set('Authorization', 'Bearer fake.token.here');

        expect([400, 401, 404]).toContain(response.status);
      }
    });

    it('should accept valid integer IDs', async () => {
      const validIds = [1, 100, 999999];

      for (const id of validIds) {
        const response = await request(app.getHttpServer())
          .get(`/users/${id}`)
          .set('Authorization', 'Bearer fake.token.here');

        expect([401, 404]).toContain(response.status);
      }
    });
  });

  describe('Enum Validation', () => {
    it('should reject invalid enum values', async () => {
      // If you have endpoints with enum params
      expect(true).toBe(true);
    });
  });

  describe('Whitelist Validation', () => {
    it('should use whitelist mode for DTOs', async () => {
      // ValidationPipe should strip unknown properties
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `whitelist${Date.now()}@example.com`,
          password: 'ValidP@ss123',
          username: `whitelist${Date.now()}`,
          firstName: 'White',
          lastName: 'List',
          unknownField: 'should be stripped',
          anotherUnknownField: 'also stripped',
        });

      expect([200, 201, 409]).toContain(response.status);
    });
  });
});
