# Project Status

**Last Updated:** January 12, 2026

## Completion Status

| Area | Status |
|------|--------|
| Backend API | 95% |
| Frontend UI | 85% |
| RBAC Security | 100% |
| E2E Tests | 140+ tests |

## Running Locally

```bash
# Backend
cd hrms-backend && mvn spring-boot:run

# Frontend
cd hrms-frontend && npm run dev

# E2E Tests
cd hrms-frontend && npx playwright test
```

## Test Credentials

- **Email:** admin@demo.com
- **Password:** password
- **Tenant ID:** 550e8400-e29b-41d4-a716-446655440000

## Auth Flow

1. POST `/api/v1/auth/login` with email/password
2. Returns JWT access token (1hr) + refresh token (24hr)
3. Include `Authorization: Bearer <token>` and `X-Tenant-ID` headers

## Directory Structure

```
nu-aura/
├── hrms-frontend/     # Next.js 14 app
│   ├── app/           # Pages (App Router)
│   ├── components/    # React components
│   ├── lib/           # Services, types, hooks
│   └── e2e/           # Playwright tests
└── hrms-backend/      # Spring Boot 3.4 app
    ├── src/main/      # Application code
    └── src/test/      # Unit/integration tests
```

## Priorities

See [BACKLOG.md](./BACKLOG.md) for pending work.
