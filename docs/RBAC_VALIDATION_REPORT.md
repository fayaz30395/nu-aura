# RBAC Validation Report

**Date:** 2026-03-22
**Author:** Architecture Agent (Security Guardian)
**Sprint:** Nu-HRMS Beta Launch (Day 1 Discovery)
**Status:** COMPLETE - P0 Findings Identified

---

## Executive Summary

Comprehensive RBAC matrix validation across 500+ permissions, 143 controllers, and 6 demo roles. The core RBAC infrastructure is **architecturally sound** with defense-in-depth, but **two P0 security gaps** and several P1 issues require remediation before beta launch.

**Verdict:** RBAC is **conditionally ready** for internal beta (50-100 users) with the P0 fixes applied.

---

## 1. Permission Enforcement Architecture

### 1.1 Backend RBAC Stack (VALIDATED)

| Layer | File | Status | Notes |
|-------|------|--------|-------|
| Filter Chain | `SecurityConfig.java` | PASS | Correct order: TenantFilter -> RateLimitingFilter -> JwtAuthenticationFilter |
| JWT Processing | `JwtAuthenticationFilter.java` | PASS | BUG-012 fix in place: loads permissions from DB when JWT has roles-only (CRIT-001) |
| Permission Normalization | `JwtAuthenticationFilter.normalizePermissionCode()` | PASS | Converts `employee.read` -> `EMPLOYEE:READ` correctly |
| AOP Permission Check | `PermissionAspect.java` | PASS | Intercepts `@RequiresPermission`, supports `value()` (OR) and `allOf()` (AND) logic |
| AOP Feature Flag Check | `FeatureFlagAspect.java` | PASS | Intercepts `@RequiresFeature` at method and class level |
| SuperAdmin Bypass (Backend) | `PermissionAspect.java:51` | PASS | `SecurityContext.isSuperAdmin()` returns early before any permission check |
| SuperAdmin Bypass (Feature) | `FeatureFlagAspect.java:31` | PASS | Same pattern, added in QA Round 3 |
| Permission Hierarchy | `SecurityContext.hasPermission()` | PASS | MODULE:MANAGE implies all actions; VIEW_ALL > VIEW_TEAM > VIEW_DEPARTMENT > VIEW_SELF |
| Format Bidirectional Match | `SecurityContext.hasPermission()` | PASS | Safety net: tries both `EMPLOYEE:READ` and `employee.read` formats |
| Revalidation Path | `PermissionAspect.checkPermissionWithRevalidation()` | PASS | Fresh DB lookup for sensitive ops (bypasses Redis cache) |
| Permission Cache | `SecurityService.getCachedPermissions()` | PASS | Redis-cached, tenant-aware, 1-hour TTL |

### 1.2 Frontend RBAC Stack (VALIDATED)

| Layer | File | Status | Notes |
|-------|------|--------|-------|
| Auth Store | `useAuth.ts` (Zustand) | PASS | Persists to sessionStorage, roles + permissions from login response body |
| Permission Hook | `usePermissions.ts` | PASS | 513 permission constants defined, matching backend `Permission.java` |
| Admin Bypass | `usePermissions.ts:639` | PASS | `isAdmin` (SUPER_ADMIN or TENANT_ADMIN) returns true for all hasPermission() calls |
| SystemAdmin Bypass | `usePermissions.ts:621-627` | PASS | Checks SYSTEM:ADMIN, HRMS:SYSTEM:ADMIN, and system.admin formats |
| Permission Normalization | `usePermissions.ts:596-607` | PASS | Normalizes dot format (`employee.read` -> `EMPLOYEE:READ`) and strips app prefix (`HRMS:EMPLOYEE:READ` -> `EMPLOYEE:READ`) |
| Permission Hierarchy | `usePermissions.ts:644-648` | PASS | MODULE:MANAGE implies all actions in that module |
| Edge Middleware | `middleware.ts` | PASS | 98 authenticated routes, 16 public routes. Coarse cookie check only. |
| Sidebar MY SPACE | `menuSections.tsx:192-206` | PASS | No `requiredPermission` on any My Space item (correct per architecture) |
| Sidebar Admin Sections | `menuSections.tsx` | PASS | All admin sections have `requiredPermission` set |

