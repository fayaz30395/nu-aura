# Loop 1 Validation Results

> **Validator Agent** | 2026-03-31
> **Method:** Static code analysis — source-level reading of all changed files
> **Scope:** 5 fixes from Loop 1 (DEF-29, DEF-27, DEF-32, DEF-33, DEF-34)

---

## Per-Defect Validation

### DEF-29 (CRITICAL): Expired JWT bypass in middleware

**Status: VALIDATED**

| Check | Result | Evidence |
|-------|--------|----------|
| `isExpired` destructured from `decodeJwt()` | PASS | Line 316: `const { role, roles, isExpired } = decodeJwt(accessToken);` |
| Expired token redirects to `/auth/login` with `returnUrl` | PASS | Lines 318-325: `if (isExpired)` block checks `isAuthenticatedRoute(pathname)` and redirects with `loginUrl.searchParams.set('returnUrl', pathname)` |
| Public routes pass through with expired tokens | PASS | Lines 327-333: if route is public (`isPublicRoute(pathname)`), falls through to `NextResponse.next()` with security headers |
| SuperAdmin bypass happens AFTER expiry check | PASS | Lines 336-340: SuperAdmin check at line 337 is structurally after the `isExpired` block (lines 318-334). Expired SuperAdmin tokens are correctly redirected before the bypass is reached |
| No false positives for valid tokens | PASS | `decodeJwt()` returns `isExpired: false` when `Date.now() / 1000 <= exp` (line 173). Only truly expired tokens trigger the redirect. If `exp` is undefined (malformed JWT), `isExpired` defaults to `false` — this is safe because the backend will reject the token on the first API call |
| Unknown routes with expired token also denied | PASS | Lines 327-331: `if (!isPublicRoute(pathname))` catches unknown routes and redirects to login |
| `decodeJwt` function signature unchanged | PASS | Lines 145-149: return type is `{ role?: string; roles: string[]; isExpired: boolean }` — matches the destructure |

**Notes:**
- The fix is minimal and correct. The `isExpired` check happens before the SuperAdmin bypass, which is the correct order — an expired token should never grant access even to SuperAdmin.
- Edge case: if `exp` is missing from the JWT payload, `isExpired` defaults to `false`. This is acceptable because (a) a well-formed JWT always has `exp`, and (b) the backend verifies the signature and expiry on every API call.

---

### DEF-27 (MEDIUM): Unknown routes deny-by-default

**Status: VALIDATED**

| Check | Result | Evidence |
|-------|--------|----------|
| `!accessToken` branch redirects ALL non-public routes | PASS | Lines 307-312: After the `isPublicRoute` check returns false (line 292) and falls through, the `!accessToken` branch unconditionally redirects to login. No distinction between known authenticated routes and unknown routes. |
| Public routes pass through without token | PASS | Lines 292-301: `isPublicRoute(pathname)` returns early with `NextResponse.next()` + security headers |
| `returnUrl` set for the redirect | PASS | Line 311: `loginUrl.searchParams.set('returnUrl', pathname)` |
| No public routes accidentally blocked | PASS | `PUBLIC_ROUTES` array (lines 21-34) includes all token-based portals (`/preboarding/portal/`, `/exit-interview/`, `/sign/`), auth pages, `/careers`, `/offer-portal`, and `/`. The `isPublicRoute` function (lines 196-207) checks both exact matches and prefix matches. |
| Expired token + unknown route also denied | PASS | Lines 327-331: unknown routes with expired tokens also redirect to login (belt-and-suspenders with the `!accessToken` branch) |

**Notes:**
- The middleware flow is now: (1) skip static assets, (2) handle `/home` redirect, (3) allow public routes, (4) if no token -> redirect to login, (5) if expired token -> redirect to login for non-public routes, (6) SuperAdmin bypass, (7) allow through. This is a sound deny-by-default model.

---

### DEF-32 (HIGH): Preboarding portal uses public client

**Status: VALIDATED**

