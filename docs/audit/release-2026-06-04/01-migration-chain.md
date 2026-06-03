# Flyway Migration Chain Audit — NU-AURA

- **Date:** 2026-06-04
- **Scope:** `backend/src/main/resources/db/migration/` (V0 … V269)
- **Mode:** READ-ONLY audit. No files were modified.
- **Method:** Filesystem inspection (Glob/Grep/Read on the working tree). Git history
  inspection was **blocked** — see Check 2.

---

## Summary verdict

| # | Check | Verdict |
|---|-------|---------|
| 1 | Version sequence (count / min / max / gaps / dupes) | **PASS (with benign gaps)** |
| 2 | Forward-only / immutability (git) | **UNVERIFIED — could not run git** |
| 3 | Repeatable (`R__`) migrations | **PASS (none present)** |
| 4 | Risky / destructive DDL | **PASS (with items to review)** |
| 5 | RLS enable/force + V254 NOBYPASSRLS reassert | **PASS** |
| 6 | `tenant_id` on recent tables (V255–V269) | **PASS** |

**Overall:** The chain is *structurally* release-grade — no duplicate versions, monotonic
ordering, no `R__` repeatable hazards, RLS hardening is present and well-formed, and the one
new table in the recent range is tenant-scoped. The single hard gate that remains **unverified**
is migration immutability (Check 2), because the sandbox shell was unavailable for git.
That check **must be run by the user** before sign-off (command below).

---

## Check 1 — Version sequence

- **Total versioned files:** 266 (`V<n>__*.sql`), all distinct versions.
- **Min version:** V0 (`V0__init.sql`)
- **Max version:** V269 (`V269__allow_tenant_sequence_allocators_under_rls.sql`)
- **Duplicate version numbers:** **NONE.** No two files share an integer version
  (`uniq -d` on parsed versions returned empty).
- **Missing version numbers in 0..269:** **{1, 27, 28, 29}** — 4 gaps.
  - Confirmed by direct lookup: no `V1__*.sql`, `V27__*.sql`, `V28__*.sql`, `V29__*.sql` exist.
  - Arithmetic check: range 0–269 = 270 slots; 270 − 4 = 266 files. Consistent.

**Verdict: PASS.** Flyway does **not** require a gapless sequence — gaps are legal and Flyway
applies whatever is present in ascending order. Gaps at V1/V27/V28/V29 are almost certainly
versions that were squashed or never merged. They are **benign** as long as no environment has
already recorded those versions in `flyway_schema_history` (a fresh-DB migrate will confirm).
No duplicates is the load-bearing property here, and that holds.

---

## Check 2 — Forward-only / immutability  ⚠️ UNVERIFIED

**This is the one check that could not be completed.** The sandbox shell
(`/sessions/.../mnt/nu-aura`) was locked by a stuck long-running process for the entire session
and every `git` invocation failed with `process ... already running`. Git is required to detect
whether a historical (already-committed) migration file was later **modified** (which breaks the
Flyway checksum of any environment that already applied it).

**The user MUST run this on their machine and confirm it returns nothing of concern:**

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura

# 1) Any migration file ever modified (M) after introduction — the danger signal:
git log --diff-filter=M --name-only --pretty=format:'%h %s' \
  -- backend/src/main/resources/db/migration/ | grep -E 'db/migration/.*\.sql' | sort -u

# 2) Per-file modification count (anything > 0 modifications = checksum risk):
for f in backend/src/main/resources/db/migration/V*__*.sql; do
  m=$(git log --diff-filter=M --oneline -- "$f" | wc -l | tr -d ' ')
  [ "$m" -gt 0 ] && echo "MODIFIED ($m): $f"
