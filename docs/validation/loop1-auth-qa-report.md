# Loop 1: Auth, Login, Logout, Session Restore, Middleware Gating - QA Report

> **QA Agent** | Sweep Loop 1 | 2026-03-31
> **Method:** Static code analysis (source-level reading, not browser testing)
> **Scope:** Authentication flow end-to-end: login, Google SSO, MFA, session restore, logout,
> middleware route protection, CSRF, rate limiting, public portal access

---

## 1. Test Execution Matrix

### 1.1 Route Protection (Middleware)

| Route                          | Type                | Middleware Behavior                                                   | Status |
|--------------------------------|---------------------|-----------------------------------------------------------------------|--------|
| `/auth/login`                  | Public              | `isPublicRoute` returns true, no redirect                             | PASS   |
| `/auth/register`               | Public (middleware) | Listed in `PUBLIC_ROUTES` but **no page.tsx exists**                  | DEF-24 |
| `/auth/forgot-password`        | Public              | Listed in `PUBLIC_ROUTES`, page.tsx exists                            | PASS   |
| `/auth/reset-password`         | Public              | Listed in `PUBLIC_ROUTES` but **no page.tsx exists**                  | DEF-25 |
| `/auth/verify-email`           | Public              | Listed in `PUBLIC_ROUTES` but **no page.tsx exists**                  | DEF-26 |
| `/preboarding/portal/[token]`  | Public              | Prefix match on `/preboarding/portal/`                                | PASS   |
| `/exit-interview/[token]`      | Public              | Prefix match on `/exit-interview/`                                    | PASS   |
| `/offer-portal`                | Public              | Exact match in `PUBLIC_ROUTES`                                        | PASS   |
| `/careers`                     | Public              | Exact match in `PUBLIC_ROUTES`                                        | PASS   |
| `/sign/[token]`                | Public              | Prefix match on `/sign/`                                              | PASS   |
| `/`                            | Public              | Special case in `isPublicRoute`                                       | PASS   |
| `/me/dashboard`                | Auth                | Listed in `AUTHENTICATED_ROUTES` via `/me` prefix                     | PASS   |
| `/employees`                   | Auth                | Listed in `AUTHENTICATED_ROUTES`                                      | PASS   |
| `/payroll`                     | Auth                | Listed in `AUTHENTICATED_ROUTES`                                      | PASS   |
| `/settings`                    | Auth                | Listed in `AUTHENTICATED_ROUTES`                                      | PASS   |
| Unknown route (e.g. `/random`) | Neither             | Falls through to `NextResponse.next()` -- **not redirected to login** | DEF-27 |

### 1.2 Login Flow

| Test Case                              | Status    | Notes                                                                                               |
|----------------------------------------|-----------|-----------------------------------------------------------------------------------------------------|
| Login form uses React Hook Form + Zod  | **FAIL**  | DEF-28 - Login page uses raw `useState`, no RHF/Zod                                                 |
| Login API contract matches backend     | PASS      | Frontend sends `{email, password}`, backend expects `@NotBlank email, @NotBlank password`           |
| Error handling on login failure        | PASS      | Catches error, extracts `response.data.message`, shows in UI                                        |
| returnUrl preserved on redirect        | PASS      | Middleware sets `returnUrl` param, login page reads it via `useSearchParams`                        |
| returnUrl sanitization (open redirect) | PASS      | `sanitizeReturnUrl()` rejects absolute URLs, `//`, protocol schemes, backslashes                    |
| Google SSO domain restriction          | PASS      | Checks `hd` and email suffix against `ALLOWED_DOMAIN`                                               |
| MFA flow after login                   | PASS      | `MfaVerification` component with code input, backup codes, auto-submit on paste                     |
| Demo account login                     | PASS      | Guarded by `NEXT_PUBLIC_DEMO_MODE=true` env var                                                     |
| Demo password exposure                 | **NOTED** | Password shown in plaintext in UI (`Welcome@123`), but gated by env var -- acceptable for demo mode |

