# P1 route sweep - run NUAURA_TEST_P1_192935

- Commit: `818a7405` · Browser: chromium 148.0.7778.96 / playwright 1.60.0 · FE http://localhost:3000 · BE http://localhost:8080 · 2026-11-18T06:59 -> 07:10
- Viewports: 1440x900, 390x844. Expected access per role = `lib/config/routes.ts` rule evaluated with the role's live permissions (`/auth/me`). A correct denial is PASS-denied.
- Allowlists (reviewed): console: /\[ApiClient\] Error: GET \S+ undefined canceled/ - axios request cancelled when the component unmounts (React dev double-mount); no user impact · http: /^40[13] (GET|POST) \/api\/v1\/auth\/(me|refresh)/ - session refresh handshake

## Catalogue reconciliation

Part B lists 290 routes; `frontend/app` has 289 (249 static + 40 dynamic).
- In catalogue, not in app: `/auth/logout`
- Every app route is in the catalogue.

## BLOCKED - dynamic routes (40)

No seeded fixture mapping in this pass; never opened with literal placeholders.

- `/calendar/[id]`
- `/contracts/[id]`
- `/employees/[id]`
- `/employees/[id]/compensation`
- `/employees/[id]/edit`
- `/exit-interview/[token]`
- `/expenses/[id]`
- `/fluence/blogs/[slug]`
- `/fluence/blogs/[slug]/edit`
- `/fluence/templates/[id]`
- `/fluence/wiki/[slug]`
- `/fluence/wiki/[slug]/edit`
- `/helpdesk/tickets/[id]`
- `/learning/courses/[id]`
- `/learning/courses/[id]/play`
- `/learning/courses/[id]/quiz/[quizId]`
- `/learning/paths/[id]`
- `/loans/[id]`
- `/offboarding/[id]`
- `/offboarding/[id]/exit-interview`
- `/offboarding/[id]/fnf`
- `/onboarding/[id]`
- `/onboarding/templates/[id]`
- `/payroll/runs/[id]`
- `/performance/cycles/[id]/calibration`
- `/performance/cycles/[id]/nine-box`
- `/preboarding/portal/[token]`
- `/projects/[id]`
- `/recruitment/agencies/[id]`
- `/recruitment/candidates/[id]`
- `/recruitment/candidates/[id]/offer`
- `/sign/[token]`
- `/surveys/[id]`
- `/surveys/[id]/analytics`
- `/surveys/[id]/respond`
- `/time-tracking/[id]`
- `/time-tracking/[id]/edit`
- `/training/catalog/[id]`
- `/travel/[id]`
- `/workflows/[id]`

## manager (sumit@nulogic.io; roles SKIP_LEVEL_MANAGER, MANAGER, REPORTING_MANAGER; 110 permissions) - 94 loads

Verdicts: PASS-denied=18, PASS=46, FAIL=26, REVIEW-denied=4

| failure class | page loads |
|---|---|
| authz | 32 |
| console | 24 |
| no | 4 |
| not-found | 2 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/benefits` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-e001-0000-0000-000000000001/active; console(2): Failed to load resource: the server responded with a status of 404 () |
| `/expenses/advances` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/advances?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/analytics` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=100&sortBy=usageCount&sortDirection=DESC; console(3): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/dashboard` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=3&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=20&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/letters/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/templates?page=0&size=20; authz: 403 GET /api/v1/letters/placeholders; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/letters/templates` | mobile | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/placeholders; authz: 403 GET /api/v1/letters/templates?page=0&size=20; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/projects/psa` | desktop | allow | rendered | FAIL | no heading |
| `/projects/psa/invoices` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/psa/invoices/status/DRAFT; console(2): Failed to load resource: the server responded with a status of 403 (); no heading |
| `/reports/attrition` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/predictive-analytics/attrition/high-risk?minScore=50; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/reports/headcount` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/headcount-trend?months=12; authz: 403 GET /api/v1/analytics/employees; authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/emp |
| `/reports/headcount` | mobile | allow | rendered | FAIL | authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/headcount-trend?months=12; authz: 403 GET /api/v1/analytics/employees; authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/hea |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-e001-0000-0000-000000000001?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/travel` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/travel/requests?page=0&size=10; console(2): Failed to load resource: the server responded with a status of 403 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/fluence/wiki/new`, `/settings/rbac`

Denied as expected (PASS-denied): `/admin/benefit-plans`, `/admin/roles`, `/expenses/reports`, `/expenses/settings`, `/helpdesk`, `/letters`, `/recruitment/job-boards`, `/referrals`, `/tax/declarations`

