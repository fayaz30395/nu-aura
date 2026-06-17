# NU-AURA Navigation Audit — QA-100x Findings

**Auditor:** Agent 1 (Navigation & Route Audit)  
**Date:** 2026-06-18  
**Scope:** Frontend navigation, routing, sidebar config, middleware, breadcrumbs, 404, app-switcher  
**Total app routes found:** 285 page.tsx files

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 2 |
| Medium | 2 |
| Low | 1 |
| Pass | 8 |

---

## Issues

---

## NAV-001
**Severity:** Critical  
**Route:** ALL protected routes  
**Issue:** Edge middleware (CSP headers + coarse auth-cookie check) is NOT running. `middleware.ts` shim was deleted in commit `44477dd5` to fix a Next.js 16 build conflict, but `proxy.ts` exports a function named `proxy`, not `middleware`. Next.js 16 requires the exported function to be named `middleware` (or re-exported as `export { proxy as middleware }`). The compiled middleware manifest confirms this: `.next/server/middleware-manifest.json` shows `"middleware": {}` (empty) and `"sortedMiddleware": []`.  
**Evidence:**  
- `frontend/proxy.ts:396` — `export function proxy(request: NextRequest) {`  
- `frontend/.next/server/middleware-manifest.json` — `{ "version": 3, "middleware": {}, "functions": {}, "sortedMiddleware": [] }`  
- Commit `44477dd5`: "fix(build): remove legacy middleware.ts shim for Next.js 16 Turbopack"  
- Prior commit `690ac694` explicitly warned: "Since that commit no CSP header was being served, no edge auth-cookie check ran before page render"  
**Impact:** No Content-Security-Policy headers served. No edge-level redirect for unauthenticated users on protected routes. No OWASP security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, etc.) on any response. Auth guard falls entirely to client-side `AuthGuard` component, creating a flash of protected content before redirect.  
**Fix:** Add `export { proxy as middleware, config }` to `proxy.ts`, OR rename the function inside to `middleware`.  
**Status:** OPEN

---

## NAV-002
**Severity:** High  
**Route:** `/admin/users`  
**Issue:** Route `/admin/users` is registered in `lib/config/routes.ts` (line 65) with permission `USER_MANAGE | SYSTEM_ADMIN`, but no `page.tsx` exists at `app/admin/users/`. Any user navigating to this URL gets a Next.js 404. The route is NOT in the AdminLayoutInner sidebar (so no accidental nav), but it IS tested by E2E specs (`rbac-employee-boundaries.spec.ts`, `auth.setup.ts`) and referenced in `lib/generated/api/admin/admin.ts`. User management currently lives at `/admin/employees`.  
**Evidence:**  
- `frontend/lib/config/routes.ts:65` — `path: '/admin/users'`  
- `frontend/app/admin/` — no `users/` subdirectory  
- `frontend/e2e/rbac-employee-boundaries.spec.ts` — navigates to `/admin/users`  
**Impact:** E2E tests that navigate to `/admin/users` will 404. Any external link or bookmark to `/admin/users` returns 404.  
**Fix:** Either create a redirect page at `app/admin/users/page.tsx` pointing to `/admin/employees`, or remove the route from `routes.ts` and update E2E tests.  
**Status:** OPEN

---

## NAV-003
**Severity:** High  
**Route:** `/admin/feature-flags`, `/admin/implicit-roles`, `/admin/mobile-api`, `/admin/departments`  
**Issue:** These four admin pages exist as `page.tsx` files but are NOT linked in `AdminLayoutInner.tsx` sidebar. They are not accessible via any visible navigation path in the admin shell. `/admin/audit` and `/admin/budget` are reachable via the main HRMS `menuSections.tsx` sidebar, so those two are lower risk.  
**Evidence:**  
- Pages exist: `frontend/app/admin/feature-flags/page.tsx`, `frontend/app/admin/implicit-roles/page.tsx`, `frontend/app/admin/mobile-api/page.tsx`, `frontend/app/admin/departments/page.tsx`  
- Not in `AdminLayoutInner.tsx` sidebar items (confirmed by grep showing no matches)  
- Not found via main HRMS `menuSections.tsx` for feature-flags, implicit-roles, mobile-api, departments  
- E2E tests directly navigate via URL: `e2e/admin-system.spec.ts:148`, `e2e/rbac-matrix.spec.ts:177`  
**Impact:** Feature-flags and implicit-roles pages are Super Admin capabilities with no UI entry point — admins can only reach them by typing URLs directly. Departments page is accessible from the main sidebar under the HRMS layout but not the admin shell.  
**Fix:** Add sidebar entries to `AdminLayoutInner.tsx` for feature-flags and implicit-roles (at minimum under System Dashboard section). For departments and mobile-api, assess whether they belong in the admin shell sidebar or HRMS sidebar.  
**Status:** OPEN

---