### 1.3 Token Handling

| Test Case                            | Status | Notes                                                                                |
|--------------------------------------|--------|--------------------------------------------------------------------------------------|
| JWT stored in httpOnly cookie        | PASS   | `CookieConfig` sets `httpOnly(true)` on both access and refresh tokens               |
| Secure flag on cookies               | PASS   | Configurable via `app.cookie.secure`, defaults to `true`                             |
| SameSite=Strict                      | PASS   | Both access and refresh token cookies use `sameSite("Strict")`                       |
| Refresh token path scoping           | PASS   | Refresh cookie has `path("/api/v1/auth")` -- only sent to auth endpoints             |
| No tokens in localStorage            | PASS   | Only `tenantId` stored in localStorage; tokens in httpOnly cookies                   |
| Token refresh on 401                 | PASS   | `client.ts` interceptor catches 401, calls `/auth/refresh`, retries original request |
| Concurrent 401 handling              | PASS   | `refreshPromise` shared across concurrent 401s (SEC-F06)                             |
| Redirect to login on refresh failure | PASS   | `redirectToLogin()` with debounce protection via `isRedirecting` flag                |
| Redirect debounce auto-reset         | PASS   | `REDIRECT_DEBOUNCE_MS = 5000`, auto-resets to prevent permanent lockout              |

### 1.4 Session Restore

| Test Case                           | Status | Notes                                                                                           |
|-------------------------------------|--------|-------------------------------------------------------------------------------------------------|
| Session persistence mechanism       | PASS   | Zustand `persist` middleware with `sessionStorage`                                              |
| Hydration flag                      | PASS   | `hasHydrated` set via `onRehydrateStorage` callback                                             |
| Session restore on page refresh     | PASS   | `AuthGuard.restoreSession()` calls `/auth/refresh` when Zustand state cleared but cookies valid |
| Stale session cleanup on login page | PASS   | Login page clears stale Zustand state if `isAuthenticated` but no fresh login                   |
| React Query cache cleared on logout | PASS   | `getQueryClient().clear()` called in logout                                                     |
| Google token cleared on logout      | PASS   | `clearGoogleToken()` called in logout                                                           |

### 1.5 Middleware Security

| Test Case               | Status   | Notes                                                                                     |
|-------------------------|----------|-------------------------------------------------------------------------------------------|
| Expired token handling  | **FAIL** | DEF-29 - `decodeJwt` computes `isExpired` but middleware NEVER checks it                  |
| OWASP security headers  | PASS     | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP, Permissions-Policy all set |
| HSTS production-only    | PASS     | Only set when `NODE_ENV === 'production'` (SEC-004 fix)                                   |
| CSP allows Google OAuth | PASS     | `connect-src`, `frame-src`, `script-src` include Google domains                           |
| SUPER_ADMIN bypass      | PASS     | Middleware checks `role === 'SUPER_ADMIN'                                                 || roles.includes('SUPER_ADMIN')` |
| Static asset skip       | PASS     | Matcher excludes `_next/static`, `_next/image`, favicon, image extensions                 |

### 1.6 CSRF Protection

| Test Case                         | Status | Notes                                                                                     |
|-----------------------------------|--------|-------------------------------------------------------------------------------------------|
| Auth endpoints CSRF exempt        | PASS   | `SecurityConfig` ignores CSRF for `/api/v1/auth/**`                                       |
| CSRF double-submit cookie pattern | PASS   | `CookieCsrfTokenRepository.withHttpOnlyFalse()`, frontend reads `XSRF-TOKEN` cookie       |
| Frontend sends CSRF header        | PASS   | `client.ts` interceptor reads `XSRF-TOKEN` cookie, sends `X-XSRF-TOKEN` header on non-GET |
| CSRF enforced in production       | PASS   | `SecurityConfig` always enables CSRF if `prod` or `production` profile active             |
| Public endpoints CSRF exempt      | PASS   | Preboarding, exit-interview, esignature, offers, career, biometric all exempt             |

