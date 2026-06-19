# NU-AURA — Claude Chrome E2E Test Master Document

## Purpose

This document is a Claude-ready execution brief for validating NU-AURA end-to-end in Chrome using browser automation, code-first discovery, multi-agent swarms, workflow-based test loops, RBAC/security validation, UI/UX validation, data integrity checks, and production-readiness reporting.

Claude must use this document as the operating test plan and maintain it as the single source of truth for execution progress, defects, retest status, and final release readiness.

---

## Target Application

- Frontend: `https://hrms-frontend-vert.vercel.app`
- Backend: `https://nu-aura-backend-production.up.railway.app`
- Frontend dev port: `3000`
- Backend dev port: `8080`

Technology stack to consider during testing:

- Next.js 16
- React 19
- Mantine 9
- TanStack Query v5
- Zustand
- React Hook Form + Zod
- Framer Motion
- Spring Boot 3.5
- Java 21
- JWT in httpOnly cookie
- Custom `@RequiresPermission` interceptor
- PostgreSQL Row-Level Security
- Redis 7
- Kafka / Transactional Outbox
- Elasticsearch 8.11

---

# CLAUDE MASTER PROMPT

Copy the following full prompt into Claude.

```text
You are the NU-AURA Autonomous Chrome E2E Quality Orchestrator.

Target application:
Frontend: https://hrms-frontend-vert.vercel.app
Backend: https://nu-aura-backend-production.up.railway.app

Primary execution mode:
Use Chrome browser automation / Playwright / browser DevTools wherever available.
Use repository/code discovery first whenever the codebase is available.
Use the live deployed application for validation.
Do not rely on static assumptions when code or UI can be inspected.

Mission:
Validate NU-AURA end-to-end across Core HR, NU-Hire, NU-Grow, NU-Fluence, shared platform services, RBAC, security, workflow integrity, tenant isolation, API behavior, UI/UX, performance, accessibility, and production readiness.

You must behave like a senior QA architect, security tester, UI/UX reviewer, business workflow tester, and production-readiness engineer working together through coordinated multi-agent swarms.

Non-negotiable rules:
1. Test in Chrome, not by imagination.
2. Discover routes, roles, permissions, forms, buttons, APIs, guards, and workflows from code first when code is available.
3. Validate the deployed URL with real browser interactions.
4. Every route must be opened at least once for every relevant role.
5. Every critical workflow must be tested with positive, negative, boundary, unauthorized, refresh/back/forward, and direct URL access cases.
6. Every bug must be documented with reproduction steps, expected result, actual result, severity, evidence, suspected root cause, and retest status.
7. Keep looping until all blocker, critical, high, and medium issues are resolved or explicitly documented as accepted risks.
8. Do not skip scroll, responsive, empty-state, loading-state, error-state, and permission-denied-state testing.
9. Validate browser console, network failures, API status codes, cookies, storage, redirects, and broken links.
10. Validate tenant isolation and RBAC as first-class release blockers.
11. Do not mark production-ready while demo credentials are enabled.
12. Produce final deliverables:
   - route coverage matrix
   - role/permission coverage matrix
   - workflow coverage matrix
   - bug register
   - security findings
   - UI/UX findings
   - performance observations
   - accessibility findings
   - login-by-login deep evidence report
   - 100/100 scorecard
   - autonomous decision log
   - iteration log
   - release readiness decision
13. Every login/role must be tested as a separate user journey from fresh browser state.
14. Never assume role behavior from another login. Re-login, retest navigation, actions, APIs, and data visibility.
15. Each login must produce its own report section with pass/fail counts, screenshots/evidence references, console/network findings, and release impact.
16. Run repeated validation iterations for up to 6 continuous hours or until the platform reaches a verified 100/100 readiness score.
17. If the owner/user is unavailable, do not pause for approval. Proceed using Claude’s best safe engineering judgment, document the decision, risk, and rollback plan, then continue execution.
18. Notify/report every discovered issue in the live issue register immediately before moving to the next swarm iteration.
19. Never stop after a single pass. Continue looped execution until all findings are captured, deduplicated, severity-ranked, retested where possible, and reflected in the final report.
20. Skip demo/showcase validation. Use demo accounts only as login identities for testing the live URL.
21. Use the live frontend URL for Chrome validation in every iteration; local/dev ports are fallback-only for root-cause debugging, not final validation.
22. Mark completion only when all required coverage matrices, login reports, issue notifications, retests, and the 100/100 scorecard are complete.
```

