# QA Bug Sheet — Single Source of Truth

**Run:** 2026-04-23-1841
**Mode:** --full (autonomous, context-bounded subset executed)
**Stack:** frontend=http://localhost:3000 backend=http://localhost:8080
**Catalog:** use-cases.yaml (900 entries)

---

## Iteration Log

| # | Started | Ended | UCs run | New rows | Fixes applied | Result |
|---|---------|-------|---------|----------|---------------|--------|
| 1 | 2026-04-23 18:41 | 2026-04-23 19:00 | 22 smoke probes (2 roles × 11 endpoints/routes) | 3 | 0 (all rejected per dev-lead minimal-fix rule) | PARTIAL — autonomous session context-bounded before full 900-UC sweep |

**Clean-sweep NOT achieved.** This was a context-bounded autonomous pass while the operator was AFK. A full mechanical sweep of 900 UCs exceeds a single conversation's context budget.

---

## Bugs

| ID | UC | Route | Role | Severity | State | Reproduction | Evidence | Owner | Fix Ref |
|----|----|-------|------|----------|-------|--------------|----------|-------|---------|
| BUG-001 | UC-DS-001 | / (global) | all | P2 | OPEN (rejected) | React hydration mismatch: `NotFound` icon server→`text-status-warning-text`, client→`text-warning-600 dark:text-warning-400` | console.log entry 1 | — | REJECTED: root cause is stale `.next-dev` cache in `frontend/sessions/hopeful-awesome-lamport/` worktree leaking into served output; > 3-line fix (cache hygiene / Conductor session cleanup). Needs human triage. |
| BUG-002 | UC-DS-002 | /auth/login | anon | P2 | OPEN (rejected) | React hydration mismatch: login status-dot server→`bg-status-success-bg`, client→`bg-success-600 dark:bg-success-400` (`app/auth/login/page.tsx:570`) | console.log entry 2 | — | REJECTED: same root cause as BUG-001 (stale build output). Dev-mode warning only; no functional failure. |
| BUG-003 | UC-RBAC-nav | /dashboard | EMPLOYEE | P2 | OPEN (suspicion, not fixed) | EMPLOYEE sidebar shows `Departments`, `Workflows`, `Helpdesk` under sections otherwise gated. | live DOM scan | — | May be intentional (helpdesk for all employees, departments read-only directory). Needs product/permissions review before fixing. |

**No P0 or P1 bugs confirmed.** Critical RBAC boundary (EMPLOYEE cannot reach admin data) is **verified correct at both API (403) and UI (Access Denied component) layers** for the probed routes.

---

## Verified (PASS)

| Check | Roles | Endpoints/Routes |
|-------|-------|------------------|
| SUPER_ADMIN full access at API | SUPER_ADMIN | `employees`, `payroll/runs`, `users/me`, `roles`, `permissions` → 200 |
| EMPLOYEE denied admin endpoints | EMPLOYEE | `employees`, `payroll/runs`, `roles`, `permissions` → 403 |
| EMPLOYEE self-access | EMPLOYEE | `users/me` → 200 |
| EMPLOYEE hits Access Denied in-page | EMPLOYEE | `/employees` renders `Access Denied` heading, no table, no leaked data |
| Login + session cookies | SUPER_ADMIN, EMPLOYEE | both logged in successfully; 15s role-switch rate-limit observed |

---

## Not Executed (context-bounded)

- 7 remaining roles × routes RBAC matrix (TENANT_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER, TEAM_LEAD, RECRUITMENT_ADMIN, FINANCE_ADMIN)
- 44 UC-CRUD flows (leave apply, employee edit, payroll run, etc.)
- 6 UC-APPR cross-role approval chains
- 30 UC-FORM validations
- 10 UC-SESS auth/session edge cases
- 15 UC-A11Y checks
- 20 UC-DS design-system grep rules (partial — 2 hits found incidentally)
- 10 UC-PERF page-weight checks

These require either (a) subagent-driven execution with its own chrome MCP session, or (b) a multi-hour session with frequent context compaction.
