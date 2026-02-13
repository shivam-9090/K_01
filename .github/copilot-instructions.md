# AI Coding Agent Instructions for K_01

## Project Overview

K_01 is a **production-grade task management platform** with enterprise-level authentication, authorization, and monitoring. This is NOT a simple CRUD app—it's a full-featured SaaS platform with:

- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL + Redis
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Infrastructure**: Docker Compose, NGINX reverse proxy, Prometheus/Grafana monitoring
- **CI/CD**: GitHub Actions with security scanning and automated testing

## Critical Architecture Concepts

### 1. Role-Based Access Control (RBAC) with Granular Permissions

The system has **two core roles** (BOSS, EMPLOYEE) plus a **granular permissions system**:

- **BOSS**: Company owner with full control. Created during registration along with their company.
- **EMPLOYEE**: Team member with configurable permissions granted by BOSS.

**Key Pattern**: Controllers use guards to enforce access:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BOSS')  // BOSS-only endpoint
async createProject() { }

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CAN_CREATE_TASK)  // Delegated permission
async createTask() { }
```

**Permissions are defined in** [backend/src/common/permissions.ts](backend/src/common/permissions.ts) with 20+ granular permissions covering projects, tasks, employees, teams, and audit logs.

### 2. Company-Based Multi-Tenancy

Every entity is **scoped to a company**:

- BOSS registers → creates User + Company in a transaction
- Employees belong to one company
- All queries MUST filter by `companyId` to prevent data leaks

**Critical Pattern**: Always include company filtering:

```typescript
// ✅ CORRECT
const tasks = await prisma.task.findMany({
  where: { companyId: user.companyId },
});

// ❌ WRONG - leaks data across companies
const tasks = await prisma.task.findMany();
```

### 3. Role-Specific Data Filtering

**EMPLOYEE users see filtered data**:

- **Tasks**: Only tasks where `assignedToIds` contains their user ID
- **Projects**: Only projects that have tasks assigned to them
- **Teams**: Cannot see other teams unless granted permission

**Implement this pattern** (see [backend/docs/EMPLOYEE_PERMISSIONS.md](backend/docs/EMPLOYEE_PERMISSIONS.md)):

```typescript
if (user.role === "EMPLOYEE") {
  where.assignedToIds = { has: user.id }; // Prisma array filter
}
```

### 4. Two-Factor Authentication (2FA) Flow

2FA is **fully implemented with TOTP** (Google Authenticator compatible):

- Users enable 2FA → Generate QR code with `speakeasy` library
- 10 backup codes generated (single-use, bcrypt hashed)
- Rate limiting: **1 attempt per minute** on verification endpoint
- Failed attempts tracked → lockout after 5 failures

**Key files**: [backend/src/2fa/2fa.service.ts](backend/src/2fa/2fa.service.ts), [backend/docs/2FA_FLOW_COMPLETE.md](backend/docs/2FA_FLOW_COMPLETE.md)

### 5. Authentication Token Strategy

- **Access Token**: 15-minute JWT with user ID, email, role, company ID
- **Refresh Token**: 7-day JWT stored in database (`RefreshToken` model)
- **Session Management**: Multiple sessions per user supported

**Token payload** (see [backend/src/auth/interfaces/auth.interface.ts](backend/src/auth/interfaces/auth.interface.ts)):

```typescript
interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  companyId: string;
}
```

### 6. GitHub Integration for Projects

Projects can link to GitHub repositories:

- Store `githubRepoName`, `githubRepoUrl`, `githubRepoBranch` in `Project` model
- OAuth flow implemented in [backend/src/auth/github-oauth.service.ts](backend/src/auth/github-oauth.service.ts)
- Frontend uses GitHub API via [frontend/src/services/github.service.ts](frontend/src/services/github.service.ts)

### 7. Monitoring & Observability

**8 custom Prometheus metrics** (see [backend/src/common/monitoring/metrics.service.ts](backend/src/common/monitoring/metrics.service.ts)):

- HTTP request count/duration by method, route, status
- Auth attempts (success/failure)
- 2FA operations (enable, verify, disable)
- Active sessions, API errors, DB connections

**Health Checks**: `/health`, `/health/live`, `/health/ready` endpoints.

## Developer Workflows

### Backend Development

```bash
# Start all services (PostgreSQL, Redis, App, Monitoring)
cd backend
docker-compose up -d

# Development mode (with hot reload)
npm run start:dev

# Database migrations
npm run prisma:migrate
npm run prisma:generate

# Run tests
npm run test          # Unit tests
npm run test:e2e      # E2E security tests
npm run test:cov      # Coverage report
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

**API Connection**: Frontend uses `VITE_API_URL` environment variable (defaults to `http://localhost:3000`).

### Database Schema Changes