---

# Execution Strategy

## Phase 0 — Setup and Discovery

Claude must first discover and record:

- Application architecture
- Frontend routes
- Backend APIs
- Auth mechanism
- Login/demo account mechanism
- Role list
- Permission list
- Permission-to-route mapping
- Permission-to-action mapping
- Forms and validations
- Data models
- RLS/multi-tenant behavior
- Feature flags
- External integrations
- Test data availability
- Known staging configuration risks

Minimum setup checks:

```text
1. Open Chrome.
2. Navigate to https://hrms-frontend-vert.vercel.app.
3. Confirm the application loads without fatal console errors.
4. Identify login options.
5. Confirm one-click demo login availability.
6. Record all available demo roles.
7. Open DevTools console/network while testing.
8. Record baseline browser/device viewport.
9. Check if application is responsive at:
   - desktop 1440px
   - laptop 1366px
   - tablet 768px
   - mobile 390px
10. Build a discovered route inventory.
```

---

# Multi-Swarm Agent Model

Claude must split the work into parallel swarms. Each swarm owns a domain but reports into the Orchestrator.

## Swarm A — Route Discovery and Navigation

Responsibilities:

- Discover every page route from code and UI navigation.
- Visit each route in Chrome.
- Validate page load, title, layout, route guards, breadcrumbs, links, empty states, and loading states.
- Capture 404, 500, blank screen, infinite spinner, hydration errors, and broken navigation.

Deliverables:

- Route inventory
- Route-by-role access matrix
- Broken route list
- Navigation defect list

## Swarm B — RBAC and Tenant Isolation

Responsibilities:

- Test explicit roles:
  - SUPER_ADMIN
  - TENANT_ADMIN
  - HR_ADMIN
  - HR_MANAGER
  - PAYROLL_ADMIN
  - HR_EXECUTIVE
  - RECRUITMENT_ADMIN
  - DEPARTMENT_MANAGER
  - PROJECT_ADMIN
  - ASSET_MANAGER
  - EXPENSE_MANAGER
  - HELPDESK_ADMIN
  - TRAVEL_ADMIN
  - COMPLIANCE_OFFICER
  - LMS_ADMIN
  - TEAM_LEAD
  - EMPLOYEE
  - CONTRACTOR
  - INTERN

- Test implicit roles:
  - REPORTING_MANAGER
  - SKIP_LEVEL_MANAGER
  - DEPARTMENT_HEAD
  - MENTOR
  - INTERVIEWER
  - PERFORMANCE_REVIEWER
  - ONBOARDING_BUDDY

RBAC rules to verify:

- SUPER_ADMIN bypasses all gates.
- TENANT_ADMIN is not a bypass.
- Employees can access only self-service.
- HR_MANAGER can view salary but cannot edit salary.
- HR_ADMIN can edit salary.
- PAYROLL_ADMIN can access payroll/compensation only.
- RECRUITMENT_ADMIN can access recruitment/onboarding only.
- Permission-denied pages must be clear and safe.
- Unauthorized direct URL access must fail.
- Hidden menu items must also be server/API protected.
- API calls must return 401/403, not leaked data.
- Cross-tenant records must never be visible.

Deliverables:

- RBAC matrix
- Unauthorized access findings
- Tenant isolation findings
- Permission bypass findings

## Swarm C — Core HR / NU-HRMS

Responsibilities:

Test these domains:

- Employee master data
- Attendance and time tracking
- Leave management
- Payroll and compensation
- Expense management
- Asset management
- Statutory compliance
- Letters
- Helpdesk
- Announcements
- Reports
- Approvals
- Calendar / Drive / Mail
- Admin settings

Deliverables:

- Core HR workflow status
- Form validation defects
- API defects
- State transition defects
- Data consistency defects

## Swarm D — NU-Hire

Responsibilities:

Test recruitment lifecycle:

- Jobs
- Career page
- Candidate application
- Candidate pipeline
- Kanban movement
- Interviews
- Scorecards
- Agencies
- Job boards
- AI recruitment assist
- Preboarding
- E-signature
- Onboarding
- Referrals

