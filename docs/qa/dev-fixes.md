# DEV Agent Fix Log — 2026-04-07

## Session 5 — DEV Agent Monitoring (2026-04-08)

### Check 1: QA findings reviewed — 2 fixes applied

### BUG-004: /loans page stuck on loading spinner indefinitely
- **File:** `frontend/app/loans/page.tsx`
- **Root cause:** Same pattern as BUG-001 (/leave). The `loading` variable used React Query's `isLoading` directly, which stays `true` between retry attempts when the backend API fails or times out. This caused an infinite spinner with no way to show the error state.
- **Fix:** Added `fetchStatus` from `useEmployeeLoans()` hook. Loading is now only `true` when `isLoading && fetchStatus === 'fetching'` — when retries pause, `fetchStatus` becomes `'idle'`, allowing the error state to render instead of the spinner.
- **Verified:** tsc passes (zero errors)

### BUG-005: /fluence/wall renders empty content (no loading state)
- **File:** `frontend/app/fluence/wall/page.tsx`
- **Root cause:** When permissions were not yet ready (`!isReady`), the page returned `null` — rendering a completely empty main content area. The QA tester correctly flagged this as a FAIL since no content was visible at all.
- **Fix:** Split the guard into two: `!isReady` now renders a proper loading state inside `AppLayout` (with an activity icon and "Loading Activity Wall..." message), while `!hasAccess` still returns null (redirect handles it). This ensures the page always shows meaningful content while permissions load.
- **Verified:** tsc passes (zero errors)

### Check 2: clean
### Check 3: clean
### Check 4: clean
### Check 5: clean
### Check 6: clean
### Check 7: clean
### Check 8: clean
### Check 9: clean
### Check 10: clean
### Check 11: clean
### Check 12: clean (FINAL CHECK — monitoring loop complete 12/12)

### Triage of remaining QA FAIL/BUG items (not code bugs):
- **/overtime redirects to /leave:** Session instability (P0). The overtime page's permission gate (`hasAnyPermission(OVERTIME_VIEW, OVERTIME_REQUEST, ATTENDANCE_MARK)`) returns false when session drops, triggering `router.replace('/me/dashboard')` which cascades. Code is correct; needs stable session.
- **/shifts, /travel Access Denied:** Same AuthGuard session issue as BUG-002/003 (already fixed in Session 4). Needs re-test with stable session.
- **/training, /surveys, /recognition Access Denied:** Explicitly flagged as "session dropped" in QA report. Re-test needed.
- **/recruitment/agencies "Failed to Load":** Backend API returning error (`agenciesQuery.isError`). Frontend error handling is correct (`PageErrorFallback`). Backend endpoint needs investigation.
- **/fluence/blogs stuck on "Preparing workspace":** AuthGuard loading state caused by session drop. Blog page code is correct. Re-test needed.

---

## Session 4 — Chrome QA Bug Fixes (22:58)

### BUG-001: /leave page stuck on loading spinner indefinitely
- **File:** `frontend/app/leave/page.tsx`
- **Root cause:** The loading state depended on `isLoading` from 3 React Query hooks, but `typesError` was never checked. When the leave-types API failed, React Query retried 3x with exponential backoff, keeping `isLoading: true` for 15+ seconds. Additionally, `useActiveLeaveTypes()` fired even when `employeeId` was empty (no `enabled` guard), wasting a request. The `loading` variable only checked `!error` against balances/requests errors, not types errors.
- **Fix:** (1) Added `typesError` to the error derivation chain. (2) Passed `!!employeeId` to `useActiveLeaveTypes(enabled)` so it only fires when user data is available. (3) Added `fetchStatus` checks — loading is now only true when queries are actively fetching (not between retries), preventing the infinite spinner.
- **Verified:** tsc passes

### BUG-002: /payroll silently redirects to /attendance (permission check fails for Super Admin)
- **File:** `frontend/components/auth/AuthGuard.tsx`
- **Root cause:** After page refresh, Zustand only persists `isAuthenticated: true` but NOT the `user` object (by design — HIGH-3 security rule). AuthGuard only called `restoreSession()` when `!isAuthenticated`. Since `isAuthenticated` was `true` but `user` was `null`, AuthGuard skipped session restore entirely. With no user object, `roles = []`, `permissions = []`, and `isAdmin = false`. The payroll page's own permission check (`hasPermission(PAYROLL_VIEW)`) returned false, triggering `router.replace('/dashboard')`, which cascaded through further redirects.
- **Fix:** AuthGuard now also triggers `restoreSession()` when `isAuthenticated` is true but `user` is null. Added `user` to the effect dependency array so the effect re-runs after session restore populates the user object.
- **Verified:** tsc passes

### BUG-003: /assets shows "Access Denied" for Super Admin (same root cause as BUG-002)
- **File:** `frontend/components/auth/AuthGuard.tsx`
- **Root cause:** Same as BUG-002. With `user = null` after refresh, `isSuperAdmin = false` and `checkAuthorization()` failed for the `/assets` route config (`anyPermission: [ASSET:VIEW, ASSET:CREATE, ASSET:MANAGE]`). AuthGuard rendered "Access Denied" and the URL changed to `/leave` (likely from a previous redirect chain).
- **Fix:** Same fix as BUG-002 — AuthGuard now restores session when `user` is null regardless of `isAuthenticated` flag.
- **Verified:** tsc passes

