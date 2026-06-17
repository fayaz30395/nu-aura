# QA Discovery Map — NU-AURA Frontend Routes

> Generated: 2026-06-17  
> Source: Agent 1 (Route Discovery) — qa-100x batch  
> Total page.tsx files found: 285 routes

---

## Route Map (grouped by module)

### Public / Landing
| Route | Notes |
|-------|-------|
| `/` | Root landing page |
| `/about` | About page |
| `/careers` | Public careers listing (NU-Hire) |
| `/contact` | Contact page |
| `/features` | Product features page |
| `/pricing` | Pricing page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Auth
| Route | Notes |
|-------|-------|
| `/auth/login` | Login page |
| `/auth/signup` | Sign-up page |
| `/auth/forgot-password` | Forgot password |
| `/auth/change-password` | Change password |
| `/reset-password` | Reset password (token-based) |

### Token-Based Portals (no account session required)
| Route | Notes |
|-------|-------|
| `/exit-interview/[token]` | Public exit interview form |
| `/preboarding/portal/[token]` | Candidate preboarding portal |
| `/sign/[token]` | E-signature portal |
| `/offer-portal` | Candidate offer portal |

### App Launchers (sub-app entry shells)
| Route | Notes |
|-------|-------|
| `/app/hrms` | HRMS launcher |
| `/app/hire` | Hire launcher |
| `/app/grow` | Grow launcher |
| `/app/fluence` | Fluence launcher |

---

### NU-HRMS — My Space (self-service)
| Route | Notes |
|-------|-------|
| `/me/dashboard` | Employee self-service dashboard (HRMS entry point) |
| `/me/profile` | My profile |
| `/me/attendance` | My attendance |
| `/me/leaves` | My leaves |
| `/me/payslips` | My payslips |
| `/me/documents` | My documents |
| `/me/assets` | My assets |
| `/me/skills` | My skills |

### NU-HRMS — Dashboards
| Route | Notes |
|-------|-------|
| `/dashboard` | General dashboard (legacy/redirect) |
| `/dashboards/employee` | Employee dashboard |
| `/dashboards/manager` | Manager dashboard |
| `/dashboards/executive` | Executive dashboard |
| `/executive` | Executive view |
| `/analytics` | Analytics hub |
| `/analytics/org-health` | Org health analytics |
| `/predictive-analytics` | Predictive analytics |

### NU-HRMS — People / Employees
| Route | Notes |
|-------|-------|
| `/employees` | Employee list |
| `/employees/[id]` | Employee detail |
| `/employees/[id]/edit` | Edit employee |
| `/employees/[id]/compensation` | Employee compensation detail |
| `/employees/directory` | Employee directory |
| `/employees/import` | Bulk import employees |
| `/employees/change-requests` | Change requests |
| `/departments` | Department list |
| `/team-directory` | Team directory |

### NU-HRMS — Attendance
| Route | Notes |
|-------|-------|
| `/attendance` | Attendance overview |
| `/attendance/my-attendance` | Personal attendance log |
| `/attendance/team` | Team attendance |
| `/attendance/regularization` | Attendance regularization |
| `/attendance/shift-swap` | Shift swap requests |
| `/attendance/comp-off` | Compensatory off |
| `/biometric-devices` | Biometric device management |

### NU-HRMS — Leave
| Route | Notes |
|-------|-------|
| `/leave` | Leave overview |
| `/leave/my-leaves` | My leave balance & history |
| `/leave/apply` | Apply for leave |
| `/leave/approvals` | Approve/reject leaves |
| `/leave/team` | Team leave view |
| `/leave/calendar` | Leave calendar |
| `/leave/encashment` | Leave encashment |
| `/leave/admin/carry-forward` | Admin carry-forward |
| `/holidays` | Holiday list |
| `/restricted-holidays` | Restricted holidays |

### NU-HRMS — Shifts
| Route | Notes |
|-------|-------|
| `/shifts` | Shift management |
| `/shifts/definitions` | Shift definitions |
| `/shifts/patterns` | Shift patterns |
| `/shifts/my-schedule` | Personal schedule |
| `/shifts/swaps` | Shift swap management |
| `/overtime` | Overtime management |

### NU-HRMS — Payroll
| Route | Notes |
|-------|-------|
| `/payroll` | Payroll overview |
| `/payroll/runs` | Payroll runs list |
| `/payroll/runs/[id]` | Payroll run detail |
| `/payroll/bulk-processing` | Bulk payroll processing |
| `/payroll/payslips` | Payslips list |
| `/payroll/salary-structures` | Salary structures |
| `/payroll/salary-structures/create` | Create salary structure |
| `/payroll/components` | Payroll components |
| `/payroll/structures` | Pay structures |
| `/payroll/statutory` | Statutory deductions |
| `/statutory` | Statutory management |
| `/statutory/filings` | Statutory filings |
| `/lwf` | Labour Welfare Fund |
| `/tax` | Tax overview |
| `/tax/declarations` | Tax declarations |
| `/compensation` | Compensation management |

### NU-HRMS — Finance & Expenses
| Route | Notes |
|-------|-------|
| `/expenses` | Expense overview |
| `/expenses/[id]` | Expense detail |
| `/expenses/approvals` | Expense approvals |
| `/expenses/mileage` | Mileage claims |
| `/expenses/reports` | Expense reports |
| `/expenses/settings` | Expense settings |
| `/loans` | Loans list |
| `/loans/[id]` | Loan detail |
| `/loans/new` | Apply for loan |
| `/travel` | Travel requests |
| `/travel/[id]` | Travel detail |
| `/travel/new` | New travel request |
| `/travel/expenses` | Travel expenses |
| `/benefits` | Employee benefits |
| `/payments` | Payment management |
| `/payments/config` | Payment configuration |

### NU-HRMS — Projects & Resources
| Route | Notes |
|-------|-------|
| `/projects` | Projects list |
| `/projects/[id]` | Project detail |
| `/projects/calendar` | Projects calendar |
| `/projects/gantt` | Projects Gantt chart |
| `/projects/resource-conflicts` | Resource conflicts |
| `/projects/psa` | PSA (Professional Services Automation) |
| `/projects/psa/invoices` | PSA invoices |
| `/projects/psa/timesheets` | PSA timesheets |
| `/resources` | Resource management |
| `/resources/availability` | Resource availability |
| `/resources/capacity` | Resource capacity |
| `/resources/pool` | Resource pool |
| `/resources/workload` | Workload view |
| `/resources/approvals` | Resource approvals |
| `/allocations` | Resource allocations |
| `/allocations/summary` | Allocations summary |
| `/timesheets` | Timesheet list |
| `/time-tracking` | Time tracking |
| `/time-tracking/[id]` | Time entry detail |
| `/time-tracking/[id]/edit` | Edit time entry |
| `/time-tracking/new` | New time entry |

### NU-HRMS — Documents & Assets
| Route | Notes |
|-------|-------|
| `/documents` | Document management |
| `/assets` | Asset management |
| `/letters` | Employee letters |
| `/letters/templates` | Letter templates |
| `/contracts` | Contracts list |
| `/contracts/[id]` | Contract detail |
| `/contracts/new` | New contract |
| `/contracts/templates` | Contract templates |

### NU-HRMS — Workflow & Approvals
| Route | Notes |
|-------|-------|
| `/approvals` | Approvals overview |
| `/approvals/inbox` | Approvals inbox |
| `/workflows` | Workflow list |
| `/workflows/[id]` | Workflow detail |
| `/inbox` | General inbox |
| `/tasks` | Task management |

