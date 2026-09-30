# Authenticated E2E Verification — 2026-09-24

## Objective
Run the AUTHENTICATED Playwright E2E suite for real against a live isolated backend
(port 8081) that a teammate had already provisioned, and report actual numbers —
not aspirational ones. This suite had never executed (0 of the suite run) before
this verification.

## Stack stood up

| Component | Value |
|---|---|
| Backend | already running, `http://localhost:8081`, `dev` profile, isolated Postgres :55432, Flyway v331, `DEMO_CREDENTIALS_ENABLED=true`, rate limiting OFF — **not touched, per instruction** |
| Frontend | started fresh: `npm run dev` on port 3000, `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`, `BACKEND_ORIGIN=http://localhost:8081`, `ALLOW_INSECURE_RELEASE_API_URL=true`, `NEXT_PUBLIC_ALLOW_INSECURE_API_URL=true`, `API_DOCS_URL=./openapi-snapshot.json` — launched via the harness's background-process mechanism so it survives the tool call |
| Port 8080 | left alone — confirmed occupied by unrelated PID 92233, never touched |

### End-to-end confirmation before running tests
- `http://localhost:3000/auth/login` → HTTP 200.
- Direct backend login (`admin@nulogic.io` / `Welcome@123`) → HTTP 200, `HR_ADMIN` + full permission set returned.
- Scripted login **through the frontend's same-origin proxy** (`POST http://localhost:3000/api/v1/auth/login`, `fayaz.m@nulogic.io` / `Welcome@123`) → HTTP 200, `roles:["SUPER_ADMIN"]`, and `__Host-hrms-access` / `__Host-hrms-refresh` cookies correctly set on `localhost` (same-origin, so the browser will store and send them — this was the thing most likely to silently break the whole suite, and it didn't).

## What was actually run

The full suite has **2,376 `test()` calls** across `e2e/*.spec.ts` (grep count; the
2,886 figure quoted in the task is not what's on disk in this checkout — flagging
the discrepancy rather than assuming which is stale). Running all of it was not
attempted — CI itself only gates a curated ~278-test subset for the same reason
(documented staleness from the Studio Slate v2 redesign). I ran that same curated
CI subset for real, then did a second, isolated confirmation pass on every test
that failed in the first pass.

**Pass 1 — the CI gate subset**, `e2e/app-switcher.spec.ts navigation.spec.ts
dashboard.spec.ts sub-app-smoke.spec.ts attendance.spec.ts nu-rbac.spec.ts
my-space.spec.ts`, `--project=setup --project=chromium --workers=2 --retries=0`,
19.0 minutes:

| Result | Count |
|---|---|
| Passed | 238 |
| Failed | 33 |
| Skipped | 3 |
| Did not run | 4 |
| **Total attempted** | **278** |

**Pass 2 — isolated re-run of the 33 failures**, `--workers=1 --retries=0` (removes
parallel-worker contention as a variable), 14.3 minutes:

- 15 of the 33 (45%) failed only with `Error reading storage state from
  playwright/.auth/user.json: ENOENT`. These did **not** reproduce in isolation —
  confirming this cluster was a **test-harness race**, not a real failure: with
  2 workers, `sub-app-smoke.spec.ts` tests started reading `playwright/.auth/user.json`
  concurrently with a filesystem window where the file was momentarily absent.
  This is an artifact of my run configuration, not a product or suite defect.
- The remaining 18 reproduced as **11 distinct real failures** (nu-rbac's
  `UC-EMP-009` did not execute in either pass — it's gated behind an earlier
  test in the same serial `describe` block, so it never got a real attempt).

## Top failure clusters (real, reproduced twice)

