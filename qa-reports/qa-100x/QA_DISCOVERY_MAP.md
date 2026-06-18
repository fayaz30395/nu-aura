# QA Discovery Map — NU-AURA Frontend Routes

> Generated: 2026-06-17 | Updated: 2026-06-18 (Iteration 7)
> Source: Agent 1 (Route Discovery) + Iteration 7 Frontend Discovery Agent
> Total page.tsx files found: 286 routes (updated from 285)

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
| `/auth/change-password` | Change password — missing error.tsx, loading.tsx |
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
| `/me/dashboard` | Employee self-service dashboard (HRMS entry point) — missing dark: variants |
| `/me/profile` | My profile |
| `/me/attendance` | My attendance — missing dark: variants |
| `/me/leaves` | My leaves |
| `/me/payslips` | My payslips |
| `/me/documents` | My documents |
| `/me/assets` | My assets |
| `/me/skills` | My skills — missing Zod validation |

### NU-HRMS — Dashboards
| Route | Notes |
|-------|-------|
| `/dashboard` | General dashboard (legacy/redirect) |
| `/dashboards/employee` | Employee dashboard |
| `/dashboards/manager` | Manager dashboard |
| `/dashboards/executive` | Executive dashboard |
| `/executive` | Executive view — missing error.tsx, loading.tsx |
| `/analytics` | Analytics hub |
| `/analytics/org-health` | Org health analytics |
| `/predictive-analytics` | Predictive analytics |

### NU-HRMS — People / Employees
| Route | Notes |
|-------|-------|
| `/employees` | Employee list |
| `/employees/[id]` | Employee detail |
| `/employees/[id]/edit` | Edit employee |
| `/employees/[id]/compensation` | Employee compensation detail — missing COMPENSATION_VIEW permission check |
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
| `/leave/my-leaves` | My leave balance & history — missing Zod validation |
| `/leave/apply` | Apply for leave |
| `/leave/approvals` | Approve/reject leaves |
| `/leave/team` | Team leave view — error.tsx + loading.tsx added iteration 7; missing dark: variants |
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
| `/payroll` | Payroll overview — missing dark: variants |
| `/payroll/runs` | Payroll runs list |
| `/payroll/runs/[id]` | Payroll run detail |
| `/payroll/bulk-processing` | Bulk payroll processing — missing dark: variants |
| `/payroll/payslips` | Payslips list — missing dark: variants |
| `/payroll/salary-structures` | Salary structures |
| `/payroll/salary-structures/create` | Create salary structure |
| `/payroll/components` | Payroll components |
| `/payroll/structures` | Pay structures |
| `/payroll/statutory` | Statutory deductions — missing dark: variants |
| `/statutory` | Statutory management |
| `/statutory/filings` | Statutory filings |
| `/lwf` | Labour Welfare Fund — missing dark: variants |
| `/tax` | Tax overview |
| `/tax/declarations` | Tax declarations |
| `/compensation` | Compensation management |

### NU-HRMS — Finance & Expenses
| Route | Notes |
|-------|-------|
| `/expenses` | Expense overview |
| `/expenses/[id]` | Expense detail |
| `/expenses/approvals` | Expense approvals — missing error.tsx |
| `/expenses/mileage` | Mileage claims — missing error.tsx |
| `/expenses/reports` | Expense reports — missing error.tsx |
| `/expenses/settings` | Expense settings — missing error.tsx |
| `/loans` | Loans list — missing dark: variants |
| `/loans/[id]` | Loan detail |
| `/loans/new` | Apply for loan |
| `/travel` | Travel requests |
| `/travel/[id]` | Travel detail |
| `/travel/new` | New travel request |
| `/travel/expenses` | Travel expenses |
| `/benefits` | Employee benefits — missing dark: variants |
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
| `/allocations` | Resource allocations — missing dark: variants |
| `/allocations/summary` | Allocations summary |
| `/timesheets` | Timesheet list |
| `/time-tracking` | Time tracking |
| `/time-tracking/[id]` | Time entry detail — missing Zod validation |
| `/time-tracking/[id]/edit` | Edit time entry |
| `/time-tracking/new` | New time entry |

