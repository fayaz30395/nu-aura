# NU-AURA — Granular QA Agent Team Prompt (Chrome MCP)

> **Pre-requisites before pasting this prompt:**
> 1. Backend running: `cd backend && ./start-backend.sh` (port 8080)
> 2. Frontend running: `cd frontend && npm run dev` (port 3000)
> 3. Chrome open with debug port: see launch command below
> 4. tmux session: `tmux new-session -s qa && claude`
>
> **Launch Chrome with debugging:**
> ```bash
> /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
>   --remote-debugging-port=9222 \
>   --user-data-dir=/tmp/chrome-debug \
>   http://localhost:3000
> ```

---

## The Prompt

```text
Goal: Execute a granular, flow-by-flow QA sweep of the entire NU-AURA platform.
The app is live at localhost:3000 (frontend) and localhost:8080 (backend).
Chrome is open with remote debugging on port 9222. Use the Chrome DevTools
MCP tools to navigate, screenshot, inspect console errors, and check network
requests on every single page.

Test EVERY functional flow. Test EVERY RBAC boundary. File bugs with severity.
Fix bugs in real-time. Write E2E tests for verified flows. Produce a final
QA sign-off report.

Create a team of 6 teammates:

1. **QA — HRMS Core** — Test all NU-HRMS flows via Chrome.
   "You are QA Engineer 1, responsible for testing ALL NU-HRMS core flows
   using Chrome DevTools MCP. The app is at http://localhost:3000.

   TEST EACH FLOW BELOW. For each flow:
   - Navigate to the page via Chrome DevTools
   - Take a screenshot
   - Check browser console for JS errors
   - Check network tab for failed API calls (4xx/5xx)
   - Verify the page renders correctly (no blank screens, broken layouts)
   - Test CRUD operations where applicable
   - Test RBAC by noting which permission gates the page

   FLOW GROUP 1 — EMPLOYEE MANAGEMENT:
   a) /employees — list loads, search works, filters work, pagination works
   b) /employees/[id] — profile view shows all tabs (personal, employment, documents, assets)
   c) /employees/[id]/edit — edit form loads, validation works, save succeeds
   d) /employees/import — CSV upload form, preview table, validation errors
   e) /employees/change-requests — list loads, can view pending changes
   f) /employees/directory — card view, search by name/department/designation
   g) /departments — list, create, edit, delete, hierarchy tree view
   h) /org-chart — renders org hierarchy, click to expand/collapse
   i) /team-directory — team cards render, manager links work
   RBAC: Employee sees only self. Team Lead sees team. HR Manager sees all.
   Test with each role and verify correct data scoping.

   FLOW GROUP 2 — ATTENDANCE:
   a) /attendance — overview dashboard, today's count, late arrivals
   b) /attendance/my-attendance — personal records, date filter, month summary
   c) /attendance/team — team list with status (present/absent/late/leave)
   d) /attendance/regularization — submit request, view pending, approve/reject
   e) /attendance/comp-off — apply, view balance, approval chain
   f) /attendance/shift-swap — request swap, approve swap
   RBAC: Employee sees own. Team Lead sees team. HR sees all + can manage.

   FLOW GROUP 3 — LEAVE MANAGEMENT:
   a) /leave — overview with balance cards, recent requests
   b) /leave/my-leaves — personal leave history with status
   c) /leave/apply — form loads (leave type dropdown, date picker, reason)
      Test: submit a leave request, verify it appears in pending
   d) /leave/approvals — pending approval queue (only for managers/HR)
      Test: approve one, reject one, verify status change
   e) /leave/calendar — team calendar view, leave indicators
   RBAC: Employee can apply + view own. Team Lead can approve team.
   HR Manager can approve all + manage leave types.

   FLOW GROUP 4 — SHIFTS:
   a) /shifts — shift dashboard with current assignments
   b) /shifts/definitions — list shift types (morning, evening, night, flexible)
   c) /shifts/patterns — weekly/bi-weekly patterns
   d) /shifts/swaps — swap requests
   RBAC: Employee sees own schedule. HR can manage definitions and assignments.

   FLOW GROUP 5 — ASSETS & CONTRACTS:
   a) /assets — asset inventory, assignment tracking, status
   b) /contracts — contract list, status (active/expiring/expired)
   c) /contracts/[id] — contract detail, terms, renewal dates
   d) /contracts/new — create contract form
   e) /contracts/templates — template management
   f) /letters — letter generation from templates
   g) /letter-templates — template CRUD
   RBAC: Employee views own assets/contracts. HR manages all.

   FLOW GROUP 6 — OVERTIME & PROBATION:
   a) /overtime — overtime requests, approval queue
   b) /probation — probation tracking, confirmation dates, review status
   RBAC: Employee requests overtime. Manager approves. HR manages probation.

   FLOW GROUP 7 — HELPDESK:
   a) /helpdesk — dashboard with open/closed ticket counts
   b) /helpdesk/tickets — ticket list with filters (status, priority, category)
   c) /helpdesk/tickets/[id] — ticket detail, comments, attachments, SLA timer
   d) /helpdesk/sla — SLA policy management
   e) /helpdesk/knowledge-base — KB articles
   RBAC: Employee creates tickets. Helpdesk Admin assigns + resolves.

   FLOW GROUP 8 — TIMESHEETS & TIME TRACKING:
   a) /timesheets — timesheet list, submit weekly
   b) /time-tracking — log entries, project-wise tracking
   c) /time-tracking/new — create entry form
   RBAC: Employee submits. Manager approves.

   FLOW GROUP 9 — APPROVALS:
   a) /approvals/inbox — unified approval inbox across all modules
      Test: leave, expense, overtime, shift swap all appear here
      Test: approve/reject actions work
   RBAC: Only users with pending items in their approval queue see entries.

   FLOW GROUP 10 — CALENDARS & HOLIDAYS:
   a) /calendar — event calendar with leave/holiday overlay
   b) /holidays — holiday list by location/year
   c) /restricted-holidays — optional holidays
   d) /nu-calendar — unified NU calendar
   RBAC: All employees can view. HR can manage holidays.

   BUG REPORTING FORMAT (for each issue found):
   Page: [URL]
   Screenshot: [describe what you see]
   Console Errors: [any JS errors]
   Network Errors: [any failed API calls with status code]
   Severity: CRITICAL / MAJOR / MINOR
   Expected: [what should happen]
   Actual: [what actually happens]
   Assign to: [Frontend Fixer or Backend Fixer]

   Post each completed flow group to the task list with PASS/FAIL status."

2. **QA — Finance + Hire + Grow + Fluence** — Test all non-HRMS flows via Chrome.
   "You are QA Engineer 2, responsible for testing all Finance, NU-Hire,
   NU-Grow, and NU-Fluence flows using Chrome DevTools MCP.
   The app is at http://localhost:3000.

   Same testing methodology as QA Engineer 1: navigate, screenshot,
   check console, check network, test CRUD, verify RBAC.

   FLOW GROUP 11 — PAYROLL & COMPENSATION:
   a) /payroll — payroll dashboard, current run status
   b) /payroll/runs — payroll run history, initiate new run
   c) /payroll/salary-structures — structure list, components
   d) /payroll/salary-structures/create — create new structure form
   e) /payroll/payslips — payslip list, download PDF
   f) /payroll/statutory — PF, ESI, PT, LWF config
   g) /payroll/bulk-processing — bulk actions
   h) /payroll/components — salary component CRUD
   i) /compensation — compensation bands, history
   j) /benefits — benefit plans, enrollment
   RBAC: Employee sees own payslips. Payroll Admin manages runs.
   HR Manager can view all. SuperAdmin sees everything.

   FLOW GROUP 12 — EXPENSES & TRAVEL:
   a) /expenses — expense list, create new claim
   b) /expenses/[id] — expense detail, receipts, approval trail
   c) /expenses/approvals — approval queue
   d) /expenses/mileage — mileage tracking
   e) /expenses/reports — expense analytics
   f) /expenses/settings — policy config, limits, categories
   g) /travel — travel requests list
   h) /travel/new — create travel request form
   i) /travel/[id] — travel detail, itinerary, approval
   j) /loans — loan applications, repayment schedule
   k) /loans/new — create loan application
   l) /payments — payment gateway dashboard
   m) /payments/config — payment provider setup (Stripe/Razorpay)
   RBAC: Employee creates expenses/travel. Manager approves.
   Finance manages settings. SuperAdmin sees all.

   FLOW GROUP 13 — TAX & STATUTORY:
   a) /tax — tax overview
   b) /tax/declarations — TDS declarations, proof submission
   c) /statutory — statutory filings dashboard
   d) /statutory-filings — detailed filing status
   e) /lwf — LWF management
   f) /compliance — compliance checklist, audit status
   RBAC: Employee declares tax. HR/Payroll Admin manages statutory.

   FLOW GROUP 14 — RECRUITMENT (NU-HIRE):
   a) /recruitment — recruitment dashboard, open positions count
   b) /recruitment/jobs — job openings list, create new job
   c) /recruitment/candidates — candidate database, search, filter
   d) /recruitment/candidates/[id] — candidate profile, resume, history
   e) /recruitment/pipeline — visual pipeline (applied/screening/interview/offer)
   f) /recruitment/interviews — interview schedule, feedback forms
   g) /recruitment/[jobId]/kanban — drag-and-drop kanban board per job
   h) /recruitment/job-boards — external board integrations
   i) /referrals — employee referral program, rewards tracking
   RBAC: Hiring Manager views assigned jobs. HR Manager sees all.
   Interviewer (implicit role) can evaluate candidates.

   FLOW GROUP 15 — ONBOARDING & OFFBOARDING (NU-HIRE):
   a) /onboarding — onboarding dashboard, active checklists
   b) /onboarding/new — create onboarding for new hire
   c) /onboarding/templates — checklist templates CRUD
   d) /onboarding/[id] — onboarding detail, task progress
   e) /preboarding — preboarding tasks before day 1
   f) /preboarding/portal/[token] — candidate self-service portal
   g) /offboarding — offboarding list, active exits
   h) /offboarding/[id] — offboarding checklist, handover status
   i) /offboarding/[id]/exit-interview — exit interview form
   j) /offboarding/[id]/fnf — full and final settlement
   k) /offboarding/exit/fnf — FnF calculation page
   RBAC: HR manages onboarding/offboarding. Employee sees own checklist.
   Manager sees team offboarding.

   FLOW GROUP 16 — PERFORMANCE & GROWTH (NU-GROW):
   a) /performance — performance hub with cycle status
   b) /performance/reviews — review list, self-review, manager review
   c) /performance/cycles — review cycle management
   d) /performance/cycles/[id]/nine-box — 9-box grid visualization
   e) /performance/cycles/[id]/calibration — calibration session
   f) /performance/okr — OKR dashboard, create/track objectives
   g) /performance/goals — goal setting, progress tracking
   h) /performance/360-feedback — 360 feedback requests, responses
   i) /performance/feedback — continuous feedback
   j) /performance/9box — standalone 9-box analysis
   k) /performance/pip — performance improvement plans
   l) /performance/competency-matrix — competency assessment grid
   m) /performance/revolution — new performance system
   RBAC: Employee self-reviews. Manager reviews team + approves goals.
   HR manages cycles + calibration. SuperAdmin sees all.

   FLOW GROUP 17 — TRAINING & LEARNING (NU-GROW):
   a) /training — training catalog
   b) /training/catalog — browse available trainings
   c) /training/my-learning — enrolled courses, progress
   d) /learning — LMS hub
   e) /learning/courses/[id] — course detail, modules, assessments
   f) /learning/courses/[id]/play — course player (video/content)
   g) /learning/courses/[id]/quiz/[quizId] — quiz/assessment
   h) /learning/certificates — earned certificates
   i) /learning/paths — learning paths, skill tracks
   RBAC: Employee enrolls + views. LMS Admin creates courses.
   Manager assigns training. HR approves training requests.

   FLOW GROUP 18 — RECOGNITION & ENGAGEMENT (NU-GROW):
   a) /recognition — kudos wall, badges, leaderboard
   b) /surveys — pulse survey list
   c) /surveys/[id] — survey detail
   d) /surveys/[id]/respond — take survey
   e) /surveys/[id]/analytics — survey results (HR/Admin only)
   f) /wellness — wellness programs, challenges
   g) /one-on-one — 1:1 meeting notes, action items
   h) /linkedin-posts — internal LinkedIn-style posts
   RBAC: Employee participates. HR creates surveys. Manager sees team engagement.

   FLOW GROUP 19 — KNOWLEDGE MANAGEMENT (NU-FLUENCE):
   a) /fluence — Fluence hub
   b) /fluence/wiki — wiki pages list
   c) /fluence/wiki/new — create wiki page (rich text editor)
   d) /fluence/wiki/[slug] — view wiki page
   e) /fluence/wiki/[slug]/edit — edit wiki page
   f) /fluence/blogs — blog posts list
   g) /fluence/blogs/new — create blog post
   h) /fluence/blogs/[slug] — view blog post
   i) /fluence/blogs/[slug]/edit — edit blog post
   j) /fluence/templates — content templates
   k) /fluence/templates/new — create template
   l) /fluence/drive — file storage, upload, folders
   m) /fluence/search — full-text search across wiki + blogs
   n) /fluence/my-content — personal content dashboard
   o) /fluence/wall — organization activity wall
   p) /fluence/dashboard — content analytics
   RBAC: Employee creates + views. Knowledge Admin manages + publishes.

   Same bug reporting format as QA Engineer 1.
   Post each completed flow group to the task list with PASS/FAIL status."

3. **QA — RBAC & Admin** — Test RBAC boundaries + Admin flows via Chrome.
   "You are QA Engineer 3, responsible for testing ALL RBAC boundaries
   and ALL admin panel flows using Chrome DevTools MCP.
   The app is at http://localhost:3000.

   FLOW GROUP 20 — RBAC BOUNDARY TESTING:
   Test access to EVERY protected route as EACH of these roles:
   SuperAdmin, Tenant Admin, HR Admin, HR Manager, Team Lead, Employee

   For each role, navigate to these pages and verify:
   - Correct access (200) or correct denial (redirect or 403 message)
   - No data leakage (employee should NOT see other employees' salary)
   - Sidebar shows only permitted menu items for the role

   RBAC MATRIX TO VERIFY:

   | Page | SuperAdmin | Tenant Admin | HR Admin | HR Manager | Team Lead | Employee |
   |------|-----------|-------------|----------|-----------|-----------|----------|
   | /employees | ALL | ALL | ALL | ALL | TEAM | SELF |
   | /payroll | ALL | ALL | DENY | ALL | DENY | SELF |
   | /payroll/runs | ALL | ALL | DENY | ALL | DENY | DENY |
   | /admin/roles | ALL | ALL | ALL | DENY | DENY | DENY |
   | /admin/permissions | ALL | ALL | ALL | DENY | DENY | DENY |
   | /admin/settings | ALL | ALL | ALL | DENY | DENY | DENY |
   | /admin/feature-flags | ALL | ALL | DENY | DENY | DENY | DENY |
   | /leave/approvals | ALL | ALL | ALL | ALL | TEAM | DENY |
   | /attendance/team | ALL | ALL | ALL | ALL | TEAM | DENY |
   | /recruitment/jobs | ALL | ALL | ALL | ALL | DENY | DENY |
   | /reports | ALL | ALL | ALL | ALL | DENY | DENY |
   | /analytics | ALL | ALL | ALL | ALL | DENY | DENY |
   | /me/dashboard | ALL | ALL | ALL | ALL | ALL | ALL |
   | /me/payslips | SELF | SELF | SELF | SELF | SELF | SELF |
   | /leave/my-leaves | SELF | SELF | SELF | SELF | SELF | SELF |

   Test DATA SCOPING specifically:
   a) Login as Employee A → /employees → should ONLY see own profile
   b) Login as Team Lead → /employees → should see team members only
   c) Login as HR Manager → /employees → should see ALL employees
   d) Login as Employee A → /payroll/payslips → should see ONLY own payslips
   e) Login as Employee A → try to access /admin/roles → should be denied
   f) Login as Team Lead → /leave/approvals → should see ONLY team requests

   Test IMPLICIT ROLES:
   a) When employee becomes reporting manager → gains team approval permissions
   b) When employee is assigned as interviewer → gains candidate evaluation access

   Test SUPERADMIN BYPASS:
   a) SuperAdmin can access EVERY page without restriction
   b) SuperAdmin can see data across ALL tenants
   c) SuperAdmin bypasses feature flags

   Test TENANT ISOLATION:
   a) Tenant A user CANNOT see Tenant B data
   b) API calls return only current tenant's records
   c) No cross-tenant data in dropdowns or search results

   FLOW GROUP 21 — ADMIN PANEL:
   a) /admin/roles — role list, create role, assign permissions
   b) /admin/permissions — permission matrix, bulk assign
   c) /admin/settings — system settings, tenant config
   d) /admin/feature-flags — toggle features per tenant
   e) /admin/custom-fields — add custom fields to entities
   f) /admin/holidays — holiday calendar CRUD
   g) /admin/leave-types — leave type configuration
   h) /admin/office-locations — location management
   i) /admin/integrations — Slack, Google, payment gateways
   j) /admin/import-keka — Keka data import tool
   k) /admin/system — system health, cache management
   l) /workflows — workflow builder, approval chains
   m) /workflows/[id] — workflow detail, step config

   FLOW GROUP 22 — REPORTS & ANALYTICS:
   a) /reports — report hub, available report types
   b) /reports/builder — custom report builder
   c) /reports/attrition — attrition trends, risk analysis
   d) /reports/leave — leave utilization by department
   e) /reports/headcount — headcount trends, hiring vs attrition
   f) /reports/performance — performance distribution, ratings
   g) /reports/payroll — payroll cost analysis
   h) /reports/utilization — resource utilization
   i) /reports/scheduled — scheduled report management
   j) /analytics — analytics dashboard
   k) /analytics/org-health — org health score
   l) /predictive-analytics — ML-based predictions
   m) /dashboards/executive — executive metrics (revenue/headcount/attrition)
   n) /dashboards/manager — manager dashboard
   o) /dashboards/employee — employee self-service dashboard
   RBAC: Employee sees own dashboard. Manager sees team. HR/Exec sees org-wide.

   FLOW GROUP 23 — APP SWITCHER & PLATFORM:
   a) App switcher (waffle grid) — verify all 4 sub-apps appear
   b) Click each sub-app → verify correct redirect
   c) Verify lock icons on apps user doesn't have access to
   d) Verify sidebar changes based on active sub-app
   e) Settings → /settings/profile, /settings/security, /settings/notifications
   f) SSO config → /settings/sso

   Same bug reporting format. Post each flow group with PASS/FAIL."

4. **Frontend Fixer** — Fix UI bugs reported by all QA agents.
   "You are the Frontend Developer. Monitor the task list continuously
   for bugs reported by QA Engineer 1, 2, and 3. Fix them in real-time.

   Your working directories:
   - frontend/app/ (pages)
   - frontend/components/ (shared components)
   - frontend/lib/hooks/ (custom hooks)
   - frontend/lib/services/ (API services)

   RULES:
   - Mantine UI (NOT Material UI)
   - Tailwind CSS with blue monochrome palette (hue ~228)
   - Colors via CSS variables from globals.css — no bg-white, no shadow-sm/md/lg
   - Only allowed tokens: accent-*, success-*, danger-*, warning-*, info-*, surface-*
   - Banned: gray-*, slate-*, sky-*, rose-*, amber-*, emerald-*
   - 8px spacing grid (p-2/4/6/8, gap-2/4/6/8 — no p-3/5)
   - Shadows: var(--shadow-card/elevated/dropdown) only
   - All icon buttons need aria-label, all interactive elements need cursor-pointer
   - React Query for data fetching, React Hook Form + Zod for forms
   - Axios client from frontend/lib/api/ — never create new instances
   - TypeScript strict — never use 'any'

   After each fix, message the QA agent who reported it to re-verify.
   Post fix details to task list: file changed, what was fixed, which bug."

5. **Backend Fixer** — Fix API bugs reported by all QA agents.
   "You are the Backend Developer. Monitor the task list continuously
   for API errors, 4xx/5xx responses, data issues, and RBAC failures
   reported by all 3 QA agents. Fix them in real-time.

   Your working directory: backend/src/main/java/com/hrms/

   RULES:
   - Package root: com.hrms (api/, application/, domain/, common/, infrastructure/)
   - Every endpoint MUST have @RequiresPermission('module.action')
   - SuperAdmin bypasses all checks via PermissionAspect — don't add exceptions
   - DTOs at API boundary (Java records + MapStruct) — never expose entities
   - Thin controllers — logic in service layer
   - All queries must filter by tenant_id (multi-tenancy)
   - Pagination on all list endpoints (Pageable, return Page<DTO>)
   - Exceptions via @ControllerAdvice with ApiErrorResponse
   - Log with SLF4J: private static final Logger log = LoggerFactory.getLogger(X.class)
   - Check for N+1 queries on any fix involving data loading

   After each fix, message the QA agent who reported it to re-verify.
   Post fix details to task list: file changed, what was fixed, which bug."

6. **Code Reviewer + Report Writer** — Review all fixes. Write final QA report.
   "You are the Code Reviewer and QA Report Writer. Two responsibilities:

   RESPONSIBILITY 1 — CODE REVIEW (ongoing):
   Monitor the task list for completed fixes by Frontend Fixer and Backend Fixer.
   Review each fix for:
   - Security: @RequiresPermission present, no XSS, no SQL injection
   - RBAC: correct permission checked, data scoped by tenant_id
   - Quality: no TypeScript 'any', DTOs used, proper error handling
   - Patterns: follows codebase conventions (React Query, Zod, MapStruct)
   - Performance: no N+1, pagination on lists, proper indexes
   If issues found, message the fixer. If clean, mark review as approved.

   RESPONSIBILITY 2 — QA REPORT (after all flow groups complete):
   Wait for all 3 QA agents to finish ALL 23 flow groups.
   Then write docs/QA-SIGNOFF-REPORT.md:

   # NU-AURA QA Sign-Off Report
   ## Date: 2026-04-02
   ## Overall: PASS / FAIL / CONDITIONAL PASS

   ### Test Coverage Summary
   | Sub-App | Flow Groups Tested | Flows Passed | Flows Failed | Bugs Found | Bugs Fixed |
   |---------|-------------------|-------------|-------------|-----------|-----------|
   | NU-HRMS | 1-10 | X | X | X | X |
   | NU-Hire | 14-15 | X | X | X | X |
   | NU-Grow | 16-18 | X | X | X | X |
   | NU-Fluence | 19 | X | X | X | X |
   | Finance | 11-13 | X | X | X | X |
   | Admin/RBAC | 20-23 | X | X | X | X |

   ### RBAC Verification
   - [ ] All 19 roles tested against protected routes
   - [ ] Data scoping verified (self/team/department/all)
   - [ ] Implicit roles auto-grant tested (7 roles)
   - [ ] SuperAdmin bypass confirmed across all modules
   - [ ] Tenant isolation verified — no cross-tenant data leaks
   - [ ] Sidebar permission gating correct per role

   ### Bug Summary
   | # | Page | Severity | Type (UI/API/RBAC) | Status | Fixed By |
   |---|------|----------|-------------------|--------|----------|

   ### Critical Findings
   (any showstoppers that block production)

   ### Recommendations
   (ordered by priority)

   ### Sign-Off
   - QA Engineer 1 (HRMS Core): PASS/FAIL
   - QA Engineer 2 (Finance+Hire+Grow+Fluence): PASS/FAIL
   - QA Engineer 3 (RBAC+Admin): PASS/FAIL
   - Code Reviewer: ALL FIXES APPROVED / PENDING

   DEPENDENCY: Start reviewing as fixes come in. Write report only after
   ALL 23 flow groups are complete."

TASK DEPENDENCIES:
1. QA Engineers 1, 2, 3 all start IMMEDIATELY (parallel — different flow groups)
2. Frontend Fixer + Backend Fixer monitor task list and fix as bugs come in
3. Code Reviewer reviews each fix as it's completed
4. QA agents re-verify fixes when notified by fixers
5. Code Reviewer writes final report after ALL 23 flow groups complete

COORDINATION:
- QA agents own the agenda — fixers respond to their findings
- After fixing a bug, fixer messages the reporting QA agent to re-test
- Code Reviewer must approve a fix before it's marked DONE
- If a fix introduces a new issue, QA agent files a new bug
- All shared file edits (SecurityConfig, globals.css) require task list notification
- Post to task list after EVERY flow group (PASS/FAIL + bug count)

Final deliverables:
- All 23 flow groups tested with PASS/FAIL status
- All bugs found, filed, fixed, and re-verified
- RBAC matrix verified for all 19 roles
- Data scoping verified (self/team/department/all)
- Tenant isolation confirmed
- All code fixes reviewed and approved
- docs/QA-SIGNOFF-REPORT.md — comprehensive QA sign-off
```