### NU-HRMS — Calendar & Comms
| Route | Notes |
|-------|-------|
| `/calendar` | Calendar view |
| `/calendar/[id]` | Calendar event detail |
| `/calendar/new` | New calendar event |
| `/nu-calendar` | NU Calendar app |
| `/nu-drive` | NU Drive app |
| `/nu-mail` | NU Mail app |
| `/announcements` | Announcements |
| `/notifications` | Notifications |
| `/company-spotlight` | Company spotlight |
| `/knowledge` | Knowledge base |

### NU-HRMS — Reports
| Route | Notes |
|-------|-------|
| `/reports` | Reports hub |
| `/reports/headcount` | Headcount report |
| `/reports/attrition` | Attrition report |
| `/reports/leave` | Leave report |
| `/reports/payroll` | Payroll report |
| `/reports/performance` | Performance report |
| `/reports/utilization` | Utilization report |
| `/reports/builder` | Custom report builder |
| `/reports/scheduled` | Scheduled reports |
| `/import-export` | Data import/export |

### NU-HRMS — Compliance & Legal
| Route | Notes |
|-------|-------|
| `/compliance` | Compliance management |
| `/probation` | Probation management |
| `/security` | Security settings |

### NU-HRMS — Admin
| Route | Notes |
|-------|-------|
| `/admin` | Admin dashboard |
| `/admin/employees` | Admin employee management |
| `/admin/departments` | Admin departments |
| `/admin/holidays` | Admin holidays |
| `/admin/leave-types` | Leave types configuration |
| `/admin/leave-requests` | All leave requests |
| `/admin/shifts` | Admin shift management |
| `/admin/payroll` | Admin payroll |
| `/admin/roles` | Role management |
| `/admin/permissions` | Permission management |
| `/admin/implicit-roles` | Implicit role management |
| `/admin/settings` | Admin settings |
| `/admin/org-hierarchy` | Org hierarchy |
| `/admin/office-locations` | Office locations |
| `/admin/budget` | Budget management |
| `/admin/audit` | Audit log |
| `/admin/reports` | Admin reports |
| `/admin/integrations` | Admin integrations |
| `/admin/integrations/webhooks` | Webhook management |
| `/admin/custom-fields` | Custom fields |
| `/admin/feature-flags` | Feature flags |
| `/admin/import-keka` | Keka import |
| `/admin/mobile-api` | Mobile API config |
| `/admin/system` | System settings |
| `/admin/profile` | Admin profile |

### NU-HRMS — Settings
| Route | Notes |
|-------|-------|
| `/settings` | Settings overview |
| `/settings/profile` | Profile settings |
| `/settings/notifications` | Notification settings |
| `/settings/privacy` | Privacy settings |
| `/settings/security` | Security settings |
| `/settings/security/api-keys` | API key management |
| `/settings/sso` | SSO configuration |
| `/settings/rbac` | RBAC settings |

### NU-HRMS — Integrations
| Route | Notes |
|-------|-------|
| `/integrations` | Integrations hub |
| `/integrations/slack` | Slack integration |

---

### NU-Hire — Recruitment
| Route | Notes |
|-------|-------|
| `/recruitment` | Recruitment dashboard (Hire entry point) |
| `/recruitment/jobs` | Job listings |
| `/recruitment/[jobId]/kanban` | Job-specific kanban board |
| `/recruitment/kanban` | Recruitment kanban |
| `/recruitment/pipeline` | Recruitment pipeline |
| `/recruitment/candidates` | Candidates list |
| `/recruitment/candidates/[id]` | Candidate detail |
| `/recruitment/candidates/[id]/offer` | Offer for candidate |
| `/recruitment/interviews` | Interviews list |
| `/recruitment/agencies` | Recruitment agencies |
| `/recruitment/agencies/[id]` | Agency detail |
| `/recruitment/scorecards` | Interview scorecards |
| `/recruitment/job-boards` | Job board integrations |
| `/recruitment/career-page` | Career page management |
| `/referrals` | Employee referrals |
| `/linkedin-posts` | LinkedIn job post management |

### NU-Hire — Onboarding
| Route | Notes |
|-------|-------|
| `/onboarding` | Onboarding list |
| `/onboarding/[id]` | Onboarding detail |
| `/onboarding/new` | New onboarding |
| `/onboarding/templates` | Onboarding templates |
| `/onboarding/templates/[id]` | Template detail |
| `/onboarding/templates/new` | New template |
| `/preboarding` | Preboarding admin |

### NU-Hire — Offboarding
| Route | Notes |
|-------|-------|
| `/offboarding` | Offboarding list |
| `/offboarding/[id]` | Offboarding detail |
| `/offboarding/[id]/exit-interview` | Offboarding exit interview |
| `/offboarding/[id]/fnf` | Offboarding FnF settlement |
| `/offboarding/fnf` | FnF overview |
| `/offboarding/exit/fnf` | Exit FnF |

---

### NU-Grow — Performance
| Route | Notes |
|-------|-------|
| `/performance` | Performance hub (Grow entry point) |
| `/performance/reviews` | Performance reviews |
| `/performance/cycles` | Review cycles |
| `/performance/cycles/[id]/calibration` | Cycle calibration |
| `/performance/cycles/[id]/nine-box` | Cycle 9-box |
| `/performance/goals` | Goals management |
| `/performance/okr` | OKR management |
| `/performance/okrs` | OKRs list |
| `/performance/feedback` | Feedback |
| `/performance/360-feedback` | 360-degree feedback |
| `/performance/9box` | 9-box grid |
| `/performance/calibration` | Calibration |
| `/performance/competency-framework` | Competency framework |
| `/performance/competency-matrix` | Competency matrix |
| `/performance/pip` | Performance improvement plan |
| `/performance/revolution` | Performance revolution view |
| `/goals` | Goals (top-level) |
| `/okr` | OKR (top-level) |
| `/feedback360` | 360 feedback (top-level) |
| `/one-on-one` | 1-on-1 meetings |

### NU-Grow — Learning
| Route | Notes |
|-------|-------|
| `/learning` | Learning hub |
| `/learning/courses` | Courses list |
| `/learning/courses/[id]` | Course detail |
| `/learning/courses/[id]/play` | Course player |
| `/learning/courses/[id]/quiz/[quizId]` | Course quiz |
| `/learning/paths` | Learning paths |
| `/learning/certificates` | Certificates |
| `/training` | Training hub |
| `/training/catalog` | Training catalog |
| `/training/catalog/[id]` | Training catalog item |
| `/training/my-learning` | My learning progress |

### NU-Grow — Engagement
| Route | Notes |
|-------|-------|
| `/surveys` | Surveys list |
| `/surveys/[id]` | Survey detail |
| `/surveys/[id]/respond` | Respond to survey |
| `/surveys/[id]/analytics` | Survey analytics |
| `/surveys/pulse` | Pulse surveys |
| `/recognition` | Recognition management |
| `/wellness` | Wellness overview |
| `/wellness/admin` | Wellness admin |

---