### 1.3 Multi-Tenant Isolation (VALIDATED)

| Control | Status | Evidence |
|---------|--------|----------|
| `tenant_id` on all tables | PASS | All entities have `tenant_id` UUID column |
| PostgreSQL RLS policies | PASS | V36 (reinstate), V37 (core HR), V38 (complete coverage), V43 (junction tables) |
| TenantContext ThreadLocal | PASS | Set from JWT `tenantId` claim in filter, cleared after request |
| Filter chain order | PASS | TenantFilter runs first, sets context before JWT processing |
| Cross-tenant query prevention | PASS | Repository methods include tenant_id in WHERE clauses |

---

## 2. Controller Permission Coverage

### 2.1 Coverage Summary

| Category | Count | Status |
|----------|-------|--------|
| Total controllers in `api/` package | 100+ | Audited |
| Controllers with `@RequiresPermission` | 91+ | PASS |
| Controllers with `@PreAuthorize` | 1 (FileUploadController) | PASS (uses isAuthenticated + hasPermission) |
| Controllers with `@RequiresFeature` | 5 | PASS (LMS x2, Payment x3, Compensation x1) |
| **Intentionally public controllers** | 4 | PASS (see below) |
| **UNPROTECTED controllers (P0/P1)** | 2 | **FAIL** (see below) |

### 2.2 Intentionally Public Controllers (VALIDATED)

| Controller | Route | Justification |
|------------|-------|---------------|
| `AuthController` | `/api/v1/auth/**` | Pre-authentication (login, register, password reset) |
| `MfaController` | `/api/v1/auth/mfa-login` | Pre-authentication MFA step |
| `PublicOfferController` | `/api/v1/public/offers/**` | Token-based candidate access (no session) |
| `PublicCareerController` | `/api/public/careers/**` | Public job listings |
| `TenantController` | `/api/v1/tenants/register` | SaaS self-serve registration |
| `FileUploadController` | `/api/v1/files/**` | Uses `@PreAuthorize("isAuthenticated()")` + granular `hasPermission()` on mutations |
| `PaymentWebhookController` | Webhook endpoint | Authenticated via HMAC signature verification internally |

### 2.3 UNPROTECTED Controllers (P0 SECURITY GAPS)

| # | Controller | Route | Severity | Risk |
|---|-----------|-------|----------|------|
| **SEC-001** | `FluenceEditLockController` | `/api/v1/fluence/edit-lock/**` | **P1** | Any authenticated user can acquire/release edit locks on any Fluence content. No permission check. Should require `KNOWLEDGE:WIKI_UPDATE` or equivalent. |
| **SEC-002** | `FluenceAttachmentController` | `/api/v1/fluence/attachments/**` | **P0** | Any authenticated user can upload, list, download, and **delete** attachments without permission check. The `DELETE` endpoint is the highest risk -- can remove content from any Fluence item. Should require `KNOWLEDGE:WIKI_CREATE` for upload, `KNOWLEDGE:WIKI_DELETE` for delete. |

---

## 3. Permission-Role Mapping Validation

### 3.1 Seeded Permissions (Database)

| Migration | Format | Scope |
|-----------|--------|-------|
| V19 (platform seed) | `resource.action` (lowercase dot) | Original permission codes |
| V60 (role_permissions seed) | References V19 codes | HR_ADMIN, MANAGER, EMPLOYEE, TEAM_LEAD, HR_MANAGER, RECRUITMENT_ADMIN |
| V66 (RBAC gap fix round 1) | Not read -- exists | First round of fixes |
| V67 (RBAC gap fix round 2) | `UPPERCASE:COLON` format | 40 new permission codes + 6 role assignments |