1. Edit `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to generate migration
3. Run `npm run prisma:generate` to update Prisma Client types
4. Restart backend application

**Important**: All models have `companyId` foreign key for multi-tenancy.

### Adding New Endpoints

1. Create DTO in `dto/` folder with `class-validator` decorators
2. Add method to service (business logic)
3. Add endpoint to controller with appropriate guards:
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('BOSS', 'EMPLOYEE')
   async endpoint(@Req() req) {
     const user = req.user;  // Injected by JWT strategy
     const companyId = user.companyId;  // Always filter by company
   }
   ```
4. Add E2E test in `backend/test/`

## Project-Specific Conventions

### Naming Patterns

- **DTOs**: `CreateTaskDto`, `UpdateTaskDto`, `TaskResponseDto`
- **Services**: `TasksService`, `AuthService`, `UsersService`
- **Controllers**: `TasksController`, `AuthController`
- **Guards**: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`

### Error Handling

Use NestJS exceptions consistently:

```typescript
throw new UnauthorizedException("Invalid credentials");
throw new ForbiddenException("Insufficient permissions");
throw new ConflictException("Email already exists");
throw new BadRequestException("Invalid 2FA code");
```

### Logging

Winston logger is configured in [backend/src/common/middleware/logger.middleware.ts](backend/src/common/middleware/logger.middleware.ts):

- **Error logs** → `logs/error.log`
- **Combined logs** → `logs/combined.log`
- **Security events** → audit logs in database

### Frontend State Management

- **Auth Context**: [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx) provides `user`, `login`, `logout`, `isAuthenticated`
- **API Service**: [frontend/src/services/api.ts](frontend/src/services/api.ts) handles auth tokens, interceptors, and error handling
- **Protected Routes**: Use `<ProtectedRoute>` wrapper to enforce authentication

### TypeScript Types Synchronization

- Backend defines DTOs with `class-validator`
- Frontend manually mirrors types in [frontend/src/types/index.ts](frontend/src/types/index.ts)
- **When adding fields**: Update both backend DTO and frontend type

## Integration Points

### Redis Usage

- **Sessions**: JWT refresh tokens stored with expiration
- **Rate Limiting**: NestJS Throttler module uses Redis storage
- **Queue**: BullMQ queues for async tasks (email, notifications)

**Connection**: `REDIS_HOST=redis`, `REDIS_PORT=6379`, `REDIS_PASSWORD` in environment.

### Email Service

Configured in [backend/src/email/email.service.ts](backend/src/email/email.service.ts):

- Supports SendGrid and Nodemailer
- Used for: Welcome emails, password reset, 2FA setup notifications
- Set `EMAIL_PROVIDER=sendgrid` or `EMAIL_PROVIDER=nodemailer`

### AI Integration (Gemini)

[backend/src/ai/ai.service.ts](backend/src/ai/ai.service.ts) provides task suggestions and project analysis:

- Requires `GEMINI_API_KEY` environment variable
- Endpoints: `/ai/suggest-tasks`, `/ai/analyze-project`

### WebSocket Chat

Real-time project chat implemented in [backend/src/chat/chat.gateway.ts](backend/src/chat/chat.gateway.ts):

- Socket.IO gateway
- Authentication via JWT token in handshake
- Events: `joinProject`, `sendMessage`, `leaveProject`

## Security Best Practices

1. **Never bypass company filtering**: Always include `companyId` in queries
2. **Use guards on all endpoints**: Minimum `@UseGuards(JwtAuthGuard)`
3. **Validate input**: All DTOs have `class-validator` decorators
4. **Hash passwords**: Use `bcrypt.hash()` with salt rounds = 10
5. **Rate limiting**: Configured in NGINX + NestJS Throttler (see [backend/nginx/nginx.conf](backend/nginx/nginx.conf))

## Testing Guidelines

- **E2E tests focus on security**: See [backend/test/security.e2e-spec.ts](backend/test/security.e2e-spec.ts)
- **Test with both roles**: Always test BOSS and EMPLOYEE access patterns
- **Mock company context**: Create test companies to isolate test data

## Key Files Reference

| File                                                                            | Purpose                              |
| ------------------------------------------------------------------------------- | ------------------------------------ |
| [ARCHITECTURE.md](../ARCHITECTURE.md)                                           | Complete system architecture diagram |
| [BACKEND_AUDIT_REPORT.md](../BACKEND_AUDIT_REPORT.md)                           | Complete code & security audit       |
| [FIX_ACTION_PLAN.md](../FIX_ACTION_PLAN.md)                                     | Step-by-step fix instructions        |
| [TESTING_SETUP.md](../TESTING_SETUP.md)                                         | Testing infrastructure guide         |
| [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)                 | Database schema (17+ models)         |
| [backend/docs/EMPLOYEE_PERMISSIONS.md](../backend/docs/EMPLOYEE_PERMISSIONS.md) | RBAC implementation details          |
| [backend/docs/2FA_FLOW_COMPLETE.md](../backend/docs/2FA_FLOW_COMPLETE.md)       | 2FA flow and implementation          |
| [backend/docs/CI_CD.md](../backend/docs/CI_CD.md)                               | GitHub Actions workflows             |
| [backend/docker-compose.yml](../backend/docker-compose.yml)                     | Full stack orchestration             |

## Common Pitfalls to Avoid

1. **Forgetting company filtering**: Always filter by `companyId` or you'll leak data across companies
2. **Not checking role in services**: Guards protect endpoints, but services should validate role context for filtered data
3. **Ignoring employee permissions**: EMPLOYEE users need permission checks, not just role checks
4. **Hard-coding URLs**: Use environment variables for frontend/backend URLs (Cloudflare ready)
5. **Breaking TypeScript types**: Changes to backend DTOs require updating frontend types manually
6. **Port conflicts**: Watch for conflicts with other projects (ports 3000, 5173, 5432, 6379)

## Docker & Infrastructure

### Starting the Application

```bash
cd backend

