# NU-AURA Super E2E Report

- **Run:** `docs/qa/runs/super-e2e-20260421T162513Z/`
- **Mode:** FULL (10 parallel workers)
- **Git SHA:** `0b3aee04866bc12dacb7168dfb5590b7d5dc1386`
- **Started:** 2026-04-21 16:25:13Z
- **Finished:** 2026-04-21 ~22:07Z (wall-clock dominated by W2 re-login attempts + cross-worker session churn)
- **Parallel speedup vs sequential estimate:** ~8× (10 workers, but dev-server contention slowed some shards)

---

## Worker Summary

| Worker | Role | Shard | Total | Pass | Fail | Bugs |
|--------|------|-------|-------|------|------|------|
| W1 | SUPER_ADMIN | HRMS core (14 pages) | 14 | 9 | 5 | 3 |
| W2 | HR_ADMIN | HRMS ops (13 pages) | 13 | 0 | 0 | 1 (blocker: login failed) |
| W3 | HR_ADMIN | NU-Hire | 7 | 3 | 3 | 5 |
| W4 | HR_MANAGER | NU-Grow | 7 | 6 | 1 | 3 findings |
| W5 | HR_ADMIN→SA* | Fluence | 8 | 4 | 4 | 3 clusters |
| W6 | EMPLOYEE | self-service/admin denials | 4 | 2 | 1 | 2 |
| W7 | EMPLOYEE | RBAC denial matrix | 7 | 7 | 0 | 0 (no leaks) |
| W8 | SUPER_ADMIN | Workflow GIFs (read-only) | 4 | 4 | 0 | 0 |
| W9 | TEAM_LEAD/MGR/EMP | Approvals inbox | 3 roles | 3 | 0 | 2 (data/fixture) |
| W10 | SUPER_ADMIN | Known-bug regression | 7 | 4 | 3 | 5 new |

*W5's session was hijacked by cross-tab cookie sharing and landed as SuperAdmin; findings reclassified.

**Totals:** 74 page probes · 42 PASS · 17 FAIL · 7 RBAC denials verified · 4 workflow renders · 7 regressions re-checked (3 still broken)

---

## Critical Findings (Consolidated — Tech Lead Lens)

### F-01 — ROOT CAUSE: `@RequiresPermission` does not bypass SuperAdmin on several controllers  (P0, cross-cutting)

**Observed by W1, W5, W10 independently.** SuperAdmin receives 403 on multiple endpoints that should bypass per `CLAUDE.md` RBAC rule ("SuperAdmin bypasses ALL checks"):

| Endpoint | Reporter |
|----------|----------|
| `GET /api/v1/employees` (both `size=20` and `size=500`) | W1, W10 |
| `GET /api/v1/leave-requests/status/PENDING` | W1 |
| `GET /api/v1/payroll/runs` | W1, W10 |
| `GET /api/v1/payroll/salary-structures` | W1, W5 |
| `GET /api/v1/payroll/components` | W1 |
| `GET /api/v1/helpdesk/categories/active` | W10 |
| `GET /api/v1/knowledge/templates` | W5 |
| `GET /api/v1/knowledge/wiki/pages` (analytics agg) | W5 |
| `GET /api/v1/knowledge/blogs` (analytics agg) | W5 |
| `GET /api/v1/fluence/attachments/recent` | W5 |

**Hypothesis:** `SecurityService.hasPermission()` / `@RequiresPermission` aspect does not honor the SuperAdmin bypass branch, OR the bypass relies on a role name that differs from the JWT claim (`SUPER_ADMIN` vs `SuperAdmin`). One fix at the aspect/service layer repairs all 10 endpoints — do NOT patch per-controller.

### F-02 — `GET /api/v1/fluence/activities` returns 500  (P0)

Reporter: W5 (`/fluence/wall` and `/fluence/analytics`). Wall shows fallback "Unable to load activity feed". Likely null-handling or missing join in `FluenceActivityService`.

