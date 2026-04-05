# Developer Agent: Auth Stack Pre-Investigation Report

**Date:** 2026-03-31
**Agent:** Developer Agent (Sweep Loop)
**Status:** Standby — pre-investigation complete, ready for defect assignments

---

## 1. Auth Flow Architecture (End-to-End)

### Login Flow

```
User enters credentials (or clicks Google SSO)
  |
  v
LoginPage (frontend/app/auth/login/page.tsx)
  |-- Email/password: useAuth().login() --> authApi.login() --> POST /api/v1/auth/login
  |-- Google SSO: useGoogleLogin() --> Google userinfo --> useAuth().googleLogin() --> POST /api/v1/auth/google
  |-- Demo mode: handleDemoLogin() --> useAuth().login() with hardcoded password
  |
  v
AuthController (backend)
  |-- AuthService.login() or AuthService.googleLogin()
  |-- Returns AuthResponse (userId, tenantId, roles, permissions, accessToken, refreshToken, fullName, email, etc.)
  |-- Sets httpOnly cookies via CookieConfig: access_token (Path=/, 1hr) + refresh_token (Path=/api/v1/auth, 24hr)
  |
  v
useAuth Zustand store (frontend/lib/hooks/useAuth.ts)
  |-- Reads roles/permissions from response body (preferred) or JWT decode (fallback)
  |-- Builds User object with roles[]
  |-- Stores in Zustand (persisted to sessionStorage as 'auth-storage')
  |-- Stores tenantId in localStorage
  |-- Calls apiClient.resetRedirectFlag()
  |
  v
LoginPage redirects to sanitizeReturnUrl(searchParams.returnUrl) || '/me/dashboard'
```

### Request Authentication Flow

```
Browser sends request with access_token cookie (withCredentials: true)
  |
  v
Next.js Edge Middleware (frontend/middleware.ts)
  |-- Skips API routes and static assets
  |-- Public routes: allow through with security headers
  |-- Authenticated routes without cookie: redirect to /auth/login?returnUrl=...
  |-- Has cookie: base64 decode JWT (NO signature verification), check SUPER_ADMIN bypass
  |-- Allow through with OWASP security headers
  |
  v
AuthGuard (frontend/components/auth/AuthGuard.tsx)
  |-- Waits for Zustand hydration (hasHydrated + isReady)
  |-- If not authenticated: tries restoreSession() (POST /auth/refresh) once
  |-- If restore fails: redirect to login
  |-- If authenticated: checks route-level permissions via findRouteConfig()
  |-- SUPER_ADMIN bypasses all route permission checks
  |
  v
API Client (frontend/lib/api/client.ts)
  |-- Sends X-Tenant-ID header from localStorage
  |-- Sends X-XSRF-TOKEN header for non-GET requests (CSRF double-submit)
  |-- On 401: attempts token refresh (shared promise for concurrent 401s)
  |-- If refresh fails: redirectToLogin() with debounce
  |
  v
Spring Security Filter Chain (backend)
  |-- RateLimitingFilter -> TenantFilter -> JwtAuthenticationFilter -> UsernamePasswordAuth
  |-- JwtAuthenticationFilter:
  |     1. Extracts JWT from cookie (preferred) or Authorization header (fallback)
  |     2. Validates token signature via JwtTokenProvider
  |     3. Sets TenantContext
  |     4. Loads permissions: from JWT claims first, then DB via SecurityService.getCachedPermissions()
  |     5. Constructs UserPrincipal and sets SecurityContext
  |     6. Populates ScopeContext for TEAM/CUSTOM scope permissions
  |-- CSRF: Cookie-based double-submit pattern (CookieCsrfTokenRepository)
  |     Exempted: /auth/**, /esignature/external/**, /ws/**, webhooks, SAML, etc.
```

### Token Refresh Flow