### NU-Fluence — Knowledge
| Route | Notes |
|-------|-------|
| `/fluence` | Fluence hub |
| `/fluence/wiki` | Wiki listing (Fluence entry point) |
| `/fluence/wiki/[slug]` | Wiki article view |
| `/fluence/wiki/[slug]/edit` | Edit wiki article |
| `/fluence/wiki/new` | New wiki article |
| `/fluence/blogs` | Blogs listing |
| `/fluence/blogs/[slug]` | Blog post view |
| `/fluence/blogs/[slug]/edit` | Edit blog post |
| `/fluence/blogs/new` | New blog post |
| `/fluence/templates` | Templates listing |
| `/fluence/templates/[id]` | Template detail |
| `/fluence/templates/new` | New template |
| `/fluence/drive` | Drive (file storage) |
| `/fluence/search` | Search |
| `/fluence/my-content` | My content |
| `/fluence/wall` | Social wall |
| `/fluence/dashboard` | Fluence dashboard |
| `/fluence/analytics` | Content analytics |

---

## Public Routes (no auth required)

From `proxy.ts` PUBLIC_ROUTES definition + token-based portals:

| Route | Auth Required | Notes |
|-------|--------------|-------|
| `/` | No | Landing page |
| `/auth/login` | No | Login |
| `/auth/signup` | No | Sign up |
| `/auth/forgot-password` | No | Forgot password |
| `/auth/reset-password` | No | Reset password (auth route) |
| `/reset-password` | No | Reset password (top-level) |
| `/terms` | No | Terms of service |
| `/privacy` | No | Privacy policy |
| `/careers` | No | Public careers page |
| `/offer-portal` | No | Offer portal (token optional) |
| `/preboarding/portal/[token]` | No | Token-based preboarding |
| `/exit-interview/[token]` | No | Token-based exit interview |
| `/sign/[token]` | No | Token-based e-signature |

Additional public pages (not in proxy.ts PUBLIC_ROUTES but have public-facing content):

| Route | Notes |
|-------|-------|
| `/about` | About page |
| `/contact` | Contact page |
| `/features` | Features page |
| `/pricing` | Pricing page |

> Note: `/about`, `/contact`, `/features`, `/pricing` pages exist as page.tsx but are NOT explicitly listed in proxy.ts PUBLIC_ROUTES. They may be accessible unauthenticated due to the proxy's default-allow behavior for unmatched routes, or may redirect to login. Requires verification.

---

## API Routes (/api/ handlers in frontend)

| Route | File | Notes |
|-------|------|-------|
| `/api/health` | `app/api/health/route.ts` | Health check endpoint |

Only 1 Next.js API route handler found. All other API calls go directly to the Spring Boot backend at port 8080.

---

## Dynamic Routes ([id], [slug], etc.)

| Route Pattern | Parameter | Module |
|--------------|-----------|--------|
| `/calendar/[id]` | id | HRMS Calendar |
| `/contracts/[id]` | id | HRMS Contracts |
| `/employees/[id]` | id | HRMS Employees |
| `/employees/[id]/edit` | id | HRMS Employees |
| `/employees/[id]/compensation` | id | HRMS Employees |
| `/exit-interview/[token]` | token | Hire (public portal) |
| `/expenses/[id]` | id | HRMS Expenses |
| `/fluence/blogs/[slug]` | slug | Fluence Blogs |
| `/fluence/blogs/[slug]/edit` | slug | Fluence Blogs |
| `/fluence/templates/[id]` | id | Fluence Templates |
| `/fluence/wiki/[slug]` | slug | Fluence Wiki |
| `/fluence/wiki/[slug]/edit` | slug | Fluence Wiki |
| `/helpdesk/tickets/[id]` | id | HRMS Helpdesk |
| `/learning/courses/[id]` | id | Grow Learning |
| `/learning/courses/[id]/play` | id | Grow Learning |
| `/learning/courses/[id]/quiz/[quizId]` | id, quizId | Grow Learning (nested) |
| `/loans/[id]` | id | HRMS Loans |
| `/offboarding/[id]` | id | Hire Offboarding |
| `/offboarding/[id]/exit-interview` | id | Hire Offboarding |
| `/offboarding/[id]/fnf` | id | Hire Offboarding |
| `/onboarding/[id]` | id | Hire Onboarding |
| `/onboarding/templates/[id]` | id | Hire Onboarding |
| `/payroll/runs/[id]` | id | HRMS Payroll |
| `/performance/cycles/[id]/calibration` | id | Grow Performance |
| `/performance/cycles/[id]/nine-box` | id | Grow Performance |
| `/preboarding/portal/[token]` | token | Hire (public portal) |
| `/projects/[id]` | id | HRMS Projects |
| `/recruitment/[jobId]/kanban` | jobId | Hire Recruitment |
| `/recruitment/agencies/[id]` | id | Hire Recruitment |
| `/recruitment/candidates/[id]` | id | Hire Recruitment |
| `/recruitment/candidates/[id]/offer` | id | Hire Recruitment |
| `/sign/[token]` | token | Hire (public portal) |
| `/surveys/[id]` | id | Grow Surveys |
| `/surveys/[id]/analytics` | id | Grow Surveys |
| `/surveys/[id]/respond` | id | Grow Surveys |
| `/time-tracking/[id]` | id | HRMS Time Tracking |
| `/time-tracking/[id]/edit` | id | HRMS Time Tracking |
| `/training/catalog/[id]` | id | Grow Training |
| `/travel/[id]` | id | HRMS Travel |
| `/workflows/[id]` | id | HRMS Workflows |

**Total dynamic routes: 40**

---

## Missing / 404 Routes

Routes referenced in `href=` attributes or `apps.ts` config but lacking a corresponding `page.tsx`:

| Referenced Route | Source | Status |
|-----------------|--------|--------|
| `/home` | proxy.ts AUTHENTICATED_ROUTES | No page.tsx — listed as "legacy redirect to /me/dashboard" |
| `/organization-chart` | proxy.ts AUTHENTICATED_ROUTES | No page.tsx at this path (may be at `/admin/org-hierarchy`) |
| `/org-chart` | proxy.ts AUTHENTICATED_ROUTES | No page.tsx found |
| `/letter-templates` | proxy.ts AUTHENTICATED_ROUTES | No page.tsx (letter templates are at `/letters/templates`) |
| `/statutory-filings` | proxy.ts AUTHENTICATED_ROUTES | No page.tsx (statutory filings at `/statutory/filings`) |
| `/psa` | proxy.ts AUTHENTICATED_ROUTES | No top-level `/psa` page (PSA is under `/projects/psa`) |

> These routes are protected by the proxy middleware but the corresponding page.tsx is either missing, moved, or renamed. Navigation to these routes will likely result in a 404 or redirect.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total page.tsx routes | 285 |
| Public routes (no auth) | 13 |
| Token-based public portals | 3 |
| Protected/authenticated routes | 269 |
| Dynamic routes | 40 |
| API route handlers | 1 |
| Nested dynamic routes (2+ params) | 1 (`/learning/courses/[id]/quiz/[quizId]`) |
| Missing/404 suspect routes | 6 |

---

## Auth Guard Architecture

The proxy operates at two levels:

1. **Edge (proxy.ts)** — coarse cookie-presence check. Redirects to `/auth/login` if no valid JWT cookie. Bypasses `/api/`, `/_next/`, `/favicon.ico`, `/static/`, `/images/`, `/fonts/`.

2. **Client-side (AuthGuard component)** — fine-grained permission check on top of the edge check. Applied in individual page components to enforce RBAC rules (e.g., only HR_ADMIN can access `/admin/payroll`).

