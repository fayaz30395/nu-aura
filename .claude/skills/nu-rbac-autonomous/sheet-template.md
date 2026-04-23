# RBAC Bug Sheet — {{RUN_ID}}

**Started:** {{START_ISO}}
**Stack:** frontend=http://localhost:3000  backend=http://localhost:8080
**Matrix:** endpoints.yaml ({{N_ENDPOINTS}} endpoints × 9 roles = {{N_CHECKS}} checks)

---

## Iteration Log

| Iter | Started | Ended | Probes | New | Fixed | Verified | Result |
|------|---------|-------|--------|-----|-------|----------|--------|
|      |         |       |        |     |       |          |        |

Clean-sweep requires: last iteration ran full matrix, new=0, fixes=0, no OPEN rows.

---

## Bugs

| ID | Role | Endpoint | Expected | Observed | Severity | State | File:Line | Fix | Iter |
|----|------|----------|----------|----------|----------|-------|-----------|-----|-----:|
|    |      |          |          |          |          |       |           |     |      |

**State**: OPEN → FIXING → COMPILED → VERIFIED, or REJECTED/UNRESOLVED.
**Severity**: P0 (lower-priv got 200 where 403 expected) | P1 (broken access) | P2 (500) | P3 (404).

---

## Pass summary (per role)

| Role | Total | Pass | Fail | Error |
|------|-------|------|------|-------|
| SUPER_ADMIN |  |  |  |  |
| TENANT_ADMIN |  |  |  |  |
| HR_ADMIN |  |  |  |  |
| HR_MANAGER |  |  |  |  |
| MANAGER |  |  |  |  |
| TEAM_LEAD |  |  |  |  |
| EMPLOYEE |  |  |  |  |
| RECRUITMENT_ADMIN |  |  |  |  |
| FINANCE_ADMIN |  |  |  |  |
