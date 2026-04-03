# NU-AURA QA Agent Team — Run 2026-04-03

> **Paste this entire prompt into a new Claude Code session (co-work or tmux).**
>
> **Pre-conditions before pasting:**
> 1. Backend running: `cd backend && ./start-backend.sh` → :8080
> 2. Frontend running: `cd frontend && npm run dev` → :3000
> 3. Both pass: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`
> 4. Working directory: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`

---

## The Prompt

```text
Goal: Execute a complete QA run of all 318 use cases in
docs/qa/NU-AURA-QA-USE-CASES.md, fix every bug found,
revalidate after fixes, and mark every use case PASS / FAIL / BLOCKED
in a live results file.

The app is live:
  Frontend: http://localhost:3000
  Backend:  http://localhost:8080/api/v1
  Auth password (all seed users): Welcome@123

Seed users:
  fayaz.m@nulogic.io       — SUPER_ADMIN
  sarankarthick.maran@nulogic.io — SUPER_ADMIN
  jagadeesh@nulogic.io     — HR_MANAGER
  sumit@nulogic.io         — MANAGER
  mani@nulogic.io          — TEAM_LEAD
  saran@nulogic.io         — EMPLOYEE
  raj@nulogic.io           — EMPLOYEE
  arun@nulogic.io          — EMPLOYEE
  suresh@nulogic.io        — RECRUITMENT_ADMIN
  newjoiner@nulogic.io     — NEW_JOINER

Results go to: docs/qa/runs/2026-04-03/
  results.md   — LIVE status table for all 318 UCs (one row per UC)
  bugs.md      — bugs filed by QA agents
  fixes.md     — fixes applied by Dev agent
  signoff.md   — final QA sign-off report

---

## STEP 1 — Orchestrator: Create Tracking Files

Before spawning any teammate, YOU (the orchestrator) must:

1. Create docs/qa/runs/2026-04-03/ directory if it doesn't exist.

2. Create docs/qa/runs/2026-04-03/results.md with this header and a row
   for every UC-XXX-NNN found in docs/qa/NU-AURA-QA-USE-CASES.md:

   # QA Run Results — 2026-04-03

   | UC ID | Title | Priority | Tester | Status | Notes |
   |-------|-------|----------|--------|--------|-------|
   | UC-AUTH-001 | Email/Password Login | P0 | QA-1 | PENDING | |
   | UC-AUTH-002 | Google OAuth SSO Login | P0 | QA-1 | PENDING | |
   ... (all 318 rows, Status=PENDING)

   To get all UC IDs: read docs/qa/NU-AURA-QA-USE-CASES.md and extract
   every line starting with "### UC-". Parse the ID and title from each.

3. Create docs/qa/runs/2026-04-03/bugs.md:

   # Bug Tracker — 2026-04-03

   | # | UC ID | Severity | Type | Page/Endpoint | Description | Status | Assigned |
   |---|-------|----------|------|---------------|-------------|--------|---------|

4. Create docs/qa/runs/2026-04-03/fixes.md:

   # Fix Log — 2026-04-03

   | # | Bug # | File Changed | What Was Fixed | Status |
   |---|-------|-------------|----------------|--------|

5. Create docs/qa/runs/2026-04-03/signoff.md:

   # QA Sign-Off Report — 2026-04-03
   ## Status: IN PROGRESS

   (Leave the rest blank — Dev-QA agent will fill this at the end)

Once all 4 files exist, spawn the 5 teammates below simultaneously.

---

## Create a team of 5 teammates:

---

### Teammate 1 — QA-1: Platform + HRMS Auth & Finance

"You are QA Engineer 1 on the NU-AURA platform. Your job is to execute
the use cases assigned to you from docs/qa/NU-AURA-QA-USE-CASES.md,
report bugs, and mark results.

PROJECT CONTEXT:
- Stack: Next.js 14 (App Router) + Spring Boot 3.4.1 (Java 17)
- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api/v1
- Auth: JWT in httpOnly cookie 'nu_aura_token'
- All seed user passwords: Welcome@123
- Package root: com.hrms
- Results file: docs/qa/runs/2026-04-03/results.md
- Bugs file: docs/qa/runs/2026-04-03/bugs.md

YOUR ASSIGNED USE CASES (read from docs/qa/NU-AURA-QA-USE-CASES.md):
  UC-AUTH-001 through UC-AUTH-007   (7 UCs — P0 Auth flows)
  UC-PAY-001 through UC-PAY-006     (6 UCs — P0 Payroll engine)
  UC-APPR-001 through UC-APPR-005   (5 UCs — P0 Approval chains)
  UC-EXP-001                        (1 UC  — Expenses)
  UC-LOAN-001                       (1 UC  — Loans)
  UC-TRAVEL-001                     (1 UC  — Travel)
  UC-STAT-001 through UC-STAT-003   (3 UCs — PF/TDS/LWF)
  UC-REPORT-001 through UC-REPORT-002 (2 UCs — Reports)
  UC-ADMIN-001 through UC-ADMIN-002 (2 UCs — Feature flags, holidays)
  UC-NOTIF-001                      (1 UC  — Notifications)
  UC-FNF-001 through UC-FNF-005     (5 UCs — Full & Final Settlement)
  UC-PERF-001 through UC-PERF-008   (8 UCs — Performance benchmarks)

TOTAL: ~42 UCs. Work sequentially. P0 first.

HOW TO EXECUTE EACH USE CASE:
1. Read the full UC section from docs/qa/NU-AURA-QA-USE-CASES.md
2. Execute the test steps using API calls (curl) and/or Chrome MCP:
   - For API tests: use curl with the JWT token
   - For UI tests: use the Chrome MCP tools (mcp__claude-in-chrome__*):
       a. mcp__claude-in-chrome__tabs_context_mcp  → check open tabs
       b. mcp__claude-in-chrome__navigate          → go to http://localhost:3000/<route>
       c. mcp__claude-in-chrome__find              → locate buttons/inputs/text
       d. mcp__claude-in-chrome__form_input        → fill login forms or data fields
       e. mcp__claude-in-chrome__get_page_text     → read page content / verify labels
       f. mcp__claude-in-chrome__read_page         → inspect DOM structure
       g. mcp__claude-in-chrome__javascript_tool   → run JS assertions or extract values
       h. mcp__claude-in-chrome__read_network_requests → verify API calls and status codes
       i. mcp__claude-in-chrome__read_console_messages → check for JS errors
   - For RBAC: switch login persona via navigate → /auth/login, fill form_input
   - IMPORTANT: always call mcp__claude-in-chrome__tabs_context_mcp first each session;
     never reuse tab IDs from a prior session
3. Verify against the Expected Result and Negative Test sections
4. Mark the result immediately in docs/qa/runs/2026-04-03/results.md:
   - Change Status from PENDING to: PASS / FAIL / BLOCKED
   - Add brief notes (e.g. 'UI rendered correctly', '404 on /api/v1/auth/mfa-login')
5. If FAIL: file a bug in docs/qa/runs/2026-04-03/bugs.md with:
   | <next#> | <UC-ID> | CRITICAL/MAJOR/MINOR | UI/API/RBAC | <url/endpoint> | <description> | OPEN | QA-1 |

HOW TO LOGIN VIA API (for role-based API tests):
  TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"saran@nulogic.io\",\"password\":\"Welcome@123\"}' \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"token\"])')

  # Then use: -H 'Authorization: Bearer $TOKEN'
  # Note: backend may use cookie-based auth. Try both.

HOW TO LOGIN VIA CHROME MCP (for UI tests):
  1. mcp__claude-in-chrome__navigate → http://localhost:3000/auth/login
  2. mcp__claude-in-chrome__form_input → fill email field with persona email
  3. mcp__claude-in-chrome__form_input → fill password field with Welcome@123
  4. mcp__claude-in-chrome__find → click the Sign In button
  5. mcp__claude-in-chrome__get_page_text → verify redirect to /me/dashboard

After each batch of 5 UCs, post a progress summary to the task list.
After all your UCs are done, post 'QA-1 COMPLETE' to the task list."

---

### Teammate 2 — QA-2: HRMS Core (Employees, Leave, Attendance, Benefits)

"You are QA Engineer 2 on the NU-AURA platform. Execute your assigned
use cases from docs/qa/NU-AURA-QA-USE-CASES.md.

PROJECT CONTEXT: (same as QA-1 above)

YOUR ASSIGNED USE CASES:
  UC-EMP-001 through UC-EMP-005     (5 UCs — Employee lifecycle)
  UC-ATT-001 through UC-ATT-003     (3 UCs — Attendance)
  UC-LEAVE-001 through UC-LEAVE-003 (3 UCs — Leave management)
  UC-BEN-001 through UC-BEN-002     (2 UCs — Benefits)
  UC-ASSET-001 through UC-ASSET-002 (2 UCs — Asset management)
  UC-CONTRACT-001                   (1 UC  — Contracts)
  UC-LETTER-001                     (1 UC  — Letters)
  UC-DEPT-001                       (1 UC  — Departments)
  UC-HELP-001                       (1 UC  — Helpdesk)
  UC-TIME-001                       (1 UC  — Timesheets)
  UC-RESOURCE-001                   (1 UC  — Resource allocation)
  UC-COMP-001                       (1 UC  — Compensation)
  UC-PROB-001 through UC-PROB-005   (5 UCs — Probation tracking)
  UC-MY-001 through UC-MY-008       (8 UCs — My Space self-service)
  UC-SETTINGS-001 through UC-SETTINGS-007 (7 UCs — Settings & security)
  UC-APPSW-001                      (1 UC  — App switcher)
  UC-SMOKE-001                      (1 UC  — Full platform smoke test)

TOTAL: ~44 UCs. Work sequentially.

HOW TO EXECUTE: Same methodology as QA-1.
- Read the full UC text from docs/qa/NU-AURA-QA-USE-CASES.md
- For UI tests: use Chrome MCP (mcp__claude-in-chrome__*) — navigate, find, form_input, get_page_text
- For API tests: use curl with JWT token
- Mark results.md immediately after each UC
- File bugs in bugs.md immediately when found

EMPLOYEE SELF-SERVICE TESTING (UC-MY-*):
  Login as saran@nulogic.io (EMPLOYEE)
  - /me/dashboard, /me/profile, /me/payslips, /me/leave
  - /me/assets, /me/documents, /me/loan
  Verify: data scoped to own records only, no admin features visible

ATTENDANCE TESTING NOTE:
  Clock-in/out may not be testable if already done today.
  For UC-ATT-001: test the regularization flow instead if clock is closed.

After all UCs done, post 'QA-2 COMPLETE' to task list."

---

### Teammate 3 — QA-3: RBAC, Security, NU-Hire, NU-Grow

"You are QA Engineer 3 on the NU-AURA platform. Execute your assigned
use cases from docs/qa/NU-AURA-QA-USE-CASES.md.

PROJECT CONTEXT: (same as QA-1 above)

YOUR ASSIGNED USE CASES:
  UC-RBAC-001 through UC-RBAC-020   (20 UCs — RBAC boundaries)
  UC-TENANT-001                     (1 UC  — Multi-tenancy isolation)
  UC-SEC-001 through UC-SEC-012     (12 UCs — Security hardening)
  UC-HIRE-001 through UC-HIRE-018   (18 UCs — NU-Hire full suite)
  UC-HIRE-009 through UC-HIRE-018   (already included above)

TOTAL: ~51 UCs. RBAC and Security are highest priority — do those first.

RBAC TESTING APPROACH:
  Test each RBAC UC by switching roles. Space logins 15 seconds apart
  due to rate limiting (5 auth requests/minute on /api/v1/auth/**).

  For each RBAC boundary test:
  1. Login as the restricted role (e.g. EMPLOYEE)
  2. Attempt the forbidden action via API:
     curl -X GET http://localhost:8080/api/v1/admin/roles \
       -H 'Authorization: Bearer $EMPLOYEE_TOKEN'
     Expected: 403
  3. Attempt via browser URL (if UI test): verify redirect occurs
  4. Any 200 response where 403 is expected = P0 security bug

SECURITY TESTING:
  UC-SEC-002 (OWASP Headers): curl -I http://localhost:8080/api/v1/employees
    Verify: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security
  UC-SEC-004 (XSS): Use Chrome MCP —
    mcp__claude-in-chrome__navigate → page with input field
    mcp__claude-in-chrome__form_input → enter <script>alert('xss')</script>
    mcp__claude-in-chrome__read_console_messages → verify no alert fired
    mcp__claude-in-chrome__get_page_text → verify literal text stored, not executed
  UC-SEC-007 (SQL Injection): Use Chrome MCP —
    mcp__claude-in-chrome__form_input → enter ' OR '1'='1 in search/filter fields
    mcp__claude-in-chrome__read_network_requests → verify 400 or safe response, no data leak

NU-HIRE TESTING:
  Login as suresh@nulogic.io (RECRUITMENT_ADMIN)
  Test: job creation, kanban pipeline, interview scheduling, offer generation

After all UCs done, post 'QA-3 COMPLETE' to task list."

---

### Teammate 4 — QA-4: NU-Grow, Dashboards, Platform

"You are QA Engineer 4 on the NU-AURA platform. Execute your assigned
use cases from docs/qa/NU-AURA-QA-USE-CASES.md.

PROJECT CONTEXT: (same as QA-1 above)

YOUR ASSIGNED USE CASES:
  UC-GROW-001 through UC-GROW-022   (22 UCs — NU-Grow: performance, OKR, LMS, recognition)
  UC-DASH-001 through UC-DASH-008   (8 UCs — Dashboards: exec, manager, employee, HR)

TOTAL: ~30 UCs.

NU-GROW TESTING APPROACH:
  Performance Reviews: Login as jagadeesh@nulogic.io (HR_MANAGER)
    → /performance/cycles → verify Q1 2026 Review cycle exists
    → UC-GROW-001: create a new review cycle
    → UC-GROW-002: self-review as saran@nulogic.io
    → UC-GROW-003: manager review as sumit@nulogic.io

  OKRs: UC-GROW-005, UC-GROW-015, UC-GROW-016
    → /performance/okr → verify Company OKR Q1 2026 exists
    → Test cascade from company → team → individual

  LMS/Training: UC-GROW-006, UC-GROW-019, UC-GROW-020
    → /learning → verify 3 seeded courses exist
    → Enroll in 'Onboarding 101' as newjoiner@nulogic.io

  Recognition: UC-GROW-007
    → /recognition → post a kudos to a peer

  Calibration: UC-GROW-010
    → /performance/cycles/{id}/calibration → verify 9-box renders

  PIP: UC-GROW-012, UC-GROW-013
    → /performance/pip → initiate a PIP for an employee

DASHBOARD TESTING:
  UC-DASH-001: Login SuperAdmin → /me/dashboard → render time < 3s
  UC-DASH-002: Login Tenant Admin → executive dashboard
  UC-DASH-003: Login sumit@nulogic.io (Manager) → manager dashboard
  UC-DASH-004: Login saran@nulogic.io (Employee) → my space overview
  UC-DASH-006: Check predictive analytics widget renders (no crash)
  UC-DASH-008: Verify partial widget failure doesn't crash whole dashboard

After all UCs done, post 'QA-4 COMPLETE' to task list."

---

### Teammate 5 — Dev + Reporter (Bug Fixer + Sign-Off)

"You are the Developer and QA Report Writer for the NU-AURA QA run.
Two responsibilities:

RESPONSIBILITY 1 — BUG FIXER (runs throughout, monitors bugs.md):

Monitor docs/qa/runs/2026-04-03/bugs.md continuously.
When a new OPEN bug appears:

1. Read the bug description and identify the cause.
2. Fix it:
   FRONTEND bugs → work in:
     frontend/app/         (pages)
     frontend/components/  (shared components)
     frontend/lib/hooks/   (custom hooks)
     frontend/lib/services/(API services)

   BACKEND bugs → work in:
     backend/src/main/java/com/hrms/

   FRONTEND RULES (non-negotiable):
   - Mantine UI (NOT Material UI)
   - Tailwind CSS — CSS variables only (no bg-white, no shadow-sm/md/lg)
   - Allowed tokens: accent-*, success-*, danger-*, warning-*, info-*, surface-*
   - Banned: gray-*, slate-*, sky-*, rose-*, amber-*, emerald-*
   - 8px spacing grid (p-2/4/6/8 only — no p-3/5)
   - React Query for data fetching — no useEffect + fetch
   - React Hook Form + Zod for all forms
   - Axios from frontend/lib/api/ — never create new instances
   - TypeScript strict — never use 'any'

   BACKEND RULES (non-negotiable):
   - @RequiresPermission('module.action') on EVERY endpoint
   - SuperAdmin bypass is automatic via PermissionAspect — never add exceptions
   - DTOs at API boundary (Java records + MapStruct) — never expose entities
   - All DB queries must filter by tenant_id
   - Pagination on all list endpoints (Pageable, return Page<DTO>)
   - Exceptions via @ControllerAdvice with ApiErrorResponse

3. After fixing, update docs/qa/runs/2026-04-03/fixes.md:
   | <#> | <bug#> | <file(s) changed> | <what was fixed> | FIXED |

4. Update the bug in bugs.md: Status → FIXED, add fixer note.

5. Update results.md for the UC: add note 'Fixed — needs revalidation'.

6. The QA agent who filed the bug will re-verify (they monitor fixes.md).
   You don't need to re-run the test yourself.

RESPONSIBILITY 2 — SIGN-OFF REPORT (runs after all QA agents finish):

Wait for all 4 QA agents to post 'COMPLETE' to the task list.
Then:

1. Read docs/qa/runs/2026-04-03/results.md and count:
   - Total UCs by status: PASS / FAIL / BLOCKED / PENDING
   - By priority: P0 / P1 / P2 / P3
   - By sub-app: Platform / HRMS / Hire / Grow / Fluence

2. Read docs/qa/runs/2026-04-03/bugs.md and count:
   - Total bugs by severity: CRITICAL / MAJOR / MINOR
   - Open vs Fixed

3. Write the final docs/qa/runs/2026-04-03/signoff.md:

   # QA Sign-Off Report — 2026-04-03
   ## Overall Verdict: GO / NO-GO / CONDITIONAL

   ### Test Coverage
   | Priority | Total | Pass | Fail | Blocked | Pass% |
   |----------|-------|------|------|---------|-------|
   | P0 (Critical) | | | | | |
   | P1 (HRMS) | | | | | |
   | P2 (Hire) | | | | | |
   | P3 (Grow) | | | | | |
   | **TOTAL** | 318 | | | | |

   ### By Sub-App
   | Sub-App | Tests | Pass | Fail | Blocked |
   |---------|-------|------|------|---------|
   | Platform (Auth/RBAC/Security) | | | | |
   | NU-HRMS | | | | |
   | NU-Hire | | | | |
   | NU-Grow | | | | |
   | Platform (Dashboards/Settings) | | | | |

   ### Bug Summary
   | Severity | Filed | Fixed | Open |
   |----------|-------|-------|------|
   | CRITICAL | | | |
   | MAJOR | | | |
   | MINOR | | | |

   ### Open Issues (if any)
   [list any FAIL UCs still not fixed]

   ### Blockers
   [any P0 failures or CRITICAL open bugs]

   ### Recommendations
   [ordered by priority]

   ### Sign-Off
   - QA-1 (Platform + Finance): PASS/FAIL — {pass_count}/{total_count}
   - QA-2 (HRMS Core): PASS/FAIL
   - QA-3 (RBAC + Security + Hire): PASS/FAIL
   - QA-4 (Grow + Dashboards): PASS/FAIL
   - Dev: All bugs FIXED / {n} open

4. Update the Status line in signoff.md:
   ## Status: COMPLETE — GO / NO-GO / CONDITIONAL

Also update the NU-AURA-QA-USE-CASES.md file:
  Add a '- **Last Run:** 2026-04-03' and '- **Last Result:** PASS/FAIL'
  line to each UC section (append after the **Priority** field)."

---

## TASK DEPENDENCIES

1. Orchestrator creates tracking files FIRST (all 4 files must exist)
2. Teammates 1-4 start SIMULTANEOUSLY after files are created
3. Teammate 5 starts immediately (monitors bugs.md from the start)
4. QA agents re-verify any UC after Teammate 5 posts a fix for it
5. Teammate 5 writes sign-off ONLY after all 4 QA agents post COMPLETE

## COORDINATION PROTOCOL

- QA agents write to results.md and bugs.md after EACH test
- Dev agent monitors bugs.md and fixes in real-time
- After a fix, Dev updates fixes.md → QA agent sees it and re-tests
- Use task list to post: 'QA-1 COMPLETE', 'BUG-3 FIXED', etc.
- Shared files that need careful edit: globals.css, SecurityConfig.java
  → Post to task list before editing these; wait for acknowledgment

## REVALIDATION FLOW

When QA sees their UC is marked 'Fixed — needs revalidation' in results.md:
1. Re-run the exact test steps from the UC document
2. If PASS: update results.md Status to PASS, add note 'Revalidated after fix'
3. If still FAIL: update bugs.md Status back to OPEN, add regression note

## FINAL DELIVERABLES

1. docs/qa/runs/2026-04-03/results.md — all 318 UCs with PASS/FAIL/BLOCKED
2. docs/qa/runs/2026-04-03/bugs.md — complete bug log
3. docs/qa/runs/2026-04-03/fixes.md — complete fix log
4. docs/qa/runs/2026-04-03/signoff.md — QA sign-off with GO/NO-GO verdict
5. docs/qa/NU-AURA-QA-USE-CASES.md — 'Last Run' field added to each UC
```