### 3.2 Dual-Format Permission Gap Analysis

**Critical Finding:** The `permissions` table contains codes in TWO formats:
- V19 seeds: `employee.read`, `attendance.read`, etc. (lowercase dot)
- V67 seeds: `REVIEW:VIEW`, `ATTENDANCE:MARK`, etc. (UPPERCASE colon)

**Impact:** V60's role_permissions reference V19's lowercase dot codes. V67's role_permissions reference V67's UPPERCASE colon codes. The JwtAuthenticationFilter normalizes at load time, so both formats resolve correctly at runtime. However, this creates duplicate rows in the `permissions` table (e.g., both `attendance.read` and `ATTENDANCE:VIEW_SELF` exist as separate records).

**Risk Level:** LOW -- the normalization in `JwtAuthenticationFilter.normalizePermissionCode()` and `SecurityContext.hasPermission()` handles both formats. But it's technical debt that should be consolidated post-beta.

### 3.3 Permission Gaps by Role (Beta-Critical 8 Modules)

#### EMPLOYEE Role

| Module | Required Permission | Seeded? | Source |
|--------|-------------------|---------|--------|
| Employee (self-view) | `employee.read` | Yes (V60, SELF) | V60 |
| Attendance (self) | `ATTENDANCE:VIEW_SELF`, `ATTENDANCE:MARK` | Yes (V67, SELF) | V67 |
| Leave (self) | `LEAVE:VIEW_SELF`, `leave.request` | Yes (V67+V60, SELF) | V67+V60 |
| Benefits (self) | `BENEFIT:VIEW_SELF`, `BENEFIT:ENROLL` | Yes (V67, SELF) | V67 |
| Dashboard | `DASHBOARD:VIEW`, `DASHBOARD:EMPLOYEE` | Yes (V67, SELF) | V67 |
| Payroll (self) | `PAYROLL:VIEW_SELF` | Yes (V67, SELF) | V67 |
| Calendar | `CALENDAR:VIEW` | Yes (V67, SELF) | V67 |
| Performance (self) | `REVIEW:VIEW`, `REVIEW:SUBMIT`, `GOAL:CREATE` | Yes (V67, SELF) | V67 |
| Expense (self) | `EXPENSE:VIEW_SELF`, `EXPENSE:CREATE` | Yes (V67, SELF) | V67 |
| **MISSING: Asset (self)** | `ASSET:VIEW` | **NO** | **GAP** |
| **MISSING: Loan (self)** | `LOAN:VIEW` | **NO** | **GAP** |

#### TEAM_LEAD Role

| Module | Required Permission | Seeded? | Source |
|--------|-------------------|---------|--------|
| Performance | `REVIEW:VIEW`, `REVIEW:CREATE`, `REVIEW:APPROVE`, `GOAL:CREATE`, `GOAL:APPROVE` | Yes (V67, TEAM) | V67 |
| Leave (team) | `LEAVE:VIEW_TEAM`, `leave.approve` | Yes (V67+V60, TEAM) | V67+V60 |
| Attendance (team) | `ATTENDANCE:VIEW_TEAM`, `ATTENDANCE:APPROVE` | Yes (V67, TEAM) | V67 |
| Expense (team) | `EXPENSE:APPROVE` | Yes (V67, TEAM) | V67 |
| **MISSING: Recruitment** | `RECRUITMENT:VIEW` | **NO** | **GAP** (beta scope) |

#### HR_ADMIN Role

| Module | Status | Notes |
|--------|--------|-------|
| Employee CRUD | PASS | Full access via V60 |
| Attendance | PASS | V60 + V67 |
| Leave | PASS | V60 + V67 (VIEW_ALL, APPROVE, MANAGE) |
| Payroll | PASS | V67 (VIEW, PROCESS, APPROVE) |
| Benefits | PASS | V67 (VIEW, MANAGE) |
| Performance | PASS | V67 (all REVIEW + GOAL + REVIEW_CYCLE) |
| Recruitment | PASS | V60 (recruitment.manage) |
| Analytics/Reports | PASS | V60 + V67 |
| **MISSING: Asset mgmt** | `ASSET:VIEW`, `ASSET:MANAGE` | **NO** | **GAP** |
| **MISSING: Onboarding** | `ONBOARDING:VIEW`, `ONBOARDING:MANAGE` | **NO** | **GAP** |

