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

### Permission Loading Flow (CRIT-001)

Permissions were removed from the JWT to keep the httpOnly cookie under the browser's 4096-byte limit. The current flow:

1. **JWT contains roles only** — `roles` claim has role codes (e.g., `SUPER_ADMIN`, `HR_MANAGER`)
2. **JwtAuthenticationFilter** detects empty `permissionScopes` from token
3. Loads permissions from DB via `SecurityService.getCachedPermissions(roles)` (Redis-cached, tenant-aware)
4. Normalizes each permission code from DB format to UPPERCASE:COLON format
5. Stores in `SecurityContext.currentPermissions` ThreadLocal for the request lifecycle
6. Also adds as `GrantedAuthority` entries for Spring Security's `@PreAuthorize` path

**Key files:**
- `backend/.../security/JwtAuthenticationFilter.java` — lines 77–92, permission loading + normalization
- `backend/.../security/SecurityContext.java` — `hasPermission()` with bidirectional format matching
- `backend/.../security/SecurityService.java` — `getCachedPermissions()` with Redis cache + tenant isolation
- `backend/.../security/Permission.java` — canonical permission constants

### SuperAdmin Bypass

SuperAdmin bypasses **all** access control checks. This is enforced at three levels:

| Layer | File | Mechanism |
|-------|------|-----------|
| Permission checks | `PermissionAspect.java` | `if (SecurityContext.isSuperAdmin()) return joinPoint.proceed()` |
| Feature flag checks | `FeatureFlagAspect.java` | Same pattern — added in QA Round 3 |
| Frontend permissions | `usePermissions.ts` | `if (isAdmin) return true` in `hasPermission()` |

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

| Sub-App | Purpose | Status |
|---------|---------|--------|
| **NU-HRMS** | Core HR (employees, attendance, leave, payroll, benefits, assets, expenses, loans, compensation) | Built |
| **NU-Hire** | Recruitment & onboarding (job postings, candidates, pipeline, onboarding, offboarding) | Built |
| **NU-Grow** | Performance, learning & engagement (reviews, OKRs, 360 feedback, LMS, training, recognition, surveys, wellness) | Built |
| **NU-Fluence** | Knowledge management & collaboration (wiki, blogs, templates, Drive integration) | Phase 2 — backend built, frontend not started |

**Single login** for all sub-apps. Auth, RBAC, and platform services are shared.

**App-aware sidebar:** Shows only sections relevant to the active sub-app (determined by route pathname via `useActiveApp` hook). Routes map to apps via `frontend/lib/config/apps.ts`.

**Route structure:** Flat routes (`/employees`, `/recruitment`, `/performance`). Entry points at `/app/hrms`, `/app/hire`, `/app/grow`, `/app/fluence`.

**Key files:**
- `frontend/lib/config/apps.ts` — app definitions, route-to-app mapping
- `frontend/lib/hooks/useActiveApp.ts` — active app detection from pathname
- `frontend/components/platform/AppSwitcher.tsx` — waffle grid UI
- `frontend/components/layout/menuSections.tsx` — sidebar menu config

---

## 1.5 Multi-Tenancy

Shared database, shared schema. All tenant-specific tables have a `tenant_id` UUID column. PostgreSQL Row-Level Security (RLS) enforces isolation.

`TenantContext` ThreadLocal is the single source of truth for the current tenant. Set in `JwtAuthenticationFilter` from the JWT `tenantId` claim. Cleared after every request.

---

## 1.6 Error Handling Conventions

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

## 2.1 Flyway Migration Status

| Field | Value |
|-------|-------|
| Active migrations | V0–V62 (63 total) |
| Next migration | **V63** |
| Legacy Liquibase | `db/changelog/` — **DO NOT USE** |

**Recent migrations:**
- `V60` — Seed role_permissions for demo roles (EMPLOYEE, HR_MANAGER, MANAGER, etc.)
- `V61` — Fix demo user passwords, reset failed_login_attempts, set auth_provider=LOCAL
- `V62` — Seed feature flags for NuLogic demo tenant (enable_payroll, enable_leave, etc.)

---

## 2.2 Seeded Feature Flags (NuLogic Demo Tenant)

All enabled by default for `tenant_id = 660e8400-e29b-41d4-a716-446655440001`:

`enable_payroll`, `enable_leave`, `enable_attendance`, `enable_performance`, `enable_recruitment`, `enable_expenses`, `enable_loans`, `enable_compensation`, `enable_assets`, `enable_documents`

---

## 2.3 Module Status

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

### NU-Hire — Built
- Job Postings, Candidates, Pipeline, Interviews
- Onboarding / Offboarding

### NU-Grow — Built
- Performance Reviews, OKRs, 360 Feedback
- LMS / Training, Recognition, Surveys, Wellness

### NU-Fluence — Phase 2
- Backend built (Elasticsearch, MinIO drive, comments, engagement)
- Frontend not started
- Wiki, Blogs, Templates, Drive Integration planned

---

## 2.4 Demo Accounts

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

## 2.5 Known Patterns & Gotchas

1. **Sidebar app-awareness:** The sidebar shows sections based on the active sub-app (determined by route pathname via `useActiveApp` hook). Routes map to apps via `frontend/lib/config/apps.ts`.

2. **Self-service vs. Admin routes:** `/me/*` routes are self-service (no permission gating in sidebar or middleware). Module routes like `/employees`, `/attendance` require module-level permissions.

3. **React Query conventions:** All data fetching uses React Query hooks in `frontend/lib/hooks/queries/`. Each hook wraps an Axios call from the corresponding service in `frontend/lib/services/`.

4. **Axios instance:** Use the existing instance in `frontend/lib/`. Never create a new one.

5. **Form conventions:** All forms use React Hook Form + Zod. No uncontrolled inputs.

6. **Permission format in code:** Always use UPPERCASE:COLON (`EMPLOYEE:READ`) in `@RequiresPermission` annotations and `Permission.java` constants. The DB stores lowercase dot format but normalization handles the conversion automatically.

7. **JWT cookie size limit:** Permissions are NOT in the JWT (CRIT-001). They're loaded from DB on each request. Don't try to add them back to the token.

8. **Feature flags must be seeded:** New feature-gated modules need their flag added to the DB via migration. Otherwise even SuperAdmin gets 403 when the bypass doesn't fire (edge cases in pre-auth flow).

---

# Tier 3: History

Append-only log of changes.

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

## Previous Rounds

*(Add earlier QA rounds and feature builds here as needed)*