# Stop and clean up
docker-compose down

# Build from scratch
docker-compose build --no-cache

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker logs auth_app
docker logs auth_frontend
docker logs auth_postgres
docker logs auth_redis
```

### Port Allocations

- **Backend API**: 3000 (NestJS)
- **Frontend**: 5173 (Vite)
- **PostgreSQL**: 5432
- **Redis**: 6379

### Container Services

1. **auth_postgres**: PostgreSQL 16 database
2. **auth_redis**: Redis 7 for sessions and rate limiting
3. **auth_app**: NestJS backend application
4. **auth_frontend**: React frontend (Vite)

**Important**: If another project (like exovita) is using these ports, stop it first:

```bash
docker stop exovita-backend exovita-frontend exovita-redis exovita-postgres
```

## Frontend Development Guidelines

### Tech Stack

- **Language**: TypeScript only (no plain JS unless explicitly requested)
- **UI Framework**: React with TSX
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with PostCSS
- **State Management**: Local state or Zustand (avoid Redux)

### Critical Rules

**Performance First**:

- Enable tree-shakeable imports only (`import { specific } from 'library'`)
- Use dynamic imports for routes, heavy components, modals
- Don't load admin/dashboard code on initial render
- Keep initial bundle lean

**React Patterns**:

- Functional components only (no class components)
- Use hooks properly
- Avoid unnecessary re-renders
- Memoize only when measurably beneficial
- Keep components small and composable

**TypeScript Standards**:

- No `any` unless absolutely unavoidable
- Explicit types for props, API responses, shared utilities
- Let TypeScript infer where safe

**Styling**:

- Prefer Tailwind utility classes
- Custom CSS only for repeated patterns or when Tailwind becomes unreadable
- Don't mix multiple styling systems

**Mental Model**: Ship less code. Load it later. Cache it once. Keep it readable.

## Testing & CI/CD

### GitHub Actions Workflows

Located in `.github/workflows/`:

1. **ci.yml**: Main CI pipeline (lint → test → security → build)
2. **docker-build.yml**: Multi-platform Docker builds with security scanning
3. **pr-checks.yml**: PR validation and auto-labeling
4. **cron-tests.yml**: Nightly regression tests and security audits

### Running Tests Locally

```bash
cd backend

# Unit tests
npm run test

# E2E tests (requires Docker containers running)
npm run test:e2e

# Coverage report
npm run test:cov

# Specific test file
npm run test:e2e -- test/security.e2e-spec.ts
```

### Test Categories

- **security.e2e-spec.ts**: Security headers, HTTPS enforcement
- **auth-security.e2e-spec.ts**: JWT, 2FA, session management
- **rate-limiting.e2e-spec.ts**: Rate limit enforcement
- **input-validation.e2e-spec.ts**: Input sanitization
- **monitoring.e2e-spec.ts**: Metrics and health checks

## TestSprite Integration

### MCP Server Configuration

TestSprite is configured in VS Code settings:

```json
{
  "mcpServers": {
    "TestSprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp@latest"],
      "env": {
        "API_KEY": "sk-user-avr8v-NhYl6RMUnQ1MPV-Z7jeQ9Z-QYMj3TaTuy9i7axqT6WbFNsnF7m7K31S4s4YBAibqHd0a2pNO8TdWiZraP7CKs5w4abpbPtaGeFUgoFIngWH7EulfNdV3x5eJI_85E"
      }
    }
  }
}
```

Use TestSprite for automated testing assistance and test generation.

## Environment Variables

### Backend (.env in backend/)

Critical variables:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://authuser:securepassword123@postgres:5432/auth_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change_this_redis_password_in_production

# JWT (15 min access, 7 day refresh)
JWT_SECRET=change_this_to_a_strong_secret_key_minimum_32_characters
JWT_EXPIRATION=900
JWT_REFRESH_EXPIRATION=604800

# 2FA
TWOFA_ENCRYPTION_KEY=un0zfCzsUJBSPdtSWAKpqkflWg4jV/dEzWT37H23AYw=

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=your_callback_url

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@yourdomain.com

# AI
GEMINI_API_KEY=your_gemini_key
```