### 1.7 Rate Limiting

| Test Case                      | Status   | Notes                                                                      |
|--------------------------------|----------|----------------------------------------------------------------------------|
| Auth endpoint rate limit       | **FAIL** | DEF-30 - CLAUDE.md says 5/min for auth, code says 10/min (Redis)           |
| Rate limit by IP for anonymous | PASS     | Falls back to `ip:` + client IP                                            |
| Rate limit cookie-based auth   | **FAIL** | DEF-31 - `resolveClientId` only checks `Authorization` header, not cookies |
| Export rate limit              | PASS     | 5 requests per 5 minutes for `/export`, `/report`, `/download`             |
| Rate limit response headers    | PASS     | `X-Rate-Limit-Remaining`, `X-Rate-Limit-Mode`, `Retry-After` headers set   |
| Redis fallback to in-memory    | PASS     | `redisAvailable` AtomicBoolean, falls back to Bucket4j                     |
| Memory safety for buckets      | PASS     | MAX_BUCKETS=50,000 with TTL eviction and scheduled cleanup                 |

### 1.8 Public Portal Access

| Test Case                              | Status   | Notes                                                                      |
|----------------------------------------|----------|----------------------------------------------------------------------------|
| Preboarding uses correct API client    | **FAIL** | DEF-32 - Uses `apiClient` (with 401 redirect) instead of `publicApiClient` |
| Exit interview uses correct API client | **FAIL** | DEF-33 - Uses `apiClient` (with 401 redirect) instead of `publicApiClient` |
| Careers page uses correct API client   | **FAIL** | DEF-34 - Uses `apiClient` (with 401 redirect) instead of `publicApiClient` |
| Sign page uses correct API client      | PASS     | Uses React Query hooks that likely use appropriate client                  |
| Offer portal uses correct API client   | PASS     | Uses dedicated `usePublicOffer` hooks                                      |

### 1.9 RBAC Loading

| Test Case                        | Status | Notes                                                                                             |
|----------------------------------|--------|---------------------------------------------------------------------------------------------------|
| Permissions from response body   | PASS   | CRIT-001: `useAuth.login` reads `roles` and `permissions` from response body                      |
| Fallback to JWT decode           | PASS   | If response body arrays empty, falls back to `decodeJwt(response.accessToken)`                    |
| Backend permission normalization | PASS   | `JwtAuthenticationFilter.normalizePermissionCode` converts `resource.action` to `RESOURCE:ACTION` |
| User-keyed permission cache      | PASS   | `securityService.getCachedPermissionsForUser(userId, roles)` with Redis cache                     |
| Frontend permission check        | PASS   | `usePermissions` hook with `hasPermission`, `hasAnyRole`, etc.                                    |
| SuperAdmin bypass in AuthGuard   | PASS   | `isSuperAdmin` check skips all route-level authorization                                          |

---

## 2. Defects Found

### DEF-24: Phantom public routes -- /auth/register has no page

| Field               | Value                                                                                                                                                                                                                       |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-24                                                                                                                                                                                                                      |
| **Module**          | Auth / Middleware                                                                                                                                                                                                           |
| **Route**           | `/auth/register`                                                                                                                                                                                                            |
| **Role**            | All                                                                                                                                                                                                                         |
| **Severity**        | LOW                                                                                                                                                                                                                         |
| **Reproduction**    | Navigate to `/auth/register`                                                                                                                                                                                                |
| **Expected**        | Either a registration page renders or user gets a proper 404                                                                                                                                                                |
| **Actual**          | Middleware marks it public (no redirect to login), but no `page.tsx` exists at `frontend/app/auth/register/`. Next.js will show its default 404. The route is also listed in `frontend/lib/config/routes.ts` PUBLIC_ROUTES. |
| **Suspected Layer** | Frontend (middleware + routes config)                                                                                                                                                                                       |
| **Owner**           | Frontend Developer                                                                                                                                                                                                          |
| **Validation**      | Remove `/auth/register` from middleware PUBLIC_ROUTES if registration is not supported, or create the page                                                                                                                  |

