# NU-AURA Comprehensive Code Review

**Date**: 2026-04-05
**Scope**: Full application (frontend + backend)
**Reviewers**: 4 parallel AI agents (Security Frontend, Security Backend, Performance, Code Quality)

---

## Executive Summary

| Domain            | Critical | High  | Medium | Low   | Status    |
|-------------------|----------|-------|--------|-------|-----------|
| Backend Security  | 0        | 0     | 0      | 0     | PASS      |
| Frontend Security | 2        | 3     | 3      | 3     | NEEDS FIX |
| Performance       | 0        | 2     | 6      | 2     | NEEDS FIX |
| Code Quality      | 2        | 3     | 3      | 3     | NEEDS FIX |
| **Total**         | **4**    | **8** | **12** | **8** |           |

**Overall Verdict**: The backend is production-ready with excellent security posture. The frontend
has 2 critical security issues (CSP unsafe-inline, JWT fallback) and several performance
optimizations needed. No showstoppers for an internal tool, but the critical items should be
addressed before external exposure.

---

## 1. Backend Security Review

### Result: ALL CLEAR

| Area                   | Status | Notes                                            |
|------------------------|--------|--------------------------------------------------|
| Permission Enforcement | PASS   | 143+ controllers, all have `@RequiresPermission` |
| SQL Injection          | PASS   | 23 native queries reviewed, all parameterized    |
| Rate Limiting          | PASS   | 5 req/min auth, Redis + Bucket4j fallback        |
| CORS                   | PASS   | Explicit origin allowlist, no wildcards          |
| Sensitive Data         | PASS   | No passwords/hashes exposed, httpOnly cookies    |

### Recommendations (Non-blocking)

1. Verify production CORS origins are set (not localhost)
2. Confirm `app.rate-limit.enabled=true` in production
3. Monitor Redis health for distributed rate limiting

---

## 2. Frontend Security Review

### CRITICAL

**CRITICAL-1: CSP `unsafe-inline` in Production** (`middleware.ts:246-247`)

- Content Security Policy allows inline scripts in production, defeating XSS protection
- **Fix**: Remove `'unsafe-inline'` from `script-src`, use Next.js Script with nonces

**CRITICAL-2: JWT Fallback to Unsigned Decode** (`useAuth.ts:97-98`)

- Falls back to unsigned JWT decode if `response.roles` is empty
- **Fix**: Require roles in AuthResponse contract, throw error if missing

### HIGH

**HIGH-1: Hardcoded Demo Credentials** (`login/page.tsx:40-63`)

- Real employee emails + default password bundled in client code
- **Fix**: Load demo accounts from backend, gate behind environment check

**HIGH-2: Untrusted JWT in Edge Middleware** (`middleware.ts:149-176`)

- JWT decoded without signature verification for route decisions
- **Risk**: Acceptable if backend validates all API calls (documented assumption)

**HIGH-3: PII in sessionStorage** (`useAuth.ts:116,155`)

- User data (employeeId, tenantId, name) stored in sessionStorage
- **Fix**: Use Zustand in-memory state only, remove sessionStorage calls

### MEDIUM

**MED-1**: returnUrl validation allows `@` character (login/page.tsx:76-87)
**MED-2**: Password field has no strength validation (employees/page.tsx:55)
**MED-3**: CSRF token regex edge case (client.ts:145-149)

### Positive Findings

- httpOnly cookies for auth tokens
- CSRF double-submit pattern implemented
- DOMPurify for HTML sanitization
- Zod validation on forms
- OWASP headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- No raw `dangerouslySetInnerHTML` without sanitization

---

## 3. Performance Review

### HIGH IMPACT

**PERF-1: N+1 Query in WikiPageController** (`WikiPageController.java:40-57`)

- `toDto()` calls `employeeRepository.findByUserIdWithUser()` per page
- 20 pages = 21 queries
- **Fix**: Batch-fetch authors via `findAllByUserIdIn(Set<UUID>)`

**PERF-2: Birthday API Called 3x** (`feed.service.ts:27`, `BirthdayWishingBoard:159`,
`CelebrationTabs:39`)

- Three different components fetch birthdays independently with different `days` params
- **Fix**: Unify to single React Query hook with `days=14`

### MEDIUM IMPACT

**PERF-3**: Inline callbacks in dashboard JSX (`dashboard/page.tsx:280`) — extract to `useCallback`
**PERF-4**: Missing `useCallback` for `handleCheckIn`/`handleCheckOut` (`dashboard/page.tsx:72-121`)
**PERF-5**: No backend cache for birthdays/anniversaries (`CacheConfig.java`) — add 24hr TTL
**PERF-6**: Feed service has no per-source timeout (`feed.service.ts:26-48`) — slow endpoint blocks
all
**PERF-7**: Heavy dependencies (Mantine 27MB, TipTap 8MB) — consider Radix/lightweight alternatives
**PERF-8**: React Query deduplication missing across dashboard hooks (`useHome.ts:164-176`)

### LOW IMPACT