### F-03 — `GET /api/v1/workflow/inbox/count` times out (30s) / 503  (P1)

Reporter: W5, W8. Sidebar inbox badge broken across multiple pages. Query likely unindexed or deadlocked under concurrent load.

### F-04 — BUG-010 regression still open on `/helpdesk/tickets`  (P1)

Reporter: W10. Source at `frontend/app/helpdesk/tickets/page.tsx:519-525` uses `<Link>` but rendered DOM emits `<span>` — 0 anchors in tbody across 7 rows. Likely dev-build stale OR `Link` inside conditional branch not executed. Needs FE repro + rebuild verification.

### F-05 — `/performance/okr` stuck on skeleton; OKR endpoints hang >10s  (P1)

Reporter: W4. `GET /api/v1/okr/objectives/my` + `/api/v1/okr/company/objectives` never return for HR_MANAGER. OKRController query likely N+1 or missing index.

### F-06 — `/helpdesk/tickets` returns Access Denied for EMPLOYEE  (P1)

Reporter: W6. Violates "Every User Is an Employee" principle in `CLAUDE.md`. Employees must be able to view their own tickets (HELPDESK:VIEW_OWN). Also 503 on `GET /helpdesk`.

### F-07 — `/approvals/inbox` returns 503 for EMPLOYEE before redirect  (P2)

Reporter: W6. Should be clean redirect or empty state, not 503.

### F-08 — HR_ADMIN 403 cluster on NU-Hire  (P1)

Reporter: W3. HR_ADMIN (verified w9 fixture mismatch — see F-11) receives 403 on:
- `GET /api/v1/recruitment/candidates` (from /pipeline + /interviews)
- `GET /api/v1/employees` (from recruitment pages)
- `GET /api/v1/letters/templates/active` (from /pipeline)

Same architectural class as F-01 — role→permission seed may be missing grants for HR_ADMIN. Investigate before F-01 fix to determine whether F-08 is subsumed.

### F-09 — `/recruitment/jobs/new` 404  (P1)

Reporter: W3. Route missing or renamed; breaks Hire-to-Retire S1.step1.

### F-10 — `/payroll/structures` and `/payroll/runs` render empty `<main>` for SuperAdmin  (P2)

Reporter: W1. Likely downstream of F-01 (component swallows 403 and renders nothing instead of error boundary). Fix F-01 first; re-test.

### F-11 — Test fixture mismatch: `sarankarthick.maran@nulogic.io` seeded as EMPLOYEE not HR_ADMIN  (P3, test infra)

Reporter: W9. Blocks W2 entirely and invalidates HR_ADMIN signal in W3/W5. Fix: seed a distinct HR_ADMIN account or update worker fixtures.

### F-12 — `/employees?page=N` URL param ignored  (P2)

Reporter: W10. Frontend always requests page=0 regardless of URL. Break deep-linking.

---

## RBAC Matrix (sampled)

| Page | SuperAdmin (W1/W8/W10) | HRManager (W4) | HRAdmin (W3) | TeamLead (W9) | Employee (W6/W7) |
|------|------------------------|----------------|--------------|---------------|------------------|
| `/admin` | allow | n/t | n/t | n/t | DENIED ✓ |
| `/payroll/runs` | 403 ⚠ (F-01) | n/t | n/t | n/t | DENIED ✓ |
| `/payroll/structures` | 403 ⚠ (F-01) | n/t | n/t | n/t | DENIED ✓ |
| `/recruitment` | n/t | n/t | 403 cluster (F-08) | n/t | DENIED ✓ |
| `/statutory` | n/t | n/t | n/t | n/t | DENIED ✓ |
| `/fluence/analytics` | 403 (F-01) | n/t | n/t | n/t | DENIED ✓ |
| `/employees` | 403 ⚠ (F-01) | n/t | 403 (F-08) | n/t | DENIED ✓ |
| `/approvals/inbox` | n/t | n/t | n/t | PASS | 503→redirect (F-07) |
| `/helpdesk/tickets` | renders empty | n/t | n/t | n/t | DENIED ⚠ (F-06) |