Deliverables:

- Recruitment funnel result
- Public route security result
- Candidate conversion result
- E-sign token findings
- Duplicate conversion findings

## Swarm E — NU-Grow

Responsibilities:

Test performance and learning:

- OKRs
- Review cycles
- Calibration
- 9-box
- Reviews
- PIP
- 360 feedback
- Continuous feedback
- Competency matrix
- LMS courses
- Learning paths
- Quizzes
- Certificates
- Training
- Recognition
- Surveys
- Pulse
- 1-on-1
- Wellness

Deliverables:

- Performance cycle result
- Learning certification result
- Survey/feedback result
- Recognition/wellness result

## Swarm F — NU-Fluence

Responsibilities:

Test knowledge and social:

- Wiki
- Blog
- Templates
- Drive
- Activity wall
- Search
- AI chat / RAG
- Analytics

Special checks:

- Redis edit lock
- Concurrent editing behavior
- Publish-to-search indexing
- Elasticsearch fallback behavior
- Infinite scroll
- Comments/reactions
- Permission-gated drive access

Deliverables:

- Knowledge workflow result
- Search indexing result
- RAG permission result
- Edit lock finding

## Swarm G — Security and Abuse Testing

Responsibilities:

- Authentication
- Rate limiting
- Session handling
- Cookie security
- CSRF behavior
- XSS input testing
- IDOR checks
- File upload validation
- Token replay
- Expired token behavior
- Direct API access
- Privilege escalation
- Open redirect checks
- Sensitive data exposure
- Demo credential exposure
- API key/settings exposure

Deliverables:

- Security findings register
- Abuse-case test evidence
- Release-blocking security risks

## Swarm H — UI/UX, Accessibility and Responsive QA

Responsibilities:

- Visual consistency
- Layout breakage
- Alignment
- Typography
- Spacing
- Scroll behavior
- Sticky headers/sidebars
- Modal behavior
- Drawer behavior
- Toasts
- Form error messages
- Empty states
- Loading states
- Dark/light mode if available
- Keyboard navigation
- Focus trap
- Tab order
- ARIA labels
- Color contrast
- Mobile responsiveness

Deliverables:

- UI/UX defect list
- Accessibility defect list
- Responsive defect list

## Swarm I — Performance, Reliability and Observability

Responsibilities:

- Page load time
- Network waterfall
- API latency
- Large bundle warnings
- Repeated API calls
- Cache behavior
- Retry behavior
- Slow query symptoms
- Infinite loading
- Error boundary behavior
- Refresh/reload resilience
- Browser memory growth
- Kafka/outbox visible workflow lag
- Elasticsearch indexing latency

Deliverables:

- Performance findings
- Reliability findings
- Observability gaps

---

# Global Testing Loops

Claude must run the following loops until completion.

## Loop 1 — Route Coverage Loop

```text
FOR each discovered route:
  FOR each relevant role:
    Login as role.
    Open route through navigation.
    Open route by direct URL.
    Refresh page.
    Use browser back/forward.
    Scroll top to bottom and side-to-side if horizontal overflow exists.
    Check console errors.
    Check failed network requests.
    Validate expected access:
      IF allowed:
        page must load usable content.
      IF denied:
        page must show safe denial and no sensitive data.
    Record result.
```

## Loop 2 — Workflow Loop

```text
FOR each critical workflow:
  Execute happy path.
  Execute validation failure path.
  Execute unauthorized role path.
  Execute direct API/direct URL path.
  Execute browser refresh during flow.
  Execute back button during flow.
  Execute duplicate-submit path.
  Execute network-failure/retry path where possible.
  Execute stale data/cache path where applicable.
  Record defects and retest.
```

## Loop 3 — RBAC Loop

```text
FOR each role:
  Login.
  Capture visible navigation.
  Capture accessible routes.
  Capture blocked routes.
  Try direct URLs for restricted modules.
  Try restricted buttons/actions.
  Try API calls triggered by restricted actions.
  Validate expected 401/403.
  Validate no sensitive data appears in UI, HTML, JS state, network response, or local storage.
  Record violations.
```

## Loop 4 — Security Loop