**PERF-9**: `gcTime: 24hr` too long, `refetchOnWindowFocus: false` prevents staleness refresh
**PERF-10**: Incomplete cache invalidation after profile mutations (`useSelfService.ts:129-136`)

### Quick Wins (< 2 hours, ~70% impact)

1. Fix birthday 3x call → single hook (PERF-2)
2. Extract inline callbacks to useCallback (PERF-3, PERF-4)
3. Add birthday/anniversary cache TTL (PERF-5)
4. Add per-source timeout in feed service (PERF-6)

---

## 4. Code Quality Review

### CRITICAL

**QUAL-1: Silent Error Swallowing** (`feed.service.ts` — 7 methods)

- `fetchAnnouncements()`, `fetchBirthdays()`, `fetchWallPosts()`, etc. all have bare
  `catch { return []; }` with no logging
- Debugging is impossible when feed sections silently fail
- **Fix**: Add `console.error` or `logger.error` before returning fallback

**QUAL-2: Inconsistent Error Logging** (6 service files)

- Some services log errors, others don't — incomplete refactoring artifact
- `wall.service.ts` and `linkedin.service.ts` return empty silently, while `search.service.ts` logs
- **Fix**: Standardize all catch blocks to log before returning fallback

### HIGH

**QUAL-3: Repeated Unsafe Type Casting** (10+ page files)

- `error as { response?: { data?: { message?: string } } }` duplicated everywhere
- **Fix**: Extract `getErrorMessage(error, fallback)` utility function

**QUAL-4: Inconsistent `apiClient` Import Alias** (`wall.service.ts`)

- Uses `api` alias while all other services use `apiClient`
- **Fix**: Standardize to `apiClient` everywhere

**QUAL-5: Oversized Page Components**

- `one-on-one/page.tsx`: 1,593 lines (5x recommended)
- `recruitment/pipeline/page.tsx`: 1,511 lines
- `letters/page.tsx`: 1,352 lines
- `dashboard/page.tsx`: 1,322 lines
- **Fix**: Extract into sub-components (List, Modal, Stats, etc.)

### MEDIUM

**QUAL-6**: Double type casting `as unknown as X` in resource pages
**QUAL-7**: Boolean comparison redundancy (`=== true` / `=== false`) in helpdesk
**QUAL-8**: 8+ dead re-export shim files from service migration

### LOW

**QUAL-9**: Console statements should use `createLogger()` utility
**QUAL-10**: Unused `canCreate` variable in employees page
**QUAL-11**: Test files mixed with production service files

---

## Priority Action Plan

### Must-Fix Before Production

| # | Issue                      | Severity | Effort | Owner      |
|---|----------------------------|----------|--------|------------|
| 1 | Remove CSP `unsafe-inline` | CRITICAL | 2hr    | Frontend   |
| 2 | Remove JWT fallback decode | CRITICAL | 30min  | Frontend   |
| 3 | Move demo creds to backend | HIGH     | 1hr    | Full-stack |
| 4 | Remove sessionStorage PII  | HIGH     | 30min  | Frontend   |
| 5 | Fix N+1 wiki page authors  | HIGH     | 1hr    | Backend    |

### Should-Fix (Performance)

| # | Issue                       | Impact | Effort |
|---|-----------------------------|--------|--------|
| 6 | Unify birthday API calls    | HIGH   | 30min  |
| 7 | Add useCallback to handlers | MEDIUM | 30min  |
| 8 | Add celebration cache TTL   | MEDIUM | 15min  |
| 9 | Add feed source timeouts    | MEDIUM | 1hr    |

### Nice-to-Have

| #  | Issue                           | Impact |
|----|---------------------------------|--------|
| 10 | Password strength validation    | MEDIUM |
| 11 | returnUrl validation tightening | LOW    |
| 12 | React Query gc/refetch tuning   | LOW    |

---

## Files Changed in This Session

| File                                                 | Change Type                    |
|------------------------------------------------------|--------------------------------|
| `frontend/lib/api/client.ts`                         | Added `getPermissive()` helper |
| `frontend/lib/services/platform/linkedin.service.ts` | 403-tolerant GET               |
| `frontend/lib/services/core/wall.service.ts`         | 403-tolerant GET               |
| `frontend/lib/services/core/analytics.service.ts`    | 403-tolerant GET               |
| `frontend/lib/services/platform/fluence.service.ts`  | 403-tolerant GET               |
| `frontend/app/globals.css`                           | Mobile responsive rules        |
| `frontend/app/layout.tsx`                            | overflow-x-hidden              |
| `frontend/components/layout/AppLayout.tsx`           | Mobile content overflow        |
| `frontend/components/layout/Header.tsx`              | Compact mobile header          |
| `frontend/components/dashboard/WelcomeBanner.tsx`    | Responsive padding/orbs        |
| `frontend/app/me/dashboard/page.tsx`                 | Responsive grid spacing        |
| `frontend/app/employees/page.tsx`                    | Responsive title               |
| `frontend/app/recruitment/page.tsx`                  | Responsive header/buttons      |
| `backend/.../WikiPageController.java`                | Added root @GetMapping         |
| `backend/.../WikiPageService.java`                   | Added getAllPages()            |