## NAV-004
**Severity:** Medium  
**Route:** All authenticated pages using `components/layout/Breadcrumbs.tsx`  
**Issue:** The Breadcrumbs component hardcodes the Home link as `href="/"` (line 43). The root `/` page immediately redirects to `/auth/login` (via `setTimeout` of 180ms in `app/page.tsx`). So any authenticated user clicking "Home" in a breadcrumb is momentarily bounced to the login page before the redirect logic fires. In admin context (`app/admin/`) breadcrumbs would be even more disorienting since the appropriate home is `/admin` not `/`.  
**Evidence:**  
- `frontend/components/layout/Breadcrumbs.tsx:43` — `href="/"`  
- `frontend/app/page.tsx` — redirects to `/auth/login` after 180ms  
**Impact:** UX bug — clicking breadcrumb Home in an authenticated session sends user to login redirect loop momentarily. May cause flicker or session loss depending on auth state handling.  
**Fix:** Change breadcrumb home href to `/me/dashboard` (for HRMS layout) or accept a `homeHref` prop so admin layout can pass `/admin`.  
**Status:** OPEN

---

## NAV-005
**Severity:** Medium  
**Route:** `/admin/users` (routes.ts) + `proxy.ts` (AUTHENTICATED_ROUTES list)  
**Issue:** `proxy.ts` AUTHENTICATED_ROUTES list (the edge middleware protection list) does not include `/admin/users`. Even if the middleware were working (see NAV-001), `/admin/users` would not be edge-protected. This is a defense-in-depth gap since `AuthGuard` would still apply client-side.  
**Evidence:**  
- `frontend/proxy.ts:70-154` — `/admin/users` absent from `AUTHENTICATED_ROUTES`  
- `frontend/lib/config/routes.ts:65` — route IS configured in client-side `PROTECTED_ROUTES`  
**Impact:** Minor since middleware is currently not running (NAV-001). When NAV-001 is fixed, `/admin/users` would be left unprotected at the edge layer.  
**Fix:** Add `/admin/users` to `AUTHENTICATED_ROUTES` in `proxy.ts`.  
**Status:** OPEN

---

## NAV-006
**Severity:** Low  
**Route:** `navigation.spec.ts` E2E spec  
**Issue:** `navigation.spec.ts` `beforeEach` uses `waitForURL('**/dashboard')` after login. After login, the app redirects to `/me/dashboard` not `/dashboard`. The glob `**/dashboard` matches both (any segment ending in `dashboard`). However, line 289 does `page.goto('/dashboard')` expecting to stay there, but the `/dashboard/page.tsx` immediately calls `router.replace('/auth/login')` if unauthenticated or `router.replace('/me/dashboard')` if authenticated. This makes the test assertion on line 292 (`expect(page.url()).toContain('/dashboard')`) ambiguous — it will match `/me/dashboard` after redirect.  
**Evidence:**  
- `frontend/e2e/navigation.spec.ts:17` — `await page.waitForURL('**/dashboard')`  
- `frontend/e2e/navigation.spec.ts:289` — `await page.goto('/dashboard')`  
- `frontend/app/dashboard/page.tsx:158,164` — redirects based on auth state  
**Impact:** Tests pass for wrong reasons; doesn't test the `/dashboard` route itself. Coverage gap.  
**Fix:** Update test to `waitForURL('**/me/dashboard')` after login and test `/dashboard` redirect behavior separately.  
**Status:** OPEN

---

## Passed Checks

| ID | Check | Result |
|----|-------|--------|
| NAV-P01 | 404 page exists with correct links | PASS — `app/not-found.tsx` links to `/me/dashboard` and uses `window.history.back()` |
| NAV-P02 | AppSwitcher handles locked apps correctly | PASS — `AppSwitcher.tsx` gates on `hasAppAccess()` and shows locked state |
| NAV-P03 | Sidebar flyover panel accessible (Esc to close, click-outside) | PASS — `Sidebar.tsx` implements both handlers |
| NAV-P04 | All hardcoded `href` links point to existing pages | PASS — all 38 static hrefs verified against `app/` directory |
| NAV-P05 | Sidebar section collapse state persisted per layout | PASS — `storageKeyPrefix` prop with admin-specific key prefix |
| NAV-P06 | AdminLayoutInner redirects unauthorized users | PASS — `useEffect` at line 60 redirects to `/me/dashboard` when `!hasAdminAccess` |
| NAV-P07 | Breadcrumb component semantically correct | PASS — uses `<nav aria-label="Breadcrumbs">` and `aria-current="page"` on last item |
| NAV-P08 | proxy.ts config export has correct matcher pattern | PASS — matcher covers all paths except `_next/static`, `_next/image`, favicon, images |

---

## Route Coverage

- **Total page.tsx routes:** 285
- **Protected routes configured in routes.ts:** 90+ entries
- **Admin pages:** 25 (23 linked in sidebar + admin main page, 2 accessible only via direct URL)
- **Public routes:** 8 (/, /auth/login, /auth/signup, /auth/forgot-password, /careers, /offer-portal, /terms, /privacy)
- **Broken hardcoded links:** 0 (all static hrefs resolve to existing pages)
- **Missing pages for configured routes:** 1 (`/admin/users`)

---

## E2E Test Result

**Status:** SKIPPED (backend not running — `ECONNREFUSED ::1:8080`)  
All 82 navigation tests did not run due to auth setup failure. Not a code defect.  
To run: start backend on `:8080` then `npx playwright test navigation.spec.ts`