### NU-HRMS — Documents & Assets
| Route | Notes |
|-------|-------|
| `/documents` | Document management — stub page |
| `/assets` | Asset management |
| `/letters` | Employee letters |
| `/letters/templates` | Letter templates |
| `/contracts` | Contracts list |
| `/contracts/[id]` | Contract detail — missing dark: variants |
| `/contracts/new` | New contract — missing dark: variants |
| `/contracts/templates` | Contract templates — missing dark: variants |

### NU-HRMS — Workflow & Approvals
| Route | Notes |
|-------|-------|
| `/approvals` | Approvals overview — missing dark: variants |
| `/approvals/inbox` | Approvals inbox — missing dark: variants |
| `/workflows` | Workflow list |
| `/workflows/[id]` | Workflow detail |
| `/inbox` | General inbox — stub page; missing dark: variants |
| `/tasks` | Task management |

### NU-HRMS — Calendar & Comms
| Route | Notes |
|-------|-------|
| `/calendar` | Calendar view |
| `/calendar/[id]` | Calendar event detail |
| `/calendar/new` | New calendar event |
| `/nu-calendar` | NU Calendar app |
| `/nu-drive` | NU Drive app — missing dark: variants |
| `/nu-mail` | NU Mail app — XSS fix applied iteration 7 |
| `/announcements` | Announcements |
| `/notifications` | Notifications — stub page; missing dark: variants |
| `/company-spotlight` | Company spotlight |
| `/knowledge` | Knowledge base — stub page; missing error.tsx, loading.tsx |

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
| `/admin/budget` | Budget management — missing error.tsx |
| `/admin/audit` | Audit log |
| `/admin/reports` | Admin reports — missing error.tsx |
| `/admin/integrations` | Admin integrations |
| `/admin/integrations/webhooks` | Webhook management — missing error.tsx |
| `/admin/custom-fields` | Custom fields |
| `/admin/feature-flags` | Feature flags — missing dark: variants |
| `/admin/import-keka` | Keka import |
| `/admin/mobile-api` | Mobile API config — missing dark: variants |
| `/admin/system` | System settings — **NOT in PROTECTED_ROUTES (HIGH: FRONT-02)** |
| `/admin/profile` | Admin profile |
| `/admin/users` | Admin users — error.tsx + loading.tsx added iteration 7; stub page |

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
| `/settings/rbac` | RBAC settings — stub page; missing error.tsx |

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
| `/recruitment/kanban` | Recruitment kanban — error.tsx + loading.tsx added iteration 7; stub page; missing error.tsx was HIGH |
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
| `/linkedin-posts` | LinkedIn job post management — missing dark: variants |

### NU-Hire — Onboarding
| Route | Notes |
|-------|-------|
| `/onboarding` | Onboarding list |
| `/onboarding/[id]` | Onboarding detail |
| `/onboarding/new` | New onboarding |
| `/onboarding/templates` | Onboarding templates — missing dark: variants |
| `/onboarding/templates/[id]` | Template detail |
| `/onboarding/templates/new` | New template — missing dark: variants |
| `/preboarding` | Preboarding admin |

### NU-Hire — Offboarding
| Route | Notes |
|-------|-------|
| `/offboarding` | Offboarding list — missing dark: variants |
| `/offboarding/[id]` | Offboarding detail |
| `/offboarding/[id]/exit-interview` | Offboarding exit interview |
| `/offboarding/[id]/fnf` | Offboarding FnF settlement |
| `/offboarding/fnf` | FnF overview |
| `/offboarding/exit/fnf` | Exit FnF — missing dark: variants |

---

