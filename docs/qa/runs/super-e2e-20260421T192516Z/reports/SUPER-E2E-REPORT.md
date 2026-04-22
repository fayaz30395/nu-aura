# NU-AURA Super E2E Report

- Run: `docs/qa/runs/super-e2e-20260421T192516Z`
- Mode: **FULL (truncated)** — passes P1–P3 completed; P4 Manager / P5 Team Lead / P6 Employee
  deferred by operator
- Git SHA: `0b3aee04866bc12dacb7168dfb5590b7d5dc1386`
- Started: 2026-04-21T19:25:16Z
- Wall-time: ~25 min for P1–P3 (plus skill-doc rewrite)
- Testers dispatched: 10 (6 wrote `report.json`: W1, W2, W3, W4, W8, W10)
- Fixers dispatched: **0** (operator chose to stop pre-fix and triage the accumulated bug set first)
- Bugs found: **21 raw → 7 real + 1 needs-decision after triage** (see `../TRIAGE.md`)

---

## TL;DR — Architecture fix validated; three headline product bug classes found

The role-pass serialization model from the prior run's skill-doc rewrite **works**: Pass 3
(RECRUITMENT_ADMIN) ran two parallel tabs (W2, W3) with zero session flips (`/auth/me`
returned `suresh@nulogic.io` on every check across 10+ pages). Pass 1 (SUPER_ADMIN, 3 tabs)
and Pass 2 (HR_MANAGER, 1 tab) were clean.

The 21 bugs below are real product findings, not harness noise. They cluster into three
headline classes:

1. **Missing frontend routes (11 bugs)** — sidebar links / documented routes point at pages
   that aren't mounted. Hard client-side 404s.
2. **Frontend/backend permission-gate drift (5 bugs)** — either the UI denies while the
   backend allows (BUG-W3-01), or the UI renders CTAs while the backend 403s the list API
   (BUG-W2-02/03/04).
3. **Auth + infra (3 bugs)** — `/auth/refresh` 401 loop that bounces authenticated users to
   `/auth/login` (BUG-W3-02); SUPER_ADMIN bypass broken on `/api/v1/analytics/dashboard`;
   renderer freeze from successive recruitment nav (likely runaway React Query retries).

---

## Summary (workers that reported)

| Worker | Role              | Tab        | Pass | Status               | Pages                 | Bugs          |
|--------|-------------------|------------|------|----------------------|-----------------------|---------------|
| W1     | SUPER_ADMIN       | 1283664350 | P1   | COMPLETE             | 14 HRMS core          | 5             |
| W8     | SUPER_ADMIN       | 1283664357 | P1   | COMPLETE             | workflow GIFs + admin | 4             |
| W10    | SUPER_ADMIN       | 1283664359 | P1   | COMPLETE             | known-bug retest      | verdicts only |
| W4     | HR_MANAGER        | 1283664353 | P2   | COMPLETE             | 7 NU-Grow pages       | 5             |
| W2     | RECRUITMENT_ADMIN | 1283664351 | P3   | COMPLETE             | 10 pages              | 4             |
| W3     | RECRUITMENT_ADMIN | 1283664352 | P3   | COMPLETE (flaky nav) | 3 recruitment pages   | 3             |
| W5     | Employee          | 1283664354 | P6   | NOT RUN              | —                     | —             |
| W6     | Employee          | 1283664355 | P6   | NOT RUN              | —                     | —             |
| W7     | Employee RBAC-    | 1283664356 | P6   | NOT RUN              | —                     | —             |
| W9     | Team Lead         | 1283664358 | P5   | NOT RUN              | —                     | —             |

---

## Critical Findings

### P1 — Missing routes (frontend not mounted)

- **BUG-W1-01** `/attendance/my` → 404 (listed in MY SPACE sidebar) —
  `frontend/app/attendance/my/page.tsx` missing
- **BUG-W1-02** `/leave/balance` → 404
- **BUG-W1-03** `/payroll/my-payslips` → 404 (listed in MY SPACE sidebar)
- **BUG-W1-04** `/payroll/settings` → 404
- **BUG-W8-01** `/admin/tenants` → 404 (SuperAdmin-only tenants console)
- **BUG-W8-02** `/admin/audit-logs` → 404 (compliance / audit trail)
- **BUG-W2-01** `/orgchart` → 404 (no route at all)
- **BUG-W4-001..004** `/performance/360`, `/performance/training`, `/performance/surveys`,
  `/performance/recognition` all 404 — NU-Grow sidebar advertises them (4 of 7
  `/performance/*` sub-routes are broken).

