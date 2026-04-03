---
name: nu-validate-fix-loop
description: Use when asked to "validate and fix", "browser QA loop", "autonomous QA", "check and fix from browser", "validate use case", "visual QA loop", or when you need to autonomously validate a feature/page in the browser, fix issues found, revalidate, and iterate until clean. Orchestrates a validate→fix→recheck cycle using Playwright (or Chrome MCP when connected) with agent teams.
---

# NU-AURA Autonomous Validate-Fix-Recheck Loop

## Overview

This skill orchestrates an autonomous cycle that:
1. **Validates** a use case by inspecting the running app in the browser (Playwright or Chrome DevTools MCP)
2. **Diagnoses** any issues found (UI bugs, console errors, broken flows, missing data)
3. **Fixes** the issues in code
4. **Rechecks** the same use case to confirm the fix
5. **Logs** results and moves to the next use case

This is a **self-healing loop** — it keeps iterating until the use case passes or hits a max retry limit (default: 3 per use case).

---

## When to Use

- "Validate and fix the leave page"
- "Browser QA loop for all HRMS pages"
- "Autonomous QA — check, fix, recheck"
- "Visual QA loop for recruitment"
- "Check the dashboard from browser and fix issues"
- "Validate use cases and auto-fix"
- After deploying a feature, to verify it works end-to-end in the browser

---

## Prerequisites

Before starting, verify:

```bash
# 1. Frontend running on :3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# 2. Backend running on :8080
curl -s http://localhost:8080/actuator/health | grep -o '"status":"UP"'
# Expected: "status":"UP"

# 3. Create report directory
mkdir -p /Users/macbook/IdeaProjects/nulogic/nu-aura/qa-reports/validate-fix-loop
```

If services are not running, start them:
```bash
cd /Users/macbook/IdeaProjects/nulogic/nu-aura
docker-compose up -d
cd backend && ./start-backend.sh &
cd frontend && npm run dev &
```

---

## Input Format

The user provides use cases in one of these formats:

### Format 1: Single page/feature
```
/nu-validate-fix-loop /employees
```

### Format 2: Module sweep
```
/nu-validate-fix-loop module:leave
```

### Format 3: Explicit use case list
```
/nu-validate-fix-loop
- Navigate to /employees, verify table loads with data
- Open employee detail, check all tabs render
- Submit leave request, verify approval flow
```

### Format 4: Full sub-app sweep
```
/nu-validate-fix-loop app:nu-hrms
```

---

## The Autonomous Loop

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                       │
│  (Main session — controls the loop)                  │
│                                                      │
│  for each USE_CASE:                                  │
│    attempt = 0                                       │
│    while attempt < MAX_RETRIES (3):                  │
│      ┌──────────────┐                                │
│      │  @qa AGENT   │──→ Validate in browser         │
│      │  (Subagent)  │    via Playwright/Chrome MCP    │
│      └──────┬───────┘                                │
│             │                                        │
│        PASS? ──yes──→ Log result, next use case      │
│             │                                        │
│            no                                        │
│             │                                        │
│      ┌──────▼───────┐                                │
│      │  @dev AGENT  │──→ Fix the issue in code       │
│      │  (Subagent)  │    (backend/frontend/both)     │
│      └──────┬───────┘                                │
│             │                                        │
│        attempt++                                     │
│        loop back to @qa AGENT (recheck)              │
│                                                      │
│    if MAX_RETRIES hit:                               │
│      Log as UNRESOLVED, continue to next use case    │
│                                                      │
│  Generate final report                               │
└─────────────────────────────────────────────────────┘
```

### Step-by-Step Execution

#### STEP 0: Parse Input & Build Use Case Queue

Convert user input into a structured queue:

```typescript
interface UseCase {
  id: string;           // e.g., "UC-001"
  route: string;        // e.g., "/employees"
  description: string;  // e.g., "Employee list loads with data, no console errors"
  checks: string[];     // Specific assertions
  status: 'PENDING' | 'PASS' | 'FAIL' | 'FIXED' | 'UNRESOLVED';
  attempts: number;
  issues: Issue[];
}
```

**Route-to-UseCase expansion** (when user provides a route or module):

| Input | Expanded Use Cases |
|-------|-------------------|
| `/employees` | Table loads, search works, filters work, create modal opens, no console errors |
| `module:leave` | Leave list loads, apply leave form works, balance shows, approval actions work, calendar view renders |
| `app:nu-hrms` | All 35 HRMS routes — basic render + no console errors + core interaction |

#### STEP 1: Validate (QA Agent)

Spawn a **@qa subagent** for each use case validation:

```
Spawn prompt for QA validation agent:

You are a QA engineer validating NU-AURA in the browser.

**Project**: NU-AURA (Next.js 14 + Spring Boot 3.4.1)
**Frontend**: http://localhost:3000
**Backend**: http://localhost:8080

**Use Case**: {USE_CASE.description}
**Route**: {USE_CASE.route}
**Checks**: {USE_CASE.checks}

## Your Task

1. Write and execute a Playwright script to validate this use case:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Collect network failures
  const networkErrors = [];
  page.on('requestfailed', req => {
    networkErrors.push(`${req.method()} ${req.url()} - ${req.failure().errorText}`);
  });

  // Login as SuperAdmin
  await page.goto('http://localhost:3000/login');
  // ... login flow ...

  // Navigate to route
  await page.goto('http://localhost:3000{USE_CASE.route}');
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'qa-reports/validate-fix-loop/{USE_CASE.id}-attempt-{N}.png', fullPage: true });

  // Run checks:
  // 1. Page rendered (not blank)
  // 2. No JS exceptions in console
  // 3. No failed network requests (except expected 404s for optional features)
  // 4. Key elements visible (tables have rows, forms have fields, etc.)
  // 5. Specific assertions from USE_CASE.checks

  // Report results
  console.log(JSON.stringify({
    status: consoleErrors.length === 0 && networkErrors.length === 0 ? 'PASS' : 'FAIL',
    consoleErrors,
    networkErrors,
    screenshot: '...',
    observations: '...'
  }));

  await browser.close();
})();
```

2. If Chrome DevTools MCP is available, use it INSTEAD of Playwright:
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page` to go to the route
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot` to capture state
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script` to check for errors
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_console_messages` for console output
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_network_requests` for failed requests
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__click` to interact with elements
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__fill` to fill form fields
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__wait_for` to wait for selectors
   - Use `mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit` for performance/a11y audits

3. Report findings in this exact format:

**RESULT**: PASS | FAIL
**ISSUES** (if FAIL):
- [ISSUE-1] {severity: P0|P1|P2} {description} {element/selector} {console error if any}
- [ISSUE-2] ...
**SCREENSHOT**: {path}
**OBSERVATIONS**: {anything notable even if passing}
```

#### STEP 2: Diagnose & Fix (Dev Agent)

If Step 1 returns FAIL, spawn a **@dev subagent** to fix:

```
Spawn prompt for Dev fix agent:

You are a senior full-stack developer fixing issues in NU-AURA.

**Project context**:
- Frontend: Next.js 14 App Router at `frontend/`
- Backend: Spring Boot 3.4.1 at `backend/src/main/java/com/hrms/`
- Stack: Mantine UI, Tailwind, React Query, Zustand, Axios (DO NOT create new instances)
- TypeScript strict (no `any`), React Hook Form + Zod for forms

**Issue to fix**:
Route: {USE_CASE.route}
Issues found by QA:
{ISSUES from Step 1}

Screenshot: {path to screenshot}

## Your Task

1. **Diagnose**: Read the relevant source files for route `{USE_CASE.route}`:
   - Frontend page: `frontend/app/{route}/page.tsx`
   - Related components in `frontend/components/`
   - API service in `frontend/lib/services/`
   - Backend controller/service if it's a data issue

2. **Root cause**: Identify why each issue occurs

3. **Fix**: Make minimal, targeted changes:
   - Fix the actual bug — do NOT refactor surrounding code
   - Follow NU-AURA coding conventions (see CLAUDE.md)
   - No new packages, no new Axios instances, no `any` types
   - Preserve existing patterns

4. **Verify the fix compiles**:
   ```bash
   cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
   ```

5. Report what you changed:
   **FILES CHANGED**:
   - `{file}:{line}` — {what changed and why}
   **FIX SUMMARY**: {one-line description}
```

#### STEP 3: Recheck (Back to QA Agent)

Re-run the exact same validation from Step 1 against the fixed code.

- If **PASS**: Mark use case as `FIXED`, log the fix, move to next use case
- If **FAIL again**: Increment attempt counter, go back to Step 2
- If **MAX_RETRIES (3) reached**: Mark as `UNRESOLVED`, log all attempts, move on

**Important**: After a dev fix, if the frontend needs a rebuild:
```bash
# Next.js hot-reloads automatically in dev mode
# Wait 2-3 seconds for HMR to complete before rechecking
sleep 3
```

For backend changes:
```bash
# Recompile and restart
cd /Users/macbook/IdeaProjects/nulogic/nu-aura/backend
mvn compile -q && ./start-backend.sh
```

---

## Report Generation