### Frontend (.env in frontend/)

```bash
VITE_API_URL=http://localhost:3000
```

## Quick Reference Commands

```bash
# Backend
cd backend
npm run start:dev          # Dev mode with hot reload
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio GUI
docker-compose logs -f app # Follow backend logs
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run test:cov           # Coverage report

# Frontend
cd frontend
npm run dev                # Start Vite dev server
npm run build              # Production build
npm run preview            # Preview production build
npm run test               # Run Vitest tests (watch mode)
npm run test:ui            # Run tests with UI
npm run test:coverage      # Generate coverage report

# Docker
docker-compose up -d       # Start all services
docker-compose down        # Stop all services
docker-compose ps          # Check status
docker system prune -a     # Clean up old images (careful!)
```

## Testing Strategy

### Frontend Testing (Vitest + React Testing Library)

**Tools Installed**:

- ✅ Vitest (TS-first, fast)
- ✅ @testing-library/react (Component testing)
- ✅ @testing-library/jest-dom (Custom matchers)
- ✅ jsdom (Browser environment simulation)

**Test Structure**:

```
frontend/src/
├── components/__tests__/
│   └── ProtectedRoute.test.tsx
├── pages/__tests__/
│   └── Login.test.tsx
├── context/__tests__/
│   └── AuthContext.test.ts
└── test/
    └── setup.ts             # Global test setup
```

**Configuration**: [frontend/vitest.config.ts](frontend/vitest.config.ts)

**Writing Tests**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });
});
```

**Best Practices**:

- Test user behavior, not implementation
- Mock external dependencies (API calls, auth store)
- Use `screen` queries over `container`
- Prefer `getByRole` over `getByTestId`

### Backend Testing (Jest + Supertest)

**Tools Installed**:

- ✅ Jest (Unit + Integration)
- ✅ Supertest (HTTP assertions)
- ✅ @nestjs/testing (NestJS utilities)

**Test Structure**:

```
backend/
├── src/
│   ├── auth/__tests__/
│   │   └── auth.service.spec.ts
│   └── 2fa/__tests__/
│       └── 2fa.service.spec.ts
└── test/
    ├── jest-e2e.json
    ├── security.e2e-spec.ts
    ├── auth-security.e2e-spec.ts
    ├── rate-limiting.e2e-spec.ts
    ├── input-validation.e2e-spec.ts
    └── monitoring.e2e-spec.ts
```

**Configuration**: [backend/jest.config.js](backend/jest.config.js), [backend/test/jest-e2e.json](backend/test/jest-e2e.json)

**Writing Unit Tests**:

```typescript
import { Test, TestingModule } from "@nestjs/testing";

describe("ServiceName", () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  it("should do something", () => {
    expect(service.method()).toBe(expected);
  });
});
```

**Writing E2E Tests**:

```typescript
describe("Feature (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it("/endpoint (GET)", () => {
    return request(app.getHttpServer())
      .get("/endpoint")
      .expect(200)
      .expect({ data: "expected" });
  });
});
```

### Test Coverage Goals

| Layer         | Current | Target | Priority    |
| ------------- | ------- | ------ | ----------- |
| Backend Unit  | 10%     | 70%    | 🔴 High     |
| Backend E2E   | 100%    | 100%   | ✅ Complete |
| Frontend Unit | 5%      | 70%    | 🔴 High     |
| Frontend E2E  | 0%      | 30%    | 🟡 Medium   |

### What to Test

**Backend**:

- ✅ Security headers and rate limiting (E2E exists)
- ✅ Authentication flows (E2E exists)
- ⚠️ Service logic (unit tests needed)
- ⚠️ Validation rules (unit tests needed)
- ⚠️ Permission checks (unit tests needed)

**Frontend**:

- ⚠️ Component rendering
- ⚠️ User interactions (clicks, form submissions)
- ⚠️ Auth state management
- ⚠️ API error handling
- ⚠️ Permission-based UI rendering

### Testing Anti-Patterns to Avoid

1. **Don't test implementation details** - Test behavior, not internal state
2. **Don't mock what you don't own** - Mock your services, not React or NestJS
3. **Don't write brittle tests** - Use semantic queries, not CSS selectors
4. **Don't skip edge cases** - Test error states, empty states, loading states
5. **Don't ignore flaky tests** - Fix them or delete them
