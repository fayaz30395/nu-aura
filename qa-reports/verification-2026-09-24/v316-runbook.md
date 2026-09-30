# V316 checksum drift — operator runbook

**Status: DRIFT CONFIRMED (deterministically, from git). Gate 1 remains BLOCKED pending a
read-only prod query the operator must run.**

---

## 1. Drift is certain, not predicted

The deployed content and the repo content are materially different files:

| Version | Commit | Size |
|---|---|---|
| Deployed to prod 2026-06-25 | `f8a95e7c` | **1,237 bytes** |
| Current repo HEAD | `e9730957` (2026-09-20) | **1,769 bytes** |

```
$ git show f8a95e7c:backend/.../V316__fix_arun_manager_to_sumit.sql > /tmp/v316_old.sql
$ diff /tmp/v316_old.sql backend/.../V316__fix_arun_manager_to_sumit.sql
→ CONTENT DIFFERS
```

The rewrite added an RLS tenant GUC (`set_config('app.current_tenant_id', …)`) and corrected the
manager id from Sumit's **user** id (`48000000-0e02-…0001`) to his **employee** id
(`48000000-e001-…0001`).

Flyway's checksum is content-derived, so a content change of this size guarantees a mismatch.
No hand-computed CRC is needed to establish that, and none should be trusted over `flyway info`.

**Consequence:** `application-prod.yml:105` sets `repair-on-migrate: false` (dev/default: `true`).
Prod does not self-heal. The next prod deploy **will** fail Flyway validation — this is a
certainty, not a risk.

## 2. The second, easier-to-miss consequence

The commit message on `e9730957` says it plainly: *"V316 never applied — missing RLS tenant GUC +
wrong id"*. The original migration **silently no-op'd wherever it ran, including prod** — the
`EXISTS` guard compared against a user id that never matches an employee row, so zero rows were
updated and the migration still recorded `success = true`.

So there are two distinct problems, and repair only solves the first:

1. **Checksum mismatch** → blocks the deploy → `flyway repair` fixes this.
2. **The data fix never actually applied in prod** → `flyway repair` does **not** fix this.
   Repair realigns the recorded checksum; it does not re-execute an already-recorded migration.
   Grep confirms the Arun→Sumit manager correction exists **only** in V316 — no later migration
   carries it.

**Therefore:** after repair, Arun's `manager_id` in prod is still wrong. Correcting it requires a
NEW forward migration (V332+), not a repair. Do not assume repair restored the intended data state.

## 3. Read-only verification (run this first)

```sql
SELECT version, description, checksum, success, installed_on, execution_time
FROM flyway_schema_history
WHERE version = '316';
```

Also worth capturing for context:

```sql
SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
SELECT COUNT(*) FROM flyway_schema_history WHERE success = false;   -- expect 0
```

## 4. Decision rule

| Observation | Action |
|---|---|
| `success = true` AND checksum ≠ repo checksum | **Repair.** This is the expected case. |
| `success = true` AND checksum = repo checksum | No drift. Nothing to do — Gate 1 clears on this output alone. |
| **`success = false`** | **STOP. Do not repair.** That is a *failed migration*, a different and more serious problem. Repair would paper over it. Escalate. |
| No row for version 316 | V316 never reached this database. Do not repair; investigate which environment you are connected to. |

## 5. Repair

```bash
railway login          # interactive browser — the CLI token is expired and has no linked project
railway link           # select nu-aura
# obtain the prod connection string, then:
flyway repair
```

Flyway `repair` rewrites only the `flyway_schema_history` metadata table. It does not touch
application data and does not re-run migrations.

## 6. Confirm

```sql
-- re-query: checksum should now match the repo's V316
SELECT version, checksum, success FROM flyway_schema_history WHERE version = '316';
```

Then validate the chain without applying anything:

```bash
flyway validate
```

Expected: validation passes, and a subsequent deploy migrates cleanly from V331 onward.

## 7. What flips Gate 1

**Gate 1 goes BLOCKED → PASS on exactly one output:** `flyway validate` returning success against
production, after either (a) confirming no drift exists, or (b) repairing and re-validating.

Nothing else clears it. A green local build does not — the drift is in prod's metadata table, not
in the repo.

## 8. Snapshot before touching anything

Take a database snapshot before running `repair`. It is metadata-only and low risk, but it is
still a write against production, and a snapshot costs nothing.

---

## Why this could not be completed autonomously

The Railway CLI is authenticated as the account owner but has **no linked project**, and
project-scoped API calls return `Unauthorized`. Re-authentication requires an interactive browser
login. No read-only path to production's `flyway_schema_history` exists from this environment, and
fabricating the value would defeat the purpose of the gate.
