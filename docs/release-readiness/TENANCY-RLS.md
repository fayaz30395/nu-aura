# NU-AURA Multi-Tenancy / RLS Assessment — Workstream B

Generated 2026-09-22. All DB-level tests run as `nu_app_rls` (restricted runtime role, no
SUPERUSER/BYPASSRLS) — never `hrms` (superuser, ignores RLS entirely). One test in this pass was
initially run against `hrms` by mistake, produced an alarming false result (22 "leaked" rows),
and was caught and corrected before being reported — noted here as a methodology reminder, not a
finding.

## B1 — Full tenant-table inventory: VERIFIED, 1 REAL DEFECT FOUND + FIXED

- **324** tables in `public` schema have a `tenant_id` column (not ~260 — a killed background
  agent's partial, unverified claim from this campaign's earlier attempt was discarded and
  redone directly rather than trusted, per the explicit "do not fabricate/trust unverified
  agent output" instruction).
- **324/324** have both `relrowsecurity` and `relforcerowsecurity` true — RLS enabled and forced
  on every tenant-owned table, no exceptions.
- **1 real defect found**: `contract_signatures_tenant_rls` (a PERMISSIVE policy) called
  `current_setting('app.current_tenant_id')` with neither the `missing_ok` argument nor `NULLIF`
  — the same broken pattern found and fixed on `resource_pools`/`resource_pool_members` earlier
  this session. Could not force a live reproduction (table is empty in this environment, so the
  broken predicate never actually gets evaluated against a row), but the defect is confirmed by
  direct policy-definition inspection, not speculative. A correct RESTRICTIVE fail-closed backstop
  (`rls_ctx_required_contract_signatures`) already exists on this table, so **no data was ever
  actually exposed** — this is a correctness/robustness fix (avoid a raw Postgres error surfacing
  on an unscoped query), not a leak closure. Fixed via migration `V330__fix_contract_signatures_rls_nullif.sql`
  (applied directly to the local DB and captured as a proper migration, matching this session's
  established pattern) — dropped and recreated the policy with the correct `NULLIF(..., true)` form.
- **1 deliberate, correctly-documented exception**: `outbox_events` has no dedicated restrictive
  policy — matches `RlsStartupProbe`'s own `INFRA_EXCLUDED_TABLES` list (confirmed in code this
  session, and again this pass): it carries `tenant_id` for routing only, is polled cross-tenant
  by trusted internal machinery, and has no user-facing API read path. Not a gap.

## B2-B5 — Live cross-tenant matrix: VERIFIED, ALL PASS

Using the two real tenants from this session's R7 work: `nulogic` (660e8400-...-001, 22 real
employees) and `E2E Tenant B` (ce55a889-...-9a3, 1 employee).

| Domain | Test | Result |
|---|---|---|
| Employees | App-level: direct-ID read/update/delete across tenants | 404 (all, both directions) — re-confirmed this session's R7 work still holds |
| Employees | DB-level: `nu_app_rls` scoped to A vs B vs unscoped | A=22, B=1, unscoped=0 |
| Notifications | DB-level: scoped A vs B vs unscoped | A=6, B=0, unscoped=0 — **PASS** |
| Audit logs | DB-level: scoped A vs B vs unscoped | A=61, B=1, unscoped=0 — **PASS** |
| Compliance/policy | App-level (this session's R3 work) | Already exhaustively tested — self-scope + IDOR fix verified, not re-run here |

Not independently re-tested this pass (would require either seeding real domain objects in
Tenant B, which currently can't happen through the app because Tenant B's non-admin roles have
no `role_permissions` seeded — a known, already-documented R7 scope boundary — or DB-level-only
spot checks, which were prioritized toward higher-value/higher-risk tables instead): attendance,
performance/competency, recognition, resource pools, recruitment, Fluence, payroll-related data.
**Recording as NOT YET VERIFIED, not as PASS** — the RLS policy inventory in B1 confirms the
structural mechanism is in place for all of these (they're covered by the 324/324 universal
RLS-enabled-and-forced result), but a live cross-tenant read/write attempt was not independently
exercised against each this pass.

## B6 — Background/async tenant context: 1 FINDING

Sampled 8 of 21 `@Scheduled`/`@KafkaListener` classes for tenant-context handling:

| Job | Classification |
|---|---|
| `AutoRegularizationScheduler` | EXPLICIT_PER_TENANT_LOOP |
| `LeaveAccrualScheduler` | EXPLICIT_PER_TENANT_LOOP |
| `PolicyAcknowledgmentReminderScheduler` | EXPLICIT_PER_TENANT_LOOP |
| `DocumentExpiryScheduler` | EXPLICIT_PER_TENANT_LOOP |
| `EmailSchedulerService` | EXPLICIT_PER_TENANT_LOOP |
| `ScheduledReportExecutionJob` | EXPLICIT_PER_TENANT_LOOP |
| `OutboxEventProcessor` | RELIES_ON_CALLER_CONTEXT (correct — outbox is the documented cross-tenant-by-design exception, see B1) |
| `ApprovalEscalationJob` / `WorkflowEscalationScheduler` | EXPLICIT_PER_TENANT_LOOP (confirmed in this session's earlier deep-dive on R4/R5) |
| **`OrphanFileCleanupScheduler`** | **NO_TENANT_CONTEXT_FOUND** |

**Finding**: `OrphanFileCleanupScheduler.collectKnownFilePaths()` runs raw `jdbcTemplate.queryForList`
against `generated_documents`/`document_versions`/`file_metadata` with **no tenant context set
anywhere in the class** — no `set_config`, no per-tenant loop. Given all three tables are among
the 324 RLS-enforced tables (B1), and the app's runtime role has no RLS bypass, this job's queries
almost certainly return **zero rows** every run regardless of how many files are actually tracked
— meaning `collectKnownFilePaths()` returns empty, and the weekly job would flag **every real file
in every tenant's storage as "orphaned"**. Not verified by actually running the scheduled job live
(cron-triggered, not manually invokable without code changes) — reasoning from the RLS mechanism
confirmed in B1, not a live reproduction. **Impact is bounded**: the class's own docstring confirms
this is explicitly "Phase 1 — report-only" (logs only, no deletion enabled), so the practical
consequence today is a noisy/useless weekly log, not data loss. **Not fixed in this pass** — flagged
per the explicit instruction not to fix background/infra findings speculatively; needs a decision
on whether this job should scope per-tenant (loop pattern, matching its siblings) or run as a
legitimate cross-tenant infra job (add it to `RlsStartupProbe`'s exclusion reasoning, matching
`outbox_events` — but unlike outbox, this job's OWN queries need to work cross-tenant too, so
that path would need the job's `JdbcTemplate` calls issued under a bypass-capable path, not just
a probe exemption).

---

## Summary

| Area | Status |
|---|---|
| B1 Table inventory | PASS — 324/324 RLS enabled+forced; 1 defect found+fixed (`V330`); 1 documented exception |
| B2-B5 Cross-tenant (employees, notifications, audit) | PASS, live-verified |
| B2-B5 Cross-tenant (attendance, performance, recognition, etc.) | NOT YET VERIFIED — structural mechanism confirmed via B1, not independently live-tested per domain |
| B6 Background jobs | 1 finding — `OrphanFileCleanupScheduler` has no tenant context (functional bug, not a leak; report-only phase bounds impact) |