Cookie names accepted by proxy:
- `access_token` (dev/staging)
- `__Host-hrms-access` (production, hardened)
- `refresh_token` / `__Host-hrms-refresh` (for token refresh)

---

## API Map — Backend Controllers

> Generated: 2026-06-17  
> Source: Agent 2 (API Map Discovery) — qa-100x batch  
> Total controllers: 180 | Total endpoint annotations: 1,760 | @RequiresPermission count: 1,764

---

### Summary Counts

| Metric | Count |
|--------|-------|
| Total @RestController files | 180 |
| Total HTTP endpoint annotations | 1,760 |
| @RequiresPermission annotations | 1,764 |
| @RequiresFeature (feature-flag gated) | 10 |
| Intentionally unprotected (design-by-decision) | 5 |
| Public routes (SecurityConfig permitAll) | ~20 paths |

---

### Top Controllers by Endpoint Count

| Controller | Base Path | Endpoints | Key Permission |
|-----------|-----------|-----------|----------------|
| `PayrollController` | `/api/v1/payroll` | 43 | `PAYROLL_*` |
| `ExitManagementController` | `/api/v1/exit/...` | 39 | `EXIT_MANAGE` |
| `ComplianceController` | `/api/v1/compliance` | 33 | `COMPLIANCE_*` |
| `BenefitEnhancedController` | `/api/v1/benefits-enhanced` | 30 | `BENEFITS_*` |
| `ResourceManagementController` | `/api/v1/resource-management` | 27 | `RESOURCE_*` |
| `OrganizationController` | `/api/v1/organization` | 27 | `ORG_*` |
| `WorkflowController` | `/api/v1/workflow` | 26 | `WORKFLOW_*` |
| `ProjectTimesheetController` | `/api/v1/project-timesheets` | 26 | `TIMESHEET_*` |
| `LmsController` | `/api/v1/lms` | 26 | `LMS_*` |
| `LetterController` | `/api/v1/letters` | 26 | `LETTER_*` |
| `HelpdeskController` | `/api/v1/helpdesk/...` | 24 | `HELPDESK_*` |
| `OneOnOneMeetingController` | `/api/v1/meetings` | 24 | `MEETING_*` |
| `ContractController` | `/api/v1/contracts` | 24 | `CONTRACT_*` |
| `AttendanceController` | `/api/v1/attendance` | 22 | `ATTENDANCE_*` |
| `ShiftManagementController` | `/api/v1/shifts` | 22 | `SHIFT_*` |
| `CustomFieldController` | `/api/v1/custom-fields` | 22 | `CUSTOM_FIELD_*` |
| `RecruitmentController` | `/api/v1/recruitment` | 23 | `RECRUITMENT_*` |
| `BudgetPlanningController` | `/api/v1/budget` | 23 | `BUDGET_*` |
| `ProbationController` | `/api/v1/probation` | 21 | `PROBATION_*` |
| `PlatformController` | `/api/v1/platform` | 23 | `PLATFORM_*` |

---

### Detailed API Map — 10 Most Important Controllers

#### 1. EmployeeController — `/api/v1/employees`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/employees` | `EMPLOYEE_CREATE` |
| GET | `/api/v1/employees` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_TEAM` |
| GET | `/api/v1/employees/search` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_TEAM` |
| GET | `/api/v1/employees/me` | _(self-service, JWT-authenticated only)_ |
| PUT | `/api/v1/employees/me` | `EMPLOYEE_UPDATE` |
| GET | `/api/v1/employees/{id}` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_SELF` |
| GET | `/api/v1/employees/{id}/hierarchy` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_TEAM` |
| GET | `/api/v1/employees/{id}/subordinates` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_TEAM` |
| GET | `/api/v1/employees/managers` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_TEAM` |
| GET | `/api/v1/employees/{id}/dotted-reports` | `EMPLOYEE_VIEW_ALL` / `EMPLOYEE_VIEW_TEAM` |
| PUT | `/api/v1/employees/{id}` | `EMPLOYEE_UPDATE` |
| PUT | `/api/v1/employees/{id}/admin` | `EMPLOYEE_VIEW_ALL` (revalidate) |
| DELETE | `/api/v1/employees/{id}` | `EMPLOYEE_DELETE` |
| PUT | `/api/v1/employees/{id}/deactivate` | `EMPLOYEE_VIEW_ALL` (revalidate) |

#### 2. AuthController — `/api/v1/auth`

| Method | Path | Permission |
|--------|------|-----------|
| GET | `/api/v1/auth/me` | Authenticated (no permission) |
| POST | `/api/v1/auth/login` | **Public** (permitAll) |
| POST | `/api/v1/auth/google` | **Public** (permitAll) |
| POST | `/api/v1/auth/mfa-login` | **Public** (permitAll) |
| POST | `/api/v1/auth/refresh` | **Public** (permitAll) |
| POST | `/api/v1/auth/logout` | Authenticated |
| POST | `/api/v1/auth/change-password` | Authenticated |
| POST | `/api/v1/auth/forgot-password` | **Public** (permitAll) |
| POST | `/api/v1/auth/reset-password` | **Public** (permitAll) |