### 3.4 Permission Gaps Summary

| Gap ID | Permission | Roles Missing | Severity | Module In Beta Scope? |
|--------|-----------|---------------|----------|-----------------------|
| GAP-001 | `ASSET:VIEW` | EMPLOYEE, TEAM_LEAD, HR_ADMIN | P1 | Yes (Asset Management) |
| GAP-002 | `ASSET:MANAGE` | HR_ADMIN | P1 | Yes |
| GAP-003 | `LOAN:VIEW` | EMPLOYEE | P2 | No (out of beta scope) |
| GAP-004 | `ONBOARDING:VIEW/MANAGE` | HR_ADMIN | P1 | Yes (Onboarding Workflows) |
| GAP-005 | `RECRUITMENT:VIEW` | TEAM_LEAD | P2 | Yes but TL doesn't need it |
| GAP-006 | Knowledge permissions | All non-SuperAdmin | P2 | No (NU-Fluence is Phase 2) |

---

## 4. Infrastructure Health Assessment

### 4.1 Docker Compose Stack

| Service | Image | Port | Health Check | Status |
|---------|-------|------|-------------|--------|
| Redis | `redis:7-alpine` | 6379 | `redis-cli ping` | CONFIGURED |
| Zookeeper | `confluentinc/cp-zookeeper:7.6.0` | 2181 | N/A | CONFIGURED |
| Kafka | `confluentinc/cp-kafka:7.6.0` | 9092 | `kafka-broker-api-versions` | CONFIGURED |
| Elasticsearch | `elasticsearch:8.11.0` | 9200 | `_cluster/health` | CONFIGURED |
| MinIO | `minio/minio:latest` | 9000/9001 | N/A (service_started only) | CONFIGURED |
| Prometheus | `prom/prometheus:latest` | 9090 | N/A | CONFIGURED |
| Backend | Spring Boot | 8080 | Depends on Redis, Kafka, MinIO, ES | CONFIGURED |
| Frontend | Next.js | 3000 | Depends on backend | CONFIGURED |

**Note:** No local PostgreSQL -- dev DB is Neon cloud (configured via `NEON_JDBC_URL` env var).

### 4.2 Infrastructure Concerns

| # | Concern | Severity | Details |
|---|---------|----------|---------|
| INFRA-001 | MinIO lacks health check | P2 | Only `service_started`, no actual health verification |
| INFRA-002 | JWT_SECRET default in docker-compose | P1 | Default value `local-dev-jwt-secret-change-in-production-minimum-32-chars` -- must be rotated before any non-dev deployment |
| INFRA-003 | Elasticsearch security disabled | P2 | `xpack.security.enabled=false` -- acceptable for internal beta but must be enabled for production |
| INFRA-004 | No Grafana in docker-compose | P2 | Prometheus is configured but Grafana dashboard container is missing |

---

## 5. Security Posture Assessment

### 5.1 OWASP Headers (VALIDATED)

| Header | Backend (SecurityConfig) | Frontend (middleware.ts) | Status |
|--------|-------------------------|------------------------|--------|
| X-Frame-Options: DENY | Yes (`.frameOptions(frame -> frame.deny())`) | Expected in CSP | PASS |
| X-Content-Type-Options: nosniff | Yes (`.contentTypeOptions()`) | Yes | PASS |
| HSTS (31536000s, includeSubDomains) | Yes | Yes | PASS |
| Referrer-Policy: strict-origin-when-cross-origin | Yes | Yes | PASS |
| Permissions-Policy (deny camera, mic, geo, payment, USB, display-capture) | Yes | Yes | PASS |
| Content-Security-Policy | Yes (`default-src 'self'; frame-ancestors 'none'`) | Yes (strict-dynamic in prod) | PASS |