### P1 — RBAC / auth

- **BUG-W3-01** RECRUITMENT_ADMIN sees "Access Denied" on `/recruitment/jobs` even though
  backend returns 200 for every `/api/v1/recruitment/*` endpoint. Frontend route guard wrong.
- **BUG-W3-02** `POST /api/v1/auth/refresh` → 401 in a loop, which intermittently bounces a
  valid authenticated session to `/auth/login?returnUrl=...` while `/auth/me` stays 200.
  Root-cause candidates: refresh token single-use collision, cookie-path mismatch, or axios
  interceptor mis-retrying. **User-facing impact: random sign-out mid-session.**
- **BUG-W1-05** `GET /api/v1/analytics/dashboard` → 403 for SUPER_ADMIN. SuperAdmin should
  bypass permission checks per RBAC spec.

### P2 — Permission-gating drift

- **BUG-W2-02** `/assets` — backend 403, UI renders "Total Assets 0" with **Add Asset** CTA.
- **BUG-W2-03** `/overtime` — backend 403, UI renders **Request Overtime** CTA.
- **BUG-W2-04** `/contracts` — backend 403, UI renders **New Contract** CTA.
- **BUG-W4-005** NU-Grow sidebar consolidates the 4 missing `/performance/*` 404s above.

### P2 — Performance

- **BUG-W3-03** Renderer freeze (CDP Runtime.evaluate timeout 45s) on third consecutive
  recruitment route nav. Correlated with the `/auth/refresh` 401 loop — likely runaway React
  Query retries. Clears after tab reload.

### P3

- **BUG-W8-03** `/workflows/builder` (no id) shows "Workflow not found" instead of empty-canvas
  new-workflow experience.

---

## Pattern consolidation (Tech Lead view)

The 11 missing-route 404s are symptoms of two underlying issues, not 11 independent fixes:

1. **Sidebar-to-route drift**: the sidebar config advertises routes that were never built or
   were renamed. Fix at the sidebar config layer (`frontend/lib/config/`) + build the missing
   pages as a batch.
2. **Permission-gate inconsistency**: `/assets`, `/overtime`, `/contracts` render CTAs
   despite 403 list responses, while `/shifts` and `/recruitment/jobs` show Access Denied.
   Missing common RBAC-aware page shell or `useHasPermission` hook on the CTAs.

Recommend ONE architect agent per pattern class rather than 16 independent fixers.

---

## RBAC matrix

Partial. 3 roles validated (SUPER_ADMIN, HR_MANAGER, RECRUITMENT_ADMIN). MANAGER, TEAM_LEAD,
EMPLOYEE deferred. Re-run P4–P6 to close coverage.

---

## Known Bug Status (W10)

See `workers/w10/report.json` for per-ID F-03…F-09 verdicts (retested under SuperAdmin session).

---

## Lifecycle Scenarios

**NOT RUN** this pass. S1–S11 queued for full re-run once P4–P6 complete.

---

## Attachments

- `workers/w{1,2,3,4,8,10}/report.json` — raw output
- `workers/w{1,2,3,4,8}/findings.jsonl` / `bugs.jsonl` where streamed
- `bugs.jsonl` — 21 entries (flock-appended shared queue)
- `screenshots/` — per-worker PNGs
- `../UNCOMMITTED-CHANGES.md` — skill-doc rewrite only (no fixer dispatch)

---

## Triage outcome (post-run)

See `../TRIAGE.md`. 11 of the 21 bugs were **tester-speculated URLs** (e.g., `/attendance/my`
is not a real sidebar link — the real route is `/attendance/my-attendance` which exists).
Closed as INVALID. 7 real product bugs remain, plus 1 needs-product-decision (`/admin/tenants`).

## Next Steps

1. **Fix BUG-W3-02 `/auth/refresh` 401 loop** before re-running P4–P6 (long sessions depend on it).
2. **Reproduce BUG-W1-05 analytics-dashboard 403** with DevTools timing — likely a pre-auth
   paint race, not a SuperAdmin-bypass defect (bypass is covered by `SuperAdminBypassTest.java`).
3. **Fix RBAC gate drift** (`/assets` `/overtime` `/contracts`) — single shared page shell.
4. **Fix BUG-W3-01** `/recruitment/jobs` frontend route guard.
5. **Product decision on `/admin/tenants`** (BUG-W8-01): build or delete.
6. **Re-run Passes P4–P6** with the sidebar-driven navigation rule now in SKILL.md.