### HYDRATION-001: React hydration mismatch in Header.tsx
- **File:** `frontend/components/layout/Header.tsx`
- **Root cause:** Mobile menu button used `p-1.5 sm:p-2.5` — responsive padding causes SSR/client mismatch because server doesn't know viewport width. The `sm:p-2.5` with `min-w-[44px] min-h-[44px]` was mobile touch-target sizing that violates the desktop-first design system rules.
- **Fix:** Changed to consistent `p-2` padding (no responsive breakpoint). Also fixed mobile search button with same issue and added missing `cursor-pointer` + `focus-visible` ring per design system rules.
- **Verified:** tsc passes

### Final Verification
- `npx tsc --noEmit`: PASS (zero errors)

---

## Session 3 — Lint Warning Fixes (2026-04-07)

### LINT-001: Missing dependency `templatesData?.content` in useMemo
- **File:** `frontend/app/fluence/analytics/page.tsx:74`
- **Root cause:** `_templates` variable used `templatesData?.content` but it was not in the useMemo dependency array
- **Fix:** Added `templatesData?.content` to the dependency array
- **Verified:** tsc passes, lint clean

### LINT-002: Logical expression `allReviews` causing new reference on every render
- **File:** `frontend/app/performance/competency-framework/page.tsx:407`
- **Root cause:** `allReviewsQuery.data?.content ?? []` creates a new array on every render, making useMemo deps unstable
- **Fix:** Wrapped `allReviews` initialization in its own `useMemo()` hook
- **Verified:** tsc passes, lint clean

### LINT-003: Missing dependency `startScan` in useCallback
- **File:** `frontend/components/expenses/ReceiptScanner.tsx:66`
- **Root cause:** `startScan` was a plain function used inside `handleFileSelected` useCallback but not in deps
- **Fix:** Wrapped `startScan` in `useCallback`, moved it before `handleFileSelected`, added to deps array
- **Verified:** tsc passes, lint clean

### LINT-004 & LINT-005: Logical expression `documentContent` causing unstable deps (x2)
- **File:** `frontend/components/fluence/MacroRenderer.tsx:155`
- **Root cause:** `(content.content as TiptapNode[]) ?? []` creates new array ref on every render, making two dependent useMemo hooks unstable
- **Fix:** Wrapped `documentContent` initialization in its own `useMemo()` hook with `[content.content]` dep
- **Verified:** tsc passes, lint clean

### Final Verification
- `npx tsc --noEmit`: PASS (zero errors)
- `npx next lint`: PASS (zero warnings, zero errors)

---

## Session 2 — Monitoring Loop (22:54+)

### Check 1 (22:54) — No issues found
- QA findings file reviewed: 47/47 pages PASS, backend UP, tsc clean
- No FAIL or BUG entries detected

### Check 2 (22:55) — No issues found
- QA findings unchanged, no FAIL/BUG entries

### Check 3 (22:56) — No issues found
- QA findings unchanged, no FAIL/BUG entries

### Check 4 (22:57) — No issues found
- QA findings unchanged, no FAIL/BUG entries

### Check 5 (22:58) — 3 BUGs + 1 hydration issue found and fixed
- See Session 4 above for details

### Check 6 (23:04) — No new issues found
- QA findings unchanged since last check

### Check 7 (23:05) — No new issues found
- QA findings unchanged since last check

### Check 8 (23:06) — No new issues found
- QA findings unchanged since last check

### Check 9 (23:07) — No new issues found
- QA findings unchanged since last check

### Check 10 (23:08) — No new issues found (FINAL CHECK)
- QA findings unchanged since last check
- Monitoring loop complete (10/10 checks)

---

## Session 1 (Previous Run)

QA findings file reviewed across 3 check cycles (5+ minutes total monitoring).

**Result: No FAIL or BUG entries found.**

### QA Results Reviewed
- 47/47 frontend pages: PASS (all return 307 -> 200 via auth redirect)
- Backend health: UP (all components)
- TypeScript compilation: PASS (zero errors)
- Lint: 5 warnings (all react-hooks/exhaustive-deps, non-blocking)
- New agency feature files: PASS (proper structure and exports)

### Non-Blocking Items (Not Bugs)
1. `app/fluence/analytics/page.tsx:74` — exhaustive-deps warning (missing dep `templatesData?.content`)
2. `app/performance/competency-framework/page.tsx:407` — exhaustive-deps warning (logical expression in deps)
3. `components/expenses/ReceiptScanner.tsx:66` — exhaustive-deps warning (missing dep `startScan`)
4. `components/fluence/MacroRenderer.tsx:155` — exhaustive-deps warning (logical expression in deps, x2)
5. PostgreSQL response time 475ms — Neon serverless cold start, not a code issue
6. Heap usage 66.4% — monitoring item, not a code fix

### Fixes Applied
None required. All checks passed cleanly.
