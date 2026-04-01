# Loop 1: Auth Module QA Results

**Date:** 2026-04-01
**Tester:** Claude Code (Automated API QA)
**Backend:** http://localhost:8080
**Frontend:** http://localhost:3000
**Test User:** fayaz.m@nulogic.io / Welcome@123 (SUPER_ADMIN)

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | 16 |
| PASS | 10 |
| FAIL (Bugs) | 6 |
| Critical | 2 |
| Major | 2 |
| Medium | 1 |
| Minor | 1 |

---

## Bug List

### BUG-AUTH-001: /api/v1/auth/me returns 404 instead of 401 for unauthenticated requests

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-AUTH-001 |
| **Module** | Auth |
| **Feature** | Current User Profile |
| **Route** | GET /api/v1/auth/me |
| **API Endpoint** | GET /api/v1/auth/me |
| **Role** | Unauthenticated |
| **Bug Type** | Security / Incorrect HTTP Status |
| **Severity** | Critical |
| **Title** | /me endpoint returns 404 "User not found with ID: null" instead of 401 Unauthorized |
| **Steps** | 1. Send GET /api/v1/auth/me without any Authorization header or cookie |
| **Expected** | HTTP 401 Unauthorized with message "Authentication required" (consistent with other protected endpoints like /api/v1/employees) |
| **Actual** | HTTP 404 Not Found with body: `{"status":404,"error":"Not Found","message":"User not found with ID: null","errorCode":"RESOURCE_NOT_FOUND"}` |

**Root Cause:** The `/api/v1/auth/**` path is `permitAll()` in `SecurityConfig.java` (line 165). This means the request reaches the controller without authentication. `SecurityContext.getCurrentUserId()` returns `null`, which is passed to `authService.getUserProfile(null)`, which throws a "User not found" exception. The `/me` endpoint should either be excluded from the `permitAll` wildcard or should check for null userId before calling the service.

**Impact:** Information leakage (reveals that userId=null is not a valid user). Inconsistent error contract -- callers expect 401 for unauthenticated access, not 404. Could confuse frontend auth guards.

---

### BUG-AUTH-002: Refresh token endpoint revokes token before using it, causing all refresh attempts to fail

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-AUTH-002 |
| **Module** | Auth |
| **Feature** | Token Refresh |
| **Route** | POST /api/v1/auth/refresh |
| **API Endpoint** | POST /api/v1/auth/refresh |
| **Role** | Any Authenticated User |
| **Bug Type** | Logic Error / Broken Feature |
| **Severity** | Critical |
| **Title** | Refresh token is revoked BEFORE being validated, making token refresh permanently broken |
| **Steps** | 1. Login to get valid accessToken and refreshToken. 2. Send POST /api/v1/auth/refresh with header `X-Refresh-Token: <valid_refresh_token>` |
| **Expected** | HTTP 200 with new accessToken and refreshToken |
| **Actual** | HTTP 401 with body: `{"status":401,"error":"Authentication Failed","message":"Invalid or expired refresh token","errorCode":"AUTHENTICATION_FAILED"}` |

**Root Cause:** In `AuthController.java` lines 130-133:
```java
// Line 131: Revokes the token first
tokenProvider.revokeToken(refreshToken);
// Line 133: Then tries to use the now-revoked token
AuthResponse authResponse = authService.refresh(refreshToken);
```
The token is revoked before `authService.refresh()` is called. The service then finds the token is revoked and rejects it. The revocation should happen AFTER the new tokens are generated, or the refresh service should handle revocation internally.

**Impact:** Users cannot refresh their access tokens. When the 1-hour access token expires, users are forced to re-login. This defeats the purpose of refresh tokens entirely and degrades user experience significantly.

---

### BUG-AUTH-003: Logout succeeds with HTTP 200 even when no token is provided

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-AUTH-003 |
| **Module** | Auth |
| **Feature** | Logout |
| **Route** | POST /api/v1/auth/logout |
| **API Endpoint** | POST /api/v1/auth/logout |
| **Role** | Unauthenticated |
| **Bug Type** | Security / Missing Auth Check |
| **Severity** | Minor |
| **Title** | Logout endpoint returns 200 OK with no token, should require authentication |
| **Steps** | 1. Send POST /api/v1/auth/logout with no Authorization header and no cookies |
| **Expected** | HTTP 401 Unauthorized (logout should require a valid session) |
| **Actual** | HTTP 200 OK with empty body |

**Root Cause:** The `/api/v1/auth/**` wildcard `permitAll()` allows unauthenticated access. The controller gracefully handles null tokens (lines 155-159 check for null before revoking). While not exploitable, this is inconsistent -- logout should semantically require an authenticated session.