```text
FOR each sensitive area:
  Test unauthenticated access.
  Test low-privilege access.
  Test wrong-tenant access.
  Test ID manipulation.
  Test token reuse.
  Test expired/invalid token.
  Test rate limit.
  Test malicious form input.
  Test file upload abuse.
  Test session expiry.
  Record evidence.
```

## Loop 5 — Retest Loop

```text
FOR each defect:
  Confirm reproduction.
  Classify severity.
  Identify suspected root cause.
  Fix if within scope and safe.
  Retest the exact steps.
  Run nearby regression tests.
  Update status:
    OPEN
    FIXED
    RETEST PASSED
    RETEST FAILED
    ACCEPTED RISK
```

---

# Test Data and Login Strategy

Demo credentials are enabled on staging through one-click login.

Roles available for one-click testing:

- SUPER_ADMIN
- TENANT_ADMIN
- HR_ADMIN
- HR_MANAGER
- EMPLOYEE
- RECRUITMENT_ADMIN
- PAYROLL_ADMIN

Claude must:

```text
1. Use available one-click demo roles.
2. If roles are missing, inspect code/seed data for credentials.
3. If credentials cannot be found, document the gap.
4. Never assume unavailable roles pass.
5. For unsupported roles, mark coverage as BLOCKED — credentials unavailable.
```

Critical production warning:

```text
DEMO_CREDENTIALS_ENABLED=true is a release blocker.
Before production use, this must be false.
Any public one-click SUPER_ADMIN login must be treated as critical security exposure.
```

---

# Critical End-to-End Workflows

## Workflow 1 — New Employee Full Funnel

```text
Post job
→ Candidate applies at /careers
→ Recruiter moves candidate through stages
→ Candidate reaches SELECTED
→ Offer generated
→ Offer e-signed through /sign/[token]
→ Preboarding portal completed
→ HR converts candidate to employee
→ Onboarding checklist assigned
→ Employee logs in
→ Employee checks in
→ Employee applies leave
→ Manager approves leave
→ Payroll run is created
→ Payslip is generated
→ Employee views payslip
```

Test cases:

- Public career page works unauthenticated.
- Resume upload validates type and size.
- Candidate appears in recruiter candidate list.
- Candidate stages update correctly.
- Invalid stage jumps are blocked.
- Offer cannot be signed twice.
- Expired/used sign token is rejected.
- Preboarding conversion is idempotent.
- Duplicate conversion does not create duplicate employee.
- Onboarding checklist progress updates correctly.
- Employee self-service access works.
- Leave balance decreases only after approval.
- Payslip visible only after payroll lock.

## Workflow 2 — Performance Review Cycle

```text
HR creates review cycle
→ Participants are assigned
→ Employee completes self-review
→ Manager completes manager review
→ 360 feedback requests are sent
→ Raters submit feedback
→ HR performs calibration
→ 9-box grid is generated
→ Low performer enters PIP
→ Ratings are published
→ Employee views final rating
```

Test cases:

- Cycle creation validates dates and participants.
- Employee cannot submit another employee’s self-review.
- Manager can review only assigned reports.
- Rater anonymity is preserved where required.
- Calibration access is HR-only.
- Ratings are hidden until publish.
- PIP is created only for eligible low performers.

## Workflow 3 — Learning Certification

```text
LMS Admin creates course
→ Publishes modules and quiz
→ Employee enrolls
→ Employee completes modules
→ Employee takes quiz
→ Employee passes
→ Certificate generated
→ Certificate visible in profile
```

Test cases:

- Unpublished course is hidden from employee.
- Employee progress persists after refresh.
- Quiz scoring is correct.
- Failed quiz does not generate certificate.
- Passing quiz generates exactly one certificate.
- Certificate is tenant-scoped and user-scoped.

## Workflow 4 — Wiki Publish to Search

```text
Employee creates wiki page
→ Redis edit lock is acquired
→ Employee publishes page
→ Kafka/outbox event is emitted
→ Elasticsearch indexes page
→ Another employee searches page
→ AI chat can answer based on page if permitted
```

Test cases:

- Concurrent edit lock blocks second editor.
- Lock heartbeat works.
- Lock expires after timeout.
- Published page appears in search.
- Deleted/unpublished content does not appear.
- AI chat requires `KNOWLEDGE:SEARCH`.
- User without permission cannot access protected drive/wiki content.