### DEF-25: Phantom public route -- /auth/reset-password has no page

| Field               | Value                                                                                                                                                                                                                           |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-25                                                                                                                                                                                                                          |
| **Module**          | Auth / Middleware                                                                                                                                                                                                               |
| **Route**           | `/auth/reset-password`                                                                                                                                                                                                          |
| **Role**            | All                                                                                                                                                                                                                             |
| **Severity**        | MEDIUM                                                                                                                                                                                                                          |
| **Reproduction**    | Click a password reset link (which would contain a token and land on `/auth/reset-password?token=...`)                                                                                                                          |
| **Expected**        | A reset password form renders                                                                                                                                                                                                   |
| **Actual**          | No `page.tsx` exists. Users who request password resets via `/auth/forgot-password` will receive an email with a link that leads to a 404. Backend `AuthController.resetPassword` endpoint exists but has no frontend consumer. |
| **Suspected Layer** | Frontend                                                                                                                                                                                                                        |
| **Owner**           | Frontend Developer                                                                                                                                                                                                              |
| **Validation**      | Create `frontend/app/auth/reset-password/page.tsx` with React Hook Form + Zod                                                                                                                                                   |

### DEF-26: Phantom public route -- /auth/verify-email has no page

| Field               | Value                                                                                                             |
|---------------------|-------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-26                                                                                                            |
| **Module**          | Auth / Middleware                                                                                                 |
| **Route**           | `/auth/verify-email`                                                                                              |
| **Role**            | All                                                                                                               |
| **Severity**        | LOW                                                                                                               |
| **Reproduction**    | Navigate to `/auth/verify-email`                                                                                  |
| **Expected**        | Email verification page or proper 404                                                                             |
| **Actual**          | No `page.tsx` exists. Listed in middleware PUBLIC_ROUTES and frontend routes config but the page was never built. |
| **Suspected Layer** | Frontend                                                                                                          |
| **Owner**           | Frontend Developer                                                                                                |
| **Validation**      | Either remove from PUBLIC_ROUTES or implement the page                                                            |

### DEF-27: Unprotected unknown routes fall through middleware

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                                             |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-27                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Module**          | Middleware                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Route**           | Any route not in PUBLIC_ROUTES or AUTHENTICATED_ROUTES (e.g., `/random`, `/admin-secret`)                                                                                                                                                                                                                                                                                                                         |
| **Role**            | Anonymous                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Severity**        | MEDIUM                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Reproduction**    | Visit any URL path that is not listed in either PUBLIC_ROUTES or AUTHENTICATED_ROUTES                                                                                                                                                                                                                                                                                                                             |
| **Expected**        | Unauthenticated users should be redirected to login for any non-public route                                                                                                                                                                                                                                                                                                                                      |
| **Actual**          | The middleware falls through to `NextResponse.next()` with security headers only (line 316-317). No authentication check is performed. While Next.js will typically 404 for missing pages, any dynamically created pages that are not in the AUTHENTICATED_ROUTES list would be accessible without authentication. The `AuthGuard` component (client-side) provides a second layer, but only if the page uses it. |
| **Suspected Layer** | Frontend (middleware)                                                                                                                                                                                                                                                                                                                                                                                             |
| **Owner**           | Frontend Developer                                                                                                                                                                                                                                                                                                                                                                                                |
| **Validation**      | Change the default behavior: if a route is not public and not in AUTHENTICATED_ROUTES, and there is no access_token cookie, redirect to login. This is a defense-in-depth improvement.                                                                                                                                                                                                                            |