Slowest: /projects/psa 11s, /expenses/advances 11s, /performance/competency-matrix 10s, /letters/templates 10s, /leave/calendar 10s

## hradmin (admin@nulogic.io; roles HR_ADMIN; 205 permissions) - 94 loads

Verdicts: PASS=69, FAIL=19, PASS-denied=6

| failure class | page loads |
|---|---|
| console | 19 |
| authz | 16 |
| not-found | 2 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/admin/roles` | desktop | allow | redirect | FAIL | authz: 403 GET /api/v1/permissions?pageable%5Bsize%5D=500; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/benefits` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-de00-0000-0000-000000000099/active; console(2): Failed to load resource: the server responded with a status of 404 () |
| `/fluence/analytics` | desktop | auth | rendered | FAIL | console(2): In HTML, %s cannot be a descendant of <%s>. This will cause a hydration error.%s <div> p ... <ActivityCard activity={{id:"06d488...", ...}}> |
| `/letters` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/letters/templates/active; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/letters/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/placeholders; authz: 403 GET /api/v1/letters/templates?page=0&size=20; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/reports/attrition` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/predictive-analytics/attrition/high-risk?minScore=50; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/settings/rbac` | desktop | auth | redirect | FAIL | authz: 403 GET /api/v1/permissions?pageable%5Bsize%5D=500; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/settings/security` | mobile | auth | rendered | FAIL | console(4): Failed to load resource: the server responded with a status of 429 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-de00-0000-0000-000000000099?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |

Denied as expected (PASS-denied): `/expenses/reports`, `/expenses/settings`, `/referrals`

Slowest: /projects/psa 11s, /expenses/advances 11s, /performance/competency-matrix 10s, /letters/templates 10s, /leave/calendar 10s

## employee (arun@nulogic.io; roles EMPLOYEE; 82 permissions) - 94 loads

Verdicts: PASS-denied=16, PASS=30, FAIL=42, REVIEW-denied=6

| failure class | page loads |
|---|---|
| authz | 44 |
| console | 36 |
| spinner | 4 |
| no | 4 |
| not-found | 2 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/benefits` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/benefits-enhanced/dashboard; not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-e001-0000-0000-000000000009/active; console(4): Failed to load resource: the server responded with |
| `/benefits` | mobile | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-e001-0000-0000-000000000009/active; authz: 403 GET /api/v1/benefits-enhanced/dashboard; console(4): Failed to load resource: the server responded with |
| `/departments` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/employees?page=0&size=500&sortBy=createdAt&sortDirection=DESC; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/advances` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/advances?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/mileage` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/mileage/pending-approvals?page=0&size=50; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/analytics` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=100&sortBy=usageCount&sortDirection=DESC; console(3): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/dashboard` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=3&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=20&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/learning/paths` | desktop | allow | rendered | FAIL | spinner after 10s: 1 |
| `/leave/calendar` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/leave-requests/status/APPROVED?page=0&size=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/letters` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/letters/templates/active; authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 4 |
| `/letters` | mobile | allow | rendered | FAIL | authz: 403 GET /api/v1/letters/templates/active; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 4 |
| `/letters/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/placeholders; authz: 403 GET /api/v1/letters/templates?page=0&size=20; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/letters/templates` | mobile | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/templates?page=0&size=20; authz: 403 GET /api/v1/letters/placeholders; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/projects/psa` | desktop | allow | rendered | FAIL | no heading |
| `/projects/psa/invoices` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/psa/invoices/status/DRAFT; console(2): Failed to load resource: the server responded with a status of 403 (); no heading |
| `/projects/resource-conflicts` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/resource-management/conflicts/open; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |
| `/shifts/swaps` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/shift-swaps/pending-approval; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-e001-0000-0000-000000000009?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/tax/declarations` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/tax-declarations?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/team-directory` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/employees?page=0&size=20&sortBy=firstName&sortDirection=ASC; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/training/my-learning` | desktop | auth | rendered | FAIL | spinner after 10s: 1 |
| `/travel` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/travel/requests?page=0&size=10; console(2): Failed to load resource: the server responded with a status of 403 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/fluence/wiki/new`, `/reports/utilization`, `/settings/rbac`

Denied as expected (PASS-denied): `/admin/benefit-plans`, `/admin/roles`, `/expenses/approvals`, `/expenses/reports`, `/expenses/settings`, `/recruitment/job-boards`, `/reports/attrition`, `/reports/headcount`

Slowest: /training/my-learning 19s, /learning/paths 15s, /learning/paths 15s, /training/my-learning 15s, /projects/psa 11s