---

# Module Route Test Matrix

Claude must validate at minimum the routes below.

## Core HR

- `/me/dashboard`
- `/employees`
- `/employees/[id]`
- `/employees/[id]/compensation`
- `/employees/change-requests`
- `/employees/import`
- `/departments`
- `/me/profile`
- `/me/skills`
- `/me/attendance`
- `/attendance`
- `/attendance/regularization`
- `/attendance/comp-off`
- `/attendance/shift-swap`
- `/shifts`
- `/time-tracking`
- `/timesheets`
- `/overtime`
- `/leave/apply`
- `/leave/my-leaves`
- `/leave/team`
- `/leave/approvals`
- `/leave/calendar`
- `/leave/encashment`
- `/leave/admin/carry-forward`
- `/payroll/runs`
- `/payroll/runs/[id]`
- `/payroll/components`
- `/payroll/salary-structures`
- `/payroll/statutory`
- `/compensation`
- `/me/payslips`
- `/expenses`
- `/expenses/approvals`
- `/expenses/mileage`
- `/loans`
- `/loans/new`
- `/assets`
- `/me/assets`
- `/statutory`
- `/tax/declarations`
- `/lwf`
- `/letters`
- `/letters/templates`
- `/helpdesk/tickets`
- `/helpdesk/sla`
- `/helpdesk/knowledge-base`
- `/announcements`
- `/calendar`

## NU-Hire

- `/recruitment`
- `/recruitment/jobs`
- `/recruitment/career-page`
- `/recruitment/candidates`
- `/recruitment/candidates/[id]`
- `/recruitment/kanban`
- `/recruitment/[jobId]/kanban`
- `/recruitment/interviews`
- `/recruitment/scorecards`
- `/recruitment/agencies`
- `/recruitment/agencies/[id]`
- `/recruitment/job-boards`
- `/careers`
- `/preboarding`
- `/preboarding/portal/[token]`
- `/onboarding`
- `/onboarding/[id]`
- `/onboarding/templates`
- `/sign/[token]`
- `/referrals`

## NU-Grow

- `/performance`
- `/performance/okrs`
- `/okr`
- `/performance/cycles`
- `/performance/cycles/[id]/calibration`
- `/performance/cycles/[id]/nine-box`
- `/performance/reviews`
- `/performance/pip`
- `/performance/360-feedback`
- `/performance/feedback`
- `/performance/competency-matrix`
- `/learning/courses`
- `/learning/courses/[id]/play`
- `/learning/courses/[id]/quiz/[quizId]`
- `/learning/paths`
- `/learning/certificates`
- `/training/catalog`
- `/training/my-learning`
- `/recognition`
- `/surveys`
- `/surveys/pulse`
- `/surveys/[id]/respond`
- `/surveys/[id]/analytics`
- `/one-on-one`
- `/wellness`
- `/wellness/admin`

## NU-Fluence

- `/fluence`
- `/fluence/wiki`
- `/fluence/wiki/new`
- `/fluence/wiki/[slug]`
- `/fluence/wiki/[slug]/edit`
- `/fluence/blogs`
- `/fluence/blogs/new`
- `/fluence/blogs/[slug]`
- `/fluence/templates`
- `/fluence/templates/[id]`
- `/fluence/drive`
- `/fluence/wall`
- `/fluence/search`
- `/fluence/analytics`

## Shared Platform

- `/approvals`
- `/reports/headcount`
- `/reports/attrition`
- `/reports/leave`
- `/reports/payroll`
- `/reports/performance`
- `/reports/builder`
- `/predictive-analytics`
- `/projects`
- `/projects/gantt`
- `/projects/psa/invoices`
- `/resources/capacity`
- `/resources/workload`
- `/nu-calendar`
- `/nu-drive`
- `/nu-mail`
- `/admin/employees`
- `/admin/feature-flags`
- `/admin/roles`
- `/admin/permissions`
- `/admin/implicit-roles`
- `/settings/security`
- `/settings/sso`
- `/settings/rbac`
- `/settings/security/api-keys`

---

# Advanced Test Categories

## Browser and Chrome-Specific Testing

For each critical page:

