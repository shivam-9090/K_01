import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  // Trust proxy (important for rate limiting behind NGINX)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Request size limits
  expressApp.use(require('express').json({ limit: '10mb' }));
  expressApp.use(
    require('express').urlencoded({ extended: true, limit: '10mb' }),
  );

  // Security: Helmet - Set security HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'no-referrer' },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS (CDN-ready)
  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o && o !== '*');

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false, // Deny all if no origins configured
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'CF-Connecting-IP', // Cloudflare real IP
      'CF-RAY', // Cloudflare trace ID
    ],
    exposedHeaders: ['X-Total-Count', 'X-Cache-Status'],
    maxAge: 3600,
  });

  // Add cache control headers for different response types
  app.use((req, res, next) => {
    // Never cache auth/sensitive endpoints
    if (
      req.url.includes('/auth/') ||
      req.url.includes('/2fa/') ||
      req.url.includes('/users/')
    ) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Health checks - no cache
    else if (req.url.includes('/health')) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
    // Metrics - cache for 30 seconds
    else if (req.url.includes('/metrics')) {
      res.setHeader('Cache-Control', 'public, max-age=30');
    }
    // Default for API responses - no cache
    else {
      res.setHeader('Cache-Control', 'no-cache, private');
    }
    next();
  });

  // Content-Type validation middleware
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (
        contentType &&
        !contentType.includes('application/json') &&
        !contentType.includes('multipart/form-data')
      ) {
        return res.status(415).json({
          statusCode: 415,
          message: 'Unsupported Media Type. Expected application/json',
          error: 'Unsupported Media Type',
        });
      }
    }
    next();
  });

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('K_01 Task Management API')
    .setDescription(
      'Production-grade task management platform with enterprise-level authentication, ' +
        'authorization (RBAC with granular permissions), 2FA, real-time chat, AI integration, ' +
        'GitHub integration, and comprehensive monitoring.\n\n' +
        '**Key Features:**\n' +
        '- 🔐 JWT Authentication with refresh tokens\n' +
        '- 🔒 Two-Factor Authentication (TOTP)\n' +
        '- 👥 Role-Based Access Control (BOSS, EMPLOYEE)\n' +
        '- 📊 Multi-tenant (company-scoped data)\n' +
        '- 🤖 AI-powered task suggestions (Gemini)\n' +
        '- 💬 Real-time WebSocket chat\n' +
        '- 📈 Prometheus metrics + Grafana dashboards\n' +
        '- 🐙 GitHub repository integration',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag(
      'Authentication',
      'User registration, login, password management, OAuth',
    )
    .addTag('2FA', 'Two-Factor Authentication setup and verification')
    .addTag('Projects', 'Project management with GitHub integration')
    .addTag('Tasks', 'Task CRUD, assignment, completion, verification')
    .addTag('Teams', 'Team management and member permissions')
    .addTag('Users', 'User profile, search, and management')
    .addTag('AI', 'AI-powered task suggestions and project analysis')
    .addTag('Chat', 'Real-time project chat (WebSocket)')
    .addTag('Search', 'Global search across users and content')
    .addTag('Storage', 'File upload and management')
    .addTag('Health', 'Health checks and readiness probes')
    .addTag('Metrics', 'Prometheus metrics endpoint')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'K_01 API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #e91e63 }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
    },
  });

  const port = process.env.PORT || 3000;

  // HTTPS setup
  if (process.env.NODE_ENV === 'production') {
    const keyPath = process.env.SSL_KEY_PATH || './certs/server.key';
    const certPath = process.env.SSL_CERT_PATH || './certs/server.crt';

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      await app.listen(port, '0.0.0.0');
    } else {
      await app.listen(port, '0.0.0.0');
    }
  } else {
    await app.listen(port, '0.0.0.0');
  }
}

bootstrap();
