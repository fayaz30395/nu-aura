# Database / Migration Layer Verification — 2026-09-24

Scope: `backend/src/main/resources/db/migration/` (319 files). Analysis-only — no
migrations edited, nothing run against a live database, no git/commit actions taken.

## 1. Migration chain integrity — TRUE HEAD IS V330, NOT V316

Sorting numerically (not lexically):

- **319 files**, versions run from V0 to **V330**.
- **No duplicate version numbers.**
- **Gaps found** (not necessarily a problem — Flyway doesn't require contiguous
  numbering — but worth knowing so a "missing migration" isn't assumed later):
  - `V0 → V2` (no V1)
  - `V26 → V30` (V27–V29 absent)
  - `V272 → V277` (V273–V276 absent)
  - `V277 → V282` (V278–V281 absent)
- **Project memory says HEAD is V316 (from the 2026-06-25 release gate). That is
  stale.** 14 more migrations have landed since: V317–V330, most recently
  **V330__fix_contract_signatures_rls_nullif.sql**. The true current HEAD is
  **V330**. The V312 `fk_employees_user` incident memory cites is real (see §2)
  but is not the latest chain event.

## 2. Migrations edited after being written/applied — CONFIRMED DRIFT RISK

Two migrations were rewritten in place across multiple commits, which is exactly
the class of change that causes Flyway checksum-mismatch failures once a
migration has already run against a target environment:

### V316__fix_arun_manager_to_sumit.sql — edited 3 times, most recently 2026-09-20
```
2fe71e70  2026-06-25  original: unconditional UPDATE manager_id
f8a95e7c  2026-06-25  added EXISTS guard (manager may not exist on fresh provision)
e9730957  2026-09-20  rewrote UPDATE: added missing RLS tenant GUC (set_config) +
                       fixed wrong id (was using Sumit's USER id, not EMPLOYEE id)
```
Per the `e9730957` commit message itself, this migration **silently no-op'd
everywhere it ran, including prod** — the RLS fail-closed policy blocked the
UPDATE and the EXISTS guard referenced the wrong id. Project memory records
V316 as deployed to prod on 2026-06-25 (Railway `5eda585a`), i.e. **before** the
2026-09-20 rewrite. That means:
- Prod's `flyway_schema_history` row for V316 was recorded against the *old*
  checksum (the never-worked version).
- `application-prod.yml` sets **`repair-on-migrate: false`** (see below) — so
  unlike dev/default profile, prod will **not** self-heal this checksum drift
  automatically. The next prod deploy that runs Flyway will fail
  `migrate`/`validate` with a checksum mismatch on V316 unless an operator
  runs `flyway repair` first, or the checksum happens to already have been
  repaired out-of-band. This should be verified against the actual prod
  `flyway_schema_history` table before the next deploy — I did not connect to
  any database to check.

### V312__seed_demo_finance_admin_user.sql — edited 2 times, most recently 2026-09-19/20
```
489711da  feat(e2e): add tenantAdmin fixture + V291 demo user seed
35f13bb1  fix(green-flag Run-6): accurate employee soft-delete copy + seed missing FINANCE_ADMIN demo user
5a726abf  fix(migration): V312 fk_employees_user breaks fresh demo-enabled provisioning
```
This matches the incident already documented in project memory (`fk_employees_user`
breaking fresh demo-enabled provisioning, fixed by `5a726abf` + repair-on-migrate).
Same underlying pattern as V316: a migration edited after having already run
somewhere. The commit message for V316 (`e9730957`) explicitly calls this "the
V312 precedent," confirming the team is aware of the pattern but has repeated it.

**Recommendation:** treat any future "fix an already-numbered migration in
place" edit as high-risk; prefer a new migration (V331+) that corrects the
previous one's effect, since prod does not auto-repair checksums.

## 3. Destructive operations — all guarded, none found without protection

| File | Line | Operation | Guard |
|---|---|---|---|
| `V55__consolidate_project_member_tables.sql` | 33 | `DROP TABLE IF EXISTS project_employees CASCADE` | `IF EXISTS`; migrates rows into `project_members` first, then recreates `project_employees` as a compatibility `VIEW` immediately after |
| `V213__align_mileage_audit_columns.sql` | 60, 71 | `ALTER TABLE … DROP COLUMN last_modified_by` | Wrapped in `DO $$ IF EXISTS (information_schema.columns check) THEN … END IF; END $$` |
| `V225__align_payroll_adjustment_audit_columns.sql` | 15 | `DROP COLUMN IF EXISTS last_modified_by` | `IF EXISTS` clause |
| `V235__align_shift_pattern_audit_columns.sql` | 15 | `DROP COLUMN IF EXISTS last_modified_by` | `IF EXISTS` clause |
| `V237__align_statutory_filing_audit_columns.sql` | 6, 12 | `DROP COLUMN IF EXISTS last_modified_by` | `IF EXISTS` clause |
| `V253__fix_app_role_permissions_role_fk.sql` | 10 | `DELETE FROM app_role_permissions WHERE role_id NOT IN (SELECT id FROM app_roles)` | Scoped `WHERE` (deletes only orphaned rows failing the FK it's about to add back) — not an unqualified delete |

No `TRUNCATE` anywhere in the migration set. No unguarded `DROP TABLE`/`DROP
COLUMN`/unqualified `DELETE FROM` found.

## 4. Seeded credentials / demo passwords

Demo credentials are seeded in several migrations. Reporting file/line/column
only, no values:

| File | What it does |
|---|---|
| `V0__init.sql:107` | Defines `users.password_changed_at TIMESTAMPTZ` — the column that governs the 90-day expiry policy (see §5) |
| `V120__password_history.sql` | Creates `password_history` table (tracks last N hashes per user) |
| `V121__reset_demo_user_passwords.sql` | `UPDATE users SET password_hash = <hash literal>, password_changed_at = NOW(), … WHERE tenant_id = '660e8400…' AND email LIKE '%@nulogic.io'` |
| `V122__reset_all_demo_passwords.sql` | Same as V121, all-tenant (`WHERE email LIKE '%@nulogic.io'`) |
| `V173__restore_sarankarthick_demo_superadmin.sql` | Seeds one demo superadmin row, sets `password_changed_at = NOW()` |
| `V312__seed_demo_finance_admin_user.sql` | Seeds FINANCE_ADMIN demo user (subject to the edit history in §2) |
| `V314__reneutralize_demo_credentials_after_v312.sql` | Closes the "ungated finance@ demo backdoor" opened by V312 (per commit `15f757cc`) |
| `V315__seed_admin_user_and_fix_hr_manager_permissions.sql` | Seeds `admin@nulogic.io` |

All demo accounts share one bcrypt hash (the literal is embedded in V121/V122
and is already documented elsewhere as project knowledge — not repeating it
here). `AuthService.java:283` also carries a runtime `KNOWN_DEMO_PASSWORD_HASHES`
allow/deny check gated by `demoCredentialsEnabled`, independent of the DB.

## 5. KEY DELIVERABLE — how to reset the expired demo password legitimately

**Table/column that governs expiry:** `users.password_changed_at` (TIMESTAMPTZ,
defined `V0__init.sql:107`).

**Enforcement logic** — `AuthService.java:290-296`:
```java
if (user.getPasswordChangedAt() != null && passwordPolicyConfig.getMaxAgeDays() > 0) {
    long daysSinceChange = ChronoUnit.DAYS.between(
            user.getPasswordChangedAt().toLocalDate(), tenantTimeService.today(tenantId));
    if (daysSinceChange > passwordPolicyConfig.getMaxAgeDays()) {
        throw new BusinessException("Your password has expired. Please reset your password.");
    }
}
```
`maxAgeDays` defaults to **90** (`PasswordPolicyConfig.java:76`). Since the last
bulk demo reset (V121/V122, dated 2026-04-08) is now >90 days old (today is
2026-09-24, 169 days elapsed), every `@nulogic.io` demo account is locked out —
this is the E2E blocker referenced in the mission brief.

**Two legitimate paths exist. Neither has been executed — both are proposals
for a human to run:**

### Option A (matches existing precedent, V121/V122 pattern) — new Flyway migration
Add `V331__refresh_demo_password_expiry.sql`:
```sql
UPDATE users
SET password_changed_at = NOW(),
    updated_at           = NOW()
WHERE email LIKE '%@nulogic.io';
```
This only touches the expiry column, not `password_hash` — the demo password
itself is unchanged, it's just no longer "expired." This is the lowest-risk
option because it's declarative, versioned, re-runs the same way in every
environment via the same pipeline as every other migration, and doesn't
require raw DB access. **Target environment:** ships to whatever environment
next runs Flyway migrate — for this to reach prod (Railway) it goes through
the normal deploy path, same as V330.

### Option B — direct SQL, for a one-off unblock without a new migration
Run directly against a target Postgres instance (dev/Neon or prod/Railway,
operator's choice — NOT executed here):
```sql
UPDATE users
SET password_changed_at = NOW()
WHERE email LIKE '%@nulogic.io';
```
Faster to unblock local/CI E2E runs today, but leaves no record in the
migration chain — the next fresh provision (new dev DB, new Testcontainers
run, a new Railway environment) will re-seed via V121/V122 with the *original*
`password_changed_at = NOW()` timestamp at provision time, so this only matters
for **long-lived, already-provisioned** databases (i.e., prod and any
long-lived dev/Neon instance), not fresh ones.

### Also available: the admin reset-password endpoint
`SystemAdminController.java:264` — `POST /admin/users/reset-password`
(`SystemAdminController.adminResetPassword`, SuperAdmin-only). This exists
specifically to close "no admin password reset path" per its own javadoc. It
would also clear the expiry (sets a new hash + `password_changed_at`), but
requires an already-authenticated SuperAdmin session — which is exactly what's
blocked if the SuperAdmin's own demo account is also expired. Not usable as
the *first* unblock unless one account is fixed via Option A/B first.

**Recommendation:** Option A (versioned migration) for anything that should
reach prod; Option B only as a stopgap directly against a specific
already-provisioned environment, and only by a human with DB access.

## 6. Offline migration validation — YES, via Testcontainers

`backend/src/test/java/com/nulogic/config/AbstractPostgresIntegrationTest.java`
spins up a real `postgres:16-alpine` Testcontainer (matches prod image) and
points `spring.flyway.url/user/password` at it via `@DynamicPropertySource`.
Every integration test extending this class runs the full Flyway chain against
a throwaway Postgres 16 instance, so migration correctness (including new
ones) is validated offline before merge. Confirmed consumers include
`RlsNoBypassTest`, `RlsTenantGucScopeTest`, `TenantTimeServiceIntegrationTest`,
`OutboxEventProcessorTest`. Project memory notes this requires a Docker socket
symlink on Colima (`sudo symlink /var/run/docker.sock → colima socket`) to run
locally — did not attempt to run it in this session (no destructive/live DB
actions were in scope).

## Summary for report-back

- **True migration HEAD: V330** (`V330__fix_contract_signatures_rls_nullif.sql`), not V316 — memory is 14 migrations stale.
- **Chain integrity:** no duplicate versions; 4 numbering gaps (cosmetic, not blocking); no out-of-order regressions beyond the two rewrite cases below.
- **Checksum drift risk confirmed:** V316 (and V312, previously documented) were edited in place after already running in some environment, most recently V316 on 2026-09-20. `application-prod.yml` has `repair-on-migrate: false`, so prod will **not** auto-heal this — verify prod's `flyway_schema_history` before the next deploy.
- **Destructive ops:** 1 `DROP TABLE`, 6 `DROP COLUMN` lines, 1 scoped `DELETE FROM` — all guarded (`IF EXISTS` / conditional `DO` blocks / narrow `WHERE`). Nothing unguarded found.
- **Demo password expiry fix path:** table `users`, column `password_changed_at`, 90-day policy in `PasswordPolicyConfig.maxAgeDays` / enforced in `AuthService.java:290-296`. Proposed fix (unexecuted): new migration `V331` (or a direct SQL `UPDATE users SET password_changed_at = NOW() WHERE email LIKE '%@nulogic.io'`) — see §5 for both statements and target-environment guidance.
- **Offline Flyway validation:** yes — `AbstractPostgresIntegrationTest` runs the full chain against Testcontainers Postgres 16 on every integration test.
