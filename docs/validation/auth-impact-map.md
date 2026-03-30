# Auth Flow Adjacent-Impact Map

> Maps which modules and files depend on auth being correct.
> Use this to determine regression-test scope when auth-related fixes land.

**Created:** 2026-03-31
**Purpose:** Guide regression testing for Loop 1 (auth flows) and any future auth changes.

---

## Auth Dependency Chain

```
JWT cookie (set by backend)
  |
  +-- frontend/middleware.ts (Edge)
  |     Route protection: cookie presence check
  |     SuperAdmin bypass: JWT decode (no sig verify)
  |     Security headers: OWASP on all responses
  |     Impact: ALL 121+ authenticated routes
  |
  +-- frontend/lib/api/client.ts (ApiClient)
  |     withCredentials: true (sends cookie)
  |     X-Tenant-ID header injection
  |     X-XSRF-TOKEN header (CSRF double-submit)
  |     401 interceptor -> refresh -> redirect
  |     Impact: ALL API calls from frontend
  |
  +-- frontend/lib/hooks/useAuth.ts (Zustand store)
  |     Login: stores user, roles, permissions in sessionStorage
  |     Logout: clears sessionStorage, React Query cache
  |     restoreSession: calls /auth/refresh
  |     Impact: ALL authenticated components
  |
  +-- frontend/lib/hooks/usePermissions.ts
  |     Extracts permissions from user.roles
  |     Normalizes formats (dot -> colon, 3-part -> 2-part)
  |     SuperAdmin/TENANT_ADMIN bypass
  |     MODULE:MANAGE hierarchy
  |     Impact: ALL permission-gated UI elements
  |
  +-- frontend/components/auth/AuthGuard.tsx
  |     Route-level auth + permission check
  |     Session restore attempt on stale state
  |     SuperAdmin bypass for route permissions
  |     Impact: ALL protected page layouts
  |
  +-- frontend/components/auth/PermissionGate.tsx
        Component-level permission hiding
        Impact: Buttons, menu items, sidebar sections
```

---

## Impact Matrix: What Breaks If Auth Changes

### If middleware.ts changes

| Affected Area | What Could Break | How to Test |
|---------------|-----------------|-------------|
| All 121+ authenticated routes | Routes become accessible without login, or login users get redirected incorrectly | Visit `/me/dashboard`, `/employees`, `/payroll/runs` without cookie; verify redirect to `/auth/login?returnUrl=...` |
| Public routes (login, register, careers) | Could accidentally require auth | Visit `/auth/login`, `/careers`, `/offer-portal` without cookie; verify they load |
| Token-based portals | `/preboarding/portal/`, `/exit-interview/`, `/sign/` could break | Visit with token URL; verify no redirect |
| SuperAdmin bypass | Could lose bypass or grant bypass to non-admins | Login as SuperAdmin; verify all routes accessible. Login as Employee; verify restricted routes blocked |
| Security headers | OWASP headers could be dropped | Check response headers on any page (X-Frame-Options, CSP, etc.) |
| Legacy /home redirect | Could stop redirecting to /me/dashboard | Visit `/home`; verify redirect |

### If client.ts (ApiClient) changes

| Affected Area | What Could Break | How to Test |
|---------------|-----------------|-------------|
| All API calls | 401 handling, refresh flow, redirect-to-login | Let token expire; verify silent refresh and retry |
| CSRF protection | Mutating requests rejected by backend | Submit any form (check-in, leave apply, create employee) |
| Tenant isolation | Wrong tenant or missing tenant header | Check network tab for `X-Tenant-ID` on API calls |
| Concurrent 401s | Multiple tabs or parallel requests cause race condition | Open multiple tabs; let token expire simultaneously |
| Redirect debounce | Multiple redirects to login or permanent lockout | Trigger 401; verify single redirect; verify can login again |

### If useAuth.ts changes

| Affected Area | What Could Break | How to Test |
|---------------|-----------------|-------------|
| Login flow | User not stored, permissions not loaded | Login; verify user name, role in header/sidebar |
| Session persistence | Page refresh loses session | Login; refresh page; verify still logged in |
| Session restore | Stale Zustand + valid cookie = infinite loop | Clear sessionStorage only; reload page; verify restore works |
| Logout | Data leakage between sessions | Logout; verify React Query cache cleared; login as different user |
| Google OAuth | Google login flow broken | Click Google login; verify it completes |
| Role/permission extraction | Wrong permissions loaded | Login as Employee; verify admin pages inaccessible |