### 1. `LoginPage` page-object is broken against the current login form — TEST STALENESS (6 failures)
`navigation.spec.ts:39,59,69` (`should navigate to Employees/Attendance/Projects`)
and `navigation.spec.ts:569,589,610` (App-Aware Sidebar suite) all drive login via
`e2e/pages/LoginPage.ts`, not the `loginAs()` API-backed helper that `auth.setup.ts`
uses successfully. Decisive line:
```
TimeoutError: locator.fill: Timeout 15000ms exceeded.
waiting for locator('input[type="email"]')
```
The email input can't be found at all, so the three sidebar tests loop `navigated
to "http://localhost:3000/auth/login"` repeatedly and blow their 120s budget.
The `loginAs()` helper (used by every passing test) works fine against the same
login page — so this is the older `LoginPage` object drifting from the current
markup, not a broken login flow. **Fix in the test, not the app.**

### 2. Attendance page selectors don't match current markup — mostly TEST STALENESS, one worth a product look (4 failures)
`attendance.spec.ts:22,138,183,236`. Decisive lines:
```
locator('h1').filter({ hasText: /Attendance|My Attendance/i }) — element(s) not found
expect(hasTotalHours || hasPresentDays).toBe(true) — Received: false
expect(hasRequestButton).toBe(true) — Received: false
getByRole('heading', { name: /Team Attendance/i }) — strict mode violation: resolved to 2 elements
   (an <h1>"Team Attendance" and an <h3>"Team Attendance Records" both match)
```
The strict-mode-violation one (`should display team attendance controls`) is a
textbook post-redesign selector-too-loose case — TEST STALENESS. The other three
(heading not found, stats not visible, regularization button not found) could be
either a redesigned attendance page or a genuine gap; I did not have budget to
diff against the live DOM to tell which — **flagging as needs-triage**, not
declaring either way.

### 2b. Storage-state race under 2 parallel workers — ENVIRONMENT (15 failures in pass 1, 0 on retry)
Covered above. Not a real defect; would not reproduce with `workers=1` or with a
small stagger, and does not indicate anything about product or test quality.

### 3. NU-Grow rail navigation doesn't land on `/performance` — needs triage (1 failure)
`app-switcher.spec.ts:74`, `navigating to NU-Grow via the rail switches the active app`:
```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
waiting for navigation until "load"
```
Clicking the Grow rail icon never reaches `/performance` within 20s. Reproduced
identically on isolated re-run (1.2m — it waits out the full test timeout on top
of the assertion timeout). Could be a renamed route, a slow-loading target page,
or a real navigation bug — **flagging as needs-triage**, did not have budget to
trace further.

### 4. `nu-rbac.spec.ts` `UC-EMP-009` never executes (1 "failure")
Both passes: the test is inside a serial-mode `describe` where an earlier case
failed/was skipped, so Playwright never attempts `UC-EMP-009` itself. Not
independently diagnosable without unblocking the earlier case in that block —
noted, not chased further given time budget.

## Judgement on genuine coverage established

This is the first real execution of any meaningful slice of this suite, and it is
a materially useful result:

- **238 tests genuinely passed** against a live authenticated backend, covering
  real user flows across all 4 sub-apps (HRMS, Hire, Grow, Fluence), the app
  switcher, dashboard, RBAC-gated routes, and attendance — using real login,
  real cookies, real permission checks, real API responses. This is not a smoke
  test; SUPER_ADMIN warmed 17 protected routes in `auth.setup.ts` and every
  downstream test rode that real session.
- The **true defect signal is small**: 6 failures trace to one stale page-object
  helper, most of the rest are one redesign-drifted selector file
  (`attendance.spec.ts`) plus 2 items needing manual triage. None of this
  suggests the *application* is broadly broken — it suggests the older,
  non-`loginAs()` corner of the test suite has rotted since the last redesign,
  which is exactly what the CI workflow's own comments already flagged
  (`~200 failures from redesign staleness`, though my curated-278 run found far
  fewer real ones — most of the historically-feared 200 range likely lives in
  the ~2,100 tests outside the curated CI gate that I did not run).
- **What this does NOT establish**: coverage of the remaining ~2,100 tests
  outside the curated CI gate (visual regression, mobile projects, the full
  RBAC matrix beyond EMPLOYEE, PSA/workforce, payroll, other sub-app-specific
  suites). Given the time budget, I ran the representative, CI-proven subset
  twice (once for numbers, once to confirm which failures are real) rather than
  attempting the full ~2,376-test suite, which was explicitly allowed
  (instruction #6).

## Explicitly did not do
- Did not modify application source, test assertions, or security settings.
- Did not touch `faylo-sdlc/`, did not commit, did not point at prod.
- Did not touch PID 92233 or port 8080.
- Did not restart or reconfigure the backend on 8081.