---

## Quick Reference for the Session

### Auth Rate Limits
- `/api/v1/auth/**` → 5 requests/minute
- Space role-switches by **15 seconds**
- Group tests by role to minimize login switches

### Chrome MCP — UI Test Workflow

All UI tests use `mcp__claude-in-chrome__*` tools against the user's real Chrome browser.
**Load each tool via ToolSearch before first use** (`select:mcp__claude-in-chrome__<tool_name>`).

```
# Step 0 — always first
mcp__claude-in-chrome__tabs_context_mcp
  → get current tabs; create a new tab if needed

# Navigate to a page
mcp__claude-in-chrome__navigate
  url: "http://localhost:3000/auth/login"

# Fill a form field
mcp__claude-in-chrome__form_input
  selector: "input[name='email']"   value: "fayaz.m@nulogic.io"
mcp__claude-in-chrome__form_input
  selector: "input[name='password']" value: "Welcome@123"

# Click a button / element
mcp__claude-in-chrome__find
  query: "Sign In button"  → returns selector
  (then use javascript_tool to click, or find with action:click)

# Read page content / verify text
mcp__claude-in-chrome__get_page_text
  → scan for expected labels, values, headings

# Inspect DOM
mcp__claude-in-chrome__read_page
  → structured DOM view for element assertions

# Run JS assertion
mcp__claude-in-chrome__javascript_tool
  code: "document.title"  or  "window.location.pathname"

# Check API calls & status codes
mcp__claude-in-chrome__read_network_requests
  pattern: "/api/v1/employees"

# Check for JS errors
mcp__claude-in-chrome__read_console_messages
  pattern: "error|Error|TypeError"

# Record a GIF for a multi-step flow
mcp__claude-in-chrome__gif_creator
  filename: "uc-auth-001-login.gif"
```

