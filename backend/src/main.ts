import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as https from 'https';

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
    origin: allowedOrigins,
    credentials: false, // Set true only if using cookies/sessions
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

  const port = process.env.PORT || 3000;

  // HTTPS setup
  if (process.env.NODE_ENV === 'production') {
    const keyPath = process.env.SSL_KEY_PATH || './certs/server.key';
    const certPath = process.env.SSL_CERT_PATH || './certs/server.crt';

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      await app.listen(port, '0.0.0.0', () => {
        console.log(`HTTPS Server running on port ${port}`);
      });
    } else {
      await app.listen(port, '0.0.0.0');
      console.log(`HTTP Server running on port ${port}`);
    }
  } else {
    await app.listen(port, '0.0.0.0');
    console.log(`Server running on http://localhost:${port}`);
  }
}

bootstrap();