#### 3. PayrollController — `/api/v1/payroll`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/payroll/runs` | `PAYROLL_PROCESS` |
| PUT | `/api/v1/payroll/runs/{id}` | `PAYROLL_PROCESS` |
| GET | `/api/v1/payroll/runs/{id}` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/runs` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/runs/period` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/runs/year/{year}` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/runs/status/{status}` | `PAYROLL_VIEW_ALL` |
| POST | `/api/v1/payroll/runs/{id}/process` | `PAYROLL_PROCESS` (revalidate) |
| GET | `/api/v1/payroll/runs/{id}/status` | `PAYROLL_VIEW_ALL` |
| POST | `/api/v1/payroll/runs/{id}/approve` | `PAYROLL_APPROVE` (revalidate) |
| POST | `/api/v1/payroll/runs/{id}/lock` | `PAYROLL_APPROVE` (revalidate) |
| DELETE | `/api/v1/payroll/runs/{id}` | `PAYROLL_PROCESS` |
| POST | `/api/v1/payroll/payslips` | `PAYROLL_PROCESS` |
| PUT | `/api/v1/payroll/payslips/{id}` | `PAYROLL_PROCESS` |
| GET | `/api/v1/payroll/payslips/{id}` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/payslips` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}` | `PAYROLL_VIEW_ALL` / `PAYROLL_VIEW_SELF` |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}/period` | `PAYROLL_VIEW_ALL` / `PAYROLL_VIEW_SELF` |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}/year/{year}` | `PAYROLL_VIEW_ALL` / `PAYROLL_VIEW_SELF` |
| GET | `/api/v1/payroll/payslips/run/{payrollRunId}` | `PAYROLL_VIEW_ALL` |
| GET | `/api/v1/payroll/payslips/run/{payrollRunId}/paged` | `PAYROLL_VIEW_ALL` |
| DELETE | `/api/v1/payroll/payslips/{id}` | `PAYROLL_PROCESS` |
| GET | `/api/v1/payroll/payslips/{id}/pdf` | `PAYROLL_VIEW_ALL` / `PAYROLL_VIEW_SELF` |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}/period/pdf` | `PAYROLL_VIEW_ALL` / `PAYROLL_VIEW_SELF` |
| POST | `/api/v1/payroll/salary-structures` | `PAYROLL_PROCESS` |

#### 4. AttendanceController — `/api/v1/attendance`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/attendance/check-in` | `ATTENDANCE_MARK` |
| POST | `/api/v1/attendance/check-out` | `ATTENDANCE_MARK` |
| GET | `/api/v1/attendance/today` | `ATTENDANCE_VIEW_SELF` |
| GET | `/api/v1/attendance/my-attendance` | `ATTENDANCE_VIEW_SELF` |
| GET | `/api/v1/attendance/my-time-entries` | `ATTENDANCE_VIEW_SELF` |
| POST | `/api/v1/attendance/multi-check-in` | `ATTENDANCE_MARK` |
| POST | `/api/v1/attendance/multi-check-out` | `ATTENDANCE_MARK` |
| GET | `/api/v1/attendance/time-entries/{attendanceRecordId}` | `ATTENDANCE_VIEW_ALL` / `ATTENDANCE_VIEW_TEAM` |
| GET | `/api/v1/attendance/employee/{employeeId}/time-entries` | `ATTENDANCE_VIEW_ALL` / `ATTENDANCE_VIEW_TEAM` |
| POST | `/api/v1/attendance/bulk-check-in` | `ATTENDANCE_VIEW_ALL` |
| POST | `/api/v1/attendance/bulk-check-out` | `ATTENDANCE_VIEW_ALL` |
| GET | `/api/v1/attendance/employee/{employeeId}` | `ATTENDANCE_VIEW_ALL` / `ATTENDANCE_VIEW_TEAM` / `ATTENDANCE_VIEW_SELF` |
| GET | `/api/v1/attendance/employee/{employeeId}/range` | `ATTENDANCE_VIEW_ALL` / `ATTENDANCE_VIEW_TEAM` / `ATTENDANCE_VIEW_SELF` |
| GET | `/api/v1/attendance/pending-regularizations` | `ATTENDANCE_APPROVE` |
| GET | `/api/v1/attendance/all` | `ATTENDANCE_MANAGE` |
| GET | `/api/v1/attendance/date/{date}` | `ATTENDANCE_VIEW_ALL` / `ATTENDANCE_VIEW_TEAM` |
| POST | `/api/v1/attendance/regularization` | `ATTENDANCE_REGULARIZE` |
| POST | `/api/v1/attendance/{id}/request-regularization` | `ATTENDANCE_REGULARIZE` |
| POST | `/api/v1/attendance/{id}/approve-regularization` | `ATTENDANCE_APPROVE` |
| POST | `/api/v1/attendance/{id}/reject-regularization` | `ATTENDANCE_APPROVE` |
| GET | `/api/v1/attendance/import/template` | `ATTENDANCE_VIEW_ALL` |
| POST | `/api/v1/attendance/import` | `ATTENDANCE_APPROVE` |

#### 5. LeaveRequestController — `/api/v1/leave-requests`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/leave-requests` | `LEAVE_REQUEST` |
| GET | `/api/v1/leave-requests/{id}` | `LEAVE_VIEW_ALL` / `LEAVE_VIEW_SELF` |
| GET | `/api/v1/leave-requests/employee/{employeeId}` | `LEAVE_VIEW_ALL` / `LEAVE_VIEW_SELF` |
| GET | `/api/v1/leave-requests/status/{status}` | `LEAVE_VIEW_ALL` / `LEAVE_VIEW_SELF` |
| GET | `/api/v1/leave-requests` | `LEAVE_VIEW_ALL` / `LEAVE_VIEW_SELF` |
| POST | `/api/v1/leave-requests/{id}/approve` | `LEAVE_APPROVE` |
| POST | `/api/v1/leave-requests/{id}/reject` | `LEAVE_REJECT` |
| POST | `/api/v1/leave-requests/{id}/cancel` | `LEAVE_CANCEL` |
| PUT | `/api/v1/leave-requests/{id}` | `LEAVE_REQUEST` |

#### 6. RecruitmentController — `/api/v1/recruitment`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/recruitment/job-openings` | `RECRUITMENT_CREATE` |
| PUT | `/api/v1/recruitment/job-openings/{id}` | `RECRUITMENT_UPDATE` |
| GET | `/api/v1/recruitment/job-openings/{id}` | `RECRUITMENT_VIEW` |
| GET | `/api/v1/recruitment/job-openings` | `RECRUITMENT_VIEW` |
| GET | `/api/v1/recruitment/job-openings/status/{status}` | `RECRUITMENT_VIEW` |
| DELETE | `/api/v1/recruitment/job-openings/{id}` | `RECRUITMENT_DELETE` |
| POST | `/api/v1/recruitment/candidates` | `RECRUITMENT_CREATE` |
| PUT | `/api/v1/recruitment/candidates/{id}` | `RECRUITMENT_UPDATE` |
| GET | `/api/v1/recruitment/candidates/{id}` | `CANDIDATE_VIEW` |
| GET | `/api/v1/recruitment/candidates` | `CANDIDATE_VIEW` |
| GET | `/api/v1/recruitment/candidates/job-opening/{jobOpeningId}` | `CANDIDATE_VIEW` |
| PUT | `/api/v1/recruitment/candidates/{id}/stage` | `RECRUITMENT_UPDATE` |
| POST | `/api/v1/recruitment/candidates/{id}/offer` | `RECRUITMENT_UPDATE` |
| POST | `/api/v1/recruitment/candidates/{id}/accept-offer` | `RECRUITMENT_UPDATE` |
| POST | `/api/v1/recruitment/candidates/{id}/decline-offer` | `RECRUITMENT_UPDATE` |
| DELETE | `/api/v1/recruitment/candidates/{id}` | `RECRUITMENT_DELETE` |
| GET | `/api/v1/recruitment/interviews` | `RECRUITMENT_VIEW` |
| POST | `/api/v1/recruitment/interviews` | `RECRUITMENT_CREATE` |
| PUT | `/api/v1/recruitment/interviews/{id}` | `RECRUITMENT_UPDATE` |
| GET | `/api/v1/recruitment/interviews/{id}` | `RECRUITMENT_VIEW` |
| GET | `/api/v1/recruitment/interviews/candidate/{candidateId}` | `RECRUITMENT_VIEW` |
| DELETE | `/api/v1/recruitment/interviews/{id}` | `RECRUITMENT_DELETE` |
| GET | `/api/v1/recruitment/offers` | `RECRUITMENT_VIEW` |

#### 7. PerformanceReviewController — `/api/v1/reviews`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/reviews` | `REVIEW_CREATE` |
| GET | `/api/v1/reviews` | `REVIEW_VIEW` |
| GET | `/api/v1/reviews/{id}` | `REVIEW_VIEW` |
| GET | `/api/v1/reviews/employee/{employeeId}` | `REVIEW_VIEW` |
| GET | `/api/v1/reviews/employee/{employeeId}/paged` | `REVIEW_VIEW` |
| GET | `/api/v1/reviews/pending/{reviewerId}` | `REVIEW_VIEW` |
| GET | `/api/v1/reviews/pending/{reviewerId}/paged` | `REVIEW_VIEW` |
| PUT | `/api/v1/reviews/{id}` | `REVIEW_UPDATE` |
| PUT | `/api/v1/reviews/{id}/submit` | `REVIEW_SUBMIT` |
| PUT | `/api/v1/reviews/{id}/complete` | `REVIEW_APPROVE` |
| DELETE | `/api/v1/reviews/{id}` | `REVIEW_DELETE` |
| DELETE | `/api/v1/reviews/competencies/{id}` | `REVIEW_DELETE` |
| POST | `/api/v1/reviews/competencies` | `REVIEW_CREATE` |
| GET | `/api/v1/reviews/{reviewId}/competencies` | `REVIEW_VIEW` |