| Check | Result | Evidence |
|-------|--------|----------|
| Import uses `publicApiClient` | PASS | Line 12: `import { publicApiClient } from '@/lib/api/public-client';` |
| No remaining `apiClient` import | PASS | Grep for `from '@/lib/api/client'` in `/preboarding` returned zero matches |
| No remaining `apiClient.` calls | PASS | Grep for `apiClient\.` in `/preboarding` returned zero matches |
| All API calls use `publicApiClient` | PASS | Line 91: `publicApiClient.get(...)`, Line 122: `publicApiClient.put(...)`, Line 149: `publicApiClient.put(...)`, Line 162: `publicApiClient.post(...)` |
| `publicApiClient` does NOT have 401 redirect interceptor | PASS | `public-client.ts` response interceptor (lines 43-70) only logs and transforms errors — no redirect to `/auth/login` |
| `publicApiClient` does NOT set `withCredentials` | PASS | `axios.create()` at line 34 has no `withCredentials` option — defaults to `false` |

---

### DEF-33 (HIGH): Exit interview uses public client

**Status: VALIDATED**

| Check | Result | Evidence |
|-------|--------|----------|
| Import uses `publicApiClient` | PASS | Line 5: `import { publicApiClient } from '@/lib/api/public-client';` |
| No remaining `apiClient` import | PASS | Grep for `from '@/lib/api/client'` in `/exit-interview` returned zero matches |
| No remaining `apiClient.` calls | PASS | Grep for `apiClient\.` in `/exit-interview` returned zero matches |
| `fetchInterview` uses `publicApiClient` | PASS | Line 49: `publicApiClient.get(...)` |
| `submitInterview` uses `publicApiClient` | PASS | Line 54: `publicApiClient.post(...)` |
| Data fetching uses React Query | PASS | Lines 80-83: `useQuery` with `queryFn: () => fetchInterview(token)` |
| Mutation uses React Query | PASS | Lines 85-104: `useMutation` with `mutationFn` calling `submitInterview` |

---

### DEF-34 (HIGH): Careers uses public client for application

**Status: VALIDATED**

| Check | Result | Evidence |
|-------|--------|----------|
| Import uses `publicApiClient` | PASS | Line 7: `import { publicApiClient } from '@/lib/api/public-client';` |
| No remaining `apiClient` import | PASS | Grep for `from '@/lib/api/client'` in `/careers` returned zero matches |
| No remaining `apiClient.` calls | PASS | Grep for `apiClient\.` in `/careers` returned zero matches |
| Application POST uses `publicApiClient` | PASS | Line 294: `await publicApiClient.post('/careers/apply', formDataObj)` |
| Job listing fetch unaffected | PASS | Line 495: `usePublicJobs(filters)` hook — was already using public fetch, not changed |
| Application form uses React Hook Form + Zod | PASS | Lines 248-262: `useForm<ApplicationFormData>({ resolver: zodResolver(applicationFormSchema) })` |

---

## Regression Check Results

| Check | Result | Details |
|-------|--------|---------|
| TypeScript compilation (`npx tsc --noEmit`) | PASS | Zero errors — clean exit |
| No `apiClient` imports in public portal pages | PASS | Grep across `/preboarding`, `/exit-interview`, `/careers` all returned zero matches |
| Middleware `config.matcher` intact | PASS | Lines 352-363: matcher correctly excludes `_next/static`, `_next/image`, `favicon.ico`, and image file extensions |
| `decodeJwt` function signature unchanged | PASS | Lines 145-149: returns `{ role?: string; roles: string[]; isExpired: boolean }` — same shape as before, with `isExpired` now actually consumed |
| `publicApiClient` has no auth-redirect interceptor | PASS | `public-client.ts` error interceptor only logs and transforms — no redirect logic |
| Security headers still applied on all paths | PASS | `addSecurityHeaders()` called in public route path (line 300), expired token public path (line 333), SuperAdmin path (line 339), and normal auth path (line 345) |
| Public route list unchanged | PASS | Lines 21-34: same set of public routes as before — no routes added or removed |
| Authenticated route list unchanged | PASS | Lines 37-121: same set of authenticated routes — no routes added or removed |

---

## Overall Verdict

**ALL 5 FIXES VALIDATED**

| Defect | Severity | Status |
|--------|----------|--------|
| DEF-29 | CRITICAL | VALIDATED |
| DEF-27 | MEDIUM | VALIDATED |
| DEF-32 | HIGH | VALIDATED |
| DEF-33 | HIGH | VALIDATED |
| DEF-34 | HIGH | VALIDATED |

All fixes are minimal, targeted, and correct. No regressions detected. TypeScript compilation passes cleanly. The middleware now implements a proper deny-by-default model with expired-token handling, and all three public portals correctly use `publicApiClient` instead of the authenticated `apiClient`.

---

**Validator:** Validator Agent (static code analysis)
**Date:** 2026-03-31
