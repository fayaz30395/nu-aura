# nu-chrome-e2e — ABORTED

**Run:** 2026-04-22-0415
**Mode:** --full (default)
**Reason:** Prerequisite self-check failed — backend could not reach `/actuator/health` within the
120s window. Root cause is a Flyway migration error blocking Spring Boot startup. Resolving it is
out-of-scope for the autonomous loop (it requires a schema decision against the shared Neon dev DB,
not a ≤3-line code fix).

---

## Self-check results

| Check                                                              | Result                                             |
|--------------------------------------------------------------------|----------------------------------------------------|
| Frontend `GET http://localhost:3000`                               | 200 OK                                             |
| Backend `GET http://localhost:8080/actuator/health`                | **000 (connection refused)** after 120 s           |
| Chrome DevTools MCP                                                | available (tabs_context_mcp responsive)            |
| Docker daemon                                                      | was down; launched Docker Desktop, came up in ~5 s |
| docker-compose infra (redis, kafka, zk, elasticsearch, prometheus) | all started                                        |

## Why the backend is not up

On startup, Flyway aborts on migration **V132**:

```
Script V132__seed_lms_course_view_for_employee.sql failed
SQL State  : 42703
Message    : ERROR: column "module" of relation "permissions" does not exist
  Position : 610
Location   : db/migration/V132__seed_lms_course_view_for_employee.sql
```

Neon (dev DB) is currently at schema version **131**. Migration V132 fails on first application.

### Evidence

- V132 SQL itself does not reference a `module` column (it INSERTs into
  `permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)`).
- The `permissions` table in `V0__init.sql` has no `module` column either.
- The failure therefore comes from a **database trigger or rule** on `permissions` that references
  `NEW.module`, not from the migration SQL itself.
- V133–V139 are also present and will queue behind V132.

### Queued migrations (unapplied)

```
V132__seed_lms_course_view_for_employee.sql          ← failing
V133__seed_analytics_view_for_hr_roles.sql
V134__fix_fluence_lms_missing_columns.sql
V135__fix_expense_claims_missing_columns.sql
V136__fix_employee_rbac_leaks.sql
V137__add_payroll_recalculation_flag.sql
V138__okr_objective_performance_indexes.sql
V139__add_helpdesk_ticket_permissions_to_employee.sql
```

Several of these (V136 RBAC leaks, V134/V135 missing columns) look like fixes landed from prior QA
runs but never successfully migrated against Neon because V132 is in the way.

## Why the skill cannot resolve this itself

The skill's Developer Lead rule is **≤3-line, no-new-files, no-new-abstractions** fixes inside app
code. This failure requires:

1. Inspecting Neon-side triggers/rules to find the `NEW.module` reference (DB introspection).
2. Either editing the trigger OR updating V132 to set `session_replication_role = replica` around
   the INSERT OR adding a `module` column to `permissions`.
3. That decision affects every subsequent migration in prod and cannot be an autonomous ≤3-line
   patch.

## Recommended next step for the user

Run against Neon to find the offending trigger, then choose the correct fix:

```sql
SELECT event_object_table, trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'permissions';

SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'permissions'::regclass AND NOT tgisinternal;
```

Once the trigger / rule is identified, one of:

- **Option A** — Drop the stale trigger in a new V132a repair migration (if it is leftover from an
  older schema).
- **Option B** — Add `module VARCHAR` column to `permissions` in a preceding migration (if the
  trigger is new and the column was forgotten).
- **Option C** — Temporarily disable the trigger around the V132 INSERT (least invasive but does not
  fix root cause).

After V132 applies cleanly and the backend serves `/actuator/health`, rerun `/nu-chrome-e2e` — the
skill will proceed with the full 900-UC catalog sweep.

## Services still running after abort

- Docker Desktop + infra containers (`hrms-redis`, `hrms-kafka`, `hrms-zookeeper`,
  `hrms-elasticsearch`, `hrms-prometheus`) — left up so the next run starts faster. Kill with
  `docker-compose down` if desired.
- Frontend Next.js dev server on :3000 — not started by this run; was already up.
- Backend Spring Boot — crashed out; no process to clean up.

SKILL_EXIT: failed reason=prereq_backend_flyway_v132_permissions_module_column_missing
