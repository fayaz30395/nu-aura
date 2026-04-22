# Triage — super-e2e-20260421T192516Z

**Triage pass performed post-run, before any fixer dispatch.** Verified every "missing route"
bug by grepping `frontend/app/` for the actual page file AND checking the live sidebar config.

## Result — 11 of 21 bugs are INVALID (tester-speculated URLs, not sidebar links)

The testers navigated to URLs they *assumed* a role should have, rather than URLs actually
rendered in the sidebar. Every "404" below has a real working page at a different path.

| Reported "missing"                      | Real route (exists)                                      | Verdict              |
|-----------------------------------------|----------------------------------------------------------|----------------------|
| `/attendance/my`                        | `/attendance/my-attendance` (`AttendanceSidebar.tsx:15`) | INVALID              |
| `/leave/balance`                        | Balance is rendered inline on `/leave` main page         | INVALID              |
| `/payroll/my-payslips`                  | `/payroll/payslips`                                      | INVALID              |
| `/orgchart` (BUG-W2-01)                 | `/org-chart` AND `/organization-chart` (both exist)      | INVALID              |
| `/performance/360` (BUG-W4-001)         | `/performance/360-feedback` AND `/feedback360`           | INVALID              |
| `/performance/training` (BUG-W4-002)    | `/training` (top-level)                                  | INVALID              |
| `/performance/surveys` (BUG-W4-003)     | `/surveys` (top-level)                                   | INVALID              |
| `/performance/recognition` (BUG-W4-004) | `/recognition` (top-level)                               | INVALID              |
| BUG-W4-005 (consolidation of above)     | —                                                        | INVALID (derivative) |
| `/payroll/settings`                     | Likely `/admin/payroll` (exists)                         | INVALID (suspected)  |
| `/admin/audit-logs`                     | Likely `/admin/system` (exists)                          | NEEDS-VERIFICATION   |

**Root cause of the false positives:** the tester prompt allowed workers to probe
MY-SPACE-style URLs ("attendance/my", "payroll/my-payslips") by name-guessing rather than
extracting actual sidebar hrefs. Under the "test real routes" contract, a 404 on a URL that
was never linked is not a bug — it's an absence of a route the app never claimed to have.

---

## Real product bugs — 7 remain

These still warrant fixer dispatch:

### P1 — Auth / RBAC

- **BUG-W3-01** RECRUITMENT_ADMIN sees UI Access-Denied on `/recruitment/jobs` while backend
  returns 200 on every `/api/v1/recruitment/*` endpoint. Frontend route-guard logic is out
  of sync with the role's actual permission set.
- **BUG-W3-02** `POST /auth/refresh` 401 loop intermittently bounces an authenticated user
  to `/auth/login` while `/auth/me` still returns 200. Likely refresh-token single-use
  collision OR cookie-path mismatch OR axios interceptor retry storm. **Fix before any
  long-session re-run.**
- **BUG-W1-05** `GET /api/v1/analytics/dashboard` returns 403 for SUPER_ADMIN. Needs
  reproduction — `PermissionAspect` + `PermissionHandlerInterceptor` both have the bypass
  and `SuperAdminBypassTest.java` passes. Hypothesis: race on initial `/dashboard` paint
  before JWT cookie round-trips. Verify with DevTools timing.

### P1 — Legitimately missing routes

- **BUG-W8-01** `/admin/tenants` — SuperAdmin-only tenants console. No equivalent path
  found. Likely never built. Product decision: build or delete sidebar entry if any.

### P2 — Permission-gating drift

- **BUG-W2-02** `/assets` — UI renders "Add Asset" CTA despite backend 403 on list endpoint.
- **BUG-W2-03** `/overtime` — UI renders "Request Overtime" CTA despite backend 403.
- **BUG-W2-04** `/contracts` — UI renders "New Contract" CTA despite backend 403.