**Impact:** Low. No security vulnerability, but inconsistent API contract. Could mask client-side bugs where logout is called without proper token management.

---

### BUG-AUTH-004: Missing Strict-Transport-Security (HSTS) header on API responses

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-AUTH-004 |
| **Module** | Auth / Security |
| **Feature** | Security Headers |
| **Route** | All API endpoints |
| **API Endpoint** | * |
| **Role** | N/A |
| **Bug Type** | Security / Missing Header |
| **Severity** | Major |
| **Title** | Strict-Transport-Security (HSTS) header is missing from all API responses |
| **Steps** | 1. Send any request to the backend API. 2. Inspect response headers |
| **Expected** | Response includes `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| **Actual** | Header is completely absent from all responses |

**Root Cause:** Spring Security's HSTS configuration is not enabled or is not effective in the current setup. The `SecurityConfig.java` configures other headers (X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy) but HSTS may be disabled because the dev environment uses HTTP (not HTTPS), and Spring Security only sends HSTS over secure connections by default.

**Impact:** In production over HTTPS, browsers would not enforce HTTPS-only connections, leaving users vulnerable to SSL-stripping attacks. Must be verified and enabled for production deployment.

---

### BUG-AUTH-005: Auth rate limit is 10/min but documented as 5/min -- and applies globally per IP, not per-endpoint

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-AUTH-005 |
| **Module** | Auth / Rate Limiting |
| **Feature** | Login Rate Limiting |
| **Route** | POST /api/v1/auth/login |
| **API Endpoint** | POST /api/v1/auth/login |
| **Role** | N/A |
| **Bug Type** | Configuration / Documentation Mismatch |
| **Severity** | Medium |
| **Title** | Auth rate limit is 10 requests/minute (not 5/min as documented), and the bucket is shared across ALL /api/v1/auth/** endpoints |
| **Steps** | 1. Send 10+ POST requests to /api/v1/auth/login within 60 seconds. 2. Also try POST /api/v1/auth/refresh and POST /api/v1/auth/logout within the same window |
| **Expected** | Per CLAUDE.md: "5/min auth" rate limit. Login, refresh, and logout should have independent or at least appropriately scoped rate limits |
| **Actual** | Rate limit is 10/min (configured in `RateLimitConfig.java` line 26: `app.rate-limit.auth.capacity:10`). The bucket is shared for all `/api/v1/auth/**` endpoints, meaning a user who logs in and refreshes tokens is consuming from the same pool. After 10 total auth requests (login + refresh + logout combined), all auth endpoints return 429 |

**Root Cause:** `RateLimitConfig` defaults auth capacity to 10, not 5. The rate limit filter applies a single bucket to the entire `/api/v1/auth/**` path prefix. This means legitimate auth flows (login -> refresh -> refresh -> ...) can exhaust the bucket.

**Impact:** (1) Documentation says 5/min but actual is 10/min -- security posture is weaker than documented against brute force. (2) Shared bucket means a legitimate user's refresh cycle can be blocked by their own login attempts, causing unexpected 429 errors on token refresh.

---

### BUG-AUTH-006: Login response returns tokens in both body AND cookies -- double exposure

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-AUTH-006 |
| **Module** | Auth |
| **Feature** | Login |
| **Route** | POST /api/v1/auth/login |
| **API Endpoint** | POST /api/v1/auth/login |
| **Role** | Any |
| **Bug Type** | Security / Token Exposure |
| **Severity** | Major |
| **Title** | Access and refresh tokens are returned in BOTH the response body JSON AND httpOnly cookies simultaneously |
| **Steps** | 1. Send POST /api/v1/auth/login with valid credentials. 2. Inspect the response body and Set-Cookie headers |
| **Expected** | Tokens should be in httpOnly cookies ONLY (as per CLAUDE.md: "JWT in cookie (NOT Authorization header)"). The response body should contain user profile info but NOT raw tokens |
| **Actual** | Response body contains `accessToken` and `refreshToken` fields with full JWT values. Set-Cookie headers also contain the tokens. Comment in code says "tokens also in body for backward compatibility during migration" (line 61) |

**Root Cause:** `AuthController.java` line 61: `// Return response (tokens also in body for backward compatibility during migration)`. The migration period appears to be ongoing indefinitely.

**Impact:** Tokens in the response body are accessible to JavaScript (XSS attack surface). The entire security benefit of httpOnly cookies is negated when tokens are also in the response body. Any XSS vulnerability could steal tokens from the JSON response even though cookies are httpOnly. The "migration" comment suggests this was meant to be temporary but has not been cleaned up.

---

## Pass Results

| # | Test | Endpoint | Result | Notes |
|---|------|----------|--------|-------|
| 1 | Valid login | POST /api/v1/auth/login | **PASS** | Returns 200 with tokens, user profile, roles, permissions. Correct user data for fayaz.m@nulogic.io |
| 2 | Invalid credentials | POST /api/v1/auth/login | **PASS** | Returns 401 with `errorCode: BAD_CREDENTIALS`, `message: "Invalid email or password"`. Does not leak whether email exists |
| 3 | Empty body | POST /api/v1/auth/login | **PASS** | Returns 400 with validation errors: `email: "Email is required"`, `password: "Password is required"` |
| 4 | /me with valid token | GET /api/v1/auth/me | **PASS** | Returns 200 with user profile. Tokens are null in response (correct -- not re-issued on profile fetch) |
| 5 | Unauthenticated /employees | GET /api/v1/employees | **PASS** | Returns 401 `{"error":"Unauthorized","message":"Authentication required"}` |
| 6 | CORS: evil origin | OPTIONS /api/v1/auth/login | **PASS** | Returns 403 "Invalid CORS request". No Access-Control-Allow-Origin header set |
| 7 | CORS: valid origin | OPTIONS /api/v1/auth/login | **PASS** | Returns 200 with `Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Credentials: true` |
| 8 | X-Content-Type-Options | All responses | **PASS** | `X-Content-Type-Options: nosniff` present on all responses |
| 9 | X-Frame-Options | All responses | **PASS** | `X-Frame-Options: DENY` present on all responses |
| 10 | Frontend login page | GET http://localhost:3000/auth/login | **PASS** | Returns 200, content-type text/html, 62KB page rendered |

---

## Security Headers Audit

| Header | Expected | Actual | Status |
|--------|----------|--------|--------|
| X-Content-Type-Options | nosniff | nosniff | **PASS** |
| X-Frame-Options | DENY | DENY | **PASS** |
| Content-Security-Policy | Present | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` | **PASS** (but `unsafe-inline` and `unsafe-eval` weaken CSP) |
| Strict-Transport-Security | Present | **MISSING** | **FAIL** (BUG-AUTH-004) |
| Referrer-Policy | Present | strict-origin-when-cross-origin | **PASS** |
| Permissions-Policy | Present | camera=(), microphone=(), geolocation=(), payment=(), usb=() | **PASS** |
| X-XSS-Protection | 0 (disabled, correct for modern CSP) | 0 | **PASS** |
| Cache-Control | no-store | no-store, no-cache, must-revalidate, private | **PASS** |

---

## Additional Observations

1. **SQL Injection Protection:** Validated -- SQL injection attempts in the email field are rejected by `@Email` validation (returns 400 "Email should be valid").

2. **CSRF Protection:** XSRF-TOKEN cookie is set on authenticated responses. Double-submit cookie pattern is in place.

3. **JWT Claims:** Access token contains `userId`, `tenantId`, `roles` (array), `employeeId`, `departmentId`, `appCode`. No permissions in JWT (correct per CRIT-001).

4. **Rate Limit Headers:** Inconsistent -- some responses show `X-Rate-Limit-Remaining: 599` (API bucket) alongside `X-RateLimit-Remaining: 0` (auth bucket). Two different header naming conventions are used simultaneously.

5. **Login Response Size:** The login response includes the full permissions array (26 permissions for SuperAdmin). For non-SuperAdmin users with 100+ permissions, this could result in large response payloads. Consider paginating or moving permissions to a separate endpoint.

6. **Refresh with no token:** Correctly returns 400 Bad Request with empty body (could improve by adding error message).

7. **Refresh with invalid token:** Correctly returns 401 with "Invalid or expired refresh token".

---

## Files Referenced

- `/backend/src/main/java/com/hrms/api/auth/controller/AuthController.java` -- Main auth controller (bugs 001, 002, 003, 006)
- `/backend/src/main/java/com/hrms/common/config/SecurityConfig.java` -- Security chain, CORS, permitAll rules (bugs 001, 003, 004)
- `/backend/src/main/java/com/hrms/common/config/RateLimitConfig.java` -- Rate limit configuration (bug 005)
- `/backend/src/main/java/com/hrms/common/config/DistributedRateLimiter.java` -- Distributed rate limit types
- `/backend/src/main/java/com/hrms/api/auth/dto/LoginRequest.java` -- Login DTO with validation
