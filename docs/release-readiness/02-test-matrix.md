# NU-AURA Test Matrix (index)

Full merged matrix: `evidence/matrix-all.csv` (451 rows; columns source,id,area,scenario,status,severity,evidence,defect_id). Per-area files: `evidence/matrix-{be,hrms,pay,hire,grow,fluence,secgate,tenant,rbac,verify,e2e}.csv`.

| Source | Pass | Fail | Blocked | Inconclusive | Not tested | Other |
|---|---|---|---|---|---|---|
| be (backend infra) | 3 | 1 | 3 | 1 | 1 | |
| hrms | 26 | 12 | 1 | 3 | 2 | |
| pay | 12 | 18 | 0 | 1 | 1 | 3 not implemented |
| hire | 38 | 20 | 6 | 9 | 2 | |
| grow | 67 | 21 | 25 | 14 | 2 | |
| fluence | 6 | 10 | 4 | 1 | 1 | |
| secgate | 44 | 26 | 4 | 4 | 4 | |
| tenant | 12 | 3 | 0 | 1 | 0 | |
| rbac | 8 | 10 | 0 | 1 | 1 | |
| verify (post-fix live) | 15 (+1 after fix) | 3 | 0 | 0 | 0 | |
| e2e (browser) | 10 | 3 | 0 | 1 | 0 | add `matrix-e2e.csv` rows to matrix-all on next merge |

Automated suites: backend 5325 run, 0 failed, 772 errors (Docker/Testcontainers, 78 classes, BLOCKED), 3 skipped (RLS no-bypass DB tests). Frontend: tsc 0 errors, vitest 2634 pass, Next 16.4.6 build OK, ESLint 0 errors / 14 warnings (`no-location-assign-relative-destination`).

Status vocabulary: PASS, FAIL, BLOCKED, NOT TESTED, INCONCLUSIVE. BLOCKED is never reported as PASS. Most FAIL rows pre-date the fixes recorded in `evidence/fixes-*.md` and `evidence/verify-live.md`.
