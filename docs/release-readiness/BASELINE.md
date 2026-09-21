# NU-AURA Release Baseline — Phase 0

Generated: 2026-09-21, read-only discovery only, no code modified in this pass.

## 1. Git / checkout state

- Branch: `main`
- HEAD: `30e58a4a8b65bfa3f00c6dd8a935afded3a99960` (2026-09-21 10:30:02 -0300, "ADLC")
- Remotes: `fayaz-deen` (Fayaz-Deen/nu-aura), `fayaz30395` (fayaz30395/nu-aura) — dual-push setup
- **Uncommitted on `main`** (this session's unfixed work, NOT yet committed):
  - Backend: `ComplianceController.java`, `ComplianceService.java`, `LeaveRequestService.java`,
    `TenantProvisioningService.java`, `ApprovalEscalationJob.java`, `Permission.java`,
    `RoleHierarchy.java`, `CompetencyRequirement.java`, `CompetencyFrameworkRepository.java`
  - Backend tests: `ComplianceServiceTest.java`, `LeaveRequestServiceTest.java`,
    new `ApprovalEscalationJobTest.java` (untracked)
  - New migration: `V329__seed_employee_compliance_self_permissions.sql` (untracked)
  - Frontend: `auth/login/page.tsx` (R1 fix)
  - Faylo ledger/story files touched (from this session's earlier faylo work)
  - Stray untracked: `.env.bak2/.bak3`, `.playwright-mcp/*.yml` — scratch, not to be committed
- **No other active session collision detected** — `git log --all --since="2 hours ago"` empty.
  However: local + remote branches show **prior parallel-agent activity exists on this repo**
  (`claude/parallel-qa-dev-orchestrator-X8F3W`, multiple `codex/*` branches on `fayaz30395`) —
  none currently ahead of or conflicting with `main`, but confirms this repo has a real history
  of session collisions per the operating rules; treat any future concurrent work with worktree
  isolation.
- Local branches beyond `main`: `chore/route-coverage-check`, `feat/storage-disable-escape-hatch`,
  `fix/dead-nav-pages`, `fix/perf-review-state-machine`, `push/both-repo-sync` — none merged,
  disposition not re-verified this pass (deferred to Workstream L).

## 2. Build / test status (current HEAD + uncommitted fixes)

- Backend `mvn compile`: **PASS** (clean, 0 errors)
- Backend `mvn test-compile`: **PASS** (clean, 0 errors)
- Backend full test suite: **NOT YET RUN** this pass (focused tests only — LeaveRequestServiceTest
  40/40, ComplianceServiceTest 21/21, ApprovalEscalationJobTest 1/1, all passing per this
  session's fix-verification cycles) — Workstream I to run the full suite.
- Frontend `tsc --noEmit`: PASS on the one file touched this session; full-project typecheck not
  re-run this pass.
- E2E full suite: last known state (from prior session, **not re-verified this pass**): 94 passed /
  18 flaky / 12 failed on isolated-stack CI. Re-run required — Workstream J.

## 3. Live environment (local dev, this session)

- Backend: UP, `nuaura-pg-fresh` (local docker, port 5433), Redis (docker, port 6380), Kafka
  enabled/outbox disabled override. Health: application/database/db/diskSpace/liveness/ping/
  redis/ssl/webhook all UP, **mail DOWN** (Mailpit container not running — known, not a code bug).
- Frontend: UP (localhost:3000, 200).
- **This is NOT the deployed production/staging environment.** Deployed Railway backend / Vercel
  frontend versions were **not queried this pass** (no Railway/Vercel MCP session established yet
  in this conversation) — required before any real deployment-status claim. Prior session memory
  claims Railway deploy `5eda585a` / Flyway V316 as of 2026-06-25, but per Rule 1 that is a
  hypothesis only, superseded by local HEAD now being far ahead (local Flyway at V329).

## 4. Database migration state (local dev DB)

- Local `nuaura-pg-fresh`: Flyway HEAD = **V329**, all successful.
- Deployed DB migration version: **unknown this pass** — not queried.

## 5. Notification architecture (confirmed this session, code-read)

Real path: `LeaveRequestService` → direct synchronous call to `WebSocketNotificationService` →
Redis-backed Spring STOMP (`/user/{id}/queue/notifications`, native multi-session fanout) +
best-effort DB persistence (`Notification` entity, failure only WARN-logged, never rolls back).
**Kafka/outbox are enabled in this environment but play zero role in leave notifications** — a
separate `LeaveApprovedEvent`/`LeaveRejectedEvent` path exists but has exactly one listener
(`PayrollIntegrationListener`, LOP deduction only, no notification responsibility).

Known gaps (found, not yet fixed):
- Push can fire before the enclosing transaction commits — a rollback after push could leave a
  user notified of a decision that didn't persist. Not yet reproduced under controlled failure.
- No idempotency/dedup key on `Notification` — a retried call could create a duplicate.
- Persistence failure path is WARN-and-swallow; a user disconnected at that exact moment loses
  the notification permanently with no server-side record.

## 6. Security status (partial, from this + prior sessions — NOT re-audited fresh this pass)

- `demoCredentialsEnabled` defaults **false** in `application-prod.yml`/`application.yml` (secure
  default, explicit opt-in required) — code-level gate confirmed this pass. **Live Railway env var
  value not re-verified this pass** (prior memory claims it was set explicitly false 2026-06-24;
  treat as unconfirmed until re-checked against the actual deployed environment).
- RLS: fail-closed confirmed this session across two real tenants (app-level + DB-level, see
  Nu-Aura.md 2026-09-21 entry) for the `employees` table specifically. Not yet re-verified for
  payroll, knowledge, notifications, documents (Workstream B).
- CSRF: confirmed live this session (double-submit `X-XSRF-TOKEN`, correctly enforced).
- Auth rate limiting: confirmed live this session (5/min on `/auth/login`, correctly enforced,
  no username-enumeration difference between wrong-password and nonexistent-user).
- Secrets-in-git-history scan: **not run this pass** — Workstream A.

## 7. Faylo state

- `epics=2 stories=179 Done=179 reviews=222 open_decisions=0`
- 4 stories still carry stale "In-flight: N uncommitted change(s)" / branch-ahead annotations
  in their titles (`US-2FWT73TFJBWK`, `US-2FWT73TJ3HV5`, `US-2FWT73TNNDP4`, `US-2FWT73TTR4D3`) —
  these read as auto-generated adoption artifacts from Stage 00, already marked Done; the branches
  they reference (`chore/route-coverage-check`, `fix/dead-nav-pages`) still exist unmerged locally.
  Disposition (merge, hand-reconcile, or drop) not decided this pass — Workstream L.
- No open faylo decisions.

## 8. Known infrastructure gaps (from this session)

- Local dev DB required a restricted `nu_app_rls` role (was running as RLS-bypass superuser) —
  fixed this session, local-only, does not describe production DB role configuration (unverified).
- `TenantProvisioningService`/`POST /api/v1/tenants/register` had **5 real bugs**, all fixed this
  session (uncommitted) — this endpoint appears to have never been exercised end-to-end before.
- `ApprovalEscalationJob` vs `WorkflowEscalationScheduler`: confirmed real unguarded race (no
  `@Version`, independent `@SchedulerLock` names) plus a separate deterministic cascade bug (fixed
  this session, uncommitted). Locking/race itself deliberately deferred pending a human decision
  (Workstream H).
- Mailpit not running locally — SMTP health DOWN, not a code defect, not yet started per user's
  earlier explicit instruction to leave it alone pending confirmation it's safe to start.

## 9. What Phase 0 could NOT establish (requires access/tools not yet invoked)

- Actual deployed Railway backend version/health
- Actual deployed Vercel frontend version/health
- Live Railway environment variable values (demo flags, secrets)
- Git history secret-scan results
- Full backend test suite results (only focused/touched-file tests run)
- Full E2E suite current pass/fail (last known number is stale, from a prior session)
- Backup/restore capability (not tested)
- Real employee source-of-truth data reconciliation (no source system connected)

---

## Dependency-ordered execution reality check

The requested campaign (15 workstreams: A–O) is a multi-week, multi-person production-readiness
program, not a single-session deliverable. Executed honestly rather than performed:

**What this pass can responsibly do next, in order:**
1. Commit the currently-uncommitted, already-tested R1/R2a/R3/R4/R7 fixes (they're real, tested,
   verified — leaving them uncommitted is itself a risk).
2. Workstream A (security) and B (RLS) — extend this session's already-working two-tenant fixture
   to the fuller matrix (payroll, knowledge, notifications, documents) — directly buildable on
   what exists.
3. Workstream J — re-run the isolated-stack E2E CI against current HEAD, classify failures
   honestly (no `|| true` restoration).
4. Workstream C — reproduce the pre-commit-push ordering risk and the missing-idempotency-key gap
   under controlled conditions; fix only if reproduction confirms real impact.
5. Workstream H — produce the decision record for R5 (scheduler locking) and stop for the human
   call, per explicit instruction not to invent concurrency semantics.
6. Everything requiring infra access I don't have yet (Railway/Vercel deployed-state, Postgres
   backup/restore, real HR source-of-truth data) needs either those tool connections established
   or the user's own hands — flagging rather than faking.

Given the user's implicit next-step, continuing now into Workstream A+B extension and Workstream J
re-run, since those build directly on verified session state without requiring new infra access.
