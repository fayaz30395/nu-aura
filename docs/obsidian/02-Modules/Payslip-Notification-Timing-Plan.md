---
title: Payslip notification timing plan
tags: [module, payroll, notifications, plan, approval-pending]
summary: Plan for a separate change that sends the employee "payslip available" notification when a payslip becomes employee-visible, not at processing time. Nothing implemented.
---

# Payslip notification timing: change plan

Plan state: **proposal for a separate change. Nothing is implemented, and `PayrollRunService` is not part of the
Batch 1 commit.** Follows [[Payslip-Visibility-Batch1-Design]].

## Problem (verified 2026-10-10)

Employees receive a websocket "Payslip Available" notification when their payslip is *generated*, but under the
Batch 1 rule a payslip is visible to the employee only once its run is `APPROVED` or `LOCKED`.

- `PayrollRunService.notifyPayslipAvailable` is called from `generatePayslipsForRun` (inside the loop, after each
  `payslipRepository.save`) and from `processBulkPayroll`.
- The notification reads "Your payslip for <month> <year> is now available" and deep-links to
  `/payroll/payslips`, which is the admin payroll page, not the employee's `/me/payslips`.

## The two call sites are different lifecycle paths

| Call site | Reached from | Run state when it fires | Correct behaviour |
|---|---|---|---|
| `generatePayslipsForRun` | `processPayrollRun` and `completeProcessing`; both end with the run `PROCESSED` | DRAFT or PROCESSING moving to PROCESSED, never released | Send nothing at processing |
| `processBulkPayroll` | bulk endpoint; `findOrCreateBulkRun` reuses **any existing run for the period** | Can be DRAFT, PROCESSED, **or already APPROVED/LOCKED** | Send only if the run is already released; otherwise wait for approval |

Consequence: simply moving the call to approval would leave employees un-notified when the bulk path adds a
payslip to a run that is already released. The rule has to be "notify when the payslip becomes employee-visible",
which happens at **approval** (for every payslip in the run) or at **creation in an already-released run**.

`PayrollRun.approve()` only allows PROCESSED to APPROVED (it throws `IllegalStateException` otherwise), and `lock()`
only APPROVED to LOCKED. Locking must not notify again.

## Plan

1. **Trigger.** Publish a `PayrollRunApprovedEvent(runId, tenantId)` from `approvePayrollRun`. A listener sends the
   notification **after commit** (`@TransactionalEventListener(phase = AFTER_COMMIT)`, an established pattern in
   `ApprovalNotificationListener`), so a rolled-back approval notifies nobody. Remove the call from
   `generatePayslipsForRun`. In `processBulkPayroll`, notify (after commit) only for payslips created while the run
   status is released.
2. **Duplicate prevention.** The state guard already makes a retried approval throw before any event is
   published. For listener replays, first verify whether `sendToUser` persists a notification row. If it does, reuse
   the existence-check pattern from `HireReminderScheduler` (no migration). If it does not, a persisted marker
   would need a migration, which needs separate approval.
3. **Delivery reliability.** Notification failure is isolated per employee and logged; it never changes or rolls
   back the approval (the event is handled after commit, in its own try/catch).
4. **Recipients and visibility.** Recipients are exactly the employees who hold a payslip in that run, resolved
   tenant-scoped (`findAllByTenantIdAndPayrollRunId`). Nobody else is notified. Fix the deep link to the
   employee page `/me/payslips`.
5. **Scope guard.** `notifyPayrollProcessed` (to the processor at PROCESSED) is a different message for a different
   audience and stays as it is.

## Regression tests (written first)

- Processing (`processPayrollRun` and `completeProcessing`) sends no availability notification.
- Approval sends exactly one notification per employee with a payslip in the run, and only after commit.
- A repeated or retried approval throws and sends nothing more; a listener replay does not duplicate.
- A failing notification does not roll back the approval, and one employee's failure does not block the others.
- Recipients: employees without a payslip in the run, employees of other tenants, and non-participants receive
  nothing.
- Bulk into an unreleased run sends nothing; bulk into an `APPROVED` or `LOCKED` run notifies the new
  recipients once.
- Locking sends nothing; a rolled-back approval sends nothing.
- The notification deep link targets `/me/payslips`.

## Investigation results (2026-10-10, read-only)

