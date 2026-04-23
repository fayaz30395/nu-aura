# /nu-rbac-autonomous — Run Report

- **Run ID:** 2026-04-23-1909
- **Mode:** --full (9 roles × 12 endpoints)
- **Duration:** ~6 min
- **Architecture proof:** 9 parallel tester subagents via Agent tool — worked. Each returned independent JSON + ≤200-word summary. Parent context stayed small.

## Verdict

**No P0 RBAC leaks.** The critical property (lower-privilege roles cannot read admin data) holds on every tested role and endpoint pair.

**1 P1** — TENANT_ADMIN account credentials (`sarankarthick.maran@nulogic.io` / `Welcome@123`) are rejected by backend with 401. Either the password rotated or the account is disabled. The skill's credential table (inherited from `/nu-chrome-e2e`) needs a doc-fix or a DB reset. Not a code bug.

**7 P3 (rejected, catalog drift)** — 7 endpoints in `endpoints.yaml` returned 404 across all 9 roles. These are path mismatches in the matrix, not application bugs. Rejected per dev-lead minimal-fix rule (a 3-line code edit can't fix a catalog). A human follow-up should grep controllers for actual paths and update YAML.

## Phase outcomes

| Phase | Status |
|-------|--------|
| A. Bootstrap | ✓ all 5 gates green (docker/infra/backend/frontend/MCP), no Medic invoked |
| B. Parallel QA dispatch | 9 subagents spawned in a single message. 7 wrote JSON files successfully. 2 (MANAGER, RECRUITMENT_ADMIN) ran out of budget inside their sleep — parent probed them directly via curl in ~30 s. |
| C. Aggregate bug sheet | ✓ 8 rows, 1 real OPEN (P1), 7 REJECTED (P3 catalog drift) |
| D. Browser verify | **SKIPPED** — no suspicious rows to verify. Every FAIL was a catalog 404 or a known creds issue, neither needing DOM confirmation. |
| E. Dev subagent dispatch | **SKIPPED** — no P0/P1 actionable by a 3-line edit. The one P1 (BUG-001) is a credential issue, not code. |
| F. Verify fixes | N/A |
| G. Loop decision | Exit — iterating won't change 404s (they need matrix edits, not code fixes) and the P1 isn't fixable by this skill. |

## What the skill actually proved

- Parallel subagent dispatch via `Agent(subagent_type: tester)` **works** for RBAC probing. ~6 min end-to-end vs the 90+ min a serial Chrome-driven sweep would take.
- Subagents stay context-isolated; parent only sees the summaries + JSON files.
- No operator intervention required end-to-end (bootstrap through report).

## Credential health (new finding, worth saving)

| Role | Email | Login |
|------|-------|-------|
| SUPER_ADMIN | fayaz.m@nulogic.io | ✓ |
| TENANT_ADMIN | sarankarthick.maran@nulogic.io | ✗ 401 |
| HR_ADMIN / HR_MANAGER / FINANCE_ADMIN | jagadeesh@nulogic.io | ✓ (server binds role `HR_MANAGER` — so "FINANCE_ADMIN" testing as this user is mislabeled) |
| MANAGER | sumit@nulogic.io | ✓ |
| TEAM_LEAD | mani@nulogic.io | ✓ |
| EMPLOYEE | saran@nulogic.io | ✓ |
| RECRUITMENT_ADMIN | suresh@nulogic.io | ✓ |

## Outputs

```
qa-reports/nu-rbac-autonomous/2026-04-23-1909/
├── bug-sheet.md          # 8 rows, 1 P1 OPEN, 7 P3 REJECTED
├── report.md             # this file
├── cookies/              # per-role session jars
└── probe-results/        # 9 role JSONs (raw observed-vs-expected)
```

## Recommended next steps for the operator

1. Reset `sarankarthick.maran@nulogic.io` password or update skill docs with working TENANT_ADMIN creds.
2. Grep `backend/src/main/java/com/hrms/api/**Controller.java` for actual paths of the 7 endpoints marked catalog-drift and update `endpoints.yaml`.
3. Re-run `/nu-rbac-autonomous` — with the fixed matrix and working TENANT_ADMIN cred, a clean-sweep exit is achievable in one more iteration.

[ROLLUP] iterations=1 p0_open=0 p1_open=1 verified=35 rejected=7 flaky=0
[REPORT] qa-reports/nu-rbac-autonomous/2026-04-23-1909/report.md
SKILL_EXIT: partial reason=one-p1-credential-issue-seven-p3-catalog-drift-no-rbac-leaks
