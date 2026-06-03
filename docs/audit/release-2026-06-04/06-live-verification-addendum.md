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

## BLOCKERS found (product / repo state — NOT environment)

1. **Repo is mid-refactor with broken, uncommitted work.** 10 backend files modified & inconsistent:
   `ProjectEmployee.deactivate()` changed to require `LocalDate`, but `ProjectService` (lines 201, 317)
   still calls it no-arg → **working-tree main does not compile.** Modified set:
   AdminService, SystemAdminService, CompensationService, PayrollRunService, ProjectService,
   PulseSurvey, ProjectEmployee (+ 3 tests below).
2. **HEAD's test sources do not compile.** `GlobalExceptionHandler` now requires
   `(MeterRegistry, TenantTimeService)`, but 3 committed test files still use the 1-arg form:
   `GlobalExceptionHandlerTest` (L44), `RestrictedHolidayControllerTest` (L57), `CompOffControllerTest` (L58).
   The fixes exist ONLY as uncommitted working-tree edits → **a clean CI checkout fails
   `mvn verify` at `test-compile`.**
3. **Earlier "tests passed" was a false signal** — Maven reused stale `target/` classes; a clean
   worktree build (HEAD) fails to compile tests as in (2).

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

## Honest readiness (revised)

- For **initial internal pilot**: ~70/100 — **down from the ~85 code-level estimate**, because a clean
  checkout of HEAD does not build (tests) and the working tree is mid-broken-refactor. The frontend is
  genuinely strong; the backend has an unfinished, uncommitted change sitting on top of it.

## #1 action before any further gating

Finish and commit the in-flight refactor so that on a **clean checkout**:
`cd backend && ./mvnw -DskipTests=false clean verify` compiles BOTH main and tests. Until
`git clean checkout → verify` is green, the runtime/migration/E2E gates cannot be trusted.

## Cleanup note

Left running for follow-up (safe to remove): git worktree at
`~/.claude/jobs/350d8506/tmp/verify-wt`, docker container `nuaura-pg-fresh`. Local boot used a fresh
throwaway Postgres only — **Neon dev was never touched.**