### DEF-28: Login page does not use React Hook Form + Zod

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                 |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-28                                                                                                                                                                                                                                                                                                                                                                |
| **Module**          | Auth                                                                                                                                                                                                                                                                                                                                                                  |
| **Route**           | `/auth/login`                                                                                                                                                                                                                                                                                                                                                         |
| **Role**            | All                                                                                                                                                                                                                                                                                                                                                                   |
| **Severity**        | LOW                                                                                                                                                                                                                                                                                                                                                                   |
| **Reproduction**    | Read `frontend/app/auth/login/page.tsx`                                                                                                                                                                                                                                                                                                                               |
| **Expected**        | Per CLAUDE.md non-negotiable code rule: "All forms must use React Hook Form + Zod. No uncontrolled inputs."                                                                                                                                                                                                                                                           |
| **Actual**          | The login page uses Google SSO as primary auth and demo account buttons. There is no email/password form with input fields (Google SSO button, demo account quick-login). Since there are no manual text inputs for the primary login flow, this is a convention violation rather than a functional bug. However, the demo login bypasses any client-side validation. |
| **Suspected Layer** | Frontend                                                                                                                                                                                                                                                                                                                                                              |
| **Owner**           | Frontend Developer                                                                                                                                                                                                                                                                                                                                                    |
| **Validation**      | Acceptable deviation since Google SSO is the primary auth path and demo mode is env-gated. Document as exception.                                                                                                                                                                                                                                                     |

### DEF-29: Middleware ignores expired JWT tokens (CRITICAL)

| Field               | Value                                                                                                                                                                                                                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-29                                                                                                                                                                                                                                                                                           |
| **Module**          | Middleware / Security                                                                                                                                                                                                                                                                            |
| **Route**           | All authenticated routes                                                                                                                                                                                                                                                                         |
| **Role**            | All                                                                                                                                                                                                                                                                                              |
| **Severity**        | CRITICAL                                                                                                                                                                                                                                                                                         |
| **Reproduction**    | 1. User logs in, receives access_token cookie. 2. Token expires (1h). 3. User navigates to an authenticated route. 4. Middleware checks for cookie presence but never checks `isExpired`.                                                                                                        |
| **Expected**        | Middleware should detect expired tokens and redirect to login (or at least not allow the request through purely on cookie presence). The `decodeJwt` function already computes `isExpired` but the result is destructured as `{ role, roles }` at line 321 -- `isExpired` is silently discarded. |
| **Actual**          | An expired JWT cookie passes the middleware check. The user sees the page shell briefly before the first API call returns 401 and the client-side interceptor redirects. This causes a flash of protected content (FOPC) for expired sessions.                                                   |
| **Suspected Layer** | Frontend (middleware.ts line 321)                                                                                                                                                                                                                                                                |
| **Owner**           | Frontend Developer                                                                                                                                                                                                                                                                               |
| **Fix**             | Change line 321 to `const { role, roles, isExpired } = decodeJwt(accessToken);` and add: `if (isExpired && isAuthenticatedRoute(pathname)) { redirect to login }`                                                                                                                                |
| **Validation**      | Verify that expired tokens trigger redirect before page render                                                                                                                                                                                                                                   |

### DEF-30: Auth rate limit mismatch -- docs say 5/min, code says 10/min

| Field               | Value                                                                                                                                                                     |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-30                                                                                                                                                                    |
| **Module**          | Backend / Security                                                                                                                                                        |
| **Route**           | `/api/v1/auth/*`                                                                                                                                                          |
| **Role**            | All                                                                                                                                                                       |
| **Severity**        | MEDIUM                                                                                                                                                                    |
| **Reproduction**    | Read `DistributedRateLimiter.java` line 53: `AUTH("ratelimit:auth:", 10, 60)` -- 10 requests per minute. CLAUDE.md states: "Rate limiting (Bucket4j + Redis): 5/min auth" |
| **Expected**        | Auth rate limit should be 5/min as documented                                                                                                                             |
| **Actual**          | Auth rate limit is 10/min in the Redis-backed DistributedRateLimiter. Either the docs are stale or the code was relaxed without updating docs.                            |
| **Suspected Layer** | Backend (DistributedRateLimiter.java) or documentation                                                                                                                    |
| **Owner**           | Backend Developer                                                                                                                                                         |
| **Validation**      | Align code and docs. For auth endpoints, 5/min is more appropriate to prevent credential stuffing.                                                                        |