```
401 response intercepted by ApiClient
  |
  v
apiClient response interceptor
  |-- Skips if already retried, on login page, or is a refresh request itself
  |-- Creates shared refreshPromise (POST /auth/refresh) to deduplicate concurrent 401s
  |-- If refresh succeeds: retries original request
  |-- If refresh fails: redirectToLogin() (debounced 5s, auto-resets)
  |
  v
AuthController.refresh() (backend)
  |-- Reads refresh_token from cookie (preferred) or X-Refresh-Token header
  |-- Revokes old refresh token
  |-- Issues new access_token + refresh_token via cookies
  |-- Returns AuthResponse body
```

### Logout Flow

```
useAuth().logout()
  |
  v
authApi.logout() --> POST /api/v1/auth/logout
  |-- Backend: revokes access_token + refresh_token, clears cookies
  |
  v
Client-side cleanup:
  |-- apiClient.clearTokens() (localStorage/sessionStorage)
  |-- clearGoogleToken()
  |-- getQueryClient().clear() (React Query cache)
  |-- Zustand: set user=null, isAuthenticated=false
```

---

## 2. Known Fragile Points (Bug-Likely Areas)

### HIGH RISK

1. **Stale Zustand rehydration vs. expired cookies (login page, lines 277-288)**

- The login page has a `useEffect` that clears stale auth state when `hasHydrated` turns true but
  `didFreshLogin` is false. This is a workaround for Zustand rehydrating `isAuthenticated=true`
  from sessionStorage while the httpOnly cookie is expired. If the timing of `hasHydrated` changes
  or the `setUser(null)` call races with the redirect effect, users could see a flash or loop.

2. **AuthGuard session restore race condition (AuthGuard.tsx, lines 95-141)**

- `restoreAttemptedRef` prevents double-restore, but the `isRestoringSession` state is excluded
  from the useEffect dependency array (intentionally, to avoid infinite loop). If `pathname`
  changes during restore, the effect re-runs with stale `isRestoringSession=true` and skips the
  else-if branch, potentially leaving the user stuck on the loader.

3. **Middleware does NOT redirect authenticated users away from /auth/login**

- Comment at middleware line 293-298 explains this is intentional to avoid infinite loops. But it
  means a user with a valid cookie who somehow lands on `/auth/login` will see the login page. The
  login page's stale-auth cleanup (point 1) will clear their Zustand state, essentially logging
  them out client-side even though their cookie is still valid.

4. **CSRF token availability on first request after login**

- The XSRF-TOKEN cookie is set by Spring Security's `CookieCsrfTokenRepository`. After login, the
  first mutating request may not have the CSRF cookie yet if it fires before the browser processes
  the Set-Cookie from the login response. The client reads `document.cookie` synchronously, so
  this is usually fine, but could fail in edge cases (rapid POST after login).

### MEDIUM RISK

5. **Demo login does not check MFA**

- `handleDemoLogin` calls `login()` directly and then immediately does `router.push()`. If the
  backend returns an MFA-required response, the demo login silently fails or succeeds without MFA
  verification. The MFA check (`mfaRequired` state) is only set in the regular form login flow,
  which demo mode bypasses.

6. **Token refresh revokes before validating**

- `AuthController.refresh()` at line 122 calls `tokenProvider.revokeToken(refreshToken)` BEFORE
  `authService.refresh(refreshToken)`. If `authService.refresh()` throws, the old token is already
  revoked and the user has no valid refresh token. This creates a forced logout on any transient
  error during refresh.

7. **returnUrl sanitization edge cases**

- `sanitizeReturnUrl` uses a regex allowlist `^\/[\w\-./~?#&=%@]*$` which permits `#` and `?`. A
  returnUrl like `/auth/login?returnUrl=/auth/login?returnUrl=...` could create nested redirect
  chains. Not a security issue (open redirect is blocked), but a UX concern.

8. **SameSite=Strict on cookies**

- Access token cookie uses `SameSite=Strict`. This means the cookie is NOT sent on cross-site
  navigations (e.g., clicking a link to the app from an email or external site). Users arriving
  from external links will appear unauthenticated and be redirected to login, even if they have a
  valid session. `SameSite=Lax` would be more appropriate for the access token.

### LOW RISK

9. **Middleware JWT decode without signature verification (CRIT-007)**

