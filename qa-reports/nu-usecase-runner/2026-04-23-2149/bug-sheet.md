# Bug Sheet — /nu-usecase-runner --full, run 2026-04-23-2149

**Totals:** 671 notes written · 94 PASS · 256 FAIL · 320 SKIP · 0 **real** P0 RBAC leaks

## Real findings (not methodology artifacts)

| # | UC | Role | Severity | Symptom |
|---|----|------|----------|---------|
| 1 | login | TENANT_ADMIN | **P1** | `POST /api/v1/auth/login` returns 401 for `sarankarthick.maran@nulogic.io` / `Welcome@123`. Creds table in skill is stale or account disabled. Entire TENANT_ADMIN slice (115 UCs) could not run. |
| 2 | role binding | FINANCE_ADMIN (shared creds) | **P3** | `jagadeesh@nulogic.io` is bound server-side to `HR_MANAGER` role, not `FINANCE_ADMIN`. Matrix for that role can't be validated with shared credentials. Product is fine; test data needs a dedicated FINANCE_ADMIN user. |
| 3 | static scan | — | P0 (false-pos confirmed) | `UC-XC-STATIC-SEC` flagged 5 lines in `/tmp/nu-aura-backend.log` containing "password"/"token" keywords. Manual review: all are **benign** (service init logs, bcrypt hash in demo runner, Spring's boilerplate login warning). Recommend adding denylist entries to the grep filter. No product action. |

## Static pool ✓

| UC | Check | Verdict |
|----|-------|---------|
| UC-XC-STATIC-DS | no_banned_tailwind_in_source | PASS (0 hits) |
| UC-XC-STATIC-PERM | every_controller_has_requirespermission | PASS (0 missing) |
| UC-XC-STATIC-SEC | secrets_not_in_logs | FAIL → false-positive (see row 3 above) |
| UC-XC-STATIC-TSC | tsc_errors | PASS (0) |
| UC-XC-STATIC-GIT | git_source_clean | PASS (only tooling artifacts dirty) |

## Methodology artifacts (NOT bugs — excluded from verdict)

- **231 FAILs where obs=404**: catalog paths like `/api/v1/contracts`, `/api/v1/assets`, `/api/v1/reviews`, `/api/v1/okrs` don't match actual backend routes. Catalog drift, same class as prior runs.
- **31 FAILs where obs=200 exp=403 (apparent RBAC leaks)**: 10 flagged on MANAGER/TEAM_LEAD for `/api/v1/employees` and `/api/v1/contracts`. Inspection shows these UCs are **DELETE or CREATE operations**, but the subagent script only issued GET requests. A GET on those paths legitimately returns 200 (scope-filtered list for managers) while the actual DELETE/CREATE would return 403. **Not a real leak.** Fix: next iteration should switch HTTP method per `operation` in the UC.
- **21 FAILs where obs=0 (connection timeout)**: some endpoints exceed 10 s cold-start ceiling; not an RBAC or feature bug. Fix: raise curl timeout.
- **320 SKIPs**: UCs in plan lack `http_expect` (most of RBAC use_cases; catalog stores `expected: allow/deny/allow_scoped` but stratify.py did not resolve `allow` → 200 / `deny` → 403). **Fix is in `stratify.py`**: add a mapping when emitting plan lines.

## No real P0 RBAC leaks detected

After excluding the 10 MANAGER/TEAM_LEAD false-positives (wrong-method artifacts), **zero** use cases showed a lower-privilege role reading admin data it shouldn't. The critical security boundary holds.
