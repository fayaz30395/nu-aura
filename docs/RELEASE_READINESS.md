# Release Readiness Checklist

**Project:** NU-AURA HRMS Platform
**Assessment Date:** March 5, 2026
**Last Updated:** March 7, 2026
**Gate Status:** **GO** — All blockers (B1-B3) and must-fix items (M1-M5) are closed in code. Sprint 8 security hardening applied (CSP headers, AES-GCM, mass-assignment guards).

## Release Gate Rules
- **GO**: All `Blocker` items are closed, and at least Priority `M1-M3` in `Must-fix` are closed.
- **NO-GO**: Any `Blocker` remains open.

## 1) Blockers (Do Not Release)

| ID | Item | Severity | Owner | Status | Resolution |
|---|---|---|---|---|---|
| B1 | Replace insecure encryption strategy (ECB mode, fallback key, raw-return on decrypt failure) | Critical | | **CLOSED** | Upgraded `CryptoConverter` to AES-256-GCM with random IV per encryption; removed insecure fallback key (now mandatory env var); decrypt failure throws instead of returning plaintext. Legacy ECB data decrypted transparently on read via prefix detection (`GCMv1:`). |
| B2 | Remove/contain privileged bypass path in permission enforcement (`isSuperAdmin` bypass) | Critical | | **CLOSED** | Removed global bypass in `PermissionAspect`; `@RequiresPermission` now enforces permissions for all users. `SecurityContext.isSuperAdmin()` is now permission-based (`SYSTEM_ADMIN`) to avoid role-only escalation. |
| B3 | Unify migration strategy for production (Flyway/Liquibase split) | Critical | | **CLOSED** | PM module converted from Liquibase to Flyway: `V1__pm_schema_initial.sql` created from all 6 Liquibase changesets; `spring.liquibase.enabled=false` and `spring.flyway.enabled=true` set in `modules/pm/src/main/resources/application.yml`. Both backend and PM now use Flyway exclusively. |

## 2) Must-fix (High Risk)

| ID | Priority | Item | Severity | Status | Resolution |
|---|---|---|---|---|---|
| M1 | P1 | Make account lockout distributed/persistent (not in-memory only) | High | **CLOSED** | `AccountLockoutService` rewritten to use `StringRedisTemplate`. Attempts stored as `lockout:attempts:{username}` (TTL = 15 min sliding window), lockout flag at `lockout:locked:{username}` (TTL = lock duration). Consistent across all cluster nodes. |
| M2 | P1 | Remove frontend mock fallbacks for resource management and ensure backend parity | High | **CLOSED** | `ResourceManagementController` at `/api/v1/resource-management` is fully implemented with all workload, capacity, allocation-requests, and availability endpoints. `ResourceController` at `/api/v1/resources/` provides allocation-summary, available, timeline, and reallocate endpoints. `ResourceManagementApiError` in frontend is graceful degradation (empty state, not mock data) that will not fire once the controller is deployed. |
| M3 | P1 | Align LMS frontend/backend API contract (`/lms/courses*`) | High | **CLOSED** | Added all missing endpoints to `LmsController`: `GET/POST /courses`, `GET /courses/published`, `GET/PUT /courses/{id}`, publish/archive/delete, `GET /my-certificates`, `GET /certificates/verify/{n}`, `GET /dashboard`, `GET /admin/dashboard`, `POST+GET /progress/{enrollmentId}/content`. All delegate to existing `LmsService` methods. |
| M4 | P2 | Close listed P0 backlog items (ATS parity, implicit role automation, offer/e-sign completion) | High | **CLOSED** | Added implicit role automation wiring in auth flow: implicit manager roles/permissions are now merged into token role+permission assembly via `ImplicitRoleService` based on employee hierarchy. ATS + offer/e-sign already wired. |
| M5 | P2 | Remove/mock-gate not-implemented calendar integration paths | Medium | **CLOSED** | `CalendarService.java` already has `@Value("${calendar.sync.mock-mode:true}")` feature flag. All real-provider sync paths (`GOOGLE`, `OUTLOOK`, `APPLE`) throw `UnsupportedOperationException` when `mockMode=false`. Import paths also guard with `if (mockMode)` before throwing. Default is `true`, so production deployments that don't set the flag won't hit unimplemented code. No changes needed. |

## 3) Can-ship (Acceptable Baseline)

| ID | Item | Status | Evidence |
|---|---|---|---|
| C1 | Broad backend API coverage is in place | Yes | 91+ controllers under `backend/src/main/java/com/hrms/api` |
| C2 | Core auth stack exists (JWT, CSRF, method security) | Yes | `backend/src/main/java/com/hrms/common/config/SecurityConfig.java` |
| C3 | Core HR modules implemented (employee, leave, attendance, payroll, performance, recruitment) | Yes | `backend/src/main/java/com/hrms/api/*`, `frontend/app/*` |
| C4 | Infrastructure and observability baseline present | Yes | `deployment/kubernetes`, `monitoring` |
| C5 | Meaningful test footprint present | Yes | backend tests + frontend e2e suite (140+ specs) |
| C6 | Course player, FnF, Statutory report, Attrition report, Headcount report pages built | Yes | Sprint 4-7 pages merged |
| C7 | Sprint 8 security hardening applied | Yes | CSP + security headers in `next.config.js`; AES-256-GCM encryption; Redis-backed lockout; Hibernate SQL logs silenced in prod; mass-assignment guard on `createCourse`; `DOMPurify` on course player HTML; XssRequestWrapperFilter active |

## Pre-Production Checklist (before sign-off)

- [ ] Set `APP_SECURITY_ENCRYPTION_KEY` to a 32-byte random key in production secrets (never use a default)
- [ ] Run data migration to re-encrypt legacy ECB rows: `SELECT id FROM <table> WHERE <col> NOT LIKE 'GCMv1:%'`
- [x] Global super-admin bypass removed from `PermissionAspect`; no bypass audit hook required
- [ ] Deploy Redis and confirm `AccountLockoutService` writes/reads successfully
- [ ] Confirm PM module starts cleanly with Flyway (check Flyway history table in `pm` schema)
- [x] M2 closed: `ResourceManagementController` + `ResourceController` confirmed implemented; frontend shows empty state (not mock) when backend unavailable
- [x] M3 closed: all missing `LmsController` endpoints added
- [x] M5 closed: `CalendarService` confirmed feature-flagged via `calendar.sync.mock-mode` (default=true)

## Exit Criteria
- All Blockers **(B1-B3) CLOSED** ✓
- All Must-fix **(M1-M5) CLOSED** ✓
- Final regression + security verification against staging.

## Sign-off
- Engineering Lead: ____________________ Date: __________
- Security Lead: _______________________ Date: __________
- QA Lead: _____________________________ Date: __________
- Product Owner: _______________________ Date: __________
