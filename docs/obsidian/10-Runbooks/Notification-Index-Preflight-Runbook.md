---
title: Notification index pre-flight runbook
tags: [runbook, database, notifications, preflight, approval-pending]
summary: Read-only production checks for a human operator before the payslip-notification unique index migration, with row-level-security handling, stop conditions, and the post-approval execution and recovery plan. Nothing here has been run.
---

# Notification index pre-flight runbook

**Who runs this:** a human operator with authorized, read-only access to the production database. No automated
worker should receive production credentials or run these queries. **Nothing in this document has been executed.**

**Purpose:** decide whether `idx_notifications_payslip_available_uq` can be built safely with
`CREATE UNIQUE INDEX CONCURRENTLY`. See [[Payslip-Notification-Timing-Plan]] for the design.

The migration is **not approved for execution**. This runbook only gathers evidence.

## 0. Row-level security: establish what you can actually see

`notifications` has ROW LEVEL SECURITY **enabled and forced**. Forced RLS applies even to the table owner, and the
restrictive policies require the setting `app.current_tenant_id`. A session without it sees **zero rows**, which
would make every check below look clean for the wrong reason. A query that cannot see all rows is not evidence.

Run first, in a read-only transaction:

```sql
begin read only;
select current_user, rolsuper, rolbypassrls from pg_roles where rolname = current_user;
```

- **Continue with method A** only if `rolsuper` or `rolbypassrls` is true.
- Otherwise use **method B** (per tenant, below).
- Always run the visibility sanity checks in section 1 before trusting any count.

**Method B, per tenant:** for each tenant id, inside its own transaction:

```sql
begin read only;
select set_config('app.current_tenant_id', '<tenant uuid>', true);
-- run the section 2 and 3 queries
rollback;
```

Take the tenant list from the `tenants` table if it is visible to your role; if it is not, obtain it from the
application's tenant administration instead and record the source.

## 1. Visibility sanity checks (must pass before anything else)

```sql
select count(*) as visible_rows from notifications;
select reltuples::bigint as planner_estimate, pg_size_pretty(pg_total_relation_size('public.notifications')) as total_size
  from pg_class where oid = 'public.notifications'::regclass;
select count(distinct tenant_id) as tenants_with_rows from notifications;
```

Stop if `visible_rows` is 0 or far below the planner estimate while the application has been in use (the estimate can
be stale after heavy deletes, so judge loosely), or if `tenants_with_rows` is implausibly low. Record the role and
method used.

## 2. Size and write activity

```sql
select date_trunc('day', created_at) as day, count(*) from notifications
 where created_at > now() - interval '14 days' group by 1 order by 1;
select date_trunc('hour', created_at) as hour, count(*) from notifications
 where created_at > now() - interval '14 days' group by 1 order by count(*) desc limit 5;
select type, count(*) from notifications group by type order by count(*) desc;
```

For a very large table, set `set local statement_timeout = '60s';` first and prefer the planner estimate over
`count(*)`. Record the peak hourly insert count and the quietest recurring window.

## 3. Payslip-type duplicate pre-flight (the decisive check)

```sql
select count(*) as payslip_type_rows from notifications where type = 'PAYSLIP_AVAILABLE';
select count(*) as payslip_type_null_entity from notifications
 where type = 'PAYSLIP_AVAILABLE' and related_entity_id is null;
select tenant_id, user_id, related_entity_type, related_entity_id, count(*)
  from notifications where type = 'PAYSLIP_AVAILABLE' and related_entity_id is not null
 group by 1,2,3,4 having count(*) > 1 order by count(*) desc;
```

**Expected:** `payslip_type_rows = 0` (the value does not exist in the application's enum today, so these notices have
been stored as `GENERAL`). Any non-zero count means rows were created another way, for example through
`POST /notifications`.

## 4. Index and migration state

```sql
select indexrelid::regclass as index_name, indisvalid, indisready
  from pg_index where indrelid = 'public.notifications'::regclass;
select version, description, success from flyway_schema_history order by installed_rank desc limit 5;
select pid, state, xact_start, now() - xact_start as age, left(query, 80) as query
  from pg_stat_activity where xact_start is not null order by xact_start limit 10;
```

- Any index with `indisvalid = false` is a leftover from an earlier failed concurrent build.
- Confirm the name `idx_notifications_payslip_available_uq` is not already taken.
- Confirm no migration at or above the proposed version exists and that no failed Flyway row is present.
- Long-open transactions are important: `CREATE INDEX CONCURRENTLY` waits for all transactions that were open when it
  started, so one stuck transaction can stall it indefinitely.
- Confirm that the migration connection (`FLYWAY_URL`) is a **direct, non-pooled** endpoint.

## 5. Stop conditions (report and wait; do not remediate on your own)

1. Visibility could not be established (section 0 or 1).
2. `payslip_type_rows` is not 0, or any duplicate group appears. **Do not rewrite, re-type or delete notification
   records.** Report the rows; a remediation plan will be presented for approval.
3. An invalid or conflicting index exists.
4. Long-running transactions that could stall the build, or no acceptable maintenance window.
5. `FLYWAY_URL` is not direct, or the schema history shows a failed migration.

## 6. Report template (operator returns this)

| Item | Result |
|---|---|
| Date, role used, method (A or B), tenant source |  |
| `visible_rows`, planner estimate, total size, tenants with rows |  |
| Peak hourly inserts, quietest window |  |
| `payslip_type_rows` / null-entity rows / duplicate groups |  |
| Invalid or conflicting indexes |  |
| Oldest open transaction age |  |
| Direct (non-pooled) migration connection confirmed |  |
| Schema history: latest versions, failed rows |  |

## 7. Execution plan (only after separate, explicit approval)

1. Re-run the all-branches version check: `git log --all --diff-filter=A -- 'backend/src/main/resources/db/migration/V3*'`.
2. Apply the migration **before** the code that relies on it, in the agreed window, with the migration connection
   direct.
3. Verify immediately:
   ```sql
   select indexrelid::regclass, indisvalid, indisready from pg_index
    where indexrelid = 'public.idx_notifications_payslip_available_uq'::regclass;
   ```
   Both flags must be true, and the definition must match the approved SQL.
4. **Recovery if the concurrent build fails:** the migration runs outside a transaction, so a failure can leave an
   INVALID index and a failed row in `flyway_schema_history`. Drop the invalid index with
   `drop index concurrently if exists public.idx_notifications_payslip_available_uq;`, then repair the failed history
   row with the Flyway repair command, run by a human. The project's `repair-on-migrate` property is recorded as a
   no-op, so startup will refuse to migrate until the failed row is repaired. Then retry.
5. Rollback order if the feature must be withdrawn: revert the code first, then
   `drop index concurrently if exists ...`. Never drop the index while the new code is running (its inserts name the
   index as their conflict target and would fail loudly).
6. Record the result and keep the release security gate at NOT_PASS until its own conditions are met.