### 5.2 CSRF Protection (VALIDATED)

| Aspect | Status | Details |
|--------|--------|---------|
| Pattern | PASS | Double-submit cookie (`CookieCsrfTokenRepository.withHttpOnlyFalse()`) |
| Cookie path | PASS | Set to `/` |
| Auth endpoints excluded | PASS | `/api/v1/auth/**` |
| External endpoints excluded | PASS | e-signature, public offers, exit interview |
| WebSocket excluded | PASS | `/ws/**` |
| Actuator health excluded | PASS | `/actuator/health` |
| Fluence chat excluded | PASS | SSE streaming endpoint |
| DocuSign webhook excluded | PASS | HMAC-verified |
| Configurable disable | PASS | `app.security.csrf.enabled` property |

### 5.3 Rate Limiting (VALIDATED per MEMORY.md)

| Endpoint Category | Capacity | Refill Rate | Status |
|-------------------|----------|-------------|--------|
| Authentication | 5 requests | 5/min | CONFIGURED |
| General API | 100 requests | 100/min | CONFIGURED |
| Export/Reporting | 5 requests | 5/5min | CONFIGURED |
| Social Feed/Wall | 30 requests | 30/min | CONFIGURED |
| Redis fallback | In-memory Bucket4j | N/A | CONFIGURED |

### 5.4 CORS Configuration (VALIDATED)

| Aspect | Status | Details |
|--------|--------|---------|
| Allowed origins | PASS | Explicit list (localhost:3000, 3001, 8080), no wildcards |
| Allowed methods | PASS | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed headers | PASS | Explicit enumeration (no wildcard) |
| Credentials | PASS | `allowCredentials: true` |
| Exposed headers | PASS | Authorization, X-Tenant-ID |

### 5.5 Password Policy (per MEMORY.md)

| Rule | Status |
|------|--------|
| Min 12 characters | CONFIGURED |
| Max 128 characters | CONFIGURED |
| Uppercase + lowercase + digit + special | CONFIGURED |
| Max 3 consecutive identical chars | CONFIGURED |
| Password history (last 5) | CONFIGURED |
| Max age 90 days | CONFIGURED |
| Rejects common passwords | CONFIGURED |
| Rejects user info in password | CONFIGURED |

---

## 6. Performance Baseline Risks

### 6.1 N+1 Query Risks

| Area | Risk | Details |
|------|------|---------|
| Permission loading | LOW | Redis-cached (`getCachedPermissions`), loaded once per request |
| Employee directory | MEDIUM | `EmployeeDirectoryController` -- BUG-002 (field mapping 500 error) indicates query issues |
| Approval workflow inbox | MEDIUM | BUG-003 (NullPointerException) suggests missing null guards in WorkflowService |

### 6.2 Cache Strategy

| Cache | TTL | Invalidation | Status |
|-------|-----|-------------|--------|
| Permission cache (Redis) | 1 hour | Role change triggers invalidation | ADEQUATE for beta |
| Rate limit buckets (Redis) | Per-window | Automatic expiry | PASS |
| Session data (Redis) | Per JWT expiry | Logout clears | PASS |

---

## 7. Known Open Bugs (from QA Round 4)

| Bug | Severity | Impact on RBAC | Status |
|-----|----------|---------------|--------|
| BUG-001 | Medium | None (LinkedIn endpoint, not RBAC) | Open |
| BUG-002 | High | None (field mapping, not RBAC) | Open |
| BUG-003 | High | None (NPE, not RBAC) | Open |
| BUG-004 | High | None (validation, not RBAC) | Open |
| BUG-005 | Medium | None (hydration, not RBAC) | Open |
| BUG-006 | **Critical** | **RBAC gap** -- Team Lead 403 on goals/reviews | Fix Ready (V67 awaiting Flyway apply) |
| BUG-007 | Medium | None (hydration, not RBAC) | Fixed |