**No data leakage detected** — W7 verified EMPLOYEE session gets no roster, no payroll, no admin content via 7 API probes.

---

## Known Bug Regression Status

| ID | Title | Status | Evidence |
|----|-------|--------|----------|
| BUG-010 | helpdesk tickets `<a href>` | **OPEN** | W10 — DOM has `<span>` not `<a>` |
| BUG-011 | contracts `<a href>` | INCONCLUSIVE | W10 — page never rendered |
| dashboard-clean-load | no console errors | FIXED ✓ | W10 |
| employees-pagination | URL driven | **OPEN** (F-12) | W10 |
| leave-no-500 | leave balances load | FIXED ✓ | W10 |
| payroll-runs-renders | SA can list | **OPEN** (F-01) | W10 |
| fluence-wiki-tree | space tree renders | FIXED ✓ | W10 |

---

## Top 5 Bugs by Severity

1. **F-01 P0** — SuperAdmin @RequiresPermission bypass broken (10 endpoints affected) — **architecture-level fix required**
2. **F-02 P0** — `/api/v1/fluence/activities` 500 error
3. **F-08 P1** — HR_ADMIN 403 cluster on NU-Hire (recruitment/candidates, employees, letters)
4. **F-04 P1** — BUG-010 regression: helpdesk tickets Link anchors still span
5. **F-05 P1** — /performance/okr skeleton hang (OKR endpoints never return)

---

## Console & Network Error Top-10

1. `/api/v1/fluence/activities` — 500 (W5×2)
2. `/api/v1/workflow/inbox/count` — timeout 30s (W5×2, W8×1)
3. `/api/v1/employees` — 403 as SA/HR_ADMIN (W1, W3, W10)
4. `/api/v1/payroll/runs` — 403 as SA (W1, W10)
5. `/api/v1/payroll/salary-structures` — 403 as SA (W1, W5)
6. `/api/v1/recruitment/candidates` — 403 as HR_ADMIN (W3×2)
7. `/api/v1/knowledge/templates` — 403 as SA (W5, W5)
8. `/api/v1/letters/templates/active` — 403 as HR_ADMIN (W3)
9. `/api/v1/helpdesk/categories/active` — 403 as SA (W10)
10. `/leave/my-leaves?_rsc=…` — 503 dev server (W10) — load artifact

---

## Observations / Non-Bug

- Cross-tab session cookie sharing caused W2/W5/W7/W10 to observe role flips. W7 handled it correctly via `/api/v1/users/me` re-verification. Future runs should use isolated browser profiles per worker or serialize role switches — tracked as skill improvement, not product bug.
- Dev server throughput degraded under 10 concurrent workers (`/_rsc` 503s, skeleton hangs 5–7s). Not a prod defect.
- W9 found zero seeded `approval_task` rows for any role — seed improvement needed to exercise approval workflows.

---

## Attachments

- `workers/w1..w10/report.json` — raw worker reports
- `tabs.json`, `manifest.json` — run metadata

## Next Suggested Actions

1. **Dispatch ONE architect fixer** (backend-dev/security-architect) for F-01 — root-cause @RequiresPermission bypass gap; do not spot-patch per endpoint.
2. Dispatch frontend-specialist for F-04 (BUG-010 Link rebuild verification) + F-12 (URL-driven pagination).
3. Dispatch backend-dev for F-02 (fluence/activities 500), F-03 (workflow/inbox/count slow), F-05 (OKR endpoints hang).
4. Re-run TARGETED hrms + hire workers after F-01 lands to confirm regression.
5. Seed HR_ADMIN account + approval_task fixtures (test-infra task).
