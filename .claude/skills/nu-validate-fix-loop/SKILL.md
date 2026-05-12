---
name: nu-validate-fix-loop
description: Use when asked to "validate and fix", "browser QA loop", "autonomous QA", "RBAC sweep", "full platform QA", "validate use case", "visual QA loop", or when you need to autonomously validate features/pages in the browser across all roles, fix issues found, revalidate, and iterate until clean. Orchestrates a validate→fix→recheck cycle using Chrome DevTools MCP (preferred) or Playwright across 9 roles, all routes, 14 validation dimensions.
---

# NU-AURA Autonomous Validate-Fix-Recheck Loop

## Overview

This skill orchestrates an autonomous cycle that:

1. **Validates** every route across all 9 roles — RBAC, render health, CRUD flows, console errors,
   network failures, design system, a11y, performance
2. **Diagnoses** any issues found (P0–P3 severity)
3. **Fixes** P0/P1/P2 issues automatically in code
4. **Rechecks** to confirm fixes (up to 3x per issue)
5. **Reports** full results to `qa-reports/validate-fix-loop/`

---

## When to Use

- "Run /nu-validate-fix-loop for all routes across all roles"
- "Full RBAC boundary validation"
- "Browser QA loop"
- "Autonomous QA — check, fix, recheck"
- "Visual QA loop for [module]"
- "Validate and fix all issues"
- After deploying a feature, before a demo, before a release

---

## Prerequisites

```bash
# Frontend running on :3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # expect 200

# Backend running on :8080
curl -s http://localhost:8080/actuator/health | grep '"status":"UP"'

# Report directory
mkdir -p /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/validate-fix-loop
```