- **`sendToUser` persists a durable `Notification` row** (`persistQuietly`, failure swallowed) after the websocket
  push. So a delivered notification leaves a record in `notifications`.
- **But the identity columns are not filled on this path.** The entity has `relatedEntityId` (UUID) and
  `relatedEntityType` (varchar 100), and the repository already has
  `existsByTenantIdAndUserIdAndRelatedEntityIdAndRelatedEntityTypeAndType(...)`. `persistQuietly` sets neither
  column, and `NotificationMessage` carries no related-entity fields. Today there is therefore **no identity to
  deduplicate on**.
- **The persisted type is `GENERAL`.** `Notification.NotificationType` has no payslip value, and `mapType` falls
  back to `GENERAL`, so type-based matching is useless until the enum gains a value.
- **No unique constraint**: the table has plain indexes only, so a database-enforced guarantee would need a
  migration (a unique index on tenant, user, related entity and type).
- **Transaction pitfall (documented in the repo):** `sendToUser` is plain `@Transactional`; inside an
  `@TransactionalEventListener(AFTER_COMMIT)` handler that silently no-ops, which is why
  `NotificationService.createNotification` is `REQUIRES_NEW`. The listener must use `REQUIRES_NEW` (or route
  through that method), otherwise the notification row is lost.

### What this means for deduplication (no migration needed unless you choose strict guarantees)

1. **Without a migration:** carry `relatedEntityType = "PAYROLL_RUN"` and `relatedEntityId = runId` through
   `NotificationMessage` into `persistQuietly`, add a payslip type to the Java enum (stored as a string, so the
   Java change alone is enough **provided the database has no CHECK on `type`**), and check
   `existsBy...` before sending. Concurrent approvals cannot race because the run is pessimistically locked and
   `approve()` is state-guarded; only listener replays need the check, so check-then-insert is adequate.
2. **With a migration (only if you want a database-enforced guarantee):** a unique index on tenant, user,
   related entity and type. That needs your separate approval, and a migration number must be chosen only after
   `git log --all --diff-filter=A -- '*V3*'`.

**Unverified:** whether the `notifications.type` column has a database CHECK constraint (the table's original
definition was not located by pattern search). Confirm against a real migrated schema before relying on option 1.

## Open decisions and unverified items

- Option 1 (no migration, check-then-insert) or option 2 (unique index migration)?
- Whether to also use the existing `PAYSLIP_READY` email and SMS templates, which exist but were not found to be
  called from the payroll flow.
- Whether the bulk-into-released-run case should notify immediately (recommended) or batch it.
- Product wording once the state is "released", which is not payment.

---

# Option 2 migration proposal (design only; not created, not applied)

Plan state: **awaiting approval. No migration file, no notification code, no push.**

## Evidence from a real migrated database (Postgres 16, Flyway at V341, 2026-10-10)

| Question | Finding |
|---|---|
| Does `notifications.type` have a CHECK or other restriction? | **No.** Constraints are only the primary key and `fk_notifications_tenant`. Inserting `PAYSLIP_AVAILABLE` and a made-up type both succeeded. The column is `varchar(50)`, stored as the Java enum name. |
| Duplicates among existing rows? | The migrated test database has **0 rows**, so it cannot answer for production. **No real database was queried.** A partial index limited to `type = 'PAYSLIP_AVAILABLE'` cannot conflict with existing data, because that value does not exist in the Java enum today (these notices are persisted as `GENERAL`). Pre-flight query for a human: `select count(*) from notifications where type = 'PAYSLIP_AVAILABLE';` expected 0. |
| Can `related_entity_id` and `related_entity_type` identify a payroll run? | Yes. `related_entity_id` is a `uuid`, `related_entity_type` is free-form `varchar(100)` (existing values include ASSET, OVERTIME_RECORD, EXPENSE_CLAIM, ATTENDANCE; nobody uses `PAYROLL_RUN`). A payroll run is unique per tenant and period. The key (employee, run) is therefore one notification per employee per run. |
| Would uniqueness suppress legitimate notifications? | **A blanket index would.** Several writers repeat the same (user, entity, type) on purpose, for example `REMINDER` and `APPROVAL_REQUIRED` escalations, and only `HireReminderScheduler` dedupes (in application code). The index must therefore be **partial, limited to the payslip type**. Prototype: two `REMINDER` rows for the same user and entity were both accepted. |

## Proposed migration (version to be re-checked)