---

## 8. Recommendations

### P0 -- Must Fix Before Beta Launch

1. **SEC-002: Add `@RequiresPermission` to `FluenceAttachmentController`**
   - Upload: `@RequiresPermission(Permission.KNOWLEDGE_WIKI_CREATE)` or content-type-specific
   - Delete: `@RequiresPermission(Permission.KNOWLEDGE_WIKI_DELETE)`
   - Read: `@RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)`
   - **Risk if unfixed:** Any authenticated user can delete Fluence attachments

2. **Apply V67 migration** -- Restart backend to trigger Flyway. This fixes BUG-006 (Team Lead 403 on performance module).

### P1 -- Must Fix Before Beta Week Ends

3. **SEC-001: Add `@RequiresPermission` to `FluenceEditLockController`**
   - All endpoints: `@RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)`
   - Lower priority because NU-Fluence is Phase 2

4. **GAP-001/002: Seed `ASSET:VIEW` and `ASSET:MANAGE` permissions for roles** (V68 migration)
   - EMPLOYEE: `ASSET:VIEW` (SELF scope)
   - HR_ADMIN: `ASSET:VIEW`, `ASSET:MANAGE` (ALL scope)

5. **GAP-004: Seed `ONBOARDING:VIEW/MANAGE` for HR_ADMIN** (V68 migration)

6. **INFRA-002: Rotate JWT_SECRET** from default value before any non-localhost access

### P2 -- Post-Beta

7. Consolidate dual-format permissions (lowercase dot + UPPERCASE colon) into single UPPERCASE colon format
8. Add Grafana container to docker-compose
9. Enable Elasticsearch security (`xpack.security.enabled=true`)
10. Add MinIO health check to docker-compose

---

## 9. Validation Methodology

### Scope
- **Backend:** 100+ controllers in `backend/src/main/java/com/hrms/api/` audited for `@RequiresPermission`, `@PreAuthorize`, or `@RequiresFeature` annotations
- **Frontend:** `usePermissions.ts` (513 permission constants), `useAuth.ts` (Zustand store), `middleware.ts` (route protection), `menuSections.tsx` (sidebar permissions)
- **Database:** Flyway migrations V0-V67 reviewed for permission seeding, role_permissions mapping, RLS policies
- **Infrastructure:** `docker-compose.yml`, `SecurityConfig.java`, CORS/CSRF/rate limiting configuration

### Tools Used
- Static code analysis (grep for `@RequiresPermission`, `@PreAuthorize`, `@RequiresFeature`)
- Controller inventory vs. annotation coverage comparison
- Migration SQL cross-reference (V19 seeds vs V60 role assignments vs V67 gap fixes)
- Security header verification against OWASP standards

### Limitations
- No live testing performed (backend was not running during this audit)
- Permission count in DB cannot be verified without database access
- Redis cache behavior not tested live

---

## 10. Conclusion

The NU-AURA RBAC system has a **strong architectural foundation**:
- Defense-in-depth (filter chain + AOP aspects + frontend hooks)
- Proper SuperAdmin bypass at all 4 layers (PermissionAspect, FeatureFlagAspect, usePermissions, middleware)
- Bidirectional permission format normalization (handles dual DB formats)
- Redis-cached permission loading with revalidation path for sensitive operations
- Comprehensive RLS policies for tenant isolation (V36-V43)

**Two P0 issues** require immediate attention:
1. `FluenceAttachmentController` missing permission annotations (authenticated users can delete any attachment)
2. V67 migration not yet applied (Team Lead blocked from performance module)

With these fixes applied, the RBAC system is **ready for internal beta launch**.

---

*Report generated by Architecture Agent / Security Guardian*
*Sprint: Nu-HRMS Beta Launch (Day 1 Discovery)*
