# Code Quality & Security Report

> **Date:** 2026-03-22
> **Scope:** Full codebase scan (backend + frontend)
> **Agent:** Code Reviewer Agent (Discovery Phase - Day 1)
> **Classification:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

---

## Executive Summary

The NU-AURA codebase demonstrates solid foundational security practices: CSRF double-submit cookie pattern, OWASP security headers, parameterized JPA queries, rate limiting, and environment-variable-driven secrets. However, several issues were identified that require attention before internal beta launch.

**Severity Breakdown:**

| Severity | Count | Description |
|----------|-------|-------------|
| P0 (Critical) | 2 | Must fix before beta launch |
| P1 (High) | 5 | Should fix before beta launch |
| P2 (Medium) | 6 | Fix within first week post-launch |
| P3 (Low) | 4 | Technical debt, non-blocking |

---

## 1. Security Vulnerabilities

### P0-SEC-001: Hardcoded Default Password in Import Services

**Severity:** P0 (Critical)
**Files:**
- `backend/src/main/java/com/hrms/application/employee/service/EmployeeImportService.java:50`
- `backend/src/main/java/com/hrms/application/dataimport/service/KekaImportService.java:50`

**Finding:** Both services use `private static final String DEFAULT_PASSWORD = "Welcome@123"` for imported users. This password:
1. Does NOT meet the platform's own password policy (requires 12+ chars, uppercase, lowercase, digit, special)
2. Is hardcoded and well-known (common default in HR systems)
3. Imported users are set to `ACTIVE` status immediately with no forced password reset

**Risk:** Any imported employee account is instantly compromisable with a known password. An attacker who knows any imported employee's email can log in.

**Recommendation:**
- Generate a random password per imported user
- Set `passwordExpired = true` or `mustChangePassword = true` to force password reset on first login
- Or mark accounts as `PENDING_ACTIVATION` until the user sets their own password via email link

---

### P0-SEC-002: Controllers Missing Permission Annotations

**Severity:** P0 (Critical)
**Files:**
- `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceEditLockController.java`
- `backend/src/main/java/com/hrms/api/knowledge/controller/FluenceAttachmentController.java`

**Finding:** These controllers have NO `@RequiresPermission` annotations on any endpoint. They only check `TenantContext.requireCurrentTenant()`, meaning any authenticated user in the tenant can:
- Acquire/release edit locks on any content
- Upload/delete file attachments to any content item

While these are NU-Fluence (Phase 2) controllers, they are deployed and accessible in the current running application.

**Note:** `TenantController` and `AuthController` are intentionally public. `WebSocketNotificationController` handles auth at the STOMP level.

**Recommendation:**
- Add `@RequiresPermission("FLUENCE:WRITE")` to mutation endpoints
- Add `@RequiresPermission("FLUENCE:READ")` to read endpoints
- Or disable these controllers via `@RequiresFeature` until NU-Fluence launches

---

### P1-SEC-003: .env Files Not Gitignored

**Severity:** P1 (High)

**Finding:** The `.gitignore` file has ALL `.env` entries COMMENTED OUT (lines prefixed with `#`). While no `.env` files currently exist in the repository, any developer creating a `.env.local` with database credentials or JWT secrets would have it tracked by Git.

**Recommendation:** Uncomment the `.env` lines in `.gitignore`:
```
.env
.env.local
.env.*.local
.env.production
.env.production.local
```

---

### P1-SEC-004: Dev Profile Exposes Stack Traces

**Severity:** P1 (High)
**File:** `backend/src/main/resources/application-dev.yml:110-112`

**Finding:**
```yaml
server:
  error:
    include-message: always
    include-binding-errors: always
    include-stacktrace: always
```

If the dev profile is accidentally activated in production (or if beta runs on dev profile), full stack traces including internal class paths, library versions, and SQL details will be exposed in error responses.

**Recommendation:**
- Verify beta launch uses a non-dev profile
- Create an `application-beta.yml` with `include-stacktrace: never`
- Or add a check that prevents `dev` profile from running outside localhost