After all use cases are processed, generate a report at:
`qa-reports/validate-fix-loop/report-{timestamp}.md`

### Report Format

```markdown
# Validate-Fix Loop Report
**Date**: {date}
**Scope**: {what was validated}
**Duration**: {total time}

## Summary
| Metric | Count |
|--------|-------|
| Total Use Cases | {n} |
| Passed (first try) | {n} |
| Fixed (required iteration) | {n} |
| Unresolved | {n} |
| Total Attempts | {n} |

## Results

### PASSED (First Try)
| ID | Route | Description |
|----|-------|-------------|
| UC-001 | /employees | Table loads with data |

### FIXED (Auto-resolved)
| ID | Route | Issue | Fix | Attempts |
|----|-------|-------|-----|----------|
| UC-003 | /leave | Console error: undefined balance | Added null check in LeaveBalance.tsx:42 | 2 |

### UNRESOLVED (Needs Manual Attention)
| ID | Route | Issue | Last Error | Attempts |
|----|-------|-------|------------|----------|
| UC-007 | /payroll | Payroll run hangs on step 3 | Timeout after 30s | 3 |

## Files Changed
{list of all files modified during fixes, grouped by module}

## Recommendations
{any patterns observed — e.g., "5 pages had missing null checks on API responses"}
```

---

## Parallel Execution Strategy

For large sweeps (full app or module), run use cases in parallel batches:

```
Batch 1 (parallel): UC-001 through UC-005 (5 independent routes)
  → 5 @qa agents validate simultaneously
  → Collect results
  → Spawn @dev agents for any failures (can be parallel if different files)
  → Recheck failed ones

Batch 2: UC-006 through UC-010
  ...
```

**Batch size**: 5 use cases per batch (to stay within token limits)
**Parallelism rule**: Only parallelize validations for DIFFERENT routes. Never run two agents modifying the same file.

---

## Use Case Libraries (Pre-built)

### NU-HRMS Core (35 use cases)
| ID | Route | Description | Key Checks |
|----|-------|-------------|------------|
| UC-H01 | /dashboard | Dashboard renders | Stats cards load, charts render, no errors |
| UC-H02 | /employees | Employee list | Table loads, pagination works, search filters |
| UC-H03 | /employees/[id] | Employee detail | All tabs render (personal, employment, documents, assets) |
| UC-H04 | /attendance | Attendance page | Calendar/list view loads, check-in button visible |
| UC-H05 | /leave | Leave management | Balance cards, leave list, apply button |
| UC-H06 | /leave (apply) | Apply leave flow | Form opens, date picker works, submit succeeds |
| UC-H07 | /payroll | Payroll dashboard | Payroll runs list, summary cards |
| UC-H08 | /expenses | Expenses list | Table loads, create expense form |
| UC-H09 | /assets | Asset management | Asset list, assignment tracking |
| UC-H10 | /loans | Loan management | Loan list, application form |
| UC-H11 | /travel | Travel requests | Request list, create form |
| UC-H12 | /benefits | Benefits | Benefits list, enrollment |
| UC-H13 | /org-chart | Org chart | Tree renders, nodes clickable |
| UC-H14 | /timesheets | Timesheets | Timesheet grid, submission |
| UC-H15 | /projects | Projects | Project list, detail view |
| UC-H16 | /reports | Reports | Report list, generation |
| UC-H17 | /analytics | Analytics | Charts render, filters work |
| UC-H18 | /calendar | Calendar | Events load, month/week views |
| UC-H19 | /announcements | Announcements | List renders, create form |
| UC-H20 | /approvals | Approvals | Pending approvals queue |
| UC-H21 | /settings | Settings | Settings page loads, forms editable |
| UC-H22 | /admin | Admin panel | Admin functions accessible |
| UC-H23 | /admin/roles | Role management | Role list, permission matrix |
| UC-H24 | /departments | Departments | Department tree/list |
| UC-H25 | /compensation | Compensation | Pay structure, revisions |
| UC-H26 | /statutory | Statutory compliance | Compliance settings |
| UC-H27 | /tax | Tax declarations | Tax forms, proofs |
| UC-H28 | /letters | Letters | Letter templates, generation |
| UC-H29 | /helpdesk | Helpdesk | Ticket list, create ticket |
| UC-H30 | /overtime | Overtime | OT requests, approvals |
| UC-H31 | /probation | Probation | Probation tracking |
| UC-H32 | /shifts | Shift management | Shift schedules |
| UC-H33 | /resources | Resources | Resource list |
| UC-H34 | /allocations | Allocations | Allocation board |
| UC-H35 | /me/profile | My profile | Personal info, self-service |