File name: `V342__notifications_payslip_available_unique_index.sql`. V341 is the highest version on any branch and
nothing holds V342 or above, **but a human must re-run `git log --all --diff-filter=A -- '*V3*'` immediately before
creating it.**

```sql
-- One "payslip available" notification per employee per payroll run.
-- Partial on purpose: other notification types legitimately repeat for the same user and entity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_payslip_available_uq
    ON notifications (tenant_id, user_id, related_entity_type, related_entity_id)
    WHERE type = 'PAYSLIP_AVAILABLE';
```

- **Uniqueness scope:** tenant, user, related entity type and id, only for rows whose type is `PAYSLIP_AVAILABLE`.
  Rows for a different run, user or tenant are allowed; rows of any other type are untouched.
- **Soft deletes:** the index deliberately does **not** exclude soft-deleted rows. Verified on the real schema: after
  setting `is_deleted = true` on the first row, a duplicate is still rejected. So a user dismissing the notification
  cannot cause a re-send on replay. The table has both `is_deleted` (the entity restriction) and `deleted_at`.
- **Existing-data handling:** none required (see above). The pre-flight count must return 0.
- **Plain versus CONCURRENTLY:** plain `CREATE UNIQUE INDEX` blocks writes for the duration of a table scan.
  Whether that matters depends on the production table size, which is unknown. If it is large, use `CONCURRENTLY`
  with the repository's existing non-transactional Flyway handling (precedent: V34). Decision needed with the size.
- **RLS:** `notifications` has FORCE ROW LEVEL SECURITY; the index does not interact with policies.

## Insert path the index relies on (for the later implementation)

- Insert first with a native `INSERT ... ON CONFLICT (tenant_id, user_id, related_entity_type, related_entity_id)
  WHERE type = 'PAYSLIP_AVAILABLE' DO NOTHING` (the `DO NOTHING` returns 0 rows on a duplicate, verified), and
  **push the websocket message only when one row was inserted**.
- **Explicit inference target, not target-less** (changed after the design review): with a target, a missing index
  makes every insert fail loudly instead of silently creating duplicates. This chooses a loud failure over a
  silent loss of the guarantee, which matches the goal of database-enforced deduplication.
- **Do not reuse `sendToUser`.** It pushes and then persists through JPA (`persistQuietly`); after a native insert
  that would write a second row, hit the unique index, and can poison the surrounding transaction. Use a
  push-only method.
- **Both call sites publish an event** (`generatePayslipsForRun` path publishes nothing; `processBulkPayroll`
  publishes only for released runs; approval publishes for the run). Today both run inside the payroll
  transaction, so a rollback after the push leaves a ghost push; handling the event after commit fixes that.
- **Assert `relatedEntityId` (the run id) is non-null** at the call site: PostgreSQL treats NULLs as distinct in a
  unique index, so a null id would never deduplicate.
- **Native insert must bind every column the entity listener would have filled:** required with no default are
  `tenant_id`, `user_id`, `type`, `title`, `message`, `priority`; set `version = 0` explicitly (the entity has an
  `@Version`); `tenant_id` must be bound because the tenant entity listener does not run on native SQL. Defaults
  cover `id`, `created_at`, `updated_at`, `is_deleted`, `is_read`.
- Required changes: add `PAYSLIP_AVAILABLE` to the Java `Notification.NotificationType`; carry `relatedEntityType`
  and `relatedEntityId` in the message; set `actionUrl` to `/me/payslips`.

## Rollback

Flyway migrations are forward-only. **Order matters now that the insert names the index as its conflict target:**
revert the code first, then drop the index (`DROP INDEX CONCURRENTLY IF EXISTS ...`, or a follow-up migration).
Dropping the index while the new code runs makes the inserts fail loudly. The old code does not use
`ON CONFLICT`, so keeping the index after a code rollback is harmless. If the index is built `CONCURRENTLY`, check
`pg_index.indisvalid`, because a failed build leaves an INVALID index behind.

## Findings from the parallel review

- **RLS (`rls-check`, read-only):** the tenant GUC is set per physical transaction, so a `REQUIRES_NEW` insert sets
  its own. `TenantContext` is **not** populated in after-commit handlers, so the event must carry `tenantId` and the
  listener must set and clear it (as `ApprovalNotificationListener` does). A missing tenant fails closed (restrictive
  policy, SQLSTATE 42501). **Unproven:** no existing test runs after-commit, then `REQUIRES_NEW`, then insert under
  RLS. My integration tests run as a superuser and would not catch it. The proving test needs a real Postgres, no
  test-level `@Transactional`, and a non-bypass role (`nu_app_rls`).