---

### P1-SEC-005: MinIO Default Credentials in Dev Config

**Severity:** P1 (High)
**File:** `backend/src/main/resources/application-dev.yml:79-80`

**Finding:**
```yaml
access-key: ${MINIO_ACCESS_KEY:minioadmin}
secret-key: ${MINIO_SECRET_KEY:minioadmin}
```

Default MinIO credentials are hardcoded as fallbacks. If environment variables are not set, anyone with network access to the MinIO instance can access all stored files (employee documents, attachments, etc.).

**Recommendation:**
- Remove default values; require explicit env vars
- Or restrict MinIO network access to backend-only in Docker Compose

---

### P1-SEC-006: Dev Database Default Password

**Severity:** P1 (High)
**File:** `backend/src/main/resources/application-dev.yml:17`

**Finding:**
```yaml
password: ${DEV_DATABASE_PASSWORD:hrms_dev_password}
```

Hardcoded fallback database password. While the dev DB is Neon cloud (not local), if a developer misconfigures and points to a shared database, this password is exposed in the source code.

**Recommendation:** Remove the default value or use a clearly non-functional placeholder.

---

### P1-SEC-007: TypeScript strictNullChecks Disabled

**Severity:** P1 (High)
**File:** `frontend/tsconfig.json:12`

**Finding:** `"strictNullChecks": false` overrides the `strict: true` setting. This is the most impactful TypeScript safety feature being disabled. It allows:
- Accessing properties on potentially null/undefined values without checks
- Runtime `TypeError: Cannot read property of undefined` crashes
- Silent data corruption when nulls propagate through the system

**Risk:** For a beta launch, this significantly increases the probability of runtime crashes from unhandled nulls.

**Recommendation:** This is a large-scale fix (likely 100s of type errors to resolve). For beta, document as known tech debt. Post-beta, enable incrementally using `// @ts-expect-error` annotations.

---

### P2-SEC-008: WebSocket Endpoints PermitAll Without CSRF

**Severity:** P2 (Medium)
**File:** `SecurityConfig.java:128, 161`

**Finding:** `/ws/**` is both `permitAll()` and CSRF-ignored. While auth is handled at the STOMP protocol level, this means:
- Any unauthenticated client can establish a WebSocket connection
- The STOMP-level auth must be robust (verify JWT in CONNECT frame)

**Recommendation:** Verify that `WebSocketConfig.java` enforces JWT authentication on STOMP CONNECT frames. If not, this becomes P0.

---

## 2. Code Quality Issues

### P2-CQ-001: God Classes (>500 lines)

**Severity:** P2 (Medium)

Multiple service classes exceed 500 lines, making them hard to test, review, and maintain:

| File | Lines | Concern |
|------|-------|---------|
| `WorkflowService.java` | 1,159 | Approval engine logic |
| `AuthService.java` | 928 | Auth + OAuth + MFA + password reset |
| `SurveyAnalyticsService.java` | 904 | Survey stats computation |
| `ExitManagementService.java` | 852 | Exit process orchestration |
| `ReportGenerationService.java` | 838 | Report building |
| `RoleManagementService.java` | 750 | Role + permission CRUD |
| `PredictiveAnalyticsService.java` | 750 | Analytics calculations |
| `RoleHierarchy.java` | 748 | Role hierarchy definition |

Frontend pages are also oversized:

| File | Lines |
|------|-------|
| `recruitment/pipeline/page.tsx` | 1,485 |
| `letters/page.tsx` | 1,324 |
| `dashboard/page.tsx` | 1,277 |
| `projects/page.tsx` | 1,265 |
| `recruitment/interviews/page.tsx` | 1,211 |

**Recommendation:** Post-beta, extract logical sub-services (e.g., split `AuthService` into `PasswordService`, `OAuthService`, `MfaService`). For frontend, extract form components and table renderers into reusable components.