If services are not running:

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
docker-compose up -d
cd backend && ./start-backend.sh &
cd frontend && npm run dev &
# Wait up to 120s for both to be healthy
```

---

## ROLES & CREDENTIALS

| Role              | Email                          | Password    |
|-------------------|--------------------------------|-------------|
| SUPER_ADMIN       | fayaz.m@nulogic.io             | Welcome@123 |
| TENANT_ADMIN      | sarankarthick.maran@nulogic.io | Welcome@123 |
| HR_ADMIN          | jagadeesh@nulogic.io           | Welcome@123 |
| HR_MANAGER        | jagadeesh@nulogic.io           | Welcome@123 |
| MANAGER           | sumit@nulogic.io               | Welcome@123 |
| TEAM_LEAD         | mani@nulogic.io                | Welcome@123 |
| EMPLOYEE          | saran@nulogic.io               | Welcome@123 |
| RECRUITMENT_ADMIN | suresh@nulogic.io              | Welcome@123 |
| FINANCE_ADMIN     | jagadeesh@nulogic.io           | Welcome@123 |

**Auth rate limit**: 5 req/min. Space role switches by ≥15 seconds.
Group tests by role to minimize login switches.

---

## SCOPE — ALL ROUTES

### MY SPACE (all 9 roles — no requiredPermission on these)

```
/me/dashboard  /me/profile    /me/leave       /me/attendance
/me/payslips   /me/assets     /me/documents   /me/loans
/me/expenses   /me/travel     /me/training    /me/goals
/me/performance /me/tax       /me/letters     /me/helpdesk
```

### NU-HRMS Admin

```
/dashboard         /employees        /departments      /attendance
/leave             /payroll          /compensation     /benefits
/expenses          /loans            /travel           /assets
/letters           /statutory        /statutory-filings /tax
/helpdesk          /approvals        /announcements    /org-chart
/timesheets        /time-tracking    /projects         /resources
/allocations       /calendar         /overtime         /probation
/shifts            /reports          /analytics        /settings
/admin             /admin/roles      /import-export    /integrations
/holidays          /restricted-holidays /contracts     /exit-interview
/workflows         /compliance       /predictive-analytics /executive
/sign              /team-directory   /referrals        /one-on-one
/organization-chart /payments        /lwf              /security
/biometric-devices /letter-templates
```

### NU-Hire

```
/recruitment  /recruitment/candidates  /recruitment/pipeline
/onboarding   /preboarding             /offboarding
/offer-portal /careers
```

### NU-Grow

```
/performance  /performance/reviews  /okr        /feedback360
/training     /learning             /recognition /surveys
/wellness     /goals
```

### NU-Fluence

```
/fluence/wiki    /fluence/blogs      /fluence/templates
/fluence/drive   /fluence/search     /fluence/my-content
/fluence/wall    /fluence/dashboard  /fluence/analytics
```

---

## VALIDATION DIMENSIONS

Check ALL of the following per route per role:

### 1. RBAC ACCESS CONTROL

- Route renders full content for authorized roles
- Route redirects to `/me/dashboard` (NOT 404/500) for unauthorized roles
- Sidebar nav items shown/hidden correctly per role
- Action buttons (Create/Edit/Delete) visible only when permitted
- SuperAdmin sees everything — zero permission errors
- `/me/*` routes accessible to ALL roles regardless of permissions

### 2. PAGE RENDER HEALTH

- Visible content loads (not blank white page)
- No unhandled React errors / ErrorBoundary triggered
- No hydration mismatch in console
- No JS crashes (undefined is not a function, cannot read properties of null, etc.)
- Loading skeleton/spinner shows before data (no blank flash)
- Empty state renders when no data (no null/undefined crash)
- Error state renders when API fails (no silent blank page)

### 3. CONSOLE & NETWORK

- Zero console ERRORs (filter: HMR, favicon, Kafka/ES infra noise expected)
- Zero failed API requests that should succeed
- No CORS errors
- No 401 on permitted endpoints
- No 403 for authorized roles
- 403 confirmed (not silent redirect) for unauthorized API calls
- No 500 errors from backend

### 4. DATA RENDERING

- Tables render with rows (seed data from Flyway V8)
- Stat cards show real numbers (not NaN, "--", null, undefined)
- Charts render (Recharts SVG has visible bars/lines, not empty)
- Pagination controls appear when data > page size
- Search/filter controls accept input without throwing errors
- Dates show valid values (not "Invalid Date")
- Currency/numbers formatted correctly

### 5. INTERACTIVE CRUD FLOWS

Run at least one full CRUD cycle per module per authorized role:

#### Employees (HR_ADMIN, HR_MANAGER, SUPER_ADMIN)

- Create employee → verify appears in list
- Edit personal info → verify persisted on reload
- View all profile tabs: Personal, Employment, Documents, Assets, Leave, Payroll
- Search by name → correct result returned
- Filter by department → list narrows correctly

#### Leave (all roles)

- EMPLOYEE: Apply casual leave for tomorrow → verify PENDING status shown
- TEAM_LEAD/MANAGER: Approve a pending leave → verify APPROVED status
- HR_MANAGER: View all-employee leave calendar
- Leave balance cards show correct numbers (not 0/0 for seeded employees)
- Leave type dropdown populated with types

#### Attendance (all roles)

- EMPLOYEE: Clock in → verify record created with timestamp
- EMPLOYEE: Clock out → verify duration calculated
- MANAGER: View team attendance for today
- HR: Regularize an attendance entry → verify correction saved
- Attendance calendar renders with color-coded markers

#### Payroll (SUPER_ADMIN, HR_ADMIN, HR_MANAGER, FINANCE_ADMIN)

- Payroll runs list loads with ≥1 run
- Click a run → salary breakdown table shows components
- Download payslip → file downloads (not 404)
- Statutory filings list loads with filing types

#### Recruitment (SUPER_ADMIN, HR_ADMIN, RECRUITMENT_ADMIN)

- Job listings load on Kanban/list view
- Create a job posting → appears in list
- Move candidate between pipeline stages (drag or button)
- Interview schedule form opens and submits without error

#### Performance (SUPER_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER, TEAM_LEAD)

- Review cycles list loads
- OKR tree renders for current quarter
- 360 Feedback form opens, fields accept input, submits
- Goal creation validates required fields and saves

#### Training (view: all roles; create: HR_ADMIN, HR_MANAGER)

- Training programs list loads with at least one program
- Enroll employee in a training → enrollment confirmed
- Mark training complete → "Generate Certificate" button appears

#### Cross-Role Approval Flow

- `saran` (EMPLOYEE) submits leave request
- `sumit` (MANAGER) sees it in /approvals → approves
- `saran` refreshes → status shows APPROVED
- Approval badge count on /approvals updates correctly

### 6. FORM VALIDATION

- Required field shows inline error on empty submit
- Email fields reject invalid format
- Date range: end date < start date is rejected
- Number fields reject negative where not allowed
- Submit button disables + shows spinner during submission
- Success toast appears after save
- Error toast appears on API failure (not silent)
- Form resets after successful submission (where applicable)

### 7. MY SPACE SELF-SERVICE — EMPLOYEE role (saran@nulogic.io)

- `/me/dashboard` → Quick stats: leave balance, attendance %, pending approvals — all non-zero
- `/me/profile` → Edit phone/address → save → verify persisted on reload
- `/me/leave` → Leave history visible, apply form submits
- `/me/attendance` → Today's status shown, clock-in/out functional
- `/me/payslips` → Payslip list loads, download triggers file
- `/me/documents` → Document list loads
- `/me/training` → Enrolled trainings visible

### 8. NAVIGATION & SIDEBAR

- Active app (HRMS / Hire / Grow / Fluence) highlighted in app switcher
- Waffle grid shows all 4 sub-apps
- Sidebar items expand/collapse on click
- Active route highlighted in sidebar
- Breadcrumbs update on navigation
- App switcher preserves auth session when switching sub-apps

### 9. DESIGN SYSTEM COMPLIANCE (spot-check 10 pages)

- No raw `bg-white` on card components (must be `bg-[var(--bg-card)]`)
- Buttons use `skeuo-button` with `active:translate-y-px`
- No `shadow-sm/md/lg` (must use `shadow-[var(--shadow-card)]` etc.)
- No banned tokens: `sky-*`, `rose-*`, `slate-*`, `gray-*`, `blue-*`, `amber-*`, `emerald-*`
- 8px spacing grid: no `p-3`, `p-5`, `gap-3`, `gap-5`
- Compact sizing: buttons `px-4 py-2`, table rows `px-4 py-2`
- Icon sizes `h-4 w-4` or `h-5 w-5` in dense tables (not `h-6+`)
- Focus rings visible on keyboard Tab navigation

### 10. ACCESSIBILITY (spot-check 5 critical pages)

- All icon-only buttons have `aria-label`
- Form inputs have `<label>` or `aria-label`
- Modals trap focus and close on Escape key
- Tables have `<th scope>` attributes
- Status badges use text + color (not color alone)
- Images have `alt` text

### 11. DARK MODE

- Toggle dark mode (header or settings)
- Verify 5 pages: `/dashboard`, `/employees`, `/leave`, `/recruitment`, `/performance`
- No white backgrounds leaking through on cards
- Text readable (sufficient contrast)
- Charts visible in dark mode

### 12. PERFORMANCE

- Flag WARN if page load > 3000ms
- Flag FAIL if page load > 5000ms
- Flag WARN if any API call > 2000ms
- Note top 10 slowest routes in report

### 13. SESSION & AUTH

- Login with each role → lands on correct page
- Refresh page while logged in → session persists
- Navigate to admin route as EMPLOYEE → redirect (not 500)
- Logout as SuperAdmin → all cookies cleared → redirected to /auth/login
- 401 is NOT returned on permitted, authenticated requests

### 14. RESPONSIVE (1366px laptop viewport)

- Sidebar collapses to icon-only at 1366px
- Tables scroll horizontally (not broken layout)
- Modals fit viewport (not clipped off-screen)
- Header elements don't overflow or wrap awkwardly

---

## RBAC ACCESS MATRIX — EXPECTED BEHAVIOR

| Route        | SUPER | HR_ADM | HR_MGR | MGR | TL | EMP | REC | FIN |
|--------------|:-----:|:------:|:------:|:---:|:--:|:---:|:---:|:---:|
| /me/*        |   ✅   |   ✅    |   ✅    |  ✅  | ✅  |  ✅  |  ✅  |  ✅  |
| /employees   |   ✅   |   ✅    |   ✅    |  ✅  | ✅  |  ❌  |  ❌  |  ❌  |
| /payroll     |   ✅   |   ✅    |   ✅    |  ❌  | ❌  |  ❌  |  ❌  |  ✅  |
| /admin/roles |   ✅   |   ✅    |   ❌    |  ❌  | ❌  |  ❌  |  ❌  |  ❌  |
| /recruitment |   ✅   |   ✅    |   ✅    |  ❌  | ❌  |  ❌  |  ✅  |  ❌  |
| /performance |   ✅   |   ✅    |   ✅    |  ✅  | ✅  |  ❌  |  ❌  |  ❌  |
| /settings    |   ✅   |   ✅    |   ❌    |  ❌  | ❌  |  ❌  |  ❌  |  ❌  |
| /analytics   |   ✅   |   ✅    |   ✅    |  ❌  | ❌  |  ❌  |  ❌  |  ❌  |
| /reports     |   ✅   |   ✅    |   ✅    |  ❌  | ❌  |  ❌  |  ❌  |  ✅  |
| /fluence/*   |   ✅   |   ✅    |   ✅    |  ✅  | ✅  |  ✅  |  ✅  |  ✅  |
| /onboarding  |   ✅   |   ✅    |   ✅    |  ❌  | ❌  |  ❌  |  ✅  |  ❌  |
| /approvals   |   ✅   |   ✅    |   ✅    |  ✅  | ✅  |  ❌  |  ✅  |  ✅  |

❌ = must redirect to `/me/dashboard` — NOT render partial content, NOT return 500.
Any 200 response with admin data to an unauthorized role = **P0 security bug — stop and fix
immediately**.

---

## AUTO-FIX RULES

### Severity & Action

| Level  | Condition                                                                                     | Action                                           | Max Retries |
|--------|-----------------------------------------------------------------------------------------------|--------------------------------------------------|-------------|
| **P0** | RBAC leak, wrong tenant data, auth bypass, full page JS crash                                 | Fix immediately, block next batch until resolved | 3           |
| **P1** | Console ERROR from app code, 4xx on permitted endpoint, broken CRUD, form submit silent fail  | Fix in current batch                             | 3           |
| **P2** | Missing loading/empty/error state, design token violation, wrong redirect target, render > 3s | Fix if straightforward, continue if complex      | 1           |
| **P3** | A11y improvement, render 1–3s, dark mode edge case, visual polish                             | Log only — do NOT auto-fix                       | 0           |

### Fix Protocol

1. Read the failing file before editing — never rewrite from scratch
2. Make the minimal targeted change — do not refactor surrounding code
3. Verify TypeScript compiles: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
4. For backend fixes: `cd backend && mvn compile -q`
5. Wait 3s for Next.js HMR before rechecking
6. If a fix causes a new error → revert immediately, try alternative approach
7. If 3 attempts all fail → mark UNRESOLVED with full diagnosis

---

## THE AUTONOMOUS LOOP

```
ORCHESTRATOR
  │
  ├─ Phase 1: SuperAdmin baseline (all routes → establish render health)
  │
  ├─ Phase 2: Role matrix (each role → access/deny per route)
  │    └─ 15s between login switches to avoid rate limiting
  │
  ├─ Phase 3: Functional CRUD (authorized roles → interactive flows)
  │
  └─ Phase 4: Cross-cutting (design, a11y, dark mode, performance)

For each USE_CASE:
  attempt = 0
  while attempt < MAX_RETRIES:
    @qa validates → PASS? → log, next use case
                  → FAIL? → @dev fixes → attempt++ → recheck
  if MAX_RETRIES hit → UNRESOLVED → continue
```

### Batch Parallelism

- Batch size: **5 routes per parallel batch**
- Parallelize: validations for **different routes only**
- Never parallelize: two agents modifying the **same file**

---

## CHROME DEVTOOLS MCP TOOL USAGE

Prefer Chrome MCP over Playwright when connected:

```
1. mcp__claude-in-chrome__tabs_context_mcp({})                    → get active tab
2. mcp__claude-in-chrome__navigate({ url: "http://localhost:3000/employees" })
3. mcp__claude-in-chrome__read_page({ tabId })                    → DOM content
4. mcp__claude-in-chrome__read_console_messages({ tabId })        → console errors
5. mcp__claude-in-chrome__read_network_requests({ tabId })        → failed requests
6. mcp__claude-in-chrome__javascript_tool({ tabId, code: "..." }) → evaluate in page
7. mcp__claude-in-chrome__find({ tabId, selector: "..." })        → locate elements
8. mcp__claude-in-chrome__form_input({ tabId, selector, value })  → fill forms
9. mcp__claude-in-chrome__computer({ action: "screenshot" })      → visual capture
10. mcp__claude-in-chrome__get_page_text({ tabId })               → text content
```

Fall back to Playwright headless if Chrome MCP is not connected.

---

## EXECUTION ORDER

```
Phase 1 — Baseline (SuperAdmin)
  Batch 1: /me/dashboard, /dashboard, /employees, /departments, /attendance
  Batch 2: /leave, /payroll, /compensation, /benefits, /expenses
  Batch 3: /loans, /travel, /assets, /letters, /statutory
  ... continue in batches of 5 through all routes

Phase 2 — Role Matrix (per non-SuperAdmin role, grouped by role)
  Login as HR_ADMIN → test HR_ADMIN routes → logout
  [15s pause]
  Login as HR_MANAGER → test HR_MANAGER routes → logout
  [15s pause]
  ... repeat for all 9 roles

Phase 3 — Functional CRUD (interactive flows)
  Leave approval chain: saran → sumit → verify
  Payroll: open run → verify breakdown → download
  Recruitment: create job → add candidate → move stage
  Performance: open review cycle → submit feedback

Phase 4 — Cross-cutting
  Design system: spot-check 10 pages
  A11y: spot-check 5 pages
  Dark mode: toggle + 5 pages
  Performance: measure top 10 slowest
  Responsive: resize to 1366px + 5 pages
```

---

## REPORT FORMAT

Save to: `qa-reports/validate-fix-loop/report-{YYYY-MM-DD}.md`

```markdown
# NU-AURA Full Platform QA Report
**Date**: {date}
**Duration**: {total time}
**Scope**: {n} routes × {n} roles = {n} use cases

## Executive Summary
| Metric | Count |
|--------|-------|
| Total use cases | {n} |
| Passed (first try) | {n} |
| Auto-fixed | {n} |
| Unresolved | {n} |
| P0 issues | {n} |
| P1 issues | {n} |
| P2 issues | {n} |
| P3 issues (logged) | {n} |

**Verdict**: GO ✅ / NO-GO ❌ / CONDITIONAL GO ⚠️

## RBAC Matrix (actual results)
[9 role × all route table with ✅ PASS / ❌ FAIL / ⚠️ WARN per cell]

## Issue Log
| ID | Route | Role | Severity | Description | Root Cause | Fix | Recheck |
|----|-------|------|----------|-------------|------------|-----|---------|
...

## Performance Log (slowest 10)
| Route | Role | Load Time | API Calls | Slowest Call |
...

## Files Changed
[all files modified during auto-fix, grouped by module]

## Unresolved Issues (needs engineering)
[full diagnosis for each unresolved issue]
```

---

## CONFIGURATION

| Setting              | Default |
|----------------------|---------|
| MAX_RETRIES          | 3       |
| BATCH_SIZE           | 5       |
| RENDER_TIMEOUT       | 10000ms |
| NETWORK_IDLE_TIMEOUT | 5000ms  |
| ROLE_SWITCH_PAUSE    | 15s     |
| SCREENSHOT_ON_PASS   | false   |
| SCREENSHOT_ON_FAIL   | true    |
| AUTO_COMMIT_FIXES    | false   |

---

## ERROR HANDLING

| Scenario                | Action                                      |
|-------------------------|---------------------------------------------|
| Service not running     | Attempt to start, abort if fails            |
| Login fails             | Abort entire loop — auth is prerequisite    |
| Rate limit 429          | Wait 60s, retry                             |
| Fix causes TS errors    | Revert immediately, try alternative         |
| Fix breaks other routes | Revert, mark UNRESOLVED                     |
| Network timeout         | Retry once, then mark infrastructure issue  |
| Chrome MCP disconnect   | Fall back to Playwright for remaining cases |
| Git lock file           | Remove `.git/HEAD.lock` and retry commit    |

---

## EXAMPLE INVOCATIONS

```
# Full sweep — all routes, all 9 roles
/nu-validate-fix-loop for ALL routes across ALL 9 roles — full RBAC + CRUD + design + a11y

# Single module sweep
/nu-validate-fix-loop module:leave — all leave routes, all roles

# Single page
/nu-validate-fix-loop /employees as EMPLOYEE — verify redirect

# RBAC only (no CRUD)
/nu-validate-fix-loop rbac-only — just access/deny matrix, no interactive flows

# Specific role
/nu-validate-fix-loop role:EMPLOYEE — validate all self-service routes as saran@nulogic.io
```