- **Test specification (`test-spec-writer`):** 12 behaviours mapped to existing classes
  (`PayrollRunServiceTest`, `ApprovalNotificationListenerTest`, the real-Postgres pattern of
  `PayslipReleaseStatusIntegrationTest`) plus new classes. Corrections applied here: soft-delete uses `is_deleted`;
  the index columns are as in the SQL above. Gaps it found: no test asserts the AFTER_COMMIT phase itself;
  `processBulkPayroll` and `completeProcessing` have no direct tests; two `WebSocketNotificationService` classes
  exist, so the target must be named; the handler and event names for the payslip-approved path are new.

## Design review (`design-reviewer`, adversarial) and my verification

Changes already applied above: explicit `ON CONFLICT` target; push-only path instead of `sendToUser`; events at both
call sites; non-null run id; native insert column list; rollback order; index named `idx_notifications_payslip_available_uq`
(repository precedent V34/V48 uses `idx_`, there is no `ux_` precedent).

| # | Finding | Status |
|---|---|---|
| 1 | Reusing `sendToUser` double-writes and can poison the transaction | Accepted; push-only method required |
| 2 | Target-less `ON CONFLICT` silently loses dedupe if the index is missing | Accepted; explicit target, loud failure |
| 3 | An insert failure is only logged (`PayrollRunService` catches `RuntimeException`), nothing retries | Accepted as a limitation; add a metric or a retry decision to the implementation plan |
| 4 | Both call sites run inside the payroll transaction, so a rollback can leave a ghost push | Confirmed; the after-commit event fixes it |
| 5 | A null `related_entity_id` never deduplicates | Accepted; assert non-null |
| 6 | Native insert must set `version`, `tenant_id` and the required columns | Accepted. **Corrects the reviewer:** `notifications` does have `deleted_at` (probe, real schema) |
| 7 | Key is per run, idempotency is per period | **Mostly moot:** `PayrollRun` has a unique index on (tenant, month, year), so one run per period. Edge: deleting a run and recreating the period gives a new run id and one new notification, which is arguably correct |
| 8 | Plain `CREATE UNIQUE INDEX` locks writes; CONCURRENTLY precedents exist (V34, V75, V94, V71) | Open; depends on production row count. The `-- flyway:executeInTransaction=false` directive was not found in the repo, so verify how existing CONCURRENTLY migrations run before choosing |
| 9 | Version number | V342 candidate; re-check across all branches first |
| 10 | Frontend type union lacks `PAYSLIP_AVAILABLE` | Typecheck gap only |
| 11 | `POST /notifications` does `valueOf(request.getType())` | **Confirmed and security-relevant, see below** |
| 12 | `existsBy...` honours the soft-delete restriction but the index does not | Do not use the derived method for dedupe; rely on the index |

### Two issues found by verification, not in the original plan

1. **Pre-emption through the create endpoint.** `POST /notifications` requires `NOTIFICATIONS_CREATE` but accepts any
   `userId` and any type name. Once `PAYSLIP_AVAILABLE` exists and is unique per (user, run), a holder of that
   permission could insert a row for another employee and run and thereby suppress the real notification. The
   endpoint should reject system-owned types (at least `PAYSLIP_AVAILABLE`). Needs a test.
2. **Latent frontend route.** `notificationRoutes.ts` maps `PAYSLIP_AVAILABLE` to `/me/payroll`, which does not
   exist (only `/me/payslips` does). It is harmless while `actionUrl` is set, because the bell prefers `actionUrl`,
   but the mapping should be corrected when this is implemented. Today these notices are stored as `GENERAL`, so
   the mapping has never applied.

## Migration tests (written first, real Postgres)

