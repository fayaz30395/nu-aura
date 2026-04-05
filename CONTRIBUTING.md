# Contributing to NU-AURA

## Workflow

1. All work happens on **`main`** branch — no feature branches
2. Write code, run lint + typecheck + tests
3. Commit with conventional commit format
4. Push to `main`

## Commit Format

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(payroll): add salary revision with effective date support
fix(leave): prevent negative leave balance on approval
refactor(auth): extract JWT validation into reusable filter
```

## Code Standards

### TypeScript / Frontend

- **No `any`** — define proper interfaces for all types
- **All forms** must use React Hook Form + Zod validation
- **All data fetching** must use React Query — no raw `useEffect` + `fetch`
- **HTTP client:** Use the existing Axios client in `frontend/lib/` — never create new instances
- **Colors:** CSS variables only — no hardcoded hex values
- **Spacing:** 8px grid — banned classes: `gap-3`, `p-3`, `p-5`, `gap-5`, `space-y-3`, `space-y-5`,
  `m-3`, `m-5`
- **Buttons:** `<Button>` component only — no raw `<button>` with inline styles
- **Loading states:** `NuAuraLoader`, `SkeletonTable`, `SkeletonStatCard`, `SkeletonCard` — no plain
  spinner text
- **Empty states:** `<EmptyState>` component — no blank page fallbacks
- **Icons:** Lucide React + Tabler Icons — don't mix icon libraries

### Java / Backend

- Java 21 with Spring Boot 3.4.1
- Follow existing package structure: `api/`, `application/`, `domain/`, `infrastructure/`, `common/`
- All endpoints must have `@RequiresPermission` or explicit public access
- All tenant-scoped entities must include `tenant_id`
- DTO mapping via MapStruct — no manual mapping
- All forms/inputs validated with Jakarta Validation annotations

### Testing

```bash
# Backend
cd backend && ./mvnw test

# Frontend lint + typecheck
cd frontend && npm run lint && npx tsc --noEmit
```

- Backend: JUnit 5 + Mockito. Use `@WebMvcTest` for controller tests, not `@SpringBootTest`
- Frontend: Component tests for all new components
- Target: 80% minimum coverage (excludes DTOs, entities, config)
- All new endpoints must have at least one test

### Sensitive Files (Require Review)

These files affect security and must be reviewed carefully before changes:

- `backend/src/main/java/com/hrms/common/config/SecurityConfig.java`
- `frontend/middleware.ts`
- Any Flyway migration file (`db/migration/V*.sql`)

## Pre-Push Checklist

- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm run lint` — zero lint errors
- [ ] `./mvnw test` — all tests pass
- [ ] No `any` types introduced
- [ ] No new Axios instances
- [ ] No hardcoded colors or spacing violations
- [ ] No secrets or credentials in code
- [ ] Flyway migration version doesn't conflict (current: V0–V91, next: V92)
