# Green-Flag Release Rollback Plan (Wave 2 — V283/V284 release)

Companion to the general runbook `docs/runbooks/rollback.md` (which covers kubectl rollout
undo, Cloud Build redeploy, JWT rotation, comms). This document adds the release-specific
deltas for the green-flag fix wave: Flyway **V283** and **V284**, the ~25 CRITICAL/HIGH
code fixes, and Kafka consumer changes.

## 1. Database — Flyway V283 / V284 (forward-only)

Flyway here has no `undo` migrations; both new migrations are forward-only. Strategy per
migration:

### V283__payroll_run_period_unique.sql — DESTRUCTIVE-ish (soft delete)

What it does:
1. Soft-deletes duplicate non-deleted `payroll_runs` rows per (tenant, year, month) —
   survivor = furthest lifecycle (LOCKED > APPROVED > PROCESSED > PROCESSING > DRAFT),
   then earliest `created_at`. Rows are **not dropped**; payslip/audit FKs stay intact.
2. Drops the V92 non-unique index and replaces it with partial unique index
   `uq_payroll_runs_tenant_period ... WHERE is_deleted = false`.

Rollback options (in order of preference):
- **Accept and stay forward.** The dedup only flips `is_deleted`/`deleted_at`. If a wrong
  survivor was chosen, *restore the specific row*:
  `UPDATE payroll_runs SET is_deleted = false, deleted_at = NULL WHERE id = '<uuid>';`
  (first soft-delete the current survivor for that period, or the unique index will reject it).
  Identify affected rows: `SELECT * FROM payroll_runs WHERE deleted_at >= '<migration ts>' AND is_deleted = true;`
- **Index-only revert** (if the unique constraint itself causes operational breakage):
  `DROP INDEX IF EXISTS uq_payroll_runs_tenant_period;`
  `CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_period ON payroll_runs (tenant_id, pay_period_year, pay_period_month);`
  then `DELETE FROM flyway_schema_history WHERE version = '283';` only if you intend to re-run a fixed V283.
- **Full restore**: Neon PITR / backup restore per `docs/runbooks/backup-restore.md` —
  last resort, loses post-deploy writes.
- Note: `CREATE UNIQUE INDEX` (non-CONCURRENT) takes a brief ACCESS EXCLUSIVE lock on
  `payroll_runs`. Run the deploy outside payroll processing windows.

### V284__workflow_optimistic_locking.sql — IDEMPOTENT / SAFE

Backfills NULL `version` to 0 and sets `NOT NULL DEFAULT 0` on `workflow_executions` and
`step_executions`. No data is removed; re-runnable; rollback is unnecessary. If the old app
image must run against the migrated schema, it is compatible (column already existed in V0,
now merely NOT NULL with default).

**Old-image-on-new-schema compatibility:** both V283 and V284 are backward compatible with
the previous app image (prev image never relied on duplicate periods or NULL versions), so
**app rollback does NOT require DB rollback.**

## 2. Application image rollback

Per `docs/runbooks/rollback.md` §3:
- Fast path: `kubectl rollout undo deployment/hrms-backend -n hrms` (and `hrms-frontend`);
  previous image is retained in GCR.
- Authoritative path: Cloud Build redeploy of the last green commit (pre-fix-wave baseline:
  commit before `b019e284` / the wave-2 fix series — record exact SHA at deploy time).
- Leave Flyway state as-is (see §1); `ddl-auto=validate` on the old image will still pass
  because V283/V284 don't remove columns the old entities map.

## 3. Config rollback

- All wave-2 hardening is env-var driven with safe defaults
  (`DEMO_CREDENTIALS_ENABLED` default **false** in base + prod; `COOKIE_USE_HOST_PREFIX=false`
  available as documented canary rollback; `VIRUSSCAN_FAIL_OPEN`, `RLS_DATASOURCE_WRAPPER_ENABLED` etc.).
- Helm: `helm rollback hrms <REV>` reverts values+manifests together. Raw k8s manifests:
  re-apply the previous tagged manifest set.
- Do NOT roll back the Flyway placeholder `demoCredentialsEnabled` to true in prod under any
  circumstance (V272 fail-closed lockdown).

## 4. Kafka consumer-group considerations

- `DeadLetterHandler` now also subscribes to `nu-aura.payroll-processing.dlt`
  (group `GROUP_DLT_HANDLER`). Rolling back the image removes that subscription — messages
  on the payroll DLT will sit unconsumed (retained, not lost). They will be processed when
  rolled forward again; check topic retention covers the rollback window (extend retention
  if rollback exceeds it).
- Offset-commit fix (`3861c4d5` — ack after durable persist): rolling back may cause
  redelivery of recently consumed events; `IdempotencyService` (Redis SETNX, 24h TTL) and
  the DLT handler's offset-derived idempotency keys absorb duplicates. No consumer-group
  offset reset is required for rollback.
- Do not delete or reset `GROUP_DLT_HANDLER` offsets during rollback.

## 5. Verification after rollback

1. `/actuator/health` ready on all pods; login + `/me` OK.
2. `flyway_schema_history` has no FAILED rows.
3. `kafka_dlt_messages_total` not spiking; consumer lag stabilizing.
4. Payroll run list renders; one active run per period:
   `SELECT tenant_id, pay_period_year, pay_period_month, COUNT(*) FROM payroll_runs WHERE is_deleted=false GROUP BY 1,2,3 HAVING COUNT(*)>1;` → 0 rows.