### NU-Hire Core (7 use cases)
| ID | Route | Description |
|----|-------|-------------|
| UC-R01 | /recruitment | Job listings dashboard |
| UC-R02 | /recruitment/candidates | Candidate pipeline |
| UC-R03 | /recruitment/pipeline | Kanban board |
| UC-R04 | /onboarding | Onboarding checklists |
| UC-R05 | /preboarding | Pre-boarding portal |
| UC-R06 | /offboarding | Offboarding flow |
| UC-R07 | /careers | Public careers page |

### NU-Grow Core (10 use cases)
| ID | Route | Description |
|----|-------|-------------|
| UC-G01 | /performance | Performance dashboard |
| UC-G02 | /performance/reviews | Review cycles |
| UC-G03 | /okr | OKR tracking |
| UC-G04 | /feedback360 | 360 feedback |
| UC-G05 | /training | Training programs |
| UC-G06 | /training/catalog | Course catalog |
| UC-G07 | /learning | Learning paths |
| UC-G08 | /recognition | Recognition wall |
| UC-G09 | /surveys | Employee surveys |
| UC-G10 | /wellness | Wellness programs |

---

## Chrome MCP Integration (When Available)

When Chrome DevTools MCP is connected, the validation agent should prefer it over Playwright for interactive debugging:

```
# Check if Chrome MCP tools are available
If tools matching `mcp__chrome*` exist:
  → Use Chrome MCP for navigation, screenshots, console inspection
  → Advantage: Can inspect the ACTUAL browser the user has open
  → Can see real session state, cookies, local storage

If Chrome MCP not available:
  → Fall back to Playwright (headless)
  → Still fully functional, just headless
```

### Chrome MCP Tool Usage Pattern
```
1. mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_pages({})                          → find/select active tab
2. mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page({ url: "http://localhost:3000/employees" })
3. mcp__plugin_chrome-devtools-mcp_chrome-devtools__wait_for({ selector: ".mantine-Table-tr", timeout: 10000 })
4. mcp__plugin_chrome-devtools-mcp_chrome-devtools__take_screenshot({})                     → inspect visually
5. mcp__plugin_chrome-devtools-mcp_chrome-devtools__evaluate_script({ expression: "document.querySelectorAll('.mantine-Table-tr').length" })
6. mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_console_messages({})                → check for errors
7. mcp__plugin_chrome-devtools-mcp_chrome-devtools__list_network_requests({})                → check for failed requests
8. mcp__plugin_chrome-devtools-mcp_chrome-devtools__click({ selector: "button.skeuo-button" }) → interact
9. mcp__plugin_chrome-devtools-mcp_chrome-devtools__fill({ selector: "input[name='search']", value: "John" })
10. mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit({})                   → full perf/a11y audit
```

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_RETRIES` | 3 | Max fix attempts per use case before marking UNRESOLVED |
| `BATCH_SIZE` | 5 | Use cases validated in parallel per batch |
| `RENDER_TIMEOUT` | 10000 | Max ms to wait for page render |
| `NETWORK_IDLE_TIMEOUT` | 5000 | Max ms to wait for network idle |
| `LOGIN_USER` | `fayaz.m@nulogic.io` | Default user for validation (SuperAdmin) |
| `SCREENSHOT_ON_PASS` | false | Whether to screenshot passing use cases |
| `AUTO_COMMIT_FIXES` | false | Whether to git commit after each fix |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Service not running | Attempt to start it, abort if fails |
| Login fails | Abort entire loop — auth is a prerequisite |
| Playwright not installed | Run `npx playwright install chromium` |
| Fix causes TypeScript errors | Revert fix, try alternative approach |
| Fix breaks other routes | Revert fix, mark as UNRESOLVED with note |
| Network timeout | Retry once, then mark as infrastructure issue |
| Chrome MCP disconnected mid-run | Fall back to Playwright for remaining use cases |

---

## Example Invocations

### Quick single page check
```
User: /nu-validate-fix-loop /employees
→ Validates employee page, fixes any issues, rechecks
→ ~2-5 minutes
```

### Module sweep
```
User: /nu-validate-fix-loop module:leave
→ Validates all leave-related pages (5-6 use cases)
→ ~10-15 minutes
```

### Full HRMS sweep
```
User: /nu-validate-fix-loop app:nu-hrms
→ Validates all 35 HRMS routes in batches of 5
→ ~45-60 minutes
```

### Custom use case list
```
User: /nu-validate-fix-loop
- Check /dashboard loads stats correctly
- Verify /employees search returns results
- Test leave application with overlapping dates
→ Runs exactly these 3 use cases
→ ~5-10 minutes
```
