# NU-AURA Release Readiness — Workstreams A/B/J Checkpoint

Generated 2026-09-22, branch `release-readiness/verified-fixes`. Executed directly in-session
(no subagents — the campaign's original 3 parallel background agents hit a weekly API rate limit
and produced no usable output; discarded rather than trusted per explicit instruction).

## A — SECURITY

**Status: PASS overall, with 2 real findings requiring decisions and 3 confirmed code defects.**

- Verified: cookie security (HttpOnly/Secure/`__Host-` hardening, all live-confirmed via raw
  Set-Cookie inspection), CSRF, rate limiting, tampered-JWT rejection, password-reset
  non-enumeration, disabled-user login denial, logout/token revocation, CORS fail-closed startup
  guard. All live-tested, not just code-read.
- Failures: **3 confirmed IDOR gaps** — `PerformanceReviewService.getEmployeeReviews`,
  `MileageService.getEmployeeMileageLogs`, `ContractService.getEmployeeContracts` — all take a
  raw `employeeId` with zero self-scope check, same root pattern as the compliance IDOR fixed in
  this session's R3. No live data leak demonstrated (tables empty in this tenant today), but
  structurally real.
- Blocked: none.
- Not yet verified: full secret-history scan was targeted, not exhaustive (`gitleaks`/`trufflehog`
  recommended as a follow-up tool); 4 of ~16 employeeId-scoped endpoints sampled in A2 returned
  inconclusive results (400/404 routing, not re-verified).
- Changes made: none to app code this pass (IDOR fixes deferred to P1, see below) — findings
  documented, not silently fixed.
- Tests: N/A for new findings (not fixed yet); R2a/R3/R7 regression re-verified live and clean
  (A5).

**2 findings needing a decision, not a code fix:**
1. `DEMO_CREDENTIALS_ENABLED` is a migration-apply-time-only gate with **zero runtime
   enforcement** (confirmed via full codebase grep). Flipping the env var on an already-deployed
   instance does nothing retroactively. HIGH — needs an explicit operational/deployment-process
   decision, not a code change.
2. Two real credentials (`NEON_DB_PASSWORD`, a Groq API key) are confirmed still present and
   reachable in `main`'s git history as of the current HEAD. The Groq key has been flagged in this
   repo's own prior audit rounds multiple times and never remediated. Rotation is the owner's
   action, not mine — not performed.

## B — MULTI-TENANCY / RLS

**Status: PASS, with 1 real defect found+fixed and 1 real functional-bug finding.**

- Verified: all 324 tenant-owned tables (real count, not a prior unverified "~260" agent claim)
  have RLS enabled+forced. Live cross-tenant isolation confirmed at both app-level (employees:
  404 on cross-tenant direct-ID access, correctly scoped lists) and DB-level using the correct
  restricted `nu_app_rls` role (employees, notifications, audit_logs all cleanly isolated: each
  tenant sees only its own rows, unscoped connections see zero).
- Failures: `contract_signatures_tenant_rls` had the same broken missing-NULLIF pattern found
  twice earlier this session on other tables — **found and fixed** (migration `V330`, committed
  `0f4711bc`). No live leak (a correct RESTRICTIVE backstop policy already existed on that table).
- Blocked: none.
- Not yet verified: attendance, performance/competency, recognition, resource pools, recruitment,
  Fluence, payroll cross-tenant reads were not independently live-tested this pass (Tenant B's
  non-admin roles have no seeded permissions, a known R7 scope boundary, blocking app-level tests;
  DB-level spot checks were prioritized toward higher-risk tables instead). The structural
  mechanism (RLS enabled+forced) is confirmed for all of them via the B1 inventory — genuine
  cross-tenant read/write attempts were not exercised per-domain.
- Changes made: `V330__fix_contract_signatures_rls_nullif.sql`.
- Tests: DB-level verification via direct `psql` queries as `nu_app_rls`; one live methodology
  error (accidentally queried as `hrms` superuser first, producing an alarming false 22-row
  "leak") was caught and corrected before being reported.