- Index `idx_notifications_payslip_available_uq` exists with the expected definition, is unique, and is partial on `type = 'PAYSLIP_AVAILABLE'`.
- The explicit `ON CONFLICT` target inserts successfully when the index exists, and **fails** when it is missing.
- `POST /notifications` rejects `PAYSLIP_AVAILABLE`.
- A duplicate (tenant, user, `PAYROLL_RUN`, run id) payslip notification is rejected (SQLSTATE 23505).
- `ON CONFLICT DO NOTHING` returns 0 rows on a duplicate.
- Other types with the same user and entity may repeat; a different run, user or tenant is allowed.
- A soft-deleted (`is_deleted = true`) row still blocks a duplicate.
- Running as a non-bypass role (`nu_app_rls`), an after-commit, `REQUIRES_NEW` insert succeeds with the tenant set from the event and fails with it cleared.
- Migrating from V341 with existing `GENERAL` notification rows succeeds unchanged.

## Decisions needed

1. Approve the partial-index design and key (employee, run).
2. Plain `CREATE UNIQUE INDEX` or `CONCURRENTLY` (needs the production `notifications` row count).
3. Confirm "a corrected payslip in the same run does not re-notify" is acceptable (the key is per run, not per payslip id).

---

# Resolution of the conditional-approval checks (2026-10-11)

Decisions received: design direction approved (migration not approved for execution); prefer `CONCURRENTLY` subject
to framework compatibility; a corrected payslip in the same run must **not** trigger a second notification; the
push of Batch 1 (`2e4f630c`) is done and is separate from this change.

## 1. Recipient identity: a pre-existing bug that changes the key

The key you described is `(tenant, employee, payroll run)`. In the schema the notification is addressed to a
**user**, not an employee, so the real key is `(tenant_id, user_id, related_entity_type='PAYROLL_RUN',
related_entity_id=runId)`, where `user_id` is the employee's linked user (`Employee.user`, a one-to-one, so the
mapping is 1:1 and the uniqueness is equivalent).

**Today the code addresses payslip notices to the employee id.** `PayrollRunService.notifyPayslipAvailable` passes
`employeeId` into `sendToUser(userId, ...)`. The websocket principal is the JWT **user id**
(`WebSocketSecurityConfig`: `UsernamePasswordAuthenticationToken(userId.toString(), ...)`) and the bell reads by
`SecurityContext.getCurrentUserId()`. Other employee-targeted notifications convert first
(`ScheduledNotificationService` uses `employee.getUser().getId()`). So, unless an employee's id happens to equal
their user id, these payslip notices have **never reached the intended person**, neither live nor in the bell
(code-level evidence; not observed on a running system).

Consequences for the design:
- The implementation must resolve each recipient to `employee.getUser().getId()`. An employee with no linked user
  cannot be notified: skip and log, never fall back to the employee id.
- Releasing this change makes employees start receiving notices they have not been receiving. That is a visible
  behaviour change and should be announced.
- Tests must assert delivery to the **user** id and absence for the employee id.

## 2. Schema facts verified on the migrated database

| Item | Verified value |
|---|---|
| Columns | `tenant_id uuid`, `user_id uuid`, `type varchar(50)`, `related_entity_id uuid` (nullable), `related_entity_type varchar(100)` (nullable), `is_deleted boolean default false`, `deleted_at timestamptz` |
| How type is stored | The Java enum name as a string; no DB CHECK |
| Unrelated notifications excluded | By the partial predicate `type = 'PAYSLIP_AVAILABLE'`; prototype showed other types repeating freely |
| Row level security | ENABLED and FORCED on `notifications`; restrictive policies require the tenant setting |

## 3. Existing duplicates: detect and resolve safely

- The payslip type value is new, so no legitimate rows exist. **Pre-flight, run by a human before the migration:**
  `select count(*) from notifications where type = 'PAYSLIP_AVAILABLE';` Expected 0. A non-zero count would mean
  rows were created through `POST /notifications` (see the review findings).
- Detect duplicates among such rows: group by tenant, user, related entity type and id, having count greater than 1.
- **Resolve by re-typing, not by soft-deleting:** the index includes soft-deleted rows, so `is_deleted = true` would
  not clear a conflict. Keep the earliest row per key and set `type = 'GENERAL'` on the rest (this preserves the
  data). Rows with a NULL related entity id never conflict.
- `notifications` has FORCE ROW LEVEL SECURITY, so these maintenance statements must run with the tenant setting
  per tenant or as a role that bypasses RLS. This is an operational step needing its own approval.

## 4. Corrected payslip in the same run: no second notification

Implemented by the key plus the rule that the notification is "the payslip became visible", not "its content
changed". A regenerated or corrected payslip in a released run produces a creation event again, the conflict target
returns 0 rows, and nothing is pushed. A required test: bulk-regenerating a payslip in an `APPROVED` run notifies
once and the second time sends nothing. A future "payslip corrected" type is out of scope.

