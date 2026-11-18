# P1 route sweep - run NUAURA_TEST_P1_539803

- Commit: `8bd65698` · Browser: chromium 148.0.7778.96 / playwright 1.60.0 · FE http://localhost:3000 · BE http://localhost:8080 · 2026-11-18T17:55 -> 18:42
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

## employee (arun@nulogic.io; roles EMPLOYEE; 82 permissions) - 498 loads

Verdicts: PASS=234, PASS-denied=181, REVIEW-denied=44, FAIL=38, FAIL-gate-missing=1

| failure class | page loads |
|---|---|
| authz | 38 |
| console | 32 |
| spinner | 4 |
| no | 4 |
| expected | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/departments` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/employees?page=0&size=500&sortBy=createdAt&sortDirection=DESC; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/advances` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/advances?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/mileage` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/mileage/pending-approvals?page=0&size=50; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/analytics` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=100&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/dashboard` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=3&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=20&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/learning/paths` | desktop | allow | rendered | FAIL | spinner after 10s: 1 |
| `/leave/calendar` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/leave-requests/status/APPROVED?page=0&size=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/letters` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/letters/templates/active; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 4 |
| `/letters` | mobile | allow | rendered | FAIL | authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 403 GET /api/v1/letters/templates/active; authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 4 |
| `/offboarding/fnf` | mobile | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/offboarding/[id]","anyPermission":["EXIT:VIEW","EXIT:MANAGE"]}) but screen rendered |
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

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/admin/employees`, `/app/hire`, `/contracts/new`, `/dashboards/employee`, `/fluence/wiki/new`, `/integrations`, `/integrations/slack`, `/leave/admin`, `/leave/team`, `/payroll`, `/payroll/payslips`, `/recruitment/agencies`, `/recruitment/jobs`, `/recruitment/pipeline`, `/reports/utilization`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`, `/settings/rbac`, `/statutory/filings`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/benefit-plans`, `/admin/budget`, `/admin/custom-fields`, `/admin/departments`, `/admin/feature-flags`, `/admin/holidays`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/leave-requests`, `/admin/leave-types`, `/admin/office-locations`, `/admin/org-hierarchy`, `/admin/payroll`, `/admin/permissions`, `/admin/profile`, `/admin/reports`, `/admin/roles`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/admin/users`, `/analytics`, `/analytics/org-health`, `/attendance/team`, `/biometric-devices`, `/compensation`, `/compliance`, `/contracts/templates`, `/dashboard`, `/dashboards/executive`, `/dashboards/manager`, `/employees`, `/employees/change-requests`, `/employees/directory`, `/employees/import`, `/executive`, `/expenses/approvals`, `/expenses/reports`, `/expenses/settings`, `/helpdesk/sla`, `/import-export`, `/leave/approvals`, `/letters/templates`, `/lwf`, `/nu-mail`, `/offboarding`, `/offboarding/dashboard`, `/offboarding/exit-interviews`, `/offboarding/fnf`, `/offboarding/settlements`, `/onboarding/new`, `/onboarding/templates`, `/overtime`, `/payments`, `/payments/config`, `/payroll/bulk-processing`, `/payroll/components`, `/payroll/runs`, `/payroll/salary-structures`, `/payroll/statutory`, `/performance/9box`, `/performance/calibration`, `/performance/pip`, `/preboarding`, `/predictive-analytics`, `/probation`, `/recruitment`, `/recruitment/candidates`, `/recruitment/career-page`, `/recruitment/interviews`, `/recruitment/job-boards`, `/reports`, `/reports/attrition`, `/reports/builder`, `/reports/headcount`, `/reports/leave`, `/reports/payroll`, `/reports/scheduled`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/statutory`, `/tax`, `/workflows`

Slowest: /offboarding/settlements 23s, /me/leaves 21s, /learning/paths 15s, /training/my-learning 15s, /me/leaves 15s
