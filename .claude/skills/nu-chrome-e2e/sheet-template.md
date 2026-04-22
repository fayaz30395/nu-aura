# QA Bug Sheet — Single Source of Truth

> Updated atomically via `mv tmp bug-sheet.md`. Never hand-edit while a sweep is running.

**Run started:** {{START_ISO}}
**Mode:** {{MODE}}   (e.g. --full, --rbac, --module=leave, --uc=UC-RBAC-017)
**Stack:** frontend=http://localhost:3000  backend=http://localhost:8080
**Catalog:** use-cases.yaml ({{TOTAL_UC}} entries)

---

## Iteration Log

| # | Started | Ended | UCs run | New rows | Fixes applied | Result |
|---|---------|-------|---------|----------|---------------|--------|
|   |         |       |         |          |               |        |

**Clean-sweep exit requires:** `full_catalog_ran = true AND new_rows = 0 AND fixes_applied = 0` in
the final iteration.

---

## Bugs

Columns: `ID | UC | Route | Role | Severity | State | Reproduction | Evidence | Owner | Fix Ref`

- `State` ∈ {OPEN, IN_PROGRESS, FIXED, VERIFIED, DUP, WONTFIX}
- `Severity` ∈ {P0, P1, P2, P3}   (P3 = log only, never blocks clean-sweep)
- `Evidence` = screenshot path / HAR / console log path relative to
  `.claude/skills/nu-chrome-e2e/runs/{{RUN_ID}}/`
- `Fix Ref` = commit SHA or file:line when State=FIXED

| ID     | UC | Route | Role | Sev | State | Reproduction (1 line) | Evidence | Owner | Fix Ref |
|--------|----|-------|------|-----|-------|-----------------------|----------|-------|---------|
| B-0001 |    |       |      |     | OPEN  |                       |          |       |         |

---

## Redirect Map (negative RBAC) — derived from iteration results

Each row: role × route → observed (expected). Only mismatches are listed.

| Role | Route | Expected | Observed | UC |
|------|-------|----------|----------|----|

---

## Clean-Sweep Attestation

Filled in by Compiler & Composer on the terminating iteration:

- [ ] Full catalog ran end-to-end
- [ ] 0 new bug rows in this iteration
- [ ] 0 fixes applied in this iteration
- [ ] `tsc --noEmit` passes
- [ ] `mvn -q -DskipTests compile` passes
- [ ] All P0/P1 bugs State=VERIFIED or WONTFIX
- [ ] Signed off at: ________________________