### If usePermissions.ts changes

| Affected Area | What Could Break | How to Test |
|---------------|-----------------|-------------|
| All permission-gated UI | Wrong elements visible/hidden | Login as Employee; verify no admin sidebar items |
| SuperAdmin bypass | SuperAdmin loses access or Employee gains access | Login as both roles; verify correct behavior |
| MANAGE hierarchy | `MODULE:MANAGE` stops implying `MODULE:READ`, etc. | Login as HR_MANAGER; verify they can view and edit |
| Permission normalization | `employee.read` stops matching `EMPLOYEE:READ` | Verify backend permissions (dot format) still match frontend checks (colon format) |
| isAdmin / isHR / isManager | Convenience flags break sidebar/dashboard logic | Verify sidebar sections for each role type |

### If AuthGuard.tsx changes

| Affected Area | What Could Break | How to Test |
|---------------|-----------------|-------------|
| All protected pages | Flash of protected content, or blank page | Navigate to any protected route; verify no content flash |
| Session restore on mount | Stale session not recovered | Clear sessionStorage; navigate to protected route; verify restore or redirect |
| Permission-gated routes | Route accessible without required permission | Login as Employee; navigate to `/payroll/runs`; verify blocked |
| Loading state | Infinite spinner or no spinner | Navigate between routes; verify loader appears briefly then content |

---

## Regression Test Playbook for Auth Fixes

When ANY auth-related file is modified, run these checks at minimum:

### Quick Smoke (5 minutes)
1. Login as Employee -- verify dashboard loads
2. Login as SuperAdmin -- verify executive dashboard loads
3. Logout -- verify redirect to login, verify no stale data
4. Visit `/me/dashboard` without cookie -- verify redirect to login
5. Visit `/auth/login` without cookie -- verify page loads (no redirect loop)

### RBAC Spot Check (5 minutes)
1. As Employee: GET `/api/v1/dashboards/executive` -- expect 403
2. As Employee: GET `/api/v1/payroll/runs` -- expect 403
3. As Employee: GET `/api/v1/dashboard/metrics` -- expect 403
4. As SuperAdmin: same endpoints -- expect 200

### Session Edge Cases (5 minutes)
1. Clear sessionStorage (keep cookies) -- reload page -- verify session restores
2. Delete access_token cookie -- reload page -- verify redirect to login
3. Open two tabs -- logout in one -- verify other tab handles it gracefully

### API Contract (2 minutes)
1. Check any API call in Network tab:
   - `X-Tenant-ID` header present
   - `X-XSRF-TOKEN` header present on POST/PUT/DELETE
   - `withCredentials` true (cookies sent)

---

## Key Files (Quick Reference)

| File | Path | Role |
|------|------|------|
| Edge Middleware | `frontend/middleware.ts` | Route protection, security headers |
| API Client | `frontend/lib/api/client.ts` | HTTP calls, 401 handling, CSRF |
| Auth Store | `frontend/lib/hooks/useAuth.ts` | Login, logout, session state |
| Permissions Hook | `frontend/lib/hooks/usePermissions.ts` | Permission checks, role checks |
| Auth Guard | `frontend/components/auth/AuthGuard.tsx` | Route-level auth enforcement |
| Permission Gate | `frontend/components/auth/PermissionGate.tsx` | Component-level permission hiding |
| Routes Config | `frontend/lib/config/routes.ts` | Route -> permission mapping |
| App Config | `frontend/lib/config/apps.ts` | Route -> sub-app mapping |
| Backend Security | `backend/src/main/java/com/hrms/common/config/SecurityConfig.java` | Spring Security filter chain |
| JWT Filter | `backend/src/main/java/com/hrms/common/security/JwtAuthenticationFilter.java` | Token verification, permission loading |
| Permission Aspect | `backend/src/main/java/com/hrms/common/security/PermissionAspect.java` | `@RequiresPermission` enforcement |
| Permission Constants | `backend/src/main/java/com/hrms/common/security/Permission.java` | All permission string constants |

---

*Last updated: 2026-03-31 by Validator Agent*