**1 finding needing a decision:** `OrphanFileCleanupScheduler` sets no tenant context anywhere —
under RLS fail-closed this almost certainly means it currently flags 100% of real files as
"orphaned" (functional bug). Impact is bounded — the job is explicitly Phase-1 report-only, no
auto-deletion enabled. Not fixed — needs a decision on whether it should loop per-tenant (matching
its 6 sibling schedulers) or be added to the documented cross-tenant-infra exception list
alongside `outbox_events` (which would require different remediation, since unlike outbox this
job's own queries need to actually work, not just be exempted from a probe).

## J — E2E

**Status: BLOCKED — no clean classified run achieved.**

- 119 real spec files discovered (not historical "5774"/"2886" figures). Genuine, relevant
  coverage confirmed to exist: auth, RBAC (including tenant-isolation and role-boundary specs),
  and a solid same-device notification test.
- 2 execution attempts on a bounded 7-file slice, both failed to complete within reasonable time
  (5 min with a lost stdout capture; 35+ min genuinely still running, workers confirmed active
  not hung, before being killed). No fabricated PASS/FAIL numbers — reporting BLOCKED per the
  explicit no-false-greens rule rather than guessing from ambiguous retry-artifact directory
  names.
- Cross-device notification testing (J6): confirmed as a real, currently-absent capability (not
  speculated — read the one existing realtime notification spec in full, confirmed single-context
  only). Did not build new harness given the environment couldn't complete the *existing* suite
  in reasonable time — new infrastructure on an unstable execution environment wouldn't produce
  trustworthy evidence either.
- Recommendation: run against the repo's own isolated-stack CI workflow (ephemeral services)
  rather than this long-lived local dev machine, which is carrying an entire campaign's worth of
  concurrent state by this point in the session.

## NOTIFICATIONS (carried forward from this session's earlier discovery + this pass's J findings)

- **Actual architecture**: `LeaveRequestService` → direct synchronous call to
  `WebSocketNotificationService` → Redis-backed Spring STOMP push (native multi-session/
  multi-device fanout via `SimpMessagingTemplate.convertAndSendToUser`) + best-effort DB
  persistence. **Not Kafka/outbox** for leave notifications, despite both being enabled in this
  environment.
- Same-device: VERIFIED — real E2E spec confirms live WebSocket delivery without page reload.
- Cross-device: NOT YET VERIFIED — no test exists; native Spring Messaging multi-session fanout
  is the underlying mechanism (well-tested framework behavior, not custom code), but not
  independently confirmed against this app's actual deployment.
- Offline / reconnect / multiple tabs: NOT YET VERIFIED — not tested this pass.
- Duplicate behavior / idempotency: **Confirmed gap** (this session's earlier discovery) — no
  dedup key on the `Notification` table; a retried call could create a duplicate.
- Transaction ordering: **Confirmed risk** (this session's earlier discovery) — the WebSocket
  push can fire before the enclosing transaction commits; a subsequent rollback could leave a
  user notified of a decision that never persisted. Not reproduced under controlled failure this
  pass.
- Redis failure: NOT YET VERIFIED.

---

## Findings triage

| ID | Finding | Severity | Category |
|---|---|---|---|
| A2-1 | IDOR: PerformanceReviewService.getEmployeeReviews | Medium | **P1** |
| A2-2 | IDOR: MileageService.getEmployeeMileageLogs | Medium | **P1** |
| A2-3 | IDOR: ContractService.getEmployeeContracts | Medium | **P1** |
| A3 | DEMO_CREDENTIALS_ENABLED is migration-time-only, no runtime gate | High | **HUMAN DECISION** (deployment process) |
| A4-1 | NEON_DB_PASSWORD in git history | High | **HUMAN DECISION** (rotate + history-scrub call) |
| A4-2 | Groq key in git history, previously flagged, never remediated | High | **HUMAN DECISION** (rotate + history-scrub call) |
| B1 | contract_signatures RLS policy missing NULLIF | Low (no live leak) | **FIXED** (`V330`, commit `0f4711bc`) |
| B6 | OrphanFileCleanupScheduler has no tenant context | Low (report-only, bounded impact) | **P2 / HUMAN DECISION** (loop-per-tenant vs infra-exempt) |
| J6 | No cross-device notification test coverage | Medium | **P1** (build harness once E2E env is stable) |
| Notif-1 | No idempotency key on Notification table | Medium | **P1** (carried from earlier this session) |
| Notif-2 | WebSocket push can precede transaction commit | Medium | **P1** (carried from earlier this session) |
| J-env | E2E suite couldn't complete in local dev environment | — | **BLOCKED — external** (recommend CI) |

## Deferred (explicitly retained, not silently resolved)

- **R2b** — reversal of an already-decided leave request. Still deferred.
- **R5** — `ApprovalEscalationJob`/`WorkflowEscalationScheduler` locking/race. Still deferred.
- B2-B5 cross-tenant live tests for attendance/performance/recognition/resource-pools/
  recruitment/Fluence/payroll — structural mechanism confirmed, live exercise not performed.
- Full exhaustive git-history secret scan (gitleaks/trufflehog) — targeted search only performed.