### NU-Grow — Performance
| Route | Notes |
|-------|-------|
| `/performance` | Performance hub (Grow entry point) |
| `/performance/reviews` | Performance reviews |
| `/performance/cycles` | Review cycles |
| `/performance/cycles/[id]/calibration` | Cycle calibration — missing dark: variants |
| `/performance/cycles/[id]/nine-box` | Cycle 9-box — missing dark: variants |
| `/performance/goals` | Goals management |
| `/performance/okr` | OKR management — missing dark: variants |
| `/performance/okrs` | OKRs list — missing error.tsx, loading.tsx |
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
| `/learning/courses` | Courses list — missing error.tsx |
| `/learning/courses/[id]` | Course detail |
| `/learning/courses/[id]/play` | Course player |
| `/learning/courses/[id]/quiz/[quizId]` | Course quiz |
| `/learning/paths` | Learning paths — missing dark: variants |
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
| `/surveys/[id]/respond` | Respond to survey — missing Zod validation |
| `/surveys/[id]/analytics` | Survey analytics |
| `/surveys/pulse` | Pulse surveys |
| `/recognition` | Recognition management |
| `/wellness` | Wellness overview |
| `/wellness/admin` | Wellness admin |

---

### NU-Fluence — Knowledge
| Route | Notes |
|-------|-------|
| `/fluence` | Fluence hub — missing dark: variants |
| `/fluence/wiki` | Wiki listing (Fluence entry point) |
| `/fluence/wiki/[slug]` | Wiki article view |
| `/fluence/wiki/[slug]/edit` | Edit wiki article |
| `/fluence/wiki/new` | Wiki new article — missing dark: variants |
| `/fluence/blogs` | Blogs listing |
| `/fluence/blogs/[slug]` | Blog post view |
| `/fluence/blogs/[slug]/edit` | Edit blog post |
| `/fluence/blogs/new` | New blog post |
| `/fluence/templates` | Templates listing |
| `/fluence/templates/[id]` | Template detail |
| `/fluence/templates/new` | New template — missing dark: variants |
| `/fluence/drive` | Drive (file storage) |
| `/fluence/search` | Search |
| `/fluence/my-content` | My content |
| `/fluence/wall` | Social wall — missing dark: variants |
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

---

## Iteration 7 Quality Gaps (by category)

### Error Boundary Coverage (FRONT-01)
Missing `error.tsx`: `/admin/budget`, `/admin/integrations/webhooks`, `/admin/reports`, `/auth/change-password`, `/executive`, `/expenses/approvals`, `/expenses/mileage`, `/expenses/reports`, `/expenses/settings`, `/learning/courses`, `/performance/okrs`, `/privacy`, `/settings/rbac`, `/terms`  
**Fixed this iteration:** `/admin/users`, `/leave/team`, `/recruitment/kanban`

### Loading State Coverage (FRONT-03)
Missing `loading.tsx`: `/auth/change-password`, `/executive`, `/knowledge`, `/performance/okrs`, `/privacy`, `/terms`  
**Fixed this iteration:** `/admin/users`, `/leave/team`, `/recruitment/kanban`

### Stub Pages (FRONT-04)
Empty/stub pages: `/documents`, `/inbox`, `/notifications`, `/settings/rbac`, `/knowledge`  
**Partially addressed:** `/admin/users`, `/recruitment/kanban`, `/leave/team` received skeletons

### Dark Mode Gaps (DARK-01)
64 pages missing `dark:` variants — see list in QA_UIUX_FINDINGS.md

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total page.tsx routes | 286 |
| Public routes (no auth) | 13 |
| Token-based public portals | 3 |
| Protected/authenticated routes | 270 |
| Dynamic routes | 40 |
| API route handlers | 1 |
| Nested dynamic routes (2+ params) | 1 (`/learning/courses/[id]/quiz/[quizId]`) |
| Missing/404 suspect routes | 6 |
| Pages missing error.tsx | 17 (3 fixed iteration 7, 14 remain) |
| Pages missing loading.tsx | 9 (3 fixed iteration 7, 6 remain) |
| Stub / empty pages | 8 |
| Pages missing dark: variants | 64 |
| Backend controllers | 180 |
| Backend endpoints with @RequiresPermission | ~1,764 |
| Flyway migrations on disk | V304 (as of 2026-06-18) |