- Documented and intentional. A forged JWT passes middleware but fails at the backend. Acceptable
  tradeoff since middleware only makes routing decisions, not data access decisions.

10. **sessionStorage for auth persistence**

- Auth state is persisted to sessionStorage, not localStorage. This means opening a new tab loses
  auth state (requires restoreSession). This is by design for security, but could cause confusion
  in multi-tab workflows.

---

## 3. Files Likely Needing Modification for Auth Fixes

### Frontend

| File                                     | Reason                                                       |
|------------------------------------------|--------------------------------------------------------------|
| `frontend/app/auth/login/page.tsx`       | Login form, SSO, demo login, MFA flow, stale session cleanup |
| `frontend/lib/hooks/useAuth.ts`          | Zustand auth store, login/logout/restore actions             |
| `frontend/lib/api/client.ts`             | Axios interceptors, 401 handling, CSRF, redirect logic       |
| `frontend/components/auth/AuthGuard.tsx` | Route protection, session restore, permission checks         |
| `frontend/middleware.ts`                 | Edge middleware, route lists, cookie inspection              |
| `frontend/lib/api/auth.ts`               | Auth API calls (login, logout, refresh, google)              |
| `frontend/lib/config/routes.ts`          | Route permission config (if route-level RBAC issues)         |
| `frontend/lib/hooks/usePermissions.ts`   | Permission/role checking hooks                               |

### Backend

| File                                                       | Reason                                              |
|------------------------------------------------------------|-----------------------------------------------------|
| `backend/.../auth/controller/AuthController.java`          | Auth endpoints, cookie setting, MFA login           |
| `backend/.../common/security/JwtAuthenticationFilter.java` | JWT validation, permission loading, SecurityContext |
| `backend/.../common/config/SecurityConfig.java`            | Filter chain, CORS, CSRF, public endpoints          |
| `backend/.../common/config/CookieConfig.java`              | Cookie attributes (SameSite, Secure, Path, MaxAge)  |
| `backend/.../common/security/JwtTokenProvider.java`        | Token generation, validation, claim extraction      |
| `backend/.../application/auth/service/AuthService.java`    | Login logic, token issuance, refresh logic          |
| `backend/.../common/security/SecurityService.java`         | Permission caching, role-to-permission resolution   |

---

## 4. Code Smells and Observations

1. **Duplicated user construction logic** in `useAuth.ts` — the `login`, `googleLogin`, and
   `restoreSession` methods all have identical User object construction (lines 100-112, 140-152,
   205-217). This should be a shared helper to prevent drift.

2. **`decodeJwt` exists in two places** — `useAuth.ts` (line 19) and `middleware.ts` (line 145).
   Different implementations with different purposes, but the duplication increases maintenance
   risk.

3. **Login page mixes concerns** — The 672-line `page.tsx` handles login form, Google SSO, MFA, demo
   accounts, animations, stale session cleanup, and lockout. A refactor into smaller components
   would reduce bug surface area.

4. **`isRedirecting` module-level mutable state in client.ts** — The redirect debounce uses a
   module-level boolean + timer. This works in SPA but could behave unexpectedly if the module is
   hot-reloaded during development.

5. **Refresh token revoke-before-validate** in `AuthController.refresh()` — As noted in fragile
   point 6, the old refresh token is revoked before the new one is issued. A transient DB or service
   error during `authService.refresh()` would leave the user with no valid tokens.

---

## 5. Readiness Assessment

The auth stack is well-structured with defense-in-depth (middleware -> AuthGuard -> API
interceptor -> backend filter chain). The most likely defects from QA will fall into:

- **Session state inconsistencies** (Zustand vs. cookie state mismatch)
- **Route protection gaps** (routes missing from middleware's AUTHENTICATED_ROUTES list)
- **Permission check failures** (format mismatch between DB `module.action` and code
  `MODULE:ACTION`)
- **MFA flow edge cases** (demo login bypassing MFA, MFA cancel state)
- **CSRF issues** on first mutating request after login

Ready to receive defect assignments from QA and UX/UI agents.
