# NU-AURA E2E Assessment — Workstream J

Generated 2026-09-22. **Status: BLOCKED / INCONCLUSIVE for a clean classified result.** No
fabricated pass/fail numbers below — per the explicit no-false-greens rule, an unclassifiable
run is reported as BLOCKED, not guessed at.

## Discovery (completed)

- `frontend/e2e/*.spec.ts`: **119 spec files** — this session's own count, not the historical
  "5774" or "2886" figures from prior docs (those were almost certainly total test-case counts
  across all browser projects × specs, not file counts; not reused here per Rule 1).
- `playwright.config.ts`: `testDir: './e2e'`, `baseURL: http://localhost:3000`, `workers: 4`
  locally, `retries: 1` locally / `2` in CI, global test timeout 120s.
- Real auth setup exists (`e2e/auth.setup.ts`), API-backed (bypasses the UI login form
  deliberately, per its own comment, so non-auth suites aren't blocked by login-form bugs),
  authenticates as SUPER_ADMIN for broadest downstream coverage, its own timeout set to 30
  minutes with a comment acknowledging "dev auth can stall behind Neon/Kafka/Hikari recovery in
  local E2E" — i.e. this exact slowness risk is already a known, documented property of this
  test suite's local-dev mode, not a surprise.
- Notification E2E: `e2e/notifications.spec.ts` and `e2e/realtime-notification-delivery.spec.ts`
  both exist. Read the latter in full — it's genuine, solid same-device coverage: logs in,
  confirms a live WebSocket connection (`data-ws-connected="true"` attribute), triggers a real
  backend broadcast via authenticated fetch, asserts the notification appears in the UI **without
  a page reload** (an injected marker variable is checked to survive), and asserts the message
  content matches. **Confirmed zero cross-device/multi-context coverage** — the test uses exactly
  one Playwright `page` fixture, one browser context, throughout.

## Execution: attempted twice, both blocked by environment slowness

Selected a bounded, mostly-non-mutating slice: `auth.spec.ts`, `auth-flow.spec.ts`,
`navigation.spec.ts`, `dashboard.spec.ts`, `rbac-tenant-isolation.spec.ts`,
`rbac-employee-boundaries.spec.ts`, `rbac-manager-boundaries.spec.ts` — 7 files. Deliberately
excluded `auth-bruteforce-lockout.spec.ts` (would risk locking demo accounts still needed for
live regression testing elsewhere in this campaign) and `tmp-debug-rbac.spec.ts` (scratch file).

**Attempt 1** (`--reporter=list`, output piped to a background task file): ran roughly 5 minutes,
produced NO captured stdout (a tool-level output-capture race with the backgrounding mechanism,
not a test failure) — the only usable evidence is the `test-results/` artifact directory, which
shows a `-retry1` folder for nearly every test in the slice (32 result dirs after the first
partial check). This is NOT reliable pass/fail evidence on its own: Playwright's trace-retention
config can keep a first-attempt trace for debugging even when the retry subsequently passes —
directory presence alone doesn't distinguish "failed then passed on retry" from "trace kept
regardless of outcome."

**Attempt 2** (`--reporter=json` to a controlled file, explicitly to get a parseable summary):
ran for **over 35 minutes** — worker processes stayed genuinely active throughout (confirmed via
repeated `ps` checks showing fresh PIDs and non-zero CPU%, not a hung/zombied state) but never
completed. After 35+ minutes against a 7-file "bounded" slice with a 120s per-test timeout and
4 workers, this is well outside any reasonable bound for what was meant to be a quick
representative check. **Killed the run** (`pkill -9`) rather than let it consume the rest of the
session's time budget. Confirmed backend (200) and frontend (200) both still healthy immediately
after the kill — the app itself did not crash; whatever caused the slowness didn't take the
services down.

**Final artifact check**: after both attempts, `test-results/` contains a `-retry1` folder for
essentially every test across all 7 spec files, but **no `.last-run.json` or completed JSON
report was ever written** — the kill happened before any summary writer flushed. There is no
reliable way to extract per-test PASS/FAIL from what's on disk.

## Root-cause hypothesis for the slowness (not confirmed)

Not investigated further given time already spent, but worth recording as a lead: this session
ran an unusually large number of concurrent services for an extended period (Postgres, Redis,
Kafka+Zookeeper, the backend JVM, the Next.js dev server, plus this session's own extensive
direct `curl`/`psql` testing against the same backend during Workstreams A and B) on what is
almost certainly a single dev machine. Next.js dev-mode (`next dev --webpack`, confirmed from
`package.json`) also recompiles routes on first navigation, which is measurably slower than a
production build — combined with `auth.setup.ts`'s own acknowledged Neon/Kafka/Hikari-recovery
stalling risk, a 4-worker parallel Playwright run hitting many distinct first-visited routes
simultaneously against a cold dev-mode server is a plausible, non-exotic explanation. Not
verified — flagging as a hypothesis for whoever runs this suite next, not a conclusion.

## What this means for Workstream J

- **Coverage exists**: real spec files for auth, RBAC (including tenant-isolation and
  employee/manager boundary specs — directly relevant to this campaign's Workstream B), and a
  solid same-device notification test. This is not a coverage gap in what's *written*.
- **Whether the current app state actually passes that coverage is UNVERIFIED this pass.** Not
  PASS, not FAIL — genuinely BLOCKED, because no clean run completed.
- **Cross-device notification testing (J6): NOT YET VERIFIED**, confirmed as a real gap (not
  speculated) — no existing test uses more than one browser context. Did not build new harness
  for it this pass — the environment couldn't even complete the *existing* bounded suite in
  reasonable time, so adding new test infrastructure on top of an unstable execution environment
  would not have produced trustworthy evidence either.

## Recommendation

Before any further E2E work: run this suite against a machine/CI environment with the resource
headroom the isolated-stack GitHub Actions workflow (`.github/workflows/e2e.yml`, referenced in
this repo's own prior sessions) was specifically built for — ephemeral, dedicated Postgres+Redis+
backend+frontend, not a long-lived local dev machine carrying an entire release-readiness
campaign's worth of concurrent state. That CI path is very likely to produce a clean, trustworthy
result far faster than repeating local attempts.