## 5. `CONCURRENTLY` versus plain: framework check and recommendation

Framework facts (verified): Flyway is configured with `mixed: true`, `transactional-lock: false`, and a direct
(non-pooler) connection (`FLYWAY_URL`). V34 creates indexes with `CREATE INDEX CONCURRENTLY` and no directive, and
it has applied successfully: a fresh database migrates through V341, and Flyway stops on the first failure. V172
carries a comment saying production needs `-- flyway:executeInTransaction=false`; no migration in the repository
carries that directive, and V34 works without it. So the framework supports `CONCURRENTLY` here (test database
only; **not proven against production**).

| | `CREATE UNIQUE INDEX CONCURRENTLY` | plain `CREATE UNIQUE INDEX` |
|---|---|---|
| Locking | Does not block writes; waits for open transactions, scans the table twice | SHARE lock, blocks every notification write (all tenants) for the full scan |
| Duration | Longer, proportional to table size | Shorter, proportional to table size |
| Failure mode | Can leave an INVALID index; check `pg_index.indisvalid` and drop it | Rolls back cleanly |
| Fit with Flyway here | Supported (V34 precedent) | Always works |

**Recommendation: `CONCURRENTLY`.** Deployment procedure: (1) pre-flight count above must be 0; (2) apply the migration
before the code that depends on it; (3) afterwards assert `indisvalid` is true and the definition matches; (4) on
failure, `DROP INDEX CONCURRENTLY IF EXISTS` the invalid index and re-run; (5) rollback order is code first, then
the index. The new migration must be exercised by a real-Postgres test that migrates from V341 through the new
file and asserts the index is valid.

**Production row count and write traffic were not obtained.** I did not query any production database. A human
can run, read-only: `select count(*), pg_size_pretty(pg_total_relation_size('notifications')) from notifications;`
and `select date_trunc('day', created_at) d, count(*) from notifications where created_at > now() - interval
'14 days' group by 1 order by 1;`. Those decide expected duration, not the choice of `CONCURRENTLY`.

## Updated decisions needed

1. Approve the corrected key: `(tenant_id, user_id, 'PAYROLL_RUN', runId)` with `user_id` taken from the employee's
   linked user, and the rule to skip employees with no linked user.
2. Confirm that fixing the recipient (employees start receiving notices) is intended in this change.
3. Approve `CONCURRENTLY`, and decide who runs the pre-flight and the row-count queries.

---

# Final implementation and migration plan (for approval)

Plan state: **design approved; migration and code not approved for execution.** Decisions received 2026-10-11:
key `(tenant_id, user_id, 'PAYSLIP_AVAILABLE', run_id)` with `user_id` from the employee's linked user; the recipient
fix is intentional; `CREATE UNIQUE INDEX CONCURRENTLY` approved in principle, pending a production pre-flight run by
an authorized human (see [[Notification-Index-Preflight-Runbook]]). Kept separate from the pushed Batch 1 commit.

## Behaviour (as approved)

| Scenario | Expected notification |
|---|---|
| Payslip generated while the run is `PROCESSED` | None |
| Run transitions to `APPROVED` | One per employee whose payslip becomes visible, to the employee's linked user |
| Payslip created in an already `APPROVED` or `LOCKED` run | One to the affected employee's linked user |
| Run transitions to `LOCKED` | None |
| Approval transaction rolls back | None |
| Approval attempted again, or the event replayed | None (no duplicate row, no second push) |
| Payslip corrected or regenerated within the same run | None |
| Employee has no linked user | None; skipped and logged; never falls back to the employee id |

## Implementation (not started)

1. **Event.** A tenant-carrying event (tenant id, run id, newly visible payslips) published from `approvePayrollRun`
   and from `processBulkPayroll` (only when the run is already released, and only for newly created payslips). The
   `generatePayslipsForRun` call site publishes nothing.
2. **Listener.** `@TransactionalEventListener(AFTER_COMMIT)` plus `REQUIRES_NEW`; sets `TenantContext` from the event
   and clears it in `finally`; isolates failures per recipient; logs and counts failures.
3. **Recipients.** Resolve each payslip's employee to `employee.getUser().getId()` within the tenant. No linked user:
   skip and log. Never use the employee id.