---

### P2-CQ-002: TypeScript `any` Usage (57 occurrences)

**Severity:** P2 (Medium)

Found 57 occurrences of `any` type across 10 files. Notable locations:
- `frontend/lib/utils/service-error.ts` (1)
- `frontend/lib/utils/type-guards.ts` (3)
- `frontend/lib/services/*.test.ts` (multiple test files)
- `frontend/app/admin/integrations/page.tsx` (1)

Most are in test files (acceptable) but production code usage in `service-error.ts`, `type-guards.ts`, and `integrations/page.tsx` violates the code rules.

**Recommendation:** Replace `any` with proper types or `unknown` in production files.

---

### P2-CQ-003: No Console.log Stripping Verified

**Severity:** P2 (Medium)

While `next.config.js` claims to strip console.log in production, no `console.log` calls were found in `frontend/app/` (0 occurrences). This is good. However, other directories were not fully scanned.

**Status:** Low risk. Next.js config handles this.

---

### P3-CQ-004: Repository `findAll()` Without Tenant Filter

**Severity:** P3 (Low)

4 repositories expose `findAll()` methods that don't include `tenantId`:
- `PSAProjectRepository.java`
- `NotificationRepository.java`
- `EmployeePayrollRecordRepository.java`
- `WallPostRepository.java`

Each has a comment: "Use this instead of the inherited findAll()." — these appear to be JPA inherited methods that are being overridden/documented. PostgreSQL RLS provides a safety net, but defense-in-depth is preferred.

**Recommendation:** Add `@Override` and throw `UnsupportedOperationException` on the parameterless `findAll()` to prevent accidental use.

---

### P3-CQ-005: Flyway validate-on-migrate Disabled

**Severity:** P3 (Low)
**File:** `application.yml:72`, `application-dev.yml:50`

**Finding:** `validate-on-migrate: false` in both base and dev configs. This means Flyway won't detect if a migration file was modified after being applied, which could lead to schema drift.

**Recommendation:** Enable in production profile.

---

## 3. Positive Security Findings

These areas are well-implemented:

| Area | Status | Details |
|------|--------|---------|
| SQL Injection | **SAFE** | All queries use JPA parameterized queries (`@Query` with `:param`). No `createNativeQuery` with string concatenation found. |
| XSS Protection | **SAFE** | No `dangerouslySetInnerHTML` found in frontend. DOMPurify is included in dependencies for sanitization. |
| CSRF Protection | **GOOD** | Double-submit cookie pattern properly configured. Exclusions are reasonable (auth, webhooks, external APIs). |
| OWASP Headers | **GOOD** | X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP all configured. |
| Rate Limiting | **GOOD** | Bucket4j + Redis with appropriate limits (5/min auth, 100/min API). |
| CORS | **GOOD** | Explicit origins, no wildcard. Headers explicitly enumerated. |
| Password Policy | **GOOD** | 12+ chars, complexity requirements, history of 5, 90-day max age. |
| JWT Security | **GOOD** | httpOnly cookies, permissions in Redis not JWT (CRIT-001), 1hr expiry. |
| Input Validation | **GOOD** | 978 validation annotations across 247 files. `@Valid` on request bodies. |
| Dependency Hygiene | **GOOD** | Frontend uses DOMPurify for HTML sanitization. No duplicate libraries detected. |

---

## 4. Dependency Audit

### Frontend

| Package | Current | Risk |
|---------|---------|------|
| `react` | 18.2.0 | Pinned (not using caret). React 19 available but migration is complex. Acceptable for beta. |
| `next` | ^14.2.35 | Latest 14.x. Good. |
| `@types/react` | 18.2.46 | Pinned. Matches React 18. |
| `eslint` | 8.56.0 | Pinned without caret. ESLint 9 available but has breaking changes. Acceptable. |
| `sockjs-client` | ^1.6.1 | Library is in maintenance mode. No known CVEs. |