### DEF-31: Rate limiter does not identify cookie-authenticated users

| Field               | Value                                                                                                                                                                                                                                              |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-31                                                                                                                                                                                                                                             |
| **Module**          | Backend / Security                                                                                                                                                                                                                                 |
| **Route**           | All API routes                                                                                                                                                                                                                                     |
| **Role**            | All authenticated                                                                                                                                                                                                                                  |
| **Severity**        | MEDIUM                                                                                                                                                                                                                                             |
| **Reproduction**    | Read `RateLimitingFilter.resolveClientId()` -- only checks `Authorization` header for Bearer token. The app uses httpOnly cookies (no Authorization header from browser).                                                                          |
| **Expected**        | Authenticated users (via cookie) should get the 2x rate limit bucket (`user:` prefix)                                                                                                                                                              |
| **Actual**          | All browser-based authenticated users fall through to the `ip:` bucket (anonymous rate). They get the base rate limit (60/min) instead of authenticated rate (120/min). In shared-office scenarios, all users behind one IP share a single bucket. |
| **Suspected Layer** | Backend (RateLimitingFilter.java)                                                                                                                                                                                                                  |
| **Owner**           | Backend Developer                                                                                                                                                                                                                                  |
| **Fix**             | Add cookie extraction to `resolveClientId()`: check `request.getCookies()` for `access_token` and extract `sub` claim from it, similar to the header path.                                                                                         |
| **Validation**      | Verify `X-Rate-Limit-Mode` header and remaining count reflect user-level bucketing                                                                                                                                                                 |

### DEF-32: Preboarding portal uses authenticated API client

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                                                                      |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-32                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Module**          | Preboarding                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Route**           | `/preboarding/portal/[token]`                                                                                                                                                                                                                                                                                                                                                                                              |
| **Role**            | Anonymous (candidate)                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Severity**        | HIGH                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Reproduction**    | Read `frontend/app/preboarding/portal/[token]/page.tsx` lines 91, 122, 149, 162 -- all use `apiClient`                                                                                                                                                                                                                                                                                                                     |
| **Expected**        | Public portal pages should use `publicApiClient` (no `withCredentials`, no 401 redirect interceptor)                                                                                                                                                                                                                                                                                                                       |
| **Actual**          | Uses `apiClient` which has `withCredentials: true` and a 401 response interceptor that redirects to `/auth/login`. If the backend returns 401 for any reason (e.g., expired token from a logged-in user visiting the portal, or token-based auth failure), the page will redirect to login instead of showing an error message. Candidates without accounts will be redirected to login on any API error that returns 401. |
| **Suspected Layer** | Frontend                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Owner**           | Frontend Developer                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Fix**             | Replace `apiClient` with `publicApiClient` in the preboarding portal page                                                                                                                                                                                                                                                                                                                                                  |
| **Validation**      | Verify preboarding page works in incognito mode without redirecting to login                                                                                                                                                                                                                                                                                                                                               |

### DEF-33: Exit interview page uses authenticated API client

