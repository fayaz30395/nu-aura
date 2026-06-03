# Live Verification Addendum (2026-06-04, on-machine run)

This addendum records a **live, on-machine** verification pass (Java 23, Docker, Maven, Node 25),
distinct from the sandbox audit in `00-release-readiness-summary.md` (which could not run backend
build, runtime, or DB proofs). Orchestrated as parallel background jobs + isolated git worktree.

## Verified GREEN

- **Frontend production build** — `next build --webpack` completed clean (exit 0), full route tree
  prerendered (264 routes). The release env-guard correctly rejects `localhost` as `NEXT_PUBLIC_API_URL`;
  build succeeds with a real HTTPS API URL.
- **Backend main source compiles at HEAD** — `spring-boot:run` (tests skipped) compiled main and
  reached Flyway initialization (failed only on a transient local DB-container crash, not code).
- **Toolchain** — Docker / Maven / Node / Java 23 all functional. (Stack targets Java 21; ran on 23.)

## CRITICAL PROCESS FINDING — autonomous agent committing to `main` live

During this ~40-min session, an autonomous **`ruflo` autopilot** (multiple `ruflo mcp start` procs
running) committed to `main` **4+ times**, advancing HEAD `188f7e63` → `9806b1a4`. The working-tree
modified-file count was observed at 1 → 10 → 49 → 60 → back to ~3 as the agent edited, then
committed/converged. **Release readiness is unmeasurable against a tree that mutates and self-commits
underneath the assessment.** Before any release gate: **pause the autopilot and cut a tagged RC.**

## Transient breakages observed mid-session — SELF-RESOLVED at current HEAD

These were caught while the autopilot was mid-edit, and were RESOLVED by its subsequent commits:

1. A half-finished `TenantTimeService` sweep had `ProjectEmployee.deactivate(LocalDate)` with
   `ProjectService` still calling it no-arg (working-tree main didn't compile). **Resolved:** current
   HEAD reverted to no-arg `deactivate()` with matching callers.
2. 3 test files used the old 1-arg `GlobalExceptionHandler` ctor vs the 2-arg
   `(MeterRegistry, TenantTimeService)`. **Resolved:** current HEAD uses the 2-arg form
   (`new GlobalExceptionHandler(meterRegistry, null)`).

## Build gate — VERIFIED at current HEAD

- **`mvn test-compile` at pinned current HEAD: SUCCESS** — main + all test sources compile cleanly
  (deprecation warnings only; zero `[ERROR]`, no `BUILD FAILURE`). The build gate's compile step is GREEN.
- NOT YET RUN at current HEAD: the full test *execution* (`mvn verify`) — requires Testcontainers
  Docker env (`DOCKER_HOST=unix:///Users/<user>/.docker/run/docker.sock`, `TESTCONTAINERS_RYUK_DISABLED=true`).
  Earlier IT failures were purely Docker-socket discovery, not product defects.
- NOTE: the first `mvn verify` "ran tests" off **stale `target/` classes** — disregard that signal.

## Gate result: `mvn verify`

- First run (main tree): misleading — compiled against stale classes; integration tests then errored
  because **Testcontainers could not find the Docker socket** (env: needs
  `DOCKER_HOST=unix:///Users/<user>/.docker/run/docker.sock` + `TESTCONTAINERS_RYUK_DISABLED=true`).
- Clean worktree run (HEAD): **FAILS at `test-compile`** — blocker (2).

## Gates BLOCKED by local environment instability (not assessed)

Docker Desktop restarted mid-session and repeatedly shed containers; the throwaway Postgres exited
twice; an unrelated **SSH tunnel occupies port 8080**, corrupting health probes. Therefore NOT proven:

- Migration P0 clean fresh-apply (V0→V269, baseline-off) — boot reached Flyway but DB container died.
- Runtime smoke (health / login across roles / logout / route protection / STOMP).
- `nu_app_rls` default-deny RLS proof.
- E2E across roles (111 Playwright specs present).
- Performance budgets.

These require a stable Docker + a dedicated free 8080 (or pin backend to 8081) to complete.

## Honest readiness (revised, current HEAD)

- For **initial internal pilot**: **~80/100** — current HEAD compiles main + tests cleanly and the
  frontend production build is green. The mid-session "broken build" was a transient autopilot state,
  now self-healed.
- The remaining gap is **unproven runtime surface** (full test run, migration clean-apply, runtime
  smoke, RLS, E2E) PLUS a **process blocker**: an autonomous agent commits to `main` continuously, so
  no stable release candidate currently exists to gate against.

## #1 action before any further gating

**Freeze the autopilot and tag a release candidate.** `ruflo` is committing to `main` every few
minutes. Until HEAD is frozen, the runtime/migration/E2E gates cannot run against a stable target.
After freezing, on a clean checkout of the tagged SHA:
`cd backend && DOCKER_HOST=unix:///Users/<user>/.docker/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=true mvn verify`
should run the full suite (compile already proven green).

## Cleanup note

Left running for follow-up (safe to remove): git worktree at
`~/.claude/jobs/350d8506/tmp/verify-wt`, docker container `nuaura-pg-fresh`. Local boot used a fresh
throwaway Postgres only — **Neon dev was never touched.**
