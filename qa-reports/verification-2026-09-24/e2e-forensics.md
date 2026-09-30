# E2E Suite Forensics — Fitness as Mandatory Release Gate

**Scope:** `frontend/e2e/` (120 spec files, cited as 2,886 tests). Analysis-only —
no application code modified, no commits/branches/pushes, `faylo-sdlc/` untouched.
Feeds Faylo decision DC-2G4FXYA98AVS.

Builds on already-verified session context: frontend typechecks clean, backend
compiles clean; demo passwords are EXPIRED (backend returns 400 "password has
expired" for the correct demo password, 401 for a wrong one); prior run died at
test ~415/2886 when the local `next dev` server crashed, and every failure after
that was a ~200ms connection error (cascading, not real evidence).

---

## 1. How does the suite start the app?

Three Playwright configs, three different app-boot strategies:

- **`playwright.config.ts`** (default/local): `webServer.command: 'npm run dev'`,
  `baseURL` defaults to `http://localhost:3000`. Playwright boots `next dev`
  itself and waits on it.
- **`playwright.live.config.ts`**: extends the base config but sets
  `webServer: undefined` — it does NOT start anything; `baseURL` defaults to
  `http://localhost:3002`. Caller is responsible for already having a server up
  (this is what CI uses, after manually booting backend+frontend as job steps).
- **`playwright.production.config.ts`**: also `webServer: undefined`, and
  **refuses to run at all** if `PLAYWRIGHT_BASE_URL` is unset (`throw new
  Error(...)` at module load — "Refusing to default to a live/stale
  deployment"). Separate `production-chromium` / `production-mobile` projects
  matching only `*.production.spec.ts`, no `setup` dependency.

## 2. Which environment/DB does each config target?

- `playwright.config.ts` → local `next dev` frontend against whatever backend
  `NEXT_PUBLIC_API_URL` resolves to (defaults to `http://localhost:8080/api/v1`
  per `e2e/fixtures/auth.ts`) — i.e., a local backend + local Postgres/Redis.
- `playwright.live.config.ts` → whatever is already running on
  `localhost:3002` (or `PLAYWRIGHT_BASE_URL`). In `.github/workflows/e2e.yml`
  this is the CI job's own ephemeral, Flyway-seeded Postgres 16 + Redis 7 +
  freshly built backend jar + `next start` frontend, all on `localhost:3000`
  (not 3002 — the workflow overrides `PLAYWRIGHT_BASE_URL=http://localhost:3000`
  at the `npx playwright test` step).
- `playwright.production.config.ts` → explicit external target via
  `PLAYWRIGHT_BASE_URL`, i.e. the real Vercel/Railway deployment. No local
  services involved.

## 3. Which accounts does it authenticate with? Shared demo password?

`e2e/auth.setup.ts` is a Playwright `setup` project that runs once, logs in as
`demoUsers.superAdmin` (`fayaz.m@nulogic.io`) via `e2e/fixtures/helpers.ts`
`loginAs()`, warms ~16 protected routes, then persists
`playwright/.auth/user.json`. `e2e/fixtures/auth.ts` provides an alternate
`authenticatedPage` fixture that logs in via `POST /api/v1/auth/login`
directly (defaults to the same `demoUsers.superAdmin`, password from
`DEMO_PASSWORD`).

`e2e/fixtures/testData.ts:7` — `export const DEMO_PASSWORD = 'Welcome@123'` —
**all** demo users in `testData.ts` (16+ accounts) share this one password.
This is the exact password confirmed expired against the local/dev backend in
prior verification. One outlier account (`testData.ts:235`) uses a distinct
password `Test@1234567` (not exercised by the standard fixtures).

## 4. Are expired demo credentials the blocker for the WHOLE suite?

**Yes — for the local/default config, the whole suite, not just auth specs.**

`playwright.config.ts` defines 5 real test projects (`chromium`, `firefox`,
`mobile-chrome`, `mobile-safari`, `tablet`), and **every one of them declares
`dependencies: ['setup']`** (lines 102, 112, 122, 132, 143). Playwright will not
run a project's tests until its dependency project passes. `setup` is
`auth.setup.ts`, which fails immediately at `loginAs()` with the expired
password. Consequence: **no test in any of the 5 projects can even start** —
this is a hard gate failure, not 120 independent specs each hitting their own
login wall.

Confirmed no spec opts out of this dependency chain via a `storageState`
override at the config level (none exists — that's controlled by `projects[]`,
not per-spec). At the per-spec level, exactly **5 of 120 spec files**
(`e2e/generated/rbac-redirect.spec.ts`, `e2e/production-readiness.production.spec.ts`,
`e2e/all-demo-users-smoke.spec.ts`, `e2e/nu-hire-grow-interaction.spec.ts`,
`e2e/auth-comprehensive.spec.ts`) call `test.use({storageState: {...}})` to
manage their own auth state instead of relying on the shared
`playwright/.auth/user.json` — but 4 of those 5 still log in with the same
demo credentials internally (only the production-readiness public-route block
is credential-free, see §8). So effectively **all 120 specs / ~2,886 tests
are blocked** under the default local config; it is a single shared-fixture
failure cascading everywhere, not a per-spec count.

## 5. Are external services required?

`grep` across `e2e/*.spec.ts` for Google Drive / Kafka / Elasticsearch /
DocuSign references found only 3 files with any mention:
`file-upload-roundtrip.spec.ts`, `notifications.spec.ts`, `system-checks.spec.ts`
— these appear to assert on system/health surfaces or file-upload UI, not
live external-provider calls. Per prior session memory, Kafka is DORMANT in
this deployment (outbox pattern is the live path — `APP_KAFKA_ENABLED=false` is
set explicitly in the CI workflow), and CI explicitly disables Elasticsearch
autoconfig too. **External services are not a suite-wide dependency** — the
suite is designed to run with Kafka/ES off. Google Drive/DocuSign were not
found referenced in any spec at all.

## 6. Is the failure deterministic?

Yes. The credential failure is deterministic: the backend password-expiry
check is a stored account-state fact (`password_expires_at` older than the
90-day max-age policy per `CLAUDE.md` security config), not a flaky timing
condition — same input (correct password) reliably returns HTTP 400 with the
same message. Verified independently in this session: the prod-smoke subset
(§8) that does NOT depend on login passed identically on two consecutive runs
(5/5 both times), confirming the harness itself is stable when the auth
blocker is out of the picture.

## 7. How far does the suite actually get before infra death?

Per established context: the last full local run reached test ~415/2886
before the `next dev` server itself crashed; everything after that point
failed in ~200ms (connection-refused pattern), which is cascading infra
death, not test signal. Combined with §4, the *current* state is worse than
that prior run: the suite now fails at test 0 (the `setup` project) before
any of the 5 real projects begin, because the demo password has since
expired. No specs execute at all under the default local config today.

## 8. Can any meaningful subset run TODAY without valid credentials? — RAN IT

Yes. `e2e/production-readiness.production.spec.ts` has a `storageState: {cookies:
[], origins: []}` block covering `CRITICAL_PUBLIC_ROUTES` (`/`, `/auth/login`,
`/about`, `/features`, `/pricing`) that needs zero credentials — it only
checks HTTP status < 400, that the body renders non-empty, and that there are
no console/page/5xx errors.

Ran it for real against the live prod frontend
(`https://hrms-frontend-vert.vercel.app`) using `playwright.production.config.ts`:

```
PLAYWRIGHT_BASE_URL=https://hrms-frontend-vert.vercel.app \
  npx playwright test --config=playwright.production.config.ts \
  --project=production-chromium -g "public route renders"

Run 1: 5 passed (6.1s)
Run 2: 5 passed (6.8s)   ← re-run for determinism, identical result
```

All 5 public routes render clean with no console errors, no page errors, no
5xx responses, both times. This is real, current, reproducible evidence: the
deployed frontend itself is healthy for unauthenticated routes. It is a very
small slice (5 of ~2,886 tests, no protected-route/RBAC/business-logic
coverage) — it proves the app isn't down, nothing more.

The other two `test()` blocks in that same file
(`authentication and protected critical routes...`, `employee direct URL
access is denied...`) both `throw` immediately if `E2E_PROD_SUPERADMIN_EMAIL`
/ `E2E_PROD_PASSWORD` / `E2E_PROD_EMPLOYEE_EMAIL` env vars are absent, and
explicitly refuse to run with the shared demo password even if it weren't
expired (`Refusing to run production smoke with the shared demo password`) —
so credentialed production smoke was not attempted, consistent with the "no
secret values" constraint on this task and the missing env vars.

## 9. Would CI reproduce the same problem?

**No — CI is architecturally immune to this specific expired-password issue,
but for a different reason it is *also* not currently a reliable gate.**

`.github/workflows/e2e.yml` ("E2E (isolated stack)"):
- Triggers only on `workflow_dispatch` or a PR labeled `e2e` — **not on every
  push**, so it is not currently wired as an always-on mandatory gate at all.
- Boots a fully ephemeral Postgres 16 + Redis 7, runs Flyway migrations fresh,
  and sets `DEMO_CREDENTIALS_ENABLED: 'true'` on a throwaway DB every run.
  A brand-new seed has no 90-day password-age history to trip the expiry
  check, so this exact failure mode would not reproduce there.
- But the workflow's own comments are a direct, pre-existing verdict on
  suite health, independent of this credential issue:

  > "NARROWED GATE (2026-06-24): 3 verified-green spec clusters only. The
  > full 107-spec functional suite has ~200 failing tests from redesign
  > staleness and is not yet safe to gate PRs on."

  The actual CI run command only executes **7 of 120** spec files
  (`app-switcher`, `navigation`, `dashboard`, `sub-app-smoke`, `attendance`,
  `nu-rbac`, `my-space`) with visual-regression tests explicitly excluded
  (Linux CI vs. committed macOS/chromium-darwin baselines). There's an open
  tracking TODO to "restore full 107-spec E2E gate." This matches prior
  session memory of a CI run: 94 pass / 18 flaky / 12 fail — on that narrowed
  7-file subset, not the full suite.

So: CI would not hit the *password-expiry* blocker, but it independently
confirms the full suite is not gate-ready — that determination was already
made and documented by whoever authored the workflow, before this forensics
pass.

## 10. Verdict

**Not suitable as a mandatory release gate today, on two independent,
stacked grounds:**

1. **Local/default execution is fully blocked.** Every test in every
   non-production project depends on a `setup` project that fails 100% of
   the time on expired shared demo credentials — the suite cannot produce a
   single real result locally in its current form. This is a credential
   lifecycle problem, not a test-design problem, and is mechanically simple
   to fix (rotate/extend the demo accounts, or point `E2E_AUTH_PASSWORD` at
   a non-expiring service account) — but until fixed, "run the e2e suite"
   locally yields zero signal, only a setup-stage failure.

2. **Even with credentials fixed, the suite's own CI workflow says it isn't
   gate-ready.** The authors of `.github/workflows/e2e.yml` already
   narrowed the enforced set to 7 of 120 files and left an explicit TODO
   because ~200 tests fail from "redesign staleness" on the full run. A
   suite whose own maintainers have declared ~200 failures out of scope is
   not something to flip to mandatory without first closing that gap — doing
   so would either block all releases or force the gate to be routinely
   overridden, defeating the purpose of a mandatory gate.

**What must change before this can be a mandatory gate, in order:**

1. Fix the credential blocker: rotate the demo account passwords (or extend
   their max-age / carve out a policy exception for E2E service accounts) so
   `auth.setup.ts` can log in at all. Without this, nothing else below can
   even be verified.
2. Reconcile the "~200 failing from redesign staleness" backlog referenced in
   the CI workflow comments — either fix those specs or formally quarantine
   them (skip + tracked issue) so the gate's pass/fail signal is trustworthy.
3. Wire the workflow to run on every PR (not just `workflow_dispatch`/`e2e`
   label) once (1) and (2) hold, and expand the gated set from the current
   7-file narrow slice back toward the full suite, sharded if needed for the
   60-minute CI timeout.
4. Add a scheduled credential-rotation check (or a non-expiring E2E service
   account) so this exact failure mode — a mandatory gate silently going
   100% red because a password aged out — cannot recur once the suite is
   made mandatory.

Until (1)-(3) are done, the honest status of this suite is: **not run, not
running, and by its own CI comments, known not to fully pass even when it
does run.**