**No duplicate libraries detected.** DOMPurify and Zod are the correct choices for sanitization and validation.

### Backend

| Dependency | Version | Risk |
|------------|---------|------|
| Spring Boot | 3.4.1 | Current stable line. Good. |
| JJWT | 0.12.6 | Latest. Good. |
| Apache POI | 5.3.0 | Latest. Good. |
| MinIO | 8.6.0 | One minor version behind (8.6.1 available). Low risk. |

**Recommendation:** Run `mvn dependency-check:check` (OWASP Dependency-Check plugin) for automated CVE scanning of transitive dependencies. This was not run as part of this scan.

---

## 5. Technical Debt Backlog

| ID | Category | Description | Priority | Effort |
|----|----------|-------------|----------|--------|
| TD-001 | Type Safety | Enable `strictNullChecks` in TypeScript | P1 | Large |
| TD-002 | Code Structure | Split god classes (8 services >500 lines) | P2 | Large |
| TD-003 | Code Structure | Split oversized page components (5 pages >1200 lines) | P2 | Medium |
| TD-004 | Type Safety | Replace 57 `any` occurrences with proper types | P2 | Small |
| TD-005 | Security | Add `@RequiresPermission` to all Fluence controllers | P0 | Small |
| TD-006 | Security | Fix default password in import services | P0 | Small |
| TD-007 | Config | Uncomment `.env` entries in `.gitignore` | P1 | Trivial |
| TD-008 | Config | Remove default credentials from dev config | P1 | Small |
| TD-009 | Testing | Add OWASP dependency-check to CI pipeline | P2 | Small |
| TD-010 | Data Safety | Override `findAll()` in 4 repositories to prevent tenant leak | P3 | Small |

---

## 6. Refactoring Recommendations

### Immediate (Pre-Beta)

1. **Fix P0-SEC-001:** Change import services to generate random passwords and force password reset
2. **Fix P0-SEC-002:** Add `@RequiresFeature(FeatureFlag.ENABLE_FLUENCE)` to FluenceEditLockController and FluenceAttachmentController as a quick gate
3. **Fix P1-SEC-003:** Uncomment `.env` in `.gitignore`

### Post-Beta (Week 2)

4. **Enable strictNullChecks** incrementally (start with `frontend/lib/` directory)
5. **Split AuthService** into focused services (Password, OAuth, MFA, Session)
6. **Split WorkflowService** into WorkflowExecutionService and WorkflowQueryService
7. **Add OWASP Dependency-Check** Maven plugin to CI pipeline

---

## 7. Metrics Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| `@RequiresPermission` coverage | 1,485 annotations / 1,522 endpoints | 100% | 97.6% |
| Input validation annotations | 978 across 247 files | Comprehensive | Good |
| SQL injection risk | 0 vulnerable patterns | 0 | PASS |
| XSS risk | 0 dangerouslySetInnerHTML | 0 | PASS |
| Hardcoded secrets in prod code | 0 (2 in import defaults) | 0 | CONDITIONAL |
| TypeScript `any` usage | 57 occurrences | 0 | 57 remaining |
| God classes (>500 lines) | 8 backend, 5 frontend | 0 | 13 total |

---

## Appendix: Scan Methodology

1. **SQL Injection:** Grep for string concatenation in SQL, `createNativeQuery`, `@Query` with `+` operators
2. **XSS:** Grep for `dangerouslySetInnerHTML`, `innerHTML`, `__html`
3. **Secrets:** Grep for `password =`, `secret =`, `api_key =` patterns with hardcoded values
4. **CSRF:** Read SecurityConfig.java, verify CookieCsrfTokenRepository configuration
5. **Auth Bypass:** Cross-reference controllers with `@RequiresPermission` annotations
6. **Tenant Isolation:** Check repository queries for `tenantId` filtering, verify RLS documentation
7. **Code Quality:** File size analysis, `any` type grep, `console.log` grep
8. **Dependencies:** Manual review of `package.json` and `pom.xml` versions
