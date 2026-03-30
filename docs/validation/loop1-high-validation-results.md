# Loop 1 HIGH Fix Validation Results

**Validator Agent** | 2026-03-31
**Scope:** DEF-24/25/26, DEF-28, DEF-30, DEF-31

---

## DEF-24/25/26: Phantom Routes Removed

**Status: PASS**

### Evidence

1. **`frontend/middleware.ts` PUBLIC_ROUTES (lines 21-31):** Confirmed `/auth/register`, `/auth/reset-password`, and `/auth/verify-email` are NOT present. The list contains only:
   - `/auth/login`
   - `/auth/forgot-password`
   - `/`
   - Token-based portals (`/preboarding/portal/`, `/exit-interview/`, `/offer-portal`, `/careers`, `/sign/`)

2. **`frontend/lib/config/routes.ts` PUBLIC_ROUTES (lines 34-46):** Confirmed the three phantom routes are NOT present. List contains: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/careers`, `/offer-portal`, `/preboarding`, `/preboarding/portal/[token]`, `/sign/[token]`, `/exit-interview/[token]`, `/`.

3. **Frontend grep for remaining references:** No live references found. The only hits are in `.next-dev/` build cache files under `frontend/sessions/`, which are stale build artifacts and will be regenerated on next build.

4. **Backend grep for email templates sending these URLs:**
   - Password reset emails use `/reset-password?token=...` (without `/auth/` prefix) -- this is a **separate route** (`/reset-password`, not `/auth/reset-password`). This route is NOT in the middleware PUBLIC_ROUTES either, but that is a pre-existing issue unrelated to this fix.
   - No backend code sends links to `/auth/register` or `/auth/verify-email`.
   - Backend `WebMvcConfig.java` excludes `/api/v*/auth/register` from the CORS interceptor -- this is the **API endpoint**, not a frontend route, and is correctly separate.

### Observations

- **NEW FINDING (INFO):** The password reset email sends users to `/reset-password?token=...` (line 193 of `EmailNotificationService.java`). This frontend route does NOT exist in `middleware.ts` PUBLIC_ROUTES and there is no `frontend/app/reset-password/page.tsx`. Since the middleware now uses deny-by-default (DEF-27 fix), unauthenticated users clicking a password reset link will be redirected to login. This is a pre-existing issue, not a regression from the DEF-24/25/26 fix -- it was broken before too because the backend always used `/reset-password` (not `/auth/reset-password`). **Recommend flagging for future fix.**

**Verdict: FIX VALIDATED -- phantom routes correctly removed from both files.**

---

## DEF-28: False Positive (SSO-Only Login)

**Status: PASS -- Correctly Identified as False Positive**

### Evidence

Read `frontend/app/auth/login/page.tsx` (673 lines). Confirmed:

1. **No email/password text inputs exist.** The login page has:
   - A Google SSO button (`Continue with Google`) at line 574-604
   - A demo account panel (only when `NEXT_PUBLIC_DEMO_MODE=true`) with pre-filled buttons at lines 156-231
   - No `<input type="email">`, no `<input type="password">`, no `<form>` element

2. **Demo login path:** `handleDemoLogin(email)` receives the email from button click, uses a constant `DEMO_PASSWORD`. No user-typed input exists.

3. **No uncontrolled inputs:** The `useState` calls (`error`, `mfaRequired`, `mfaUserId`, `lockoutUntil`, `isGoogleLoading`, `isDemoLoading`, `mounted`, `didFreshLogin`) are all UI state, not form field state.

4. **`loginSchema` exists** in `frontend/lib/validations/auth.ts` for future use if email/password fields are ever added.

**Verdict: CORRECTLY MARKED AS FALSE POSITIVE. No code change needed.**

---

## DEF-30: Docs Mismatch (No Code Change)

**Status: PASS -- Confirmed Docs-Only Issue**

### Evidence

1. **`DistributedRateLimiter.java` line 53:** `AUTH("ratelimit:auth:", 10, 60)` -- confirms 10 requests per 60 seconds.

2. **CLAUDE.md (root)** states: `"Rate limiting (Bucket4j + Redis): 5/min auth"` -- this is stale.

3. **`.claude/CLAUDE.md`** also states: `"Rate limiting (Bucket4j + Redis): 5/min auth"` -- same stale value.

4. The fix log correctly chose NOT to change code (reducing from 10 to 5 could break legitimate flows like MFA retry, Google SSO token exchange, demo login).

### Action Required

Both `CLAUDE.md` (root) and `.claude/CLAUDE.md` need to be updated to say `10/min auth` instead of `5/min auth`. This is a documentation task, not a code fix.

**Verdict: CONFIRMED -- 10/min is the actual rate. Docs update needed.**

---

## DEF-31: Rate Limiter Cookie Identification

**Status: PASS**

### Evidence

#### 1. `resolveClientKey()` checks `access_token` cookie (lines 136-163)

The method now has three tiers:
1. **Headers first:** Checks `X-User-ID` + `X-Tenant-ID` headers (existing behavior, used by non-browser clients)
2. **Cookie fallback:** Calls `getJwtFromCookie(request)` to extract the `access_token` cookie, then `jwtTokenProvider.getUserIdFromToken()` and `getTenantIdFromToken()` to extract identity
3. **IP fallback:** Falls back to `"ip:" + clientIp` if both header and cookie paths fail

#### 2. Graceful fallback on invalid/missing cookies (lines 155-158)

The cookie parsing is wrapped in a `try/catch (RuntimeException e)`:
- Catches any exception from `jwtTokenProvider.getUserIdFromToken()` or `getTenantIdFromToken()` (expired token, malformed JWT, null claims)
- Logs at DEBUG level: `"Could not extract user from access_token cookie for rate limiting"`
- Falls through to IP-based limiting

This is correct -- `JwtTokenProvider` methods throw `RuntimeException` subtypes (e.g., `io.jsonwebtoken.ExpiredJwtException`, `MalformedJwtException`), and the catch block correctly handles all of them.

#### 3. Cookie extraction uses `CookieConfig.ACCESS_TOKEN_COOKIE` (lines 169-179)

The `getJwtFromCookie()` helper method:
- Checks `request.getCookies()` for null (handles no-cookie requests)
- Matches against `CookieConfig.ACCESS_TOKEN_COOKIE` constant (same constant used by `JwtAuthenticationFilter`)
- Returns null if cookie not found (triggers fallback to IP)

#### 4. Test coverage

**`RateLimitFilterTest.java`** includes two new DEF-31 tests:

**Test 1: `shouldResolveClientKeyFromAccessTokenCookie()` (lines 496-522)**
- Sets up: no X-User-ID/X-Tenant-ID headers, but `access_token` cookie with a fake JWT
- Mocks `jwtTokenProvider.getUserIdFromToken()` and `getTenantIdFromToken()` to return UUIDs
- Asserts: captured client key equals `tenantId:userId` (not `ip:...`)
- Verifies `filterChain.doFilter()` is called (request passes through)

**Test 2: `shouldFallBackToIpWhenCookieJwtIsInvalid()` (lines 526-549)**
- Sets up: `access_token` cookie with "invalid-token"
- Mocks `jwtTokenProvider.getUserIdFromToken()` to throw `RuntimeException("Invalid token")`
- Asserts: captured client key starts with `"ip:"` (graceful fallback)
- Verifies `filterChain.doFilter()` is called (request still passes, just with IP-based rate limit)

Both happy path and error path are covered.

#### 5. Safety of `JwtTokenProvider` usage

The `jwtTokenProvider.getUserIdFromToken()` call is safely wrapped in a `catch (RuntimeException)` block. Even if the token is:
- Malformed (no dots, invalid base64) -> `MalformedJwtException` caught
- Expired -> `ExpiredJwtException` caught
- Tampered signature -> `SignatureException` caught
- Null claims -> `NullPointerException` caught

All exceptions are caught and handled by falling back to IP-based limiting. No exception can propagate up and cause a 500 error.

**Verdict: FIX VALIDATED -- cookie identification works correctly with proper fallback.**

---

## Validation Summary

| Defect | Severity | Fix Status | Validation |
|--------|----------|------------|------------|
| DEF-24 | HIGH | Phantom route `/auth/register` removed | **PASS** |
| DEF-25 | HIGH | Phantom route `/auth/reset-password` removed | **PASS** |
| DEF-26 | HIGH | Phantom route `/auth/verify-email` removed | **PASS** |
| DEF-28 | HIGH | False positive (SSO-only login) | **PASS** (correctly identified) |
| DEF-30 | HIGH | Docs mismatch -- no code change | **PASS** (docs update pending) |
| DEF-31 | HIGH | Rate limiter cookie identification | **PASS** |

### New Findings

| ID | Severity | Description |
|----|----------|-------------|
| NEW-V1 | MEDIUM | Password reset email sends users to `/reset-password?token=...` which has no frontend page and is not in PUBLIC_ROUTES. Deny-by-default middleware will redirect to login. Pre-existing issue. |
| NEW-V2 | LOW | Backend `WebMvcConfig.java` line 25 still excludes `/api/v*/auth/register` from CORS interceptor -- harmless (API endpoint, not frontend route) but worth cleaning up if registration is not supported. |

### Pending Actions

- [ ] Update `CLAUDE.md` (root) and `.claude/CLAUDE.md` to change `5/min auth` to `10/min auth` (DEF-30)
- [ ] Create `/reset-password` frontend page or add `/reset-password` to PUBLIC_ROUTES + create page (NEW-V1)