### API Quick Auth
```bash
# Get SuperAdmin token
SA_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"fayaz.m@nulogic.io","password":"Welcome@123"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token",""))')

# Get Employee token
EMP_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"saran@nulogic.io","password":"Welcome@123"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token",""))')

# Test an endpoint
curl -s -H "Authorization: Bearer $SA_TOKEN" \
  http://localhost:8080/api/v1/employees | python3 -m json.tool | head -20
```

### UC Assignment Map

| Teammate | UC Groups | UC Count |
|----------|-----------|----------|
| QA-1 | AUTH, PAY, APPR, EXP, LOAN, TRAVEL, STAT, REPORT, ADMIN, NOTIF, FNF, PERF | ~42 |
| QA-2 | EMP, ATT, LEAVE, BEN, ASSET, CONTRACT, LETTER, DEPT, HELP, TIME, RESOURCE, COMP, PROB, MY, SETTINGS, APPSW, SMOKE | ~44 |
| QA-3 | RBAC, TENANT, SEC, HIRE | ~51 |
| QA-4 | GROW, DASH | ~30 |
| Dev+Report | Monitor bugs, fix, write sign-off | — |

### Severity Levels
| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Auth bypass, data leak, crash | Block release immediately |
| MAJOR | Wrong data, RBAC failure, broken CRUD | Fix before release |
| MINOR | UI glitch, missing validation msg | Fix in next sprint |

---

## How to Launch This

In your co-work session, paste the block between the triple-backticks above.
Or reference this file directly:

```bash
cat docs/qa/runs/QA-RUN-2026-04-03-TEAM-PROMPT.md
```