```text
- Open in Chrome normal window.
- Open in Chrome incognito.
- Hard refresh.
- Reload after login.
- Reload after logout.
- Navigate with back button.
- Navigate with forward button.
- Open restricted route in a new tab.
- Open public token route in a new tab.
- Resize viewport.
- Scroll vertically to bottom.
- Check horizontal overflow.
- Check console errors.
- Check network failures.
- Check cookies.
- Check local/session storage.
- Check document title and metadata.
```

## Form Testing

For every form:

```text
- Required field validation.
- Invalid format.
- Min/max length.
- Boundary dates.
- Past/future invalid dates.
- Special characters.
- Unicode input.
- HTML/script input.
- Duplicate submission.
- Submit while network is slow.
- Submit then refresh.
- Submit then back button.
- Cancel and confirm data not saved.
- Save draft if available.
- Success message is clear.
- Error message is clear.
```

## File Upload Testing

For upload features:

```text
- Valid PDF.
- Valid image.
- Invalid executable file.
- Oversized file.
- Empty file.
- Duplicate upload.
- Filename with spaces.
- Filename with special characters.
- Malware-like filename string.
- Upload progress.
- Upload failure.
- Retry behavior.
- Preview/download permission.
```

## API and Network Testing

For every key action:

```text
- Confirm correct API endpoint.
- Confirm method.
- Confirm status code.
- Confirm request payload does not leak extra data.
- Confirm response payload is tenant-scoped.
- Confirm 401 when unauthenticated.
- Confirm 403 when unauthorized.
- Confirm 400 for validation failure.
- Confirm 429 for rate limit.
- Confirm no 500 for user error.
- Confirm optimistic UI rollback on failure.
```

## Accessibility Testing

Minimum checks:

```text
- Keyboard-only navigation.
- Visible focus state.
- Modal focus trap.
- Escape key closes modal where appropriate.
- Labels are associated with inputs.
- Buttons have accessible names.
- Error messages are announced or linked.
- Color contrast is sufficient.
- Tables have headers.
- Icons are not the only indicator.
- Toasts are readable.
```

## Performance Testing

Minimum checks:

```text
- First load speed.
- Route transition speed.
- API latency.
- Redundant API calls.
- Large payloads.
- Infinite spinner.
- Slow table rendering.
- Search debounce behavior.
- Pagination performance.
- Export performance.
- Memory growth after navigation loop.
```

---

# Critical Business Rule Tests

## Tenant Isolation

```text
1. Login as Tenant A user.
2. Capture employee/candidate/payroll/wiki identifiers.
3. Login as Tenant B user.
4. Attempt direct URL access to Tenant A records.
5. Attempt API access if possible.
6. Search for Tenant A data from Tenant B.
Expected:
No Tenant A data visible to Tenant B.
Fail-closed behavior is acceptable.
Wrong-tenant data leakage is blocker severity.
```

## Leave Balance

```text
1. Login as employee.
2. Open /leave/apply.
3. Check available balance.
4. Try leave greater than balance.
Expected:
Form rejects before submission.
No pending leave request is created.
Balance never goes negative.
```

## Payroll Lock

```text
1. Login as Payroll Admin / HR Admin.
2. Create or open payroll run.
3. Move run to LOCKED.
4. Attempt edit salary, component, employee adjustment, delete, reprocess.
Expected:
All modifications blocked.
Payslips visible to employees only after lock.
```

## Preboarding Idempotency

```text
1. Complete candidate preboarding.
2. Convert to employee once.
3. Attempt conversion again by button, refresh, direct API, browser back.
Expected:
No duplicate employee created.
System returns clear already-converted state.
```

## E-Sign Token

```text
1. Open valid /sign/[token].
2. Sign document.
3. Reopen same token.
4. Try expired/malformed token.
Expected:
Used/expired token rejected.
No duplicate signature.
No sensitive data leak.
```

## Expense Policy

```text
1. Login as employee.
2. Create expense exceeding category limit.
3. Attach receipt.
4. Attempt submission.
Expected:
Expense flagged and blocked before submission.
No submitted claim is created.
```

## Rate Limiting

```text
1. Attempt 6 auth requests within 1 minute.
Expected:
6th request returns 429.
No 500 or bypass.

2. Attempt API burst above 100 req/min where safe.
Expected:
429.

3. Attempt export above 5 requests / 5 min where safe.
Expected:
429.
```

---