4. **Persistence.** Native `INSERT ... ON CONFLICT (tenant_id, user_id, related_entity_type, related_entity_id) WHERE
   type = 'PAYSLIP_AVAILABLE' DO NOTHING`, binding every required column (`tenant_id`, `user_id`, `type`, `title`,
   `message`, `priority`, `version = 0`); non-null run id asserted; push only when one row was inserted, through a
   push-only method (not `sendToUser`); `actionUrl` = `/me/payslips`; new Java enum value `PAYSLIP_AVAILABLE`.
5. **Hardening.** `POST /notifications` rejects `PAYSLIP_AVAILABLE` (system-owned types), so it cannot be used to
   pre-empt a real notice.
6. **Frontend.** Correct the type-to-route map entry from `/me/payroll` (does not exist) to `/me/payslips`.
7. **Migration (unapplied).** `V342__notifications_payslip_available_unique_index.sql`, `CREATE UNIQUE INDEX
   CONCURRENTLY IF NOT EXISTS idx_notifications_payslip_available_uq ... WHERE type = 'PAYSLIP_AVAILABLE'`; the
   version is re-checked across all branches immediately before creation.

Expected files: `PayrollRunService`, a new event and listener, `NotificationRepository` (native insert),
`WebSocketNotificationService` (push-only method), `Notification` enum, `NotificationController`, the new migration,
`notificationRoutes.ts`, and the tests below.

## Regression test specification (written first, after approval)

The tests are **not written yet**: files that reference classes that do not exist would not compile and would break
the test build for everyone. They are written as failing tests first, once implementation is approved.

| # | Test | Level |
|---|---|---|
| 1 | Processing (`processPayrollRun`, `completeProcessing`) sends no availability notification | Unit |
| 2 | Approval notifies exactly one notification per employee with a linked user, after commit | Real Postgres |
| 3 | **Recipient identity:** the row and the push target the **user id**; nothing is addressed to the employee id | Real Postgres |
| 4 | **Missing linked user:** that employee is skipped and logged, the others are still notified | Unit + Postgres |
| 5 | **Tenant isolation:** an employee or payslip of another tenant receives nothing; the row's `tenant_id` is the run's | Real Postgres |
| 6 | **Approval rollback:** forcing a failure after `approve` yields no notification row and no push | Real Postgres |
| 7 | **Retries:** a second approval throws `IllegalStateException` and creates nothing | Unit |
| 8 | **Replay:** invoking the listener twice gives one row per user and one push | Real Postgres |
| 9 | **Corrected payslip:** deleting and regenerating a payslip in an `APPROVED` run sends nothing the second time | Real Postgres |
| 10 | Locking sends nothing | Unit |
| 11 | Bulk into a `DRAFT` or `PROCESSED` run sends nothing; into `APPROVED` or `LOCKED` notifies only the new employees, once | Unit + Postgres |
| 12 | One recipient failing does not roll back the approval or block the others | Unit |
| 13 | The notification link is `/me/payslips` | Unit |
| 14 | Persistence from the after-commit handler is actually committed and visible (no test-level `@Transactional`) | Real Postgres |
| 15 | **RLS:** as a non-bypass role (`nu_app_rls`) the insert succeeds with the tenant from the event and fails when it is cleared | Real Postgres |
| 16 | Push-only path: `sendToUser` is not used and no second row is written | Unit |
| 17 | `POST /notifications` rejects `PAYSLIP_AVAILABLE` | Controller |
| 18 | Frontend: `PAYSLIP_AVAILABLE` routes to `/me/payslips` | Vitest (`notificationRoutes.test.ts`) |
| M1-M7 | Migration: index exists, valid, unique and partial; duplicate rejected (23505); explicit conflict target inserts 0 rows on a duplicate and **fails when the index is missing**; other types repeat; different run, user or tenant allowed; a soft-deleted row still blocks a duplicate; migrating from V341 with existing `GENERAL` rows succeeds | Real Postgres |

## Approval gates (in order)

1. This document set is finalized (done in this revision).
2. Authorized operator runs the pre-flight and returns the report ([[Notification-Index-Preflight-Runbook]]).
3. Final migration and implementation plan is presented with those results, for approval.
4. Explicit execution approval, then: failing tests first, implementation, verification, a separate commit.
5. Migration applied only after its own approval; release security gate stays NOT_PASS.
