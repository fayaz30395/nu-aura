# Super E2E regression — ABORTED at pre-flight

**UTC:** 20260421T205756Z
**Stage:** Pre-flight, before any worker dispatch

## Why aborted

Backend cannot start. Flyway chain is wedged on V132.

### Root cause chain

1. **V130 duplicate (my fix).** The prior fixer dispatch left two `V130__*.sql` files:
   - `V130__seed_enable_lms_feature_flag.sql` (already applied, in flyway_schema_history)
   - `V130__add_helpdesk_ticket_permissions_to_employee.sql` (new, untracked)
   → Renamed the new one to `V139__add_helpdesk_ticket_permissions_to_employee.sql` and rebuilt the jar. That unblocked resolver.
2. **V132 column mismatch (pre-existing).** With resolver unblocked, Flyway now attempts V132 → V133 → ... for the first time on this environment and fails:
   ```
   Script V132__seed_lms_course_view_for_employee.sql failed
   ERROR: column "module" of relation "permissions" does not exist
   ```
   `information_schema` confirms the `permissions` table has a `resource` column, not `module`. V132 and V133 both INSERT into `permissions (..., module, action, ...)` — neither column exists; the real columns are `resource` and `action` (action exists).
3. **Why it wasn't caught earlier.** `flyway_schema_history` shows V131 as the last successful migration. V132–V138 have never applied on this Neon database. The backend instance that was reported "UP" in the previous run must have been an older jar that pre-dated V132, OR the operator had been running without the current migration files on the classpath.

### What this means for the super-e2e run

- Every pass depends on live backend. Cannot proceed.
- Fixing V132/V133 is not in-scope for a QA regression — it's a migration audit that needs to cover V132–V139 (column names, missing ON CONFLICT clauses, schema assumptions). Silently "fixing" them by guessing `resource`/`action` substitutions risks seeding the wrong permission rows and corrupting RBAC state across all roles — exactly what this run was supposed to verify.

## Recommended next steps (for a human, not a QA agent)

1. Audit V132–V139 against the real `permissions` table schema (13 columns: id, code, name, description, action, resource, created_at, updated_at, version, is_deleted, created_by, updated_by, deleted_at).
2. For each bad INSERT, decide whether to: (a) rewrite the migration, (b) add a compensating V140 migration that seeds the right rows and adds `module`/`action` as generated columns if some code still reads them, or (c) mark V132 as `baseline` and move on.
3. Confirm the backend class code that previously ran against V131-only DB doesn't expect a `module` column on `permissions` (check `Permission` JPA entity).
4. Re-run `/nu-chrome-super-e2e` once backend is healthy.

## What this run DID leave behind

| File | Change |
|------|--------|
| `backend/src/main/resources/db/migration/V130__add_helpdesk_ticket_permissions_to_employee.sql` → `V139__...` | Renamed. Fixes duplicate-V130 resolver error. |
| `backend/target/hrms-backend-1.0.0.jar` | Rebuilt with V139 rename. BUG-W3-02 cookie-clearing fix is in this jar (AuthController change committed in the earlier fixer dispatch). |

No product code changed in this invocation. No git commits. No frontend changes.

## Context

Bugs that were going to be re-verified (all deferred until backend is up):
- BUG-W3-02 /auth/refresh cookie clearing on failure
- BUG-W2-02 /assets PermissionGate
- BUG-W2-04 /contracts PermissionGate
- BUG-W3-01 RECRUITMENT_ADMIN access to /recruitment/jobs