done
```

**Pass criterion:** both commands print nothing. Any printed `V<n>__*.sql` is a
**RELEASE BLOCKER** — that migration's checksum changed after it was committed, and any database
that already ran it will fail Flyway validation (`Migration checksum mismatch`). Remediation is
to revert the content and ship the change as a new forward migration instead.

---

## Check 3 — Repeatable migrations (`R__`)

- **`R__*.sql` files found:** **NONE.**
- No non-standard filenames (every file matches `V<n>__*.sql`).

**Verdict: PASS.** No repeatable migrations means no risk of an `R__` script silently re-running
on a content change. The chain is purely versioned/forward.

---

## Check 4 — Risky / destructive DDL

Grep across all migrations:

- **`DROP TABLE`:** 1 occurrence — `V55__consolidate_project_member_tables.sql`:
  `DROP TABLE IF EXISTS project_employees CASCADE;` (one-time consolidation of project-member
  tables). **Review for deployed-schema upgrades:** on an environment that still has
  `project_employees` populated, this drops it with CASCADE. Acceptable if the consolidation was
  already validated in lower environments, but confirm the replacement table is backfilled first.
- **`TRUNCATE`:** **NONE** (matches were only the word "truncated" in comments of
  `V32__failed_kafka_events.sql`).
- **`DROP COLUMN`:** several, all redundant audit-column realignments (`last_modified_by`):
  - `V213__align_mileage_audit_columns.sql` (lines 60, 71) — bare `DROP COLUMN` but **guarded by
    `IF EXISTS (... information_schema.columns ...)` inside a `DO $$` block**, so idempotent/safe.
  - `V225__align_payroll_adjustment_audit_columns.sql`, `V235__align_shift_pattern_audit_columns.sql`,
    `V237__align_statutory_filing_audit_columns.sql` — all use `DROP COLUMN IF EXISTS`.
- **`DROP CONSTRAINT`:** `V253__fix_app_role_permissions_role_fk.sql`,
  `V259__create_knowledge_templates.sql` — both `DROP CONSTRAINT IF EXISTS` (FK realignment). Safe.

**Verdict: PASS (with review items).** No `TRUNCATE`. All column/constraint drops are
idempotent and target redundant audit columns / FKs, not data-bearing columns. The only true
data-loss statement is the single `DROP TABLE ... CASCADE` in V55, which must be confirmed safe
against any deployed schema during the upgrade-path migrate.

---

## Check 5 — RLS coverage (enable/force + V254 NOBYPASSRLS)

29 migrations reference `ENABLE/FORCE ROW LEVEL SECURITY`. The hardening chain is coherent and
fail-closed:

- **`V254__enforce_runtime_rls_fail_closed.sql`** (the requested ~V254 file) does exactly what's
  expected:
  - **Reasserts `ALTER ROLE nu_app_rls NOBYPASSRLS`** (lines 21–32), guarded for role-absence and
    insufficient-privilege.
  - Scans every `public` table with a UUID `tenant_id`, runs `ENABLE` + `FORCE ROW LEVEL
    SECURITY`, and installs a **RESTRICTIVE** policy requiring
    `app.current_tenant_id` to be present and to match `tenant_id` (fail-closed when context is
    absent). SuperAdmin bypass is explicitly **application-layer only** (header comment).
- **`V255__reenforce_rls_on_all_tenant_tables.sql`** — idempotent re-scan so release validation
  fails closed if any tenant table still lacks RLS/FORCE/policy.
- **`V262__reenforce_rls_after_late_tenant_tables.sql`** — re-enforces after later tenant tables
  were added.
- **`V263__allow_global_catalog_rows_under_rls.sql`** — deliberate carve-out so null-tenant
  global catalog rows (`permissions`, `tenants`, `nu_applications`, `app_permissions`,
  `app_roles`, `app_role_permissions`) remain visible to the runtime role (login fix), while
  tenant-owned rows stay fail-closed.
- **`V269__allow_tenant_sequence_allocators_under_rls.sql`** — sequence-allocator carve-out.
- Earlier coverage: V24, V36, V37, V38, V81, V90, V177, V179, etc.

**Verdict: PASS.** RLS is enabled+forced across tenant tables, `nu_app_rls` is reasserted as
`NOBYPASSRLS`, policies are restrictive and tenant-context-required, and the global/sequence
carve-outs are intentional and scoped.

---

## Check 6 — `tenant_id` on recent tables (V255–V269)

Grep for `CREATE TABLE` in V255–V269 found exactly **one** new table:

- **`V259__create_knowledge_templates.sql`** → `CREATE TABLE IF NOT EXISTS knowledge_templates`
  includes **`tenant_id UUID NOT NULL`** plus standard audit/soft-delete columns and a
  tenant-scoped unique index (`(tenant_id, slug) WHERE is_deleted = FALSE`). Correctly multi-tenant.

All other V255–V269 migrations are RLS re-enforcement, column/audit alignment, permission/role
seeds, or constraint fixes — no new tables, so nothing else to tenant-scope.

**Verdict: PASS.** The only new table in the recent range is properly `tenant_id`-scoped; it will
be picked up by the V254/V255/V262 RLS scans automatically.

---

## What the user must run to fully validate

1. **Immutability gate (Check 2 — currently UNVERIFIED, run first):** the two `git log
   --diff-filter=M` commands above. Both must print nothing.

2. **Fresh-DB migrate (proves the chain applies clean from V0):**
   ```bash
   docker-compose up -d
   cd backend && ./start-backend.sh   # Flyway runs V0..V269 on an empty schema
   # or: ./mvnw -q flyway:migrate -Dflyway.url=<fresh-db-url>
   ```
   Expect: success through V269, no "Migration checksum mismatch", no "Validate failed".

3. **Upgrade-from-deployed-schema migrate (proves no destructive surprise on a live DB):**
   - Restore a copy of the current production/staging schema, then run Flyway against it.
   - Pay special attention to **V55 `DROP TABLE project_employees CASCADE`** and the
     `DROP COLUMN last_modified_by` realignments (V213/V225/V235/V237) — confirm those columns/tables
     are already absent or safely replaced in the deployed schema so the upgrade is non-destructive.
   - Confirm `flyway_schema_history` has no rows for the gap versions {1, 27, 28, 29}.

**Bottom line:** structurally release-grade and RLS-hardened; the **only** outstanding gate is the
git immutability check, which was not runnable in this environment and must be confirmed by the
user before release.