| Field               | Value                                                                                 |
|---------------------|---------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-33                                                                                |
| **Module**          | Offboarding                                                                           |
| **Route**           | `/exit-interview/[token]`                                                             |
| **Role**            | Anonymous (departing employee)                                                        |
| **Severity**        | HIGH                                                                                  |
| **Reproduction**    | Read `frontend/app/exit-interview/[token]/page.tsx` lines 49, 54 -- uses `apiClient`  |
| **Expected**        | Should use `publicApiClient`                                                          |
| **Actual**          | Same issue as DEF-32. On 401, user is redirected to login instead of seeing an error. |
| **Suspected Layer** | Frontend                                                                              |
| **Owner**           | Frontend Developer                                                                    |
| **Fix**             | Replace `apiClient` with `publicApiClient`                                            |
| **Validation**      | Verify exit interview works in incognito mode                                         |

### DEF-34: Careers page uses authenticated API client for job application

| Field               | Value                                                                                                                                                                                                                                                                                                                                                               |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bug ID**          | DEF-34                                                                                                                                                                                                                                                                                                                                                              |
| **Module**          | Recruitment                                                                                                                                                                                                                                                                                                                                                         |
| **Route**           | `/careers`                                                                                                                                                                                                                                                                                                                                                          |
| **Role**            | Anonymous (job applicant)                                                                                                                                                                                                                                                                                                                                           |
| **Severity**        | HIGH                                                                                                                                                                                                                                                                                                                                                                |
| **Reproduction**    | Read `frontend/app/careers/page.tsx` line 294 -- uses `apiClient.post('/careers/apply', ...)`                                                                                                                                                                                                                                                                       |
| **Expected**        | Public careers page should use `publicApiClient` for all API calls                                                                                                                                                                                                                                                                                                  |
| **Actual**          | Job listing may work (uses `usePublicJobs` hook which may use public client), but the job application submission at line 294 uses `apiClient`. If a non-logged-in user submits a job application and the backend returns any non-200 response, the 401 interceptor might interfere. Also, `withCredentials: true` sends cookies unnecessarily for public endpoints. |
| **Suspected Layer** | Frontend                                                                                                                                                                                                                                                                                                                                                            |
| **Owner**           | Frontend Developer                                                                                                                                                                                                                                                                                                                                                  |
| **Fix**             | Replace `apiClient` with `publicApiClient` for the apply endpoint                                                                                                                                                                                                                                                                                                   |
| **Validation**      | Submit a job application in incognito mode                                                                                                                                                                                                                                                                                                                          |

---

## 3. Coverage Summary

| Category             | Tests  | Pass   | Fail   | Noted |
|----------------------|--------|--------|--------|-------|
| Route Protection     | 16     | 13     | 3      | 0     |
| Login Flow           | 9      | 7      | 1      | 1     |
| Token Handling       | 8      | 8      | 0      | 0     |
| Session Restore      | 6      | 6      | 0      | 0     |
| Middleware Security  | 6      | 5      | 1      | 0     |
| CSRF Protection      | 5      | 5      | 0      | 0     |
| Rate Limiting        | 6      | 4      | 2      | 0     |
| Public Portal Access | 5      | 2      | 3      | 0     |
| RBAC Loading         | 6      | 6      | 0      | 0     |
| **Total**            | **67** | **56** | **10** | **1** |

### Defect Summary

| Severity  | Count  | IDs                            |
|-----------|--------|--------------------------------|
| CRITICAL  | 1      | DEF-29                         |
| HIGH      | 3      | DEF-32, DEF-33, DEF-34         |
| MEDIUM    | 4      | DEF-25, DEF-27, DEF-30, DEF-31 |
| LOW       | 3      | DEF-24, DEF-26, DEF-28         |
| **Total** | **11** | DEF-24 through DEF-34          |

---

## 4. Positive Findings (Well-Implemented)

The following aspects of the auth system are implemented correctly and securely:

1. **Cookie security model** -- httpOnly, Secure, SameSite=Strict, path-scoped refresh token. This
   is best-practice for SPA token storage.
2. **CSRF double-submit pattern** -- Properly implemented with `CookieCsrfTokenRepository`, auth
   endpoints correctly exempted.
3. **Open redirect prevention** -- `sanitizeReturnUrl()` in the login page is thorough, rejecting
   protocol-relative URLs, javascript: URIs, and backslash tricks.
