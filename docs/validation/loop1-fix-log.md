# Loop 1 Fix Log - Auth Stack Defects

**Date:** 2026-03-31
**Agent:** Developer Agent
**Source:** `docs/validation/loop1-auth-qa-report.md`

---

## DEF-29 (CRITICAL): Middleware ignores expired JWT tokens

**File changed:** `frontend/middleware.ts`

**What was changed:**

- The `decodeJwt(accessToken)` call now destructures `isExpired` alongside `role` and `roles`
- Added an `isExpired` check block immediately after decoding: if the token is expired and the route
  is authenticated (or unknown/non-public), the middleware redirects to `/auth/login?returnUrl=...`
- If the token is expired but the route is public, it passes through with security headers (public
  routes don't need auth)

**Why:**
Previously, `decodeJwt()` computed `isExpired` but the middleware destructured only
`{ role, roles }`, silently discarding the expiry check. This allowed expired tokens to pass
middleware, causing a flash of protected content before the backend rejected the token.

**How to verify:**

1. Log in, then manually set the `access_token` cookie expiry to a past time (or wait for it to
   expire)
2. Navigate to any authenticated route (e.g., `/employees`)
3. Expected: immediate redirect to `/auth/login?returnUrl=/employees` with no flash of content

---

## DEF-27 (MEDIUM): Unknown routes fall through middleware without auth check

**File changed:** `frontend/middleware.ts`

**What was changed:**

- The `!accessToken` branch now applies deny-by-default: ANY non-public route without a cookie
  redirects to login (previously only routes explicitly listed in `AUTHENTICATED_ROUTES` were
  protected)
- The expired-token branch also denies unknown routes (not in `AUTHENTICATED_ROUTES` and not in
  `PUBLIC_ROUTES`)

**Why:**
Previously, routes not listed in either `PUBLIC_ROUTES` or `AUTHENTICATED_ROUTES` would get
`NextResponse.next()` without any auth check. This meant any future route or typo route could be
accessed without authentication.

**How to verify:**

1. Clear all cookies (log out)
2. Navigate to a route not in either list, e.g., `/some-random-path`
3. Expected: redirect to `/auth/login?returnUrl=/some-random-path`

---

## DEF-32 (HIGH): Preboarding portal uses authenticated API client

**File changed:** `frontend/app/preboarding/portal/[token]/page.tsx`

**What was changed:**

- Replaced `import { apiClient } from '@/lib/api/client'` with
  `import { publicApiClient } from '@/lib/api/public-client'`
- All `apiClient.get(...)`, `apiClient.put(...)`, `apiClient.post(...)` calls changed to
  `publicApiClient.get(...)`, `publicApiClient.put(...)`, `publicApiClient.post(...)`

**Why:**
The preboarding portal is accessed by unauthenticated candidates via a token URL. Using `apiClient`
adds auth headers and has a 401 interceptor that redirects to `/auth/login`, breaking the portal for
candidates without sessions.

**How to verify:**

1. Open a preboarding portal link in an incognito/private window (no session)
2. Expected: portal loads and all steps (personal info, bank details, documents, offer letter) work
   without redirect to login

---

## DEF-33 (HIGH): Exit interview portal uses authenticated API client

**File changed:** `frontend/app/exit-interview/[token]/page.tsx`

**What was changed:**

- Replaced `import { apiClient } from '@/lib/api/client'` with
  `import { publicApiClient } from '@/lib/api/public-client'`
- Both `fetchInterview()` and `submitInterview()` now use `publicApiClient` instead of `apiClient`

**Why:**
Same as DEF-32. The exit interview is a public form accessed via token URL by departing employees
who may not have active sessions.

**How to verify:**

1. Open an exit interview link in an incognito window
2. Expected: form loads, all steps render, and submission works without login redirect

---

## DEF-34 (HIGH): Careers page application form uses authenticated API client

**File changed:** `frontend/app/careers/page.tsx`

**What was changed:**

- Replaced `import { apiClient } from '@/lib/api/client'` with
  `import { publicApiClient } from '@/lib/api/public-client'`
- The `ApplicationModal.handleFormSubmit()` now posts via
  `publicApiClient.post('/careers/apply', formDataObj)` instead of `apiClient.post(...)`
- Note: The job listing fetch (`usePublicJobs` hook) was already using raw `fetch` and was NOT
  affected

**Why:**
The careers page is public. Job applications are submitted by unauthenticated candidates. Using
`apiClient` caused the 401 interceptor to redirect candidates to login.

**How to verify:**

1. Open `/careers` in an incognito window
2. Browse jobs, click "Apply Now", fill in the form, and submit
3. Expected: application submits successfully without login redirect

---

## Summary

| Defect | Severity | File                                               | Status |
|--------|----------|----------------------------------------------------|--------|
| DEF-29 | CRITICAL | `frontend/middleware.ts`                           | Fixed  |
| DEF-27 | MEDIUM   | `frontend/middleware.ts`                           | Fixed  |
| DEF-32 | HIGH     | `frontend/app/preboarding/portal/[token]/page.tsx` | Fixed  |
| DEF-33 | HIGH     | `frontend/app/exit-interview/[token]/page.tsx`     | Fixed  |
| DEF-34 | HIGH     | `frontend/app/careers/page.tsx`                    | Fixed  |

All fixes are minimal, targeted changes. No surrounding code was refactored. No new dependencies
were added.

---

## DEF-28 (HIGH): Login page doesn't use React Hook Form + Zod

**Status:** Not applicable (false positive)

**Investigation:**
The login page (`frontend/app/auth/login/page.tsx`) does NOT have email/password text inputs. It is
a purely SSO-based login (Google OAuth) with demo account quick-login buttons. There are no
`useState` calls for email or password, no `<input type="email">` or `<input type="password">`
elements. The `handleDemoLogin` function receives the email directly from the button click, and the
password is a constant (`DEMO_PASSWORD`).

A `loginSchema` already exists in `frontend/lib/validations/auth.ts` and is available if
email/password fields are ever added back. No code change needed.

---

## DEF-24/25/26 (HIGH): Phantom routes in middleware PUBLIC_ROUTES

**Files changed:**

- `frontend/middleware.ts`
- `frontend/lib/config/routes.ts`

**What was changed:**

- Removed `/auth/register`, `/auth/reset-password`, `/auth/verify-email` from `PUBLIC_ROUTES` in
  both `frontend/middleware.ts` (edge middleware) and `frontend/lib/config/routes.ts` (client-side
  route config)

**Why:**
These three routes had no corresponding `page.tsx` files:

- `/auth/register` -- no page exists (signup is at `/auth/signup`)
- `/auth/reset-password` -- no page exists
- `/auth/verify-email` -- no page exists

Verified the backend does NOT send links to any of these paths:

- Password reset emails point to `/reset-password?token=...` (without `/auth/` prefix), which is a
  separate issue
- No backend code references `/auth/register` or `/auth/verify-email` as frontend URLs

Keeping phantom routes in `PUBLIC_ROUTES` expands the unauthenticated attack surface for no benefit.
Removed.

**How to verify:**

1. Navigate to `/auth/register` without a session -- should now redirect to `/auth/login`
2. Navigate to `/auth/reset-password` without a session -- should now redirect to `/auth/login`
3. Navigate to `/auth/verify-email` without a session -- should now redirect to `/auth/login`
4. Existing auth flows (login, signup, forgot-password) remain unaffected

---

## DEF-30 (HIGH): Rate limit mismatch (docs say 5/min, code says 10/min)

**Status:** Documentation mismatch -- NO code change made

**Investigation:**

- `backend/src/main/java/com/hrms/common/config/DistributedRateLimiter.java` line 53:
  `AUTH("ratelimit:auth:", 10, 60)` -- 10 requests per minute
- `CLAUDE.md` states: "Rate limiting (Bucket4j + Redis): 5/min auth"
- The code value (10/min) was likely increased deliberately after initial documentation was written.
  Reducing it to 5/min without understanding the reason could break legitimate use cases (e.g., MFA
  retry, Google SSO token exchange, demo account login flows)

**Action needed:** Update CLAUDE.md to reflect the actual code value: `10/min auth` instead of
`5/min auth`. This is a docs-only update.

---

## DEF-31 (HIGH): Rate limiter doesn't identify cookie-authenticated users

**Files changed:**

- `backend/src/main/java/com/hrms/common/security/RateLimitFilter.java`
- `backend/src/test/java/com/hrms/common/security/RateLimitFilterTest.java`

**What was changed:**

1. Added `JwtTokenProvider` as a constructor dependency (injected via `@RequiredArgsConstructor`)
2. Updated `resolveClientKey()` to check the `access_token` cookie when `X-User-ID`/`X-Tenant-ID`
   headers are absent:

- Extracts the JWT from the cookie using `CookieConfig.ACCESS_TOKEN_COOKIE`
- Calls `jwtTokenProvider.getUserIdFromToken()` and `getTenantIdFromToken()` to extract user
  identity
- Falls back to IP-based limiting if cookie parsing fails (invalid/expired token)

3. Added a private `getJwtFromCookie()` helper method (mirrors the pattern in
   `JwtAuthenticationFilter`)
4. Added two new test cases:

- `shouldResolveClientKeyFromAccessTokenCookie()` -- verifies cookie-based user identification
- `shouldFallBackToIpWhenCookieJwtIsInvalid()` -- verifies graceful fallback on bad cookies

**Why:**
The NU-AURA frontend uses HttpOnly cookies (not Authorization headers) for authentication. The rate
limiter only checked `X-User-ID` and `X-Tenant-ID` headers, which are not set by the frontend. This
meant all cookie-authenticated users got IP-based rate limiting, so all users behind a shared
NAT/VPN would share a single rate limit bucket.

**How to verify:**

1. Log in via the frontend (cookie-based auth)
2. Make API requests and observe `X-RateLimit-Remaining` headers
3. The rate limit should be per-user, not per-IP
4. Run: `cd backend && mvn test -pl . -Dtest=RateLimitFilterTest`

---

## Summary (Updated)

| Defect       | Severity | File                                                                   | Status                          |
|--------------|----------|------------------------------------------------------------------------|---------------------------------|
| DEF-29       | CRITICAL | `frontend/middleware.ts`                                               | Fixed (prior)                   |
| DEF-27       | MEDIUM   | `frontend/middleware.ts`                                               | Fixed (prior)                   |
| DEF-32       | HIGH     | `frontend/app/preboarding/portal/[token]/page.tsx`                     | Fixed (prior)                   |
| DEF-33       | HIGH     | `frontend/app/exit-interview/[token]/page.tsx`                         | Fixed (prior)                   |
| DEF-34       | HIGH     | `frontend/app/careers/page.tsx`                                        | Fixed (prior)                   |
| DEF-28       | HIGH     | `frontend/app/auth/login/page.tsx`                                     | Not applicable (false positive) |
| DEF-24/25/26 | HIGH     | `frontend/middleware.ts`, `frontend/lib/config/routes.ts`              | Fixed                           |
| DEF-30       | HIGH     | `DistributedRateLimiter.java`                                          | Docs mismatch -- no code change |
| DEF-31       | HIGH     | `RateLimitFilter.java`                                                 | Fixed                           |
| DEF-35       | CRITICAL | `frontend/app/reset-password/page.tsx` (new), `frontend/middleware.ts` | Fixed                           |

All fixes are minimal, targeted changes. No surrounding code was refactored. No new dependencies
were added.

---

## DEF-35 (CRITICAL): Password reset route broken -- no frontend page at `/reset-password`

**Files changed:**

- `frontend/app/reset-password/page.tsx` (NEW)
- `frontend/middleware.ts`

**What was changed:**

1. Created `frontend/app/reset-password/page.tsx` -- a full password reset form page that:

- Reads `?token=` from the URL (via `useSearchParams` wrapped in `Suspense`)
- Shows an "Invalid Reset Link" state if no token is present, with a link to request a new one
- Renders a password reset form using React Hook Form + Zod validation
- Enforces the backend password policy: 12+ chars, uppercase, lowercase, digit, special character
- Submits to `POST /auth/reset-password` via `publicApiClient` (no auth cookie needed)
- Sends `{ token, newPassword, confirmPassword }` matching the backend `ResetPasswordRequest` DTO
- Shows success state with "Sign In" button on completion
- Has show/hide password toggles and password requirements box
- Matches the visual style of existing auth pages (forgot-password, login)

2. Added `/reset-password` to `PUBLIC_ROUTES` in `frontend/middleware.ts` so the deny-by-default
   middleware (DEF-27) allows unauthenticated access

**Why:**
The backend `EmailNotificationService.sendPasswordResetEmail()` sends emails containing
`{frontendUrl}/reset-password?token={resetToken}`. No page existed at that route. After DEF-27 (
deny-by-default middleware), clicking the reset link in the email redirected users to `/auth/login`,
completely breaking password recovery.

**How to verify:**

1. Go to `/auth/forgot-password`, enter a valid email, submit
2. Check the email for the reset link (points to `/reset-password?token=...`)
3. Click the link -- should show the reset password form (not redirect to login)
4. Enter a new password meeting the policy, submit
5. Expected: success message, then "Sign In" button takes you to login
6. Also verify: `/reset-password` with no token shows "Invalid Reset Link" with link to request new
   one
