# NU-AURA Platform — Architecture Memory

> **Purpose:** Comprehensive living wiki for the NU-AURA platform. Captures architecture decisions, evolving state, and change history. Complements `CLAUDE.md` (locked-in tech stack and code rules). When facts differ between the two files, MEMORY.md is the more recent source of truth for evolving state (migration counts, module status, etc.).

---

# Tier 1: Architecture Decisions

Stable decisions that rarely change. All developers and AI agents must follow these.

---

## 1.1 Core Principle: Every User Is an Employee

**Decision:** In NU-AURA, **every user — regardless of role — is also an employee**. An HR Manager, a CEO, a Team Lead, and a regular Employee all share the same employee record. Higher roles grant additional admin/management capabilities, but they **never lose** the base employee experience.

**Implications:**

- **Sidebar:** The "My Space" section (My Dashboard, My Profile, My Payslips, My Attendance, My Leaves, My Documents) is **always visible** to all authenticated users. These items must have **no `requiredPermission`** in the sidebar config. Permission enforcement happens at the page/API level (users can only see their own data).
- **RBAC:** Roles are **additive, not exclusive**. An HR_MANAGER has all the permissions of an EMPLOYEE plus HR management permissions. A SUPER_ADMIN has everything.
- **Self-service pages** (`/me/*` routes) must always be accessible to any authenticated user. Never gate them behind module-level permissions.
- **Admin/management pages** are gated by specific permissions, but users with those permissions still see all regular employee pages too.
- **Sidebar MY SPACE items** must never have `requiredPermission` — they are self-service and visible to everyone.

**Key file:** `frontend/components/layout/menuSections.tsx` — MY SPACE section has no `requiredPermission` on any item.

---

## 1.2 RBAC Architecture

### Permission Format

Two formats exist in the codebase. Both are supported:

| Location | Format | Example |
|----------|--------|---------|
| Database (`permissions` table, V19 seed) | lowercase dot | `employee.read` |
| Java constants (`Permission.java`) | UPPERCASE colon | `EMPLOYEE:READ` |
| `@RequiresPermission` annotations | UPPERCASE colon | `EMPLOYEE:READ` |

**Resolution:** Normalization happens at two levels:
1. **Load time:** `JwtAuthenticationFilter.normalizePermissionCode()` converts `employee.read` → `EMPLOYEE:READ` when loading permissions from DB.
2. **Check time:** `SecurityContext.hasPermission()` has a safety net that tries both formats during comparison — so even if a code path bypasses the filter, permission checks still work.

### Permission Scale

500+ granular permissions across 16 business modules. Documented in `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`.

### Permission Hierarchy

`SecurityContext.hasPermission()` supports implicit grants:
- `MODULE:MANAGE` implies all actions for that module (`MODULE:READ`, `MODULE:MARK`, etc.)
- `MODULE:READ` implies `MODULE:VIEW_*` actions
- Scope hierarchy: `VIEW_ALL` > `VIEW_TEAM` > `VIEW_DEPARTMENT` > `VIEW_SELF` — higher scopes imply all lower scopes.

### Permission Loading Flow (CRIT-001)

Permissions were removed from the JWT to keep the httpOnly cookie under the browser's 4096-byte limit (see `ADR-002-JWT-TOKEN-OPTIMIZATION.md` — 96% JWT size reduction). The current flow:

1. **JWT contains roles only** — `roles` claim has role codes (e.g., `SUPER_ADMIN`, `HR_MANAGER`)
2. **JwtAuthenticationFilter** detects empty `permissionScopes` from token
3. Loads permissions from DB via `SecurityService.getCachedPermissions(roles)` (Redis-cached, tenant-aware)
4. Normalizes each permission code from DB format to UPPERCASE:COLON format
5. Stores in `SecurityContext.currentPermissions` ThreadLocal for the request lifecycle
6. Also adds as `GrantedAuthority` entries for Spring Security's `@PreAuthorize` path

**Key files:**
- `backend/.../security/JwtAuthenticationFilter.java` — permission loading + normalization
- `backend/.../security/SecurityContext.java` — `hasPermission()` with bidirectional format matching + hierarchy
- `backend/.../security/SecurityService.java` — `getCachedPermissions()` with Redis cache + tenant isolation
- `backend/.../security/Permission.java` — canonical permission constants

### SuperAdmin Bypass

SuperAdmin bypasses **all** access control checks. This is enforced at three levels:

| Layer | File | Mechanism |
|-------|------|-----------|
| Permission checks | `PermissionAspect.java` | `if (SecurityContext.isSuperAdmin()) return joinPoint.proceed()` |
| Feature flag checks | `FeatureFlagAspect.java` | Same pattern — added in QA Round 3 |
| Frontend permissions | `usePermissions.ts` | `if (isAdmin) return true` in `hasPermission()` |
| Middleware (Next.js) | `middleware.ts` | SUPER_ADMIN role in JWT bypasses all route restrictions |

`SecurityContext.isSuperAdmin()` checks: `hasRole("SUPER_ADMIN") || isSystemAdmin()` — where `isSystemAdmin()` checks for the `SYSTEM:ADMIN` permission (optionally app-prefixed).

---

## 1.3 Feature Flags

Feature flags are stored in the `feature_flags` table (per-tenant, keyed by `feature_key`). Controllers annotated with `@RequiresFeature(FeatureFlag.ENABLE_PAYROLL)` will 403 if the flag isn't enabled for the tenant.

**SuperAdmin bypasses feature flags** (added in QA Round 3 — `FeatureFlagAspect.java`).

**Key files:**
- `backend/.../security/FeatureFlagAspect.java` — AOP aspect enforcing `@RequiresFeature`
- `backend/.../security/RequiresFeature.java` — annotation definition
- `backend/.../featureflag/FeatureFlagService.java` — flag lookup + default flag creation
- `backend/.../featureflag/FeatureFlag.java` — entity + constant strings

---

## 1.4 NU-AURA Platform Structure

NU-AURA is a **bundle app platform** with 4 sub-apps accessed via a Google-style waffle grid app switcher:

| Sub-App | Purpose | Entry Route | Status |
|---------|---------|-------------|--------|
| **NU-HRMS** | Core HR (employees, attendance, leave, payroll, benefits, assets, expenses, loans, compensation) | `/me/dashboard` | Built (~95%) |
| **NU-Hire** | Recruitment & onboarding (job postings, candidates, pipeline, onboarding, offboarding) | `/recruitment` | Built (~92%) |
| **NU-Grow** | Performance, learning & engagement (reviews, OKRs, 360 feedback, LMS, training, recognition, surveys, wellness) | `/performance` | Built (~90%) |
| **NU-Fluence** | Knowledge management & collaboration (wiki, blogs, templates, Drive integration) | `/fluence/wiki` | Phase 2 — backend built, frontend routes defined |

**Single login** for all sub-apps. Auth, RBAC, and platform services are shared.

**App-aware sidebar:** Shows only sections relevant to the active sub-app (determined by route pathname via `useActiveApp` hook). Routes map to apps via `frontend/lib/config/apps.ts`. Sidebar has **9 main sections + 4 app hubs, 113 total menu items**.

**Route structure:** Flat routes (`/employees`, `/recruitment`, `/performance`). Entry points at `/app/hrms`, `/app/hire`, `/app/grow`, `/app/fluence`.

**Key files:**
- `frontend/lib/config/apps.ts` — app definitions, route-to-app mapping, permission prefixes per app
- `frontend/lib/hooks/useActiveApp.ts` — active app detection from pathname
- `frontend/components/platform/AppSwitcher.tsx` — waffle grid UI
- `frontend/components/layout/menuSections.tsx` — sidebar menu config (461 lines)

---

## 1.5 Multi-Tenancy

Shared database, shared schema. All tenant-specific tables have a `tenant_id` UUID column. PostgreSQL Row-Level Security (RLS) enforces isolation. See `docs/adr/ADR-001-multi-tenant-architecture.md`.

`TenantContext` ThreadLocal is the single source of truth for the current tenant. Set in `JwtAuthenticationFilter` from the JWT `tenantId` claim. Cleared after every request.

Filter chain order: `TenantFilter` → `RateLimitingFilter` → `JwtAuthenticationFilter`.

---

## 1.6 Security Architecture

### Authentication

- **JWT expiry:** 1 hour (3,600,000 ms). Refresh token: 24 hours.
- **Cookie-based:** httpOnly `access_token` cookie. Secure=true in production.
- **CSRF:** Double-submit cookie pattern (`CookieCsrfTokenRepository`). Excluded for auth endpoints, external APIs, WebSocket, health checks.
- **Google OAuth:** Supported via `@react-oauth/google` (frontend) + backend OAuth2 client.
- **MFA:** Supported (`/api/v1/auth/mfa-login` is public/pre-auth).

### Password Policy

- Min 12, max 128 characters. Requires uppercase, lowercase, digit, special character.
- Max 3 consecutive identical characters. Password history: last 5 passwords.
- Max age: 90 days. Rejects common passwords. Rejects user info in password.

### CORS