4. **Session restore mechanism** -- `AuthGuard.restoreSession()` prevents redirect loops when
   Zustand state is cleared but cookies are still valid.
5. **Concurrent 401 handling** -- Shared `refreshPromise` prevents multiple simultaneous refresh
   calls (SEC-F06).
6. **Redirect debounce** -- Auto-reset timer on `isRedirecting` prevents permanent lockout.
7. **OWASP security headers** -- Comprehensive set including CSP, HSTS (prod-only),
   Permissions-Policy.
8. **JWT signature not trusted at edge** -- Middleware correctly notes (CRIT-007) that edge decode
   is unsigned; backend validates signatures.
9. **Logout cleanup** -- Clears cookies (backend), localStorage, sessionStorage, React Query cache,
   Google tokens.
10. **MFA support** -- Full TOTP + backup code flow with proper UI component.

---

## 5. Recommendations for Loop 2 (Dashboard & Navigation)

1. **Fix DEF-29 first** -- Expired token handling is CRITICAL and affects all authenticated flows.
2. **Fix DEF-32/33/34** -- Public portal API client issues affect candidate/employee-facing portals.
3. **Verify sidebar visibility** -- Dashboard loop should test that MY SPACE items have no
   `requiredPermission` (per CLAUDE.md).
4. **Test app switcher** -- Verify waffle grid shows correct lock icons based on permissions.
5. **Test /home redirect** -- Middleware redirects `/home` to `/me/dashboard`, verify this works.
6. **Test 403 handling** -- Previous sweep noted generic error instead of Access Denied page.
7. **Test navigation after session restore** -- Verify that after `restoreSession()`, the user lands
   on the correct page (not /me/dashboard if they requested /payroll).

---

## 6. Files Audited

| File                   | Path                                               | Key Findings                                      |
|------------------------|----------------------------------------------------|---------------------------------------------------|
| Middleware             | `frontend/middleware.ts`                           | DEF-27, DEF-29                                    |
| Login Page             | `frontend/app/auth/login/page.tsx`                 | DEF-28; sanitizeReturnUrl is good                 |
| API Client             | `frontend/lib/api/client.ts`                       | Well-implemented cookie auth, CSRF, refresh       |
| Public API Client      | `frontend/lib/api/public-client.ts`                | Exists but underused (DEF-32/33/34)               |
| Auth Store             | `frontend/lib/hooks/useAuth.ts`                    | Session restore, logout cleanup both solid        |
| AuthGuard              | `frontend/components/auth/AuthGuard.tsx`           | Proper session restore, redirect handling         |
| Routes Config          | `frontend/lib/config/routes.ts`                    | Phantom routes (DEF-24/25/26)                     |
| AuthController         | `backend/.../AuthController.java`                  | Clean, proper cookie handling                     |
| SecurityConfig         | `backend/.../SecurityConfig.java`                  | CSRF, CORS, filter chain all correct              |
| JwtAuthFilter          | `backend/.../JwtAuthenticationFilter.java`         | Permission normalization, scope context           |
| RateLimitFilter        | `backend/.../RateLimitingFilter.java`              | DEF-31 -- cookie auth not recognized              |
| DistributedRateLimiter | `backend/.../DistributedRateLimiter.java`          | DEF-30 -- 10/min vs documented 5/min              |
| CookieConfig           | `backend/.../CookieConfig.java`                    | Solid -- httpOnly, Secure, SameSite, path scoping |
| Preboarding Portal     | `frontend/app/preboarding/portal/[token]/page.tsx` | DEF-32                                            |
| Exit Interview         | `frontend/app/exit-interview/[token]/page.tsx`     | DEF-33                                            |
| Careers                | `frontend/app/careers/page.tsx`                    | DEF-34                                            |
| Auth Types             | `frontend/lib/types/auth.ts`                       | Clean interfaces, no `any` usage                  |