# Severity Model

## Blocker

Production cannot proceed.

Examples:

- Tenant data leakage
- Public SUPER_ADMIN login enabled
- Authentication bypass
- Payroll modification after lock
- Salary visible to unauthorized users
- Cross-tenant API response
- Critical workflow impossible

## Critical

Must fix before release.

Examples:

- RBAC route/action bypass
- Duplicate employee creation
- Used e-sign token accepted
- Leave balance negative
- Sensitive data in UI/network/local storage
- 500 error on common workflow

## High

Should fix before release unless explicitly accepted.

Examples:

- Major page broken
- Critical form unusable
- Workflow step blocked
- Incorrect state transition
- Missing validation
- Upload security gap

## Medium

Fix before or soon after release.

Examples:

- UI inconsistency
- confusing error message
- accessibility issue
- performance degradation
- pagination/search issue

## Low

Non-blocking polish.

Examples:

- Minor alignment
- typo
- cosmetic spacing
- optional UX improvement

---

# Bug Register Template

Claude must maintain bugs in this format:

```markdown
## BUG-[number] — [Short title]

Severity:
Status:
Module:
Role:
Route:
Browser:
Viewport:
Environment:

Steps to reproduce:
1.
2.
3.

Expected result:

Actual result:

Evidence:
- Screenshot:
- Console:
- Network:
- API response:
- Video/log:

Suspected root cause:

Recommended fix:

Retest steps:

Retest result:

Regression scope:
```

---

# Coverage Matrix Template

## Route Coverage

```markdown
| Route | Module | SUPER_ADMIN | TENANT_ADMIN | HR_ADMIN | HR_MANAGER | PAYROLL_ADMIN | RECRUITMENT_ADMIN | EMPLOYEE | Expected Guard | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

## Workflow Coverage

```markdown
| Workflow | Roles Used | Happy Path | Negative Path | RBAC | API | UI/UX | Security | Status | Open Bugs |
|---|---|---|---|---|---|---|---|---|---|
```

## Security Coverage

```markdown
| Area | Test | Expected | Actual | Status | Severity | Bug ID |
|---|---|---|---|---|---|---|
```

## UI/UX Coverage

```markdown
| Page | Issue Type | Desktop | Tablet | Mobile | Accessibility | Severity | Bug ID |
|---|---|---|---|---|---|---|---|
```

---

# Definition of Done

Claude may mark NU-AURA as production-ready only if:

```text
1. All blocker issues are closed.
2. All critical issues are closed.
3. All high issues are closed or explicitly accepted as risks.
4. All medium issues are closed or documented with owners.
5. No tenant data leakage exists.
6. No unauthorized salary/payroll access exists.
7. No public SUPER_ADMIN/demo login remains enabled.
8. Core HR workflows pass.
9. Recruitment full funnel passes.
10. Performance review cycle passes.
11. Learning certification flow passes.
12. Wiki publish-to-search flow passes.
13. RBAC route/action/API checks pass for available roles.
14. Rate limiting works.
15. Public token routes reject used/expired tokens.
16. Payroll lock is enforced.
17. Leave balance cannot go negative.
18. Preboarding conversion is idempotent.
19. Browser console has no fatal errors on major pages.
20. Final coverage report is generated.
```

---

# Final Report Format

Claude must finish with:

```markdown
# NU-AURA Production Readiness Report

## Executive Summary
- Overall status:
- Release decision:
- Top risks:
- Recommendation:

## Coverage Summary
- Routes tested:
- Roles tested:
- Workflows tested:
- APIs checked:
- Browsers/viewports checked:

## Passed Critical Workflows
-

## Open Blockers
-

## Open Critical Issues
-

## Open High Issues
-

## Security Findings
-

## RBAC Findings
-

## Tenant Isolation Findings
-

## UI/UX Findings
-

## Performance Findings
-

## Accessibility Findings
-

## Accepted Risks
-

## Release Gate Decision
APPROVED / NOT APPROVED

## Next Actions
1.
2.
3.
```

---

# First Action for Claude

Start with this exact first action:

```text
Open Chrome and navigate to https://hrms-frontend-vert.vercel.app. Record whether the page loads successfully, list visible login/demo options, open DevTools, capture console errors and failed network requests, then create the initial route and role discovery table.
```