- Default allowed origins: `http://localhost:3000`, `http://localhost:3001`, `http://localhost:8080`
- Configurable via `app.cors.allowed-origins`. Credentials allowed.
- Custom headers: `X-Tenant-ID`, `X-XSRF-TOKEN` in allowed/exposed headers.

### OWASP Security Headers

Applied at both Next.js middleware (edge) and Spring Security levels:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `HSTS: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: Denies camera, microphone, geolocation, payment, USB, display-capture
- `Content-Security-Policy`: Restrictive default-src 'self', allows Google OAuth domains
- `X-XSS-Protection: 1; mode=block` (edge only)

### Rate Limiting

Token bucket algorithm (Bucket4j), backed by Redis for distributed rate limiting:

| Endpoint Category | Capacity | Refill Rate |
|-------------------|----------|-------------|
| Authentication (`/api/v1/auth/**`) | 5 requests | 5 per minute |
| General API | 100 requests | 100 per minute |
| Export/Reporting | 5 requests | 5 per 5 minutes |
| Social Feed/Wall | 30 requests | 30 per minute |

Disabled in dev profile. Falls back to in-memory Bucket4j if Redis is unavailable.

### Access Control Summary

| Endpoint | Access |
|----------|--------|
| `/api/v1/auth/**`, `/actuator/health` | Public |
| `/swagger-ui/**`, `/api-docs/**` | SUPER_ADMIN only |
| `/actuator/**` (except health) | SUPER_ADMIN only |
| All other `/api/**` | Authenticated + RBAC |

---

## 1.7 Event-Driven Architecture (Kafka)

### Topics

| Topic | Consumer Group | Purpose |
|-------|----------------|---------|
| `nu-aura.approvals` | `nu-aura-approvals-service` | Approval workflow events |
| `nu-aura.notifications` | `nu-aura-notifications-service` | Email, SMS, push notifications |
| `nu-aura.audit` | `nu-aura-audit-service` | Audit trail logging |
| `nu-aura.employee-lifecycle` | `nu-aura-employee-lifecycle-service` | Hire, transfer, termination events |
| `nu-aura.fluence-content` | `nu-aura-fluence-search-service` | Elasticsearch content indexing |

Each topic has a matching dead-letter topic (`*.dlt`). DLT handler: `nu-aura-dlt-handler` consumer group. Failed events stored in `FailedKafkaEvent` table for manual recovery.

**Key file:** `backend/.../infrastructure/kafka/KafkaTopics.java`
**Runbook:** `docs/runbooks/kafka-dead-letter.md`

---

## 1.8 Approval Workflow Engine

Generic `approval_service` engine. Workflows are data-driven, not hardcoded.

**Data model:** `workflow_def` → `workflow_step` → `approval_instance` → `approval_task`

Supports: leave approvals, expense approvals, onboarding approvals, performance reviews, asset approvals, requisition approvals. Dynamic routing based on configurable steps and role-based approval chains.

**Key doc:** `docs/build-kit/08_APPROVAL_WORKFLOW_ENGINE.md`

---

## 1.9 Error Handling Conventions

### Frontend

- API errors must show **graceful error states with retry buttons**, never infinite spinners.
- Use React Query's `retry` (2–3 retries) and `retryDelay` (exponential backoff) for transient failures.
- Loading states should be **tab-aware** — only show loading for the active tab's query, not all queries on the page.
- Always provide a user-actionable recovery path (Retry button, or Refresh Page as fallback).

### Backend

- All controllers use `@RequiresPermission` for access control — never manual `if` checks.
- Feature-gated controllers use `@RequiresFeature` at the class level.
- 403 responses include a message explaining what's missing (permission name or feature flag).

---

# Tier 2: Living State

Updated frequently as the project evolves.

---

## 2.1 Codebase Scale

### Backend (Spring Boot Monolith)

| Metric | Count |
|--------|-------|
| Controllers | 161 |
| Services | 217 |
| Entities | ~270 |
| Repositories | 271 |
| DTOs / Request / Response | 482 |
| Config classes | 30+ |
| Test classes | 131 |
| Scheduled jobs (`@Scheduled`) | 25 |
| Kafka listeners | 6 |

**Spring Boot:** 3.4.1 / **Java:** 17 / **JaCoCo minimum:** 80% (excludes DTOs, entities, config)

### Frontend (Next.js 14)

| Metric | Count |
|--------|-------|
| Page routes (`page.tsx`) | 237 |
| Layout files | 5 |
| Components (in `/components`) | 143 |
| React Query hooks (in `/hooks`) | 105 |
| Service files (in `/services`) | 107 |
| Type definition files | 63 |
| Zustand stores | 1 (`useAuth`) |
| Sidebar menu items | 113 |

### Database

| Metric | Count |
|--------|-------|
| Total tables | 270+ |
| Business domains | 16 |
| Active Flyway migrations | 88 files (V0–V91) |

---

## 2.2 Flyway Migration Status

| Field | Value |
|-------|-------|
| Active migrations | V0–V91 (88 files, gaps at V1, V27–V29, V63–V66, V68–V79) |
| Next migration | **V92** |
| Legacy Liquibase | `db/changelog/` — **DO NOT USE** |

**Recent migrations (Wave 12-18, 2026-03-27):**
- `V67` — Fix RBAC permission gaps round 2: 40 missing uppercase permission codes + 6 role assignments
- `V80` — Seed 207 missing permissions covering all 328 `Permission.java` constants (1012 lines, idempotent)
- `V81` — Enable RLS on 115 tenant tables that were previously missing it
- `V82` — LWF (Labour Welfare Fund) tables
- `V83` — Seed default letter templates
- `V84` — SAML identity providers table
- `V85` — Restricted holidays tables
- `V86` — Biometric device integration tables
- `V87` — Statutory filing tables
- `V88` — Expense management extension tables
- `V89` — Shift management enhancement tables
- `V90` — Fix RLS policies and schema corrections
- `V91` — ShedLock table for distributed scheduled job locking

**Earlier migrations:**
- `V59` — Login performance indexes
- `V60` — Seed role_permissions for demo roles
- `V61` — Fix demo user passwords
- `V62` — Seed feature flags for NuLogic demo tenant

---

## 2.3 Seeded Feature Flags (NuLogic Demo Tenant)

All enabled by default for `tenant_id = 660e8400-e29b-41d4-a716-446655440001`:

`enable_payroll`, `enable_leave`, `enable_attendance`, `enable_performance`, `enable_recruitment`, `enable_expenses`, `enable_loans`, `enable_compensation`, `enable_assets`, `enable_documents`

---

## 2.4 Infrastructure Stack

### Docker Compose Services (Development)

| Service | Image | Port |
|---------|-------|------|
| Redis | `redis:7-alpine` | 6379 |
| Zookeeper | `confluentinc/cp-zookeeper:7.6.0` | 2181 |
| Kafka | `confluentinc/cp-kafka:7.6.0` | 9092 (external), 29092 (internal) |
| Elasticsearch | `elasticsearch:8.11.0` | 9200 |
| MinIO | `minio/minio:latest` | 9000 (API), 9001 (Console) |
| Prometheus | `prometheus:latest` | 9090 |
| Backend | Spring Boot | 8080 |
| Frontend | Next.js | 3000 |

**Network:** `hrms_network` (bridge). **No local PostgreSQL** — dev DB is Neon cloud.

### Redis Usage

- Permission cache (TTL: 1 hour)
- Rate limiting (Bucket4j distributed state)
- Session data
- General application cache

### Connection Pools (HikariCP)

| Profile | Max Pool | Min Idle | Connection Timeout | Max Lifetime |
|---------|----------|----------|-------------------|--------------|
| Dev | 10 | 2 | 30s | 30min |
| Prod | 20 | 5 | 30s | 10min |

### Monitoring

- **Prometheus:** 28 alert rules (2 groups), 19 SLO rules
- **Grafana:** 4 dashboards (System Overview, API Metrics, Business Metrics, Webhooks)
- **AlertManager:** Email + webhook + PagerDuty routing

---

## 2.5 Integration Points

| Integration | Purpose | Config |
|-------------|---------|--------|
| Google OAuth | Social login + Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Twilio | SMS notifications | `TwilioConfig.java` (mock mode in dev) |
| MinIO | S3-compatible file storage | Port 9000/9001, `MinioConfig.java` |
| Elasticsearch | Full-text search (NU-Fluence) | Port 9200, `ElasticsearchConfig.java` |
| SMTP | Email delivery | `EmailConfig.java` |
| Job Boards | Recruitment integration | `JobBoardIntegrationService.java` |
| WebSocket/STOMP | Real-time notifications | `/ws/**` endpoint, SockJS fallback |

---

## 2.6 Module Status

### NU-HRMS — Fully Built & QA'd
- Dashboard (main + executive)
- Admin Dashboard (user management, system health, role assignment)
- Employees (CRUD, directory, org chart)
- Attendance (overview, team, regularization, comp-off, shift swap)
- Leave Management (overview, team, calendar, policies, accrual)
- Payroll (runs, payslips, components, statutory)
- Compensation (cycles, revisions)
- Expenses (my claims, pending, all)
- Approvals (pending, approved, rejected)
- Team Directory (grid/list views, department filter)
- Loans (applications, tracking)
- Benefits (enrollment, plans)
- Assets (assignment, tracking)
- Documents (management, templates)
- Projects & Resources (allocation, timesheets)
- Calendar, NU-Drive, NU-Mail

### NU-Hire — Built
- Job Postings, Candidates, Pipeline, Interviews
- Onboarding / Offboarding / Preboarding
- Offer Portal, Careers Page

### NU-Grow — Built
- Performance Reviews (Revolution), OKRs, 360 Feedback
- LMS / Training, Recognition, Surveys, Wellness

### NU-Fluence — Phase 2
- Backend built (Elasticsearch, MinIO drive, comments, engagement, wall/feed)
- Frontend routes defined in `apps.ts` (wiki, blogs, my-content, templates, drive, search, wall, dashboard)
- Wiki, Blogs, Templates, Drive Integration to be implemented

---

## 2.7 Demo Accounts

8 demo users across roles for the NuLogic tenant. Passwords managed via V61 migration.

| Role | Users |
|------|-------|
| SUPER_ADMIN | 1 (admin@nulogic.com) |
| HR_MANAGER | 1 |
| MANAGER | 1 |
| TEAM_LEAD | 1 |
| EMPLOYEE | 2 |
| RECRUITMENT_ADMIN | 1 |
| FINANCE_ADMIN | 1 |

---

## 2.8 Key Dependencies & Versions

### Backend

| Dependency | Version |
|------------|---------|
| Spring Boot | 3.4.1 |
| Java | 17 |
| JJWT | 0.12.6 |
| MinIO SDK | 8.6.0 |
| Apache POI | 5.3.0 |
| OpenPDF | 2.0.3 |
| Bucket4j | 8.7.0 |
| MapStruct | 1.6.3 |
| Lombok | 1.18.36 |
| SpringDoc OpenAPI | 2.7.0 |
| JaCoCo | 0.8.13 |

### Frontend

| Dependency | Version |
|------------|---------|
| Next.js | ^14.2.35 |
| React | 18.2.0 |
| TypeScript | ^5.9.3 |
| Mantine | ^8.3.14 |
| Tailwind CSS | ^3.4.0 |
| React Query | ^5.17.0 |
| Zustand | ^4.4.7 |
| Axios | ^1.7.8 |
| React Hook Form | ^7.49.2 |
| Zod | ^3.22.4 |
| Framer Motion | ^12.23.24 |
| Recharts | ^3.5.0 |
| Tiptap (Rich Text) | ^3.20.1 |
| ExcelJS | ^4.4.0 |
| Lucide React | ^0.561.0 |
| Tabler Icons | ^3.36.1 |

**Note:** `jsPDF` is NOT in dependencies. PDF generation uses OpenPDF (backend) or browser-native APIs.

---

## 2.9 Frontend Configuration

### Next.js Config
- React strict mode enabled
- Image optimization: AVIF + WebP, 7-day cache TTL
- Remote image patterns: Google, AWS S3, CloudFront, GCS, LinkedIn, MinIO
- Bundle analyzer available via `ANALYZE=true`
- Vendor chunk splitting: separate React Query, Recharts, Radix UI
- Console.log stripped in production

### TypeScript Config
- Target: ES2020, Module: ESNext, JSX: Preserve
- `strict: true` but `strictNullChecks: false` (overridden)
- Path alias: `@/*` → `./*`

### Middleware (Edge)
- 16 public routes, 47+ authenticated routes
- Coarse-grained JWT decode (base64, no signature verification at edge)
- Fine-grained auth handled by frontend `AuthGuard` + backend RBAC
- CSP: strict-dynamic in production, unsafe-eval in development

---

## 2.10 Scheduled Jobs

25 `@Scheduled` jobs across these areas (now with **ShedLock** for distributed locking — V91):
- **Attendance:** Auto-regularization
- **Contracts:** Lifecycle management
- **Email:** Scheduled email delivery
- **Notifications:** Scheduled notification dispatch
- **Recruitment:** Job board integration sync
- **Workflows:** Escalation scheduler
- **Reports:** Scheduled report execution
- **Webhooks:** Delivery + retry
- **Rate Limiting:** Token bucket cleanup
- **Tenant:** Tenant-related scheduled operations

---

## 2.11 Documentation Index

| Location | Contents | Count |
|----------|----------|-------|
| `docs/build-kit/` | Core architecture docs (00–17) + ADRs (001–005) + index | 24 files |
| `docs/adr/` | Foundational ADRs (multi-tenant, auth, caching, webhooks) | 5 files |
| `docs/architecture-diagrams/` | Mermaid diagrams (system context, containers, modules, auth flow, etc.) | 9 .mmd files |
| `docs/runbooks/` | Incident response, payroll correction, data correction, Kafka DLT | 4 files |
| `docs/execution/` | Phase 0–7 execution logs | 8 files |
| `docs/rate-limiting/` | Rate limiting implementation guide | 1 file |
| Root docs | README, APIContracts, Backend, Frontend, Design, Security Audit, Go-Live Checklist, Production Readiness Matrix | 8+ files |

**Total documentation files:** 86

### Key Build-Kit Docs

| # | Document | Scope |
|---|----------|-------|
| 00 | MASTER_PLAN | Consolidated reference — what's built, what's missing, decisions |
| 04 | RBAC_PERMISSION_MATRIX | 500+ permissions, 16 modules, role definitions |
| 05 | DATABASE_SCHEMA_DESIGN | 254 tables, 16 domains, RLS policies |
| 06 | PAYROLL_RULE_ENGINE | SpEL formula engine, DAG evaluation |
| 08 | APPROVAL_WORKFLOW_ENGINE | 4-table workflow model, dynamic routing |
| 10 | EVENT_DRIVEN_ARCHITECTURE | Kafka topics, consumers, DLQ pattern |
| 14 | DEVOPS_ARCHITECTURE | Docker, Kubernetes, CI/CD |
| 15 | OBSERVABILITY | Prometheus, Grafana, SLOs, alerting |

### Architecture Decision Records

| ADR | Decision |
|-----|----------|
| ADR-001 (build-kit) | Theme consolidation — CSS Variables-first dark mode (79% class reduction) |
| ADR-002 (build-kit) | JWT token optimization — minimal JWT + Redis permission cache (96% size reduction) |
| ADR-003 (build-kit) | Payroll saga pattern — orchestration-based with compensating transactions |
| ADR-004 (build-kit) | Recruitment ATS gap analysis — job board integration roadmap |
| ADR-005 (build-kit) | Database connection pool sizing — HikariCP tuning |
| ADR-001 (docs/adr) | Multi-tenant architecture — shared DB + shared schema + RLS |
| ADR-002 (docs/adr) | Authentication strategy — JWT with roles only, Redis permission cache |
| ADR-003 (docs/adr) | Caching strategy — Redis for sessions, permissions, rate limiting |
| ADR-004 (docs/adr) | Webhook delivery system — retry logic, DLQ for failures |

---

## 2.12 Known Patterns & Gotchas

1. **Sidebar app-awareness:** The sidebar shows sections based on the active sub-app (determined by route pathname via `useActiveApp` hook). Routes map to apps via `frontend/lib/config/apps.ts`.

2. **Self-service vs. Admin routes:** `/me/*` routes are self-service (no permission gating in sidebar or middleware). Module routes like `/employees`, `/attendance` require module-level permissions.

3. **React Query conventions:** All data fetching uses React Query hooks in `frontend/lib/hooks/queries/`. Each hook wraps an Axios call from the corresponding service in `frontend/lib/services/`.

4. **Axios instance:** Use the existing instance in `frontend/lib/`. Never create a new one.

5. **Form conventions:** All forms use React Hook Form + Zod. No uncontrolled inputs.

6. **Permission format in code:** Always use UPPERCASE:COLON (`EMPLOYEE:READ`) in `@RequiresPermission` annotations and `Permission.java` constants. The DB stores lowercase dot format but normalization handles the conversion automatically.

7. **JWT cookie size limit:** Permissions are NOT in the JWT (CRIT-001). They're loaded from DB on each request via Redis cache. Don't try to add them back to the token.

8. **Feature flags must be seeded:** New feature-gated modules need their flag added to the DB via migration. Otherwise even SuperAdmin gets 403 when the bypass doesn't fire (edge cases in pre-auth flow).

9. **Rich text editor:** Tiptap (17 extensions) is the standard rich text editor. Used across wiki, blogs, templates, and other content modules.

10. **Drag and drop:** `@hello-pangea/dnd` is the standard DnD library. Used in kanban boards, pipeline management, etc.

11. **Real-time features:** WebSocket via STOMP + SockJS at `/ws/**`. Used for notifications and live updates.

12. **Application profiles:** `dev` (mock services, debug logging), `demo` (seed data), `prod` (hardened security, real integrations), `test` (test isolation).

13. **No jsPDF in frontend:** PDF generation happens on the backend via OpenPDF (2.0.3). Frontend exports use ExcelJS for spreadsheets.

---

# Tier 3: History

Append-only log of changes.

---

## Architecture Audit — 2026-03-21

**Scope:** Deep audit of entire codebase (backend, frontend, docs) by principal architect review.

**Key findings documented:** Full codebase scale metrics, security architecture, infrastructure topology, integration landscape, Kafka event flow, scheduled job inventory, documentation index. All captured in Tier 1 and Tier 2 sections above.

---

## QA Round 4 (Deep RBAC Regression) — 2026-03-22

**Scope:** Deep regression with strict RBAC verification across all roles (SuperAdmin, Team Lead, Employee). Sequential single-tab testing — login as each role, test all allowed/blocked routes, verify permission enforcement.

**Status:** COMPLETED — All 7 bugs resolved in Waves 12-18.

**Result:** 7 bugs found across 53 routes tested. All fixed.

### Bugs Found & Resolved

| Bug | Severity | Module | Description | Status |
|-----|----------|--------|-------------|--------|
| BUG-001 | Medium | Dashboard | `/api/v1/linkedin-posts/active` 500 — fixed endpoint path in `linkedin.service.ts` | **Fixed** (Wave 12) |
| BUG-002 | High | People/Org Chart | `/api/v1/employees/directory/search` 500 — verified code was correct; false positive | **Closed** (Wave 12) |
| BUG-003 | High | Approvals | `/api/v1/workflow/inbox?status=PENDING` 500 — defensive null guards added in WorkflowService | **Fixed** (Wave 12) |
| BUG-004 | High | Expenses | `/api/v1/expenses/employees/` 500 — added @NotNull validation on 12 UUID path variables | **Fixed** (Wave 12) |
| BUG-005 | Medium | Admin Users | Hydration mismatch — added suppressHydrationWarning + type guards on user.roles | **Fixed** (Wave 12) |
| BUG-006 | Critical | Performance (RBAC) | Team Lead gets 403 — V67 migration seeds missing permissions | **Fixed** (Wave 12) |
| BUG-007 | Medium | Sidebar Layout | SSR hydration mismatch — suppressHydrationWarning | **Fixed** (QA Round 4) |

**Report:** `qa-reports/qa-deep-regression-2026-03-22.xlsx`

---

## QA Round 3 — 2026-03-21

**Scope:** Full QA sweep across 23 pages, 3 sub-apps, 3 user roles. Produced `qa-reports/qa-report-2026-03-21.xlsx`.

**Result:** 13 bugs found, 13 fixed. TypeScript: 0 errors after all fixes.

### Fix Summary

| Bug | Severity | Module | Fix |
|-----|----------|--------|-----|
| BUG-001 | Medium | Dashboard | Added retry logic + graceful error fallback for LinkedIn 500 |
| BUG-002 | High | Admin Dashboard | Fixed roles column — was calling `.name` on `string[]`, changed to `.join()` |
| BUG-003 | Medium | Admin Dashboard | Name column — added email prefix fallback when name is empty |
| BUG-004 | Low | Admin Dashboard | Department column — improved trim check for non-empty values |
| BUG-005 | Medium | Admin Dashboard | Wrong user identity — wired up `useAuth()` hook instead of hardcoded string |
| BUG-006 | Medium | Admin Dashboard | System Health — added retry logic + refresh button + degradation message |
| BUG-007 | High | Expenses | Loading state — only check active tab's query, not all 3 simultaneously |
| BUG-008 | High | Approvals | Created missing `app/approvals/page.tsx` with tabs, search, pagination |
| BUG-009 | High | Team Directory | Created missing `app/team-directory/page.tsx` with grid/list views |
| BUG-010 | High | Loans | Made data extraction defensive — handles both paginated and array responses |
| BUG-011 | **Critical** | Compensation | Added SuperAdmin bypass to `FeatureFlagAspect` + seeded feature flags (V62) |
| BUG-012 | **Critical** | Auth/RBAC | Loaded permissions from DB in `JwtAuthenticationFilter` + format normalization |
| BUG-013 | High | Sidebar | Removed `requiredPermission` from MY SPACE items — self-service for all users |

### Files Changed

**Backend (4 modified + 2 new):**
- `FeatureFlagAspect.java` — SuperAdmin bypass
- `JwtAuthenticationFilter.java` — DB permission loading + `normalizePermissionCode()`
- `SecurityContext.java` — Bidirectional format matching in `hasPermission()`
- `V61__fix_demo_user_passwords.sql` — Demo password fixes
- `V62__seed_feature_flags_for_demo_tenant.sql` — Feature flag seeding

**Frontend (11 modified + 2 new):**
- `menuSections.tsx` — MY SPACE items permission-free
- `usePermissions.ts` — Admin bypass in `hasPermission()`
- `useAuth.ts` — Session restore reads from response body
- `admin/page.tsx` — Roles column fix, system health refresh button
- `admin/layout.tsx` — User identity from auth hook
- `dashboard/page.tsx` — LinkedIn error retry/fallback
- `expenses/page.tsx` — Tab-specific loading + error state
- `loans/page.tsx` — Defensive data extraction
- `useAdmin.ts` — Retry logic for system health
- `useAnalytics.ts` — Retry logic for dashboard analytics
- `admin.service.ts` — Improved health fallback response
- **NEW:** `app/approvals/page.tsx` — Full approvals page
- **NEW:** `app/team-directory/page.tsx` — Full team directory page

**Report:** `qa-reports/qa-report-2026-03-21-FIXED.xlsx`

---

## Agent Team Production Hardening — Waves 12-18 (2026-03-27)

**Scope:** Full-platform production hardening via an automated agent team. 10 commits, 24 new Flyway migrations (V67–V91), 3 new feature pages, P0 security fixes, code quality improvements.

### Wave 12: Forensic Analysis + Security Hardening + Feature Gap Fixes

**Security (P0):**
- **SpEL Injection RCE Fix:** `PayrollComponentService.java` — switched `StandardEvaluationContext` to `SimpleEvaluationContext` to prevent remote code execution via payroll formula injection
- **Payslip IDOR Fix:** `PayrollController.java` — added scope-based employee access validation to 7 payslip/salary endpoints
- **RLS on 115 tables:** V81 migration enables RLS on all tenant tables that were previously missing it

**RBAC:**
- V67: 40 missing permissions + 6 role assignments
- V80: Seeds all 328 `Permission.java` constants (207 were missing from DB)

**Feature Pages Added:**
- `frontend/app/overtime/page.tsx` — Overtime management
- `frontend/app/referrals/page.tsx` — Employee referrals
- `frontend/app/probation/page.tsx` — Probation management

**Code Quality:**
- Fixed `linkedin.service.ts` endpoint path (`/knowledge/blogs` → `/linkedin-posts`)
- Removed mock fallback data from `useFluence.ts`
- Removed unguarded console.error calls from `useShifts.ts`
- Replaced 24+ `as any` with `Partial<Type>` in test files
- Added `suppressHydrationWarning` + type guards on `admin/page.tsx`
- Guarded 13 console.warn/error calls in `websocket.ts` with dev-only check

### Waves 13-15: P3 Code Quality + Keka Gap Closure + Production Features

- 17 parallel agents dispatched for code quality, Keka feature parity, and production features
- Statutory compliance schemas added (V82-V89): LWF, letter templates, SAML, restricted holidays, biometric devices, statutory filing, expense extensions, shift management
- NU-Fluence frontend verified (routes defined, backend built)

### Waves 16-17: Final Gap Closure + Polish

- All remaining Keka feature gaps addressed
- NU-Fluence verified complete at current phase
- Final UI polish across modules

### Wave 18: Production Readiness

- **ShedLock:** V91 adds `shedlock` table for distributed scheduled job locking — prevents duplicate job execution in multi-instance deployments
- **DTO Validation:** Additional `@NotNull` constraints on path variables
- **Memory Leaks:** Fixed useEffect cleanup in multiple components
- **File Security:** Validated MinIO upload paths
- **V90:** Fixed RLS policies and schema corrections from previous waves

### Production Readiness Audit (Final)

- 8-audit deep dive across RBAC, API security, error handling, TypeScript safety
- 40+ CRITICAL/HIGH fixes applied
- RBAC deep audit: 10-iteration hardening pass
- Test failures from security hardening fixed (SpEL MapAccessor fix for tests)

**Final state:** TypeScript 0 errors (`npx tsc --noEmit`). All tests pass. Working tree clean.

### Keka Feature Gap Analysis Results

| Category | Gaps Found | Status |
|----------|-----------|--------|
| Critical (core HR parity) | 5 | Addressed — overtime, probation, referrals pages added; statutory schemas added |
| Important (differentiation) | 11 | Partially addressed — biometric, SAML, restricted holidays schemas added |
| Nice-to-have | 8 | Deferred to next sprint |

**Reports generated:**
- `docs/superpowers/reports/` — API audit, security audit, health reports, Excel report
- `docs/superpowers/specs/2026-03-27-full-platform-analysis-design.md` — Agent team design spec

---

## Previous Rounds

*(Add earlier QA rounds and feature builds here as needed)*