#### 8. WikiPageController — `/api/v1/knowledge/wiki/pages`

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/api/v1/knowledge/wiki/pages` | `KNOWLEDGE_WIKI_CREATE` |
| GET | `/api/v1/knowledge/wiki/pages` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/my` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/space/{spaceId}` | `KNOWLEDGE_WIKI_READ` |
| PUT | `/api/v1/knowledge/wiki/pages/{pageId}` | `KNOWLEDGE_WIKI_UPDATE` |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/publish` | `KNOWLEDGE_WIKI_PUBLISH` |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/archive` | `KNOWLEDGE_WIKI_UPDATE` |
| POST | `/api/v1/knowledge/wiki/pages/{pageId}/toggle-pin` | `KNOWLEDGE_WIKI_UPDATE` |
| DELETE | `/api/v1/knowledge/wiki/pages/{pageId}` | `KNOWLEDGE_WIKI_DELETE` |
| GET | `/api/v1/knowledge/wiki/pages/search` | `KNOWLEDGE_SEARCH` |
| GET | `/api/v1/knowledge/wiki/pages/space/{spaceId}/tree` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/space/{spaceId}/root` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/children` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/breadcrumbs` | `KNOWLEDGE_WIKI_READ` |
| PATCH | `/api/v1/knowledge/wiki/pages/{pageId}/move` | `KNOWLEDGE_WIKI_UPDATE` |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/export` | `KNOWLEDGE_WIKI_READ` |
| GET | `/api/v1/knowledge/wiki/pages/{pageId}/versions` | `KNOWLEDGE_WIKI_READ` |

#### 9. UserController — `/api/v1/users`

| Method | Path | Permission |
|--------|------|-----------|
| GET | `/api/v1/users/me` | _(self-service, no @RequiresPermission — BUG-022 intentional)_ |
| GET | `/api/v1/users` | `USER_VIEW` |
| PUT | `/api/v1/users/{id}/roles` | `USER_MANAGE` |

#### 10. AdminController — `/api/v1/admin`

| Method | Path | Permission |
|--------|------|-----------|
| GET | `/api/v1/admin/health` | `SYSTEM_ADMIN` |
| GET | `/api/v1/admin/settings` | `SYSTEM_ADMIN` |
| GET | `/api/v1/admin/stats` | `SYSTEM_ADMIN` |
| GET | `/api/v1/admin/users` | `SYSTEM_ADMIN` |
| PATCH | `/api/v1/admin/users/{userId}/role` | `SYSTEM_ADMIN` |
| POST | `/api/v1/admin/users/{userId}/link-employee` | `SYSTEM_ADMIN` |

---

### Complete Controller Registry

| Controller | Base Path | Endpoint Count |
|-----------|-----------|---------------|
| `AdminController` | `/api/v1/admin` | 6 |
| `EncryptionBackfillController` | `/api/v1/admin/encryption-backfill` | ~2 |
| `KafkaAdminController` | `/api/v1/admin/kafka` | ~4 |
| `SystemAdminController` | `/api/v1/admin/system` | ~6 |
| `SystemAuditLogController` | `/api/v1/admin/system/audit-logs` | ~4 |
| `AdvancedAnalyticsController` | `/api/v1/analytics/advanced` | ~8 |
| `AnalyticsController` | `/api/v1/analytics` | ~10 |
| `DashboardsController` | `/api/v1/dashboards` | ~8 |
| `OrganizationHealthController` | `/api/v1/analytics/org-health` | ~6 |
| `PredictiveAnalyticsController` | `/api/v1/predictive-analytics` | ~6 |
| `ScheduledReportController` | `/api/v1/scheduled-reports` | ~8 |
| `AnnouncementController` | `/api/v1/announcements` | ~8 |
| `AssetManagementController` | `/api/v1/assets` | ~12 |
| `AttendanceController` | `/api/v1/attendance` | 22 |
| `BiometricDeviceController` | `/api/v1/biometric` | ~6 |
| `CompOffController` | `/api/v1/comp-off` | ~6 |
| `HolidayController` | `/api/v1/holidays` | ~8 |
| `MobileAttendanceController` | `/api/v1/mobile/attendance` | 4 |
| `OfficeLocationController` | `/api/v1/office-locations` | ~6 |
| `RestrictedHolidayController` | `/api/v1/restricted-holidays` | ~6 |
| `AuditLogController` | `/api/v1/audit` & `/api/v1/audit-logs` | ~8 |
| `AuthController` | `/api/v1/auth` | 9 |
| `MfaController` | `/api/v1/auth/mfa` | ~4 |
| `SamlConfigController` | `/api/v1/auth/saml` | ~4 |
| `BenefitEnhancedController` | `/api/v1/benefits-enhanced` | 30 |
| `BenefitManagementController` | `/api/v1/benefits` | ~16 |
| `BudgetPlanningController` | `/api/v1/budget` | 23 |
| `CalendarController` | `/api/v1/calendar` | ~8 |
| `ContentViewController` | `/api/v1/views` | 7 |
| `CompensationController` | `/api/v1/compensation` | ~12 |
| `ComplianceController` | `/api/v1/compliance` | 33 |
| `DsrAdminFulfillmentController` | `/api/v1/admin/dsr` | ~4 |
| `DsrController` | `/api/v1/me/dsr` | ~4 |
| `ContractController` | `/api/v1/contracts` | 24 |
| `ContractTemplateController` | `/api/v1/contracts/templates` | ~8 |
| `CustomFieldController` | `/api/v1/custom-fields` | 22 |
| `DashboardController` | `/api/v1/dashboard` | 1 |
| `KekaImportController` | `/api/v1/keka-import` | ~4 |
| `FileUploadController` | `/api/v1/files` | ~6 |
| `EmployeeDirectoryController` | `/api/v1/employees/directory` | ~4 |
| `EmployeeImportController` | `/api/v1/employees/import` | ~4 |
| `TalentProfileController` | `/api/v1/employees/{id}/talent-profile` | ~6 |
| `DepartmentController` | `/api/v1/departments` | ~8 |
| `EmployeeController` | `/api/v1/employees` | ~20 |
| `EmployeeDocumentController` | `/api/v1/employees` (sub-paths) | ~8 |
| `EmployeeSkillController` | `/api/v1/employees` (sub-paths) | ~6 |
| `EmploymentChangeRequestController` | `/api/v1/employment-change-requests` | ~8 |
| `OneOnOneMeetingController` | `/api/v1/meetings` | 24 |
| `PulseSurveyController` | `/api/v1/surveys` | ~10 |
| `ESignatureController` | `/api/v1/esignature` | ~8 |
| `ExitManagementController` | `/api/v1/exit/...` | 39 |
| `OffboardingController` | `/api/v1/offboarding` | ~10 |
| `FnFController` | `/api/v1/exit/fnf` | ~6 |
| `ExpenseAdvanceController` | `/api/v1/expense-advances` | ~6 |
| `ExpenseCategoryController` | `/api/v1/expense-categories` | ~6 |
| `ExpenseClaimController` | `/api/v1/expense-claims` | ~10 |
| `ExpenseItemController` | `/api/v1/expense-items` | ~4 |
| `ExpensePolicyController` | `/api/v1/expense-policies` | ~6 |
| `ExpenseReportController` | `/api/v1/expense-reports` | ~6 |
| `MileageController` | `/api/v1/mileage` | ~6 |
| `MileagePolicyController` | `/api/v1/mileage-policies` | ~4 |
| `OcrReceiptController` | `/api/v1/ocr-receipts` | ~2 |
| `ExportController` | `/api/v1/export` | ~4 |
| `FeatureFlagController` | `/api/v1/admin/feature-flags` | 7 |
| `HelpdeskController` | `/api/v1/helpdesk/...` | 24 |
| `HelpdeskSLAController` | `/api/v1/helpdesk/sla` | ~6 |
| `HomeController` | `/api/v1/home` | 7 |
| `DocuSignController` | `/api/v1/integrations/docusign` | ~4 |
| `IntegrationConnectorController` | `/api/v1/integrations/connectors` | ~6 |
| `IntegrationController` | `/api/v1/integrations` | ~8 |
| `SlackCommandController` | `/api/v1/integrations/slack` | 3 |
| `BlogCategoryController` | `/api/v1/knowledge/blog-categories` | ~6 |
| `BlogPostController` | `/api/v1/knowledge/blog-posts` | ~10 |
| `ContentEngagementController` | `/api/v1/knowledge/engagement` | ~8 |
| `FluenceActivityController` | `/api/v1/knowledge/activity` | ~4 |
| `FluenceAttachmentController` | `/api/v1/knowledge/attachments` | ~4 |
| `FluenceChatController` | `/api/v1/knowledge/chat` | ~4 |
| `FluenceCommentController` | `/api/v1/knowledge/comments` | ~8 |
| `FluenceEditLockController` | `/api/v1/knowledge/edit-locks` | ~4 |
| `FluenceSearchController` | `/api/v1/knowledge/fluence-search` | ~4 |
| `KnowledgeSearchController` | `/api/v1/knowledge/search` | ~4 |
| `LinkedinPostController` | `/api/v1/linkedin-posts` | ~6 |
| `TemplateController` | `/api/v1/knowledge/templates` | ~8 |
| `WikiInlineCommentController` | _(no @RequestMapping found)_ | ~6 |
| `WikiPageController` | `/api/v1/knowledge/wiki/pages` | 18 |
| `WikiSpaceController` | `/api/v1/knowledge/wiki/spaces` | ~8 |
| `LeaveBalanceController` | `/api/v1/leave-balances` | ~8 |
| `LeaveRequestController` | `/api/v1/leave-requests` | 9 |
| `LeaveTypeController` | `/api/v1/leave-types` | ~6 |
| `LetterController` | `/api/v1/letters` | 26 |
| `LmsController` | `/api/v1/lms` | 26 |
| `QuizController` | `/api/v1/lms/quizzes` | ~8 |
| `CourseEnrollmentController` | `/api/v1/lms` (sub-paths) | ~6 |
| `LoanController` | `/api/v1/loans` | ~10 |
| `MeetingController` | `/api/v1/one-on-one` | ~8 |
| `DataMigrationController` | `/api/v1/migration` | 7 |
| `MobileApprovalController` | `/api/v1/mobile/approvals` | ~4 |
| `MobileDashboardController` | `/api/v1/mobile/dashboard` | ~4 |
| `MobileLeaveController` | `/api/v1/mobile/leave` | ~6 |
| `MobileNotificationController` | `/api/v1/mobile/notifications` | ~4 |
| `MobileSyncController` | `/api/v1/mobile/sync` | ~2 |
| `MonitoringController` | `/api/monitoring` | 3 |
| `MultiChannelNotificationController` | `/api/v1/notifications` | ~8 |
| `NotificationController` | `/api/v1/notifications` | ~8 |
| `SmsNotificationController` | `/api/v1/notifications/sms` | ~4 |
| `OnboardingManagementController` | `/api/v1/onboarding` | ~12 |
| `OrganizationController` | `/api/v1/organization` | 27 |
| `OvertimeManagementController` | `/api/v1/overtime` | ~10 |
| `PaymentConfigController` | `/api/v1/payments/config` | ~6 |
| `PaymentController` | `/api/v1/payments` | ~8 |
| `PaymentWebhookController` | `/api/v1/payments/webhooks` | 3 |
| `BonusController` | `/api/v1/payroll/bonus` | ~8 |
| `GlobalPayrollController` | `/api/v1/global-payroll` | ~10 |
| `PayrollController` | `/api/v1/payroll` | 43 |
| `PayrollStatutoryController` | `/api/v1/payroll/statutory` | ~8 |
| `StatutoryFilingController` | `/api/v1/payroll/statutory-filings` | ~6 |
| `Feedback360Controller` | `/api/v1/feedback360` | ~10 |
| `OkrController` | `/api/v1/okr` | ~12 |
| `PerformanceRevolutionController` | `/api/v1/performance/revolution` | ~8 |
| `FeedbackController` | `/api/v1/feedback` | ~8 |
| `GoalController` | `/api/v1/goals` | ~10 |
| `PerformanceReviewController` | `/api/v1/reviews` | 14 |
| `PIPController` | `/api/v1/performance/pip` | ~8 |
| `ReviewCycleController` | `/api/v1/review-cycles` | ~8 |
| `PlatformController` | `/api/v1/platform` | 23 |
| `RootProbeController` | `/` | 1 |
| `TenantController` | `/api/v1/tenants` | ~8 |
| `PreboardingController` | `/api/v1/preboarding` | ~10 |
| `ProbationController` | `/api/v1/probation` | 21 |
| `ProjectTimesheetController` | `/api/v1/project-timesheets` | 26 |
| `ProjectController` | `/api/v1/projects` | ~12 |
| `ResourceController` | `/api/v1/resources` | ~8 |
| `PSAInvoiceController` | `/api/v1/psa/invoices` | ~10 |
| `PSAProjectController` | `/api/v1/psa/projects` | ~10 |
| `PSATimesheetController` | `/api/v1/psa/timesheets` | ~8 |
| `PublicCareerController` | `/api/v1/public/careers` | **Public** ~4 |
| `PublicOfferController` | `/api/v1/public/offers` | **Public** ~4 |
| `RecognitionController` | `/api/v1/recognition` | ~8 |
| `AgencyController` | `/api/v1/recruitment/agencies` | ~8 |
| `AIRecruitmentController` | `/api/v1/recruitment/ai` | ~6 |
| `ApplicantController` | `/api/v1/recruitment/applicants` | ~8 |
| `JobBoardController` | `/api/v1/recruitment/job-boards` | ~6 |
| `RecruitmentController` | `/api/v1/recruitment` | 23 |
| `ScorecardController` | `/api/v1/recruitment/scorecards` | ~6 |
| `ReferralController` | `/api/v1/referrals` | ~6 |
| `CustomReportController` | `/api/v1/reports/custom` | ~8 |
| `ReportController` | `/api/v1/reports` | ~10 |
| `ResourceConflictController` | `/api/v1/resource-management/conflicts` | ~6 |
| `ResourceManagementController` | `/api/v1/resource-management` | 27 |
| `ResourcePoolController` | `/api/v1/resource-pools` | ~6 |
| `SelfServiceController` | `/api/v1/self-service` | ~10 |
| `ShiftManagementController` | `/api/v1/shifts` | 22 |
| `ShiftSwapController` | `/api/v1/shift-swaps` | ~8 |
| `ESIController` | `/api/v1/statutory/esi` | ~6 |
| `LWFController` | `/api/v1/payroll/lwf` | ~4 |
| `ProfessionalTaxController` | `/api/v1/statutory/pt` | ~6 |
| `ProvidentFundController` | `/api/v1/statutory/pf` | ~6 |
| `StatutoryContributionController` | `/api/v1/statutory/contributions` | ~8 |
| `TDSController` | `/api/v1/statutory/tds` | ~6 |
| `SurveyAnalyticsController` | `/api/v1/survey-analytics` | ~6 |
| `SurveyManagementController` | `/api/v1/survey-management` | ~10 |
| `TaxDeclarationController` | `/api/v1/tax-declarations` | ~8 |
| `TimeTrackingController` | `/api/v1/time-tracking` | ~10 |
| `TrainingManagementController` | `/api/v1/training` | ~12 |
| `TravelController` | `/api/v1/travel` | ~10 |
| `TravelExpenseController` | `/api/v1/travel/expenses` | ~8 |
| `ImplicitRoleRuleController` | `/api/v1/implicit-role-rules` | ~6 |
| `NotificationPreferencesController` | `/api/v1/notification-preferences` | ~4 |
| `PermissionController` | `/api/v1/permissions` | ~6 |
| `RoleController` | `/api/v1/roles` | ~8 |
| `UserController` | `/api/v1/users` | 3 |
| `WallController` | `/api/v1/wall` | ~12 |
| `WebhookController` | `/api/webhooks` | ~8 |
| `WebhookRotationController` | `/api/v1/admin/webhooks` | ~6 |
| `WellnessController` | `/api/v1/wellness` | ~10 |
| `ApprovalEscalationController` | `/api/v1/escalation` | ~6 |
| `ApprovalsController` | `/api/v1/approvals` | ~12 |
| `WorkflowController` | `/api/v1/workflow` | 26 |
| `ApiKeyController` | `/api/v1/admin/api-keys` | 6 |
| `WebSocketNotificationController` | `/api/ws-notifications` | 1 |

---

## Unprotected Endpoints (Intentional or Security Risk)

### Publicly Accessible (No Authentication — SecurityConfig permitAll)

| Path | Controller | Risk Level | Notes |
|------|-----------|-----------|-------|
| `/api/v1/auth/login` | `AuthController` | Low | Expected |
| `/api/v1/auth/google` | `AuthController` | Low | Expected |
| `/api/v1/auth/refresh` | `AuthController` | Low | Expected |
| `/api/v1/auth/forgot-password` | `AuthController` | Low | Expected |
| `/api/v1/auth/reset-password` | `AuthController` | Low | Expected |
| `/api/v1/auth/mfa-login` | `AuthController` | Low | Expected |
| `/api/v1/external/**` | External APIs | Low | API Key protected via `ApiKeyAuthenticationFilter` |
| `/api/v1/tenants/register` | `TenantController` | **Medium** | Tenant self-registration — confirm it is demo-safe |
| `/api/v1/esignature/external/**` | `ESignatureController` | Low | Signed token-gated |
| `/api/v1/public/offers/**` | `PublicOfferController` | Low | Public career offer portal |
| `/api/v1/exit/interview/public/**` | `ExitManagementController` | Low | Token-gated public exit survey |
| `/api/v1/public/careers/**` | `PublicCareerController` | Low | Expected public careers page |
| `/ws/**` | WebSocket | Low | WS auth handled separately |
| `/api/v1/integrations/docusign/webhook` | `DocuSignController` | Low | Webhook signature verified |
| `/api/v1/payments/webhooks/**` | `PaymentWebhookController` | Low | Provider signature verified |
| `/api/v1/preboarding/portal/**` | `PreboardingController` | Low | Token-gated |
| `/api/v1/biometric/punch` | `BiometricDeviceController` | **Medium** | Device authentication only — no user JWT |
| `/api/v1/biometric/punch/batch` | `BiometricDeviceController` | **Medium** | Device authentication only — no user JWT |
| `/api/v1/integrations/slack/commands` | `SlackCommandController` | Low | Slack signature verified |
| `/api/v1/integrations/slack/interactions` | `SlackCommandController` | Low | Slack signature verified |
| `/api/v1/integrations/slack/events` | `SlackCommandController` | Low | Slack signature verified |
| `/actuator/health` | Spring Actuator | Low | Health probe only |
| `/swagger-ui/**`, `/v3/api-docs/**` | Springdoc | **High (PROD)** | API docs exposed — should be disabled in production |

### Authenticated but No @RequiresPermission (Design-by-Decision)

| Path | Controller | Rationale | Risk Level |
|------|-----------|-----------|-----------|
| `GET /api/v1/users/me` | `UserController` | BUG-022: self-profile, JWT-scoped to own user | None — correct design |
| `GET /api/v1/employees/me` | `EmployeeController` | Self-service, JWT-scoped | None — correct design |
| `GET /api/v1/admin/feature-flags/check/{featureKey}` | `FeatureFlagController` | RBAC-02: UI feature gating for any authenticated user | Low — read-only feature flag check |
| `GET /api/monitoring/ping` | `MonitoringController` | Health probe endpoint, no permission check | Low — returns "pong" only |
| `GET /` | `RootProbeController` | Root probe for load balancer health | None |

---

## Feature-Flag-Gated Endpoints

These controllers require a feature flag to be enabled at the tenant level:

| Controller | Feature Flag | Base Path |
|-----------|-------------|-----------|
| `CourseEnrollmentController` | `ENABLE_LMS` | `/api/v1/lms` |
| `PaymentConfigController` | `ENABLE_PAYMENTS` | `/api/v1/payments/config` |
| `PaymentWebhookController` | `ENABLE_PAYMENTS` | `/api/v1/payments/webhooks` |
| `PaymentController` | `ENABLE_PAYMENTS` | `/api/v1/payments` |
| `CompensationController` | `ENABLE_PAYROLL` | `/api/v1/compensation` |
| `FluenceEditLockController` | `ENABLE_FLUENCE` | `/api/v1/knowledge/edit-locks` |
| `FluenceAttachmentController` | `ENABLE_FLUENCE` | `/api/v1/knowledge/attachments` |

Mechanism: `@RequiresFeature` annotation handled by `FeatureFlagAspect` (AOP). SUPER_ADMIN and TENANT_ADMIN bypass the feature flag check per `FeatureFlagAspect` admin bypass logic.

---

## Security Notes

1. **Swagger UI** (`/swagger-ui/**`, `/v3/api-docs/**`) is `permitAll` — must be disabled or access-controlled in production. Current SecurityConfig allows it unconditionally.
2. **Biometric punch** endpoints (`/api/v1/biometric/punch`, `/batch`) bypass JWT auth — protected only by device-level credentials. Ensure device credential rotation is enforced.
3. **Tenant registration** (`/api/v1/tenants/register`) is public — confirm rate limiting and CAPTCHA are in place before production.
4. **`DEMO_CREDENTIALS_ENABLED=true`** in Railway staging means the `SUPER_ADMIN` demo login is a click away — must be flipped to `false` before public user traffic.
5. **RLS enforcement**: All sensitive data endpoints rely on PostgreSQL RLS (row-level security). The RLS tenant GUC is set as transaction-local (`set_config(..., true)`) — fixed in commit `0ea63f6e`.