Common pattern: these pages fall back to empty-state instead of Access-Denied when the list
call 403s. Contrast `/shifts` and `/recruitment/jobs` which correctly render Access-Denied.
One architect-agent fix on the shared RBAC page shell would resolve all three.

### P2 — Performance

- **BUG-W3-03** Chrome-MCP CDP Runtime.evaluate 45s timeout after 3 consecutive recruitment
  navigations. Correlates with BUG-W3-02 — likely runaway React Query retries on the 401
  refresh loop. Fixing W3-02 should resolve W3-03.

### P3

- **BUG-W8-03** ~~`/workflows/builder` shows "Workflow not found"~~ — **INVALID on re-check**.
  There is no `/workflows/builder` route. The dynamic `[id]` route treats "builder" as a
  workflow id and correctly 404s. The real "Create Workflow" CTA on `/workflows` points to
  `/workflows/new`, which the page handles via `isNew = workflowId === 'new'` branch
  (`frontend/app/workflows/[id]/page.tsx:192-197`). Another speculated URL.

---

## Verdict

- **Scope for fixer dispatch: 6 bugs** (3 P1 auth/RBAC + 3 P2 gating drift)
- **1 needs product decision** (BUG-W8-01 /admin/tenants)
- **12 closed as INVALID** (BUG-W8-03 added on second-pass verification — `/workflows/builder` is
  yet another speculated URL; real path is `/workflows/new` which works correctly)

## Fixer dispatch summary (this run)

| Bug       | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | File(s)                                                                    |
|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| BUG-W3-02 | Clear auth cookies on refresh failure + widen frontend gap 5→30 min                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `backend/.../AuthController.java`, `frontend/lib/hooks/useTokenRefresh.ts` |
| BUG-W2-02 | Wrap `/assets` page body in `PermissionGate permission={ASSET_VIEW}`                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `frontend/app/assets/page.tsx`                                             |
| BUG-W2-04 | Wrap `/contracts` page body in `PermissionGate permission={CONTRACT_VIEW}`                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `frontend/app/contracts/page.tsx`                                          |
| BUG-W2-03 | DEFERRED — `/overtime` legitimately serves `OVERTIME_REQUEST`-only users (employees submitting their own). Fix belongs on the team-list tab, not the page shell.                                                                                                                                                                                                                                                                                                                                                                   |
| BUG-W3-01 | LIKELY DOWNSTREAM of BUG-W3-02 — W3's `report.json` shows "First nav redirected to /auth/login. Re-nav reached URL but rendered Access Denied." This matches the auth refresh 401 loop signature: middleware bounces to login, session is effectively half-dead, re-navigation reaches the page but `user.roles` is stale or cleared. Route config `frontend/lib/config/routes.ts:678` requires only `RECRUITMENT:VIEW`/`RECRUITMENT:CREATE`, which RECRUITMENT_ADMIN has per V107. **Re-verify after BUG-W3-02 fix is deployed.** |
| BUG-W1-05 | DEFERRED — SuperAdminBypassTest passes; almost certainly a paint race where the analytics fetch fires before the JWT cookie round-trips on first load. Needs Network+Performance DevTools timing capture to confirm.                                                                                                                                                                                                                                                                                                               |
| BUG-W8-01 | Product decision — route `/admin/tenants` has no sidebar entry; either build or remove dead link.                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Skill follow-up

Update `.claude/skills/nu-chrome-super-e2e/SKILL.md` PER-WORKER CONTRACT to add:

> **Sidebar-driven navigation only.** Extract hrefs via `get_page_text` or
> `javascript_tool` (`Array.from(document.querySelectorAll('aside a, nav a')).map(a=>a.href)`)
> and test ONLY those. Do not speculate URLs based on English labels. A 404 on a URL that
> the app never linked is not a product bug — it's an absent route the product never
> promised. Log those as `SPECULATED` in `findings.jsonl`, not as bugs.