---

## Auth Guard Architecture

The proxy operates at two levels:

1. **Edge (proxy.ts)** — coarse cookie-presence check. Redirects to `/auth/login` if no valid JWT cookie. Bypasses `/api/`, `/_next/`, `/favicon.ico`, `/static/`, `/images/`, `/fonts/`.

2. **Client-side (AuthGuard component)** — fine-grained permission check on top of the edge check. Applied in individual page components to enforce RBAC rules (e.g., only HR_ADMIN can access `/admin/payroll`).

**Known gap (FRONT-02):** `/admin/system` returns `routeConfig === null` from `findRouteConfig()` because `AuthGuard` uses exact `^/admin$` regex for base path matching. Result: `setIsAuthorized(true)` for any authenticated user on `/admin/system`.

Cookie names accepted by proxy:
- `access_token` (dev/staging)
- `__Host-hrms-access` (production, hardened)
- `refresh_token` / `__Host-hrms-refresh` (for token refresh)

---

## API Map — Backend Controllers

> Updated: 2026-06-18 (Iteration 7)
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
| Controllers without @RequiresPermission (all intentional) | 7 |

---

### Unprotected Endpoints (Intentional or Security Risk)

#### Intentional public endpoints
| Controller | Reason |
|-----------|--------|
| `AuthController` | Pre-auth by definition (login, refresh, forgot-password); `/me` and `/change-password` rely on `SecurityConfig .authenticated()` |
| `RootProbeController` | Health probe GET/HEAD only; no data exposure |
| `TenantController` | POST `/api/v1/tenants/register` is intentionally public SaaS self-signup; rate-limited via AUTH bucket (5/min) |
| `PublicCareerController` | `/api/v1/public/careers/**` is a public job board; validated + constrained |
| `PublicOfferController` | `/api/v1/public/offers/**` is token-based offer accept/decline for candidates |

#### Endpoints with body validation gap
| Controller | Method | Issue |
|-----------|--------|-------|
| `SlackCommandController` | `handleEvent` | `@RequestBody String body` — raw webhook payload; @Valid cannot apply to String; HMAC signing-secret check provides equivalent protection |
| `DocuSignController` | `handleDocuSignCallback` | `@RequestBody String payload` — raw HMAC-signed body; @Valid not applicable to String; verified by DocuSign signature |

---

## Feature-Flag-Gated Endpoints

| Controller | Feature Flag | Base Path |
|-----------|-------------|-----------|
| `CourseEnrollmentController` | `ENABLE_LMS` | `/api/v1/lms` |
| `PaymentConfigController` | `ENABLE_PAYMENTS` | `/api/v1/payments/config` |
| `PaymentWebhookController` | `ENABLE_PAYMENTS` | `/api/v1/payments/webhooks` |
| `PaymentController` | `ENABLE_PAYMENTS` | `/api/v1/payments` |
| `CompensationController` | `ENABLE_PAYROLL` | `/api/v1/compensation` |
| `FluenceEditLockController` | `ENABLE_FLUENCE` | `/api/v1/knowledge/edit-locks` |
| `FluenceAttachmentController` | `ENABLE_FLUENCE` | `/api/v1/knowledge/attachments` |

---

## RBAC Summary (Iteration 7)

| Metric | Count |
|--------|-------|
| Roles defined (V107 seed) | 7 core + expanded set (22 total per RBAC discovery) |
| Backend permission constants | 362 |
| Frontend permission enum entries | 392 |
| Backend @RequiresPermission annotations | 1,764 |
| Frontend routes with explicit permission spec | 177 |
| Frontend routes with auth-only fallback | 108 |
| High-risk unregistered routes (admin/settings) | ~20 |

> Full RBAC matrix and security findings in QA_RBAC_SECURITY_FINDINGS.md
