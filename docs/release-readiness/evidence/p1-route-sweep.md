# P1 route sweep - run NUAURA_TEST_P1_193110

- Commit: `c0e2db9a` · Browser: chromium 148.0.7778.96 / playwright 1.60.0 · FE http://localhost:3000 · BE http://localhost:8080 · 2026-11-16T19:59 -> 20:17
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

Verdicts: PASS=205, PASS-denied=172, REVIEW-denied=44, FAIL=69, FAIL-gate-missing=5, PASS-redirected=1, FAIL-session-lost=2

| failure class | page loads |
|---|---|
| authz | 94 |
| console | 53 |
| no | 16 |
| expected | 5 |
| not-found | 4 |
| spinner | 4 |
| error | 2 |
| signed-in | 2 |
| failed-requests | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/auth/forgot-password` | desktop | public | rendered | FAIL | no heading |
| `/benefits` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits/plans/active; authz: 403 GET /api/v1/benefits-enhanced/dashboard; not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-e001-0000-0000-000000000009/active; console(6):  |
| `/calendar` | desktop | allow | rendered | FAIL | console(1): %o %s TypeError: events.forEach is not a function at groupEventsByDate (http://localhost:3000/_next/static/chunks/_0h30ti7alw2kr._.js:130:16 |
| `/company-spotlight` | desktop | auth | rendered | FAIL | no heading |
| `/departments` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/employees?page=0&size=500&sortBy=createdAt&sortDirection=DESC; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/advances` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/advances?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/approvals` | desktop | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/approvals","anyPermission":["EXPENSE:APPROVE","EXPENSE:MANAGE"]}) but screen rendered |
| `/expenses/mileage` | desktop | auth | rendered | FAIL | error: Error: page.evaluate: TypeError: Failed to execute 'createTreeWalker' on 'Document': parameter 1 is not of type 'Node'.; authz: 403 GET /api/v1/expenses/mileage/pending-approvals?page=0&size=50; authz: 403 GET /api/v1/expen |
| `/expenses/mileage` | mobile | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/mileage/pending-approvals?page=0&size=50; authz: 403 GET /api/v1/expenses/mileage/pending-approvals?page=0&size=50; authz: 403 GET /api/v1/expenses/mileage/pending-approvals?page=0&size=50; authz: 4 |
| `/expenses/reports` | desktop | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/reports","anyPermission":["EXPENSE:REPORT","EXPENSE:MANAGE"]}) but screen rendered |
| `/expenses/settings` | mobile | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/settings","anyPermission":["EXPENSE:SETTINGS","SYSTEM:ADMIN"]}) but screen rendered |
| `/features` | desktop | auth | rendered | FAIL | error: Error: page.evaluate: TypeError: Failed to execute 'createTreeWalker' on 'Document': parameter 1 is not of type 'Node'. |
| `/features` | mobile | auth | rendered | FAIL | no heading |
| `/feedback360` | desktop | allow | redirect | FAIL | console(35): Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING; failed-requests(31): GET http://localhost:3000/_next/static/chunks/node_modules_%40mantine_core_esm_1m-u56ul-0k1b._.js net::ERR_INCOMPLETE_CHUNKED_ENCODIN |
| `/fluence/analytics` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=100&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/dashboard` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=3&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/drive` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/fluence/attachments/recent; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=20&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates/new` | desktop | auth | rendered | FAIL | no heading |
| `/helpdesk` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/helpdesk/sla/dashboard; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/learning/paths` | desktop | allow | rendered | FAIL | spinner after 10s: 1 |
| `/leave/calendar` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/leave-requests/status/APPROVED?page=0&size=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/letters` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 403 GET /api/v1/letters/templates/active; console(6): Failed to load resource: the server responded with a status |
| `/letters` | mobile | allow | rendered | FAIL | authz: 403 GET /api/v1/letters/templates/active; authz: 403 GET /api/v1/recruitment/candidates?page=0&size=100; authz: 403 GET /api/v1/letters?page=0&size=20; console(6): Failed to load resource: the server responded with a status |
| `/letters/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/placeholders; authz: 403 GET /api/v1/letters/templates?page=0&size=20; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/me/documents` | desktop | allow | session-lost | FAIL-session-lost | signed-in user sent to /auth/login |
| `/onboarding` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/onboarding/processes?page=0&size=100; console(2): Failed to load resource: the server responded with a status of 403 (); no heading |
| `/performance/competency-matrix` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000009/skill-gaps; authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000009/skill-gaps; authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-00 |
| `/performance/revolution` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000009/skill-gaps; authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000009/skill-gaps; console(4): Failed to load resource: the server responded  |
| `/projects/psa` | desktop | allow | rendered | FAIL | no heading |
| `/projects/psa/invoices` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/psa/invoices/status/DRAFT; console(2): Failed to load resource: the server responded with a status of 403 (); no heading |
| `/projects/resource-conflicts` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/resource-management/conflicts/open; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/referrals` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/referrals?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/settings/security` | desktop | auth | rendered | FAIL | console(4): Failed to load resource: the server responded with a status of 429 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |
| `/shifts/swaps` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/shift-swaps/pending-approval; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-e001-0000-0000-000000000009?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/tax/declarations` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/tax-declarations?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/team-directory` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/employees?page=0&size=20&sortBy=firstName&sortDirection=ASC; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/training/my-learning` | desktop | auth | rendered | FAIL | spinner after 10s: 1 |
| `/travel` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/travel/requests?page=0&size=10; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/wellness/admin` | desktop | auth | rendered | FAIL | no heading |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/admin/employees`, `/app/hire`, `/contracts/new`, `/dashboards/employee`, `/fluence/wiki/new`, `/integrations`, `/integrations/slack`, `/leave/admin`, `/leave/team`, `/payroll`, `/payroll/payslips`, `/recruitment/agencies`, `/recruitment/jobs`, `/recruitment/pipeline`, `/reports/utilization`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`, `/settings/rbac`, `/statutory/filings`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/benefit-plans`, `/admin/budget`, `/admin/custom-fields`, `/admin/departments`, `/admin/feature-flags`, `/admin/holidays`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/leave-requests`, `/admin/leave-types`, `/admin/office-locations`, `/admin/org-hierarchy`, `/admin/payroll`, `/admin/permissions`, `/admin/profile`, `/admin/reports`, `/admin/roles`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/admin/users`, `/analytics`, `/analytics/org-health`, `/attendance/team`, `/biometric-devices`, `/compensation`, `/compliance`, `/contracts/templates`, `/dashboard`, `/dashboards/executive`, `/dashboards/manager`, `/employees`, `/employees/change-requests`, `/employees/directory`, `/employees/import`, `/executive`, `/helpdesk/sla`, `/import-export`, `/leave/approvals`, `/lwf`, `/nu-mail`, `/offboarding`, `/offboarding/dashboard`, `/offboarding/exit-interviews`, `/offboarding/fnf`, `/offboarding/settlements`, `/onboarding/new`, `/onboarding/templates`, `/overtime`, `/payments`, `/payments/config`, `/payroll/bulk-processing`, `/payroll/components`, `/payroll/runs`, `/payroll/salary-structures`, `/payroll/statutory`, `/performance/9box`, `/performance/calibration`, `/performance/pip`, `/preboarding`, `/predictive-analytics`, `/probation`, `/recruitment`, `/recruitment/candidates`, `/recruitment/interviews`, `/recruitment/job-boards`, `/reports`, `/reports/attrition`, `/reports/builder`, `/reports/headcount`, `/reports/leave`, `/reports/payroll`, `/reports/scheduled`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/statutory`, `/tax`, `/workflows`

Slowest: /expenses/approvals 153s, /expenses/settings 31s, /features 31s, /expenses/mileage 31s, /expenses/reports 30s

## manager (sumit@nulogic.io; roles SKIP_LEVEL_MANAGER, MANAGER, REPORTING_MANAGER; 107 permissions) - 498 loads

Verdicts: PASS=240, PASS-denied=154, REVIEW-denied=44, FAIL=54, FAIL-gate-missing=4, FAIL-session-lost=2

| failure class | page loads |
|---|---|
| authz | 46 |
| console | 37 |
| no | 21 |
| not-found | 4 |
| expected | 4 |
| failed-requests | 3 |
| signed-in | 2 |
| error | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/auth/forgot-password` | desktop | public | rendered | FAIL | no heading |
| `/benefits` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits/plans/active; not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-e001-0000-0000-000000000001/active; console(4): Failed to load resource: the server responded with a |
| `/calendar` | desktop | allow | rendered | FAIL | console(1): %o %s TypeError: events.forEach is not a function at groupEventsByDate (http://localhost:3000/_next/static/chunks/_0h30ti7alw2kr._.js:130:16 |
| `/company-spotlight` | desktop | auth | rendered | FAIL | no heading |
| `/expenses/advances` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/expenses/advances?page=0&size=20; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/expenses/approvals` | desktop | allow | rendered | FAIL | console(52): Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING; failed-requests(51): GET http://localhost:3000/expenses/approvals net::ERR_INCOMPLETE_CHUNKED_ENCODING; no heading |
| `/expenses/approvals` | mobile | allow | rendered | FAIL | failed-requests(2): GET http://localhost:3000/expenses/approvals net::ERR_ABORTED; no heading |
| `/expenses/mileage` | desktop | auth | rendered | FAIL | no heading |
| `/expenses/reports` | desktop | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/reports","anyPermission":["EXPENSE:REPORT","EXPENSE:MANAGE"]}) but screen rendered |
| `/expenses/settings` | desktop | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/settings","anyPermission":["EXPENSE:SETTINGS","SYSTEM:ADMIN"]}) but screen rendered |
| `/features` | desktop | auth | rendered | FAIL | error: Error: page.evaluate: TypeError: Failed to execute 'createTreeWalker' on 'Document': parameter 1 is not of type 'Node'. |
| `/features` | mobile | auth | rendered | FAIL | no heading |
| `/feedback360` | desktop | allow | redirect | FAIL | console(35): Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING; failed-requests(33): GET http://localhost:3000/_next/static/chunks/components_ui_0_b39bpr9pla6._.js net::ERR_INCOMPLETE_CHUNKED_ENCODING |
| `/fluence/analytics` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=100&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/dashboard` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=3&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/drive` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/fluence/attachments/recent; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/knowledge/templates?page=0&size=20&sortBy=usageCount&sortDirection=DESC; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates/new` | desktop | auth | rendered | FAIL | no heading |
| `/letters/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/templates?page=0&size=20; authz: 403 GET /api/v1/letters/placeholders; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/me/documents` | desktop | allow | session-lost | FAIL-session-lost | signed-in user sent to /auth/login |
| `/onboarding` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/onboarding/processes?page=0&size=100; console(2): Failed to load resource: the server responded with a status of 403 (); no heading |
| `/performance/competency-matrix` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000001/skill-gaps; authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000001/skill-gaps; authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-00 |
| `/performance/revolution` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000001/skill-gaps; authz: 403 GET /api/v1/lms/employees/48000000-e001-0000-0000-000000000001/skill-gaps; console(4): Failed to load resource: the server responded  |
| `/projects/psa` | desktop | allow | rendered | FAIL | no heading |
| `/projects/psa/invoices` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/psa/invoices/status/DRAFT; console(2): Failed to load resource: the server responded with a status of 403 (); no heading |
| `/reports/attrition` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/predictive-analytics/attrition/high-risk?minScore=50; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/reports/headcount` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/analytics/headcount-trend?months=12; authz: 403 GET /api/v1/analytics/employees; authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/employees; authz: 403 GET /api/v1/analytics/org- |
| `/reports/headcount` | mobile | allow | rendered | FAIL | authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/employees; authz: 403 GET /api/v1/analytics/headcount-trend?months=12; authz: 403 GET /api/v1/analytics/org-health; authz: 403 GET /api/v1/analytics/hea |
| `/reports/utilization` | desktop | allow | rendered | FAIL | no heading |
| `/settings/security` | mobile | auth | rendered | FAIL | console(4): Failed to load resource: the server responded with a status of 429 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-e001-0000-0000-000000000001?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/travel` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/travel/requests?page=0&size=10; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/wellness/admin` | desktop | auth | rendered | FAIL | no heading |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/admin/employees`, `/admin/leave-requests`, `/admin/reports`, `/app/hire`, `/contracts/new`, `/dashboards/employee`, `/fluence/wiki/new`, `/integrations`, `/integrations/slack`, `/payroll`, `/payroll/payslips`, `/recruitment/agencies`, `/recruitment/candidates`, `/recruitment/jobs`, `/recruitment/pipeline`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`, `/settings/rbac`, `/statutory/filings`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/benefit-plans`, `/admin/budget`, `/admin/custom-fields`, `/admin/departments`, `/admin/feature-flags`, `/admin/holidays`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/leave-types`, `/admin/office-locations`, `/admin/org-hierarchy`, `/admin/payroll`, `/admin/permissions`, `/admin/profile`, `/admin/roles`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/admin/users`, `/analytics`, `/analytics/org-health`, `/biometric-devices`, `/compensation`, `/compliance`, `/contracts/templates`, `/dashboard`, `/dashboards/executive`, `/documents`, `/employees/change-requests`, `/employees/import`, `/executive`, `/helpdesk`, `/helpdesk/sla`, `/helpdesk/tickets`, `/import-export`, `/learning/paths`, `/letters`, `/lwf`, `/nu-drive`, `/nu-mail`, `/offboarding`, `/offboarding/dashboard`, `/offboarding/exit-interviews`, `/offboarding/fnf`, `/offboarding/settlements`, `/onboarding/new`, `/onboarding/templates`, `/one-on-one`, `/overtime`, `/payments`, `/payments/config`, `/payroll/bulk-processing`, `/payroll/components`, `/payroll/runs`, `/payroll/salary-structures`, `/payroll/statutory`, `/performance/calibration`, `/performance/pip`, `/preboarding`, `/predictive-analytics`, `/probation`, `/recruitment`, `/recruitment/job-boards`, `/referrals`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/statutory`, `/tax`, `/tax/declarations`

Slowest: /expenses/approvals 153s, /expenses/settings 31s, /features 31s, /expenses/mileage 31s, /expenses/reports 31s

## hradmin (admin@nulogic.io; roles HR_ADMIN; 204 permissions) - 498 loads

Verdicts: PASS=363, PASS-denied=64, FAIL=43, REVIEW-denied=22, FAIL-gate-missing=4, FAIL-session-lost=2

| failure class | page loads |
|---|---|
| console | 28 |
| authz | 22 |
| no | 15 |
| not-found | 8 |
| expected | 4 |
| failed-requests | 3 |
| signed-in | 2 |
| error | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/admin/benefit-plans` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits/plans?page=0&size=100; console(2): Failed to load resource: the server responded with a status of 404 () |
| `/admin/roles` | desktop | allow | redirect | FAIL | authz: 403 GET /api/v1/permissions?pageable%5Bsize%5D=500; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/auth/forgot-password` | desktop | public | rendered | FAIL | no heading |
| `/benefits` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/benefits/plans/active; not-found: 404 GET /api/v1/benefits-enhanced/flex/allocations/employee/48000000-de00-0000-0000-000000000099/active; console(4): Failed to load resource: the server responded with a |
| `/calendar` | desktop | allow | rendered | FAIL | console(1): %o %s TypeError: events.forEach is not a function at groupEventsByDate (http://localhost:3000/_next/static/chunks/_0h30ti7alw2kr._.js:130:16 |
| `/company-spotlight` | desktop | auth | rendered | FAIL | no heading |
| `/expenses/approvals` | desktop | allow | rendered | FAIL | console(51): Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING; failed-requests(50): GET http://localhost:3000/expenses/approvals net::ERR_INCOMPLETE_CHUNKED_ENCODING; no heading |
| `/expenses/approvals` | mobile | allow | rendered | FAIL | failed-requests(3): GET http://localhost:3000/expenses/approvals net::ERR_ABORTED; no heading |
| `/expenses/mileage` | desktop | auth | rendered | FAIL | no heading |
| `/expenses/reports` | desktop | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/reports","anyPermission":["EXPENSE:REPORT","EXPENSE:MANAGE"]}) but screen rendered |
| `/expenses/settings` | desktop | deny | rendered | FAIL-gate-missing | expected deny ({"path":"/expenses/settings","anyPermission":["EXPENSE:SETTINGS","SYSTEM:ADMIN"]}) but screen rendered |
| `/features` | desktop | auth | rendered | FAIL | error: Error: page.evaluate: TypeError: Failed to execute 'createTreeWalker' on 'Document': parameter 1 is not of type 'Node'. |
| `/features` | mobile | auth | rendered | FAIL | no heading |
| `/feedback360` | desktop | allow | redirect | FAIL | console(35): Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING; failed-requests(31): GET http://localhost:3000/_next/static/chunks/lib_1absl533-m2so._.js net::ERR_INCOMPLETE_CHUNKED_ENCODING |
| `/fluence/drive` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/fluence/attachments/recent; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/fluence/templates/new` | desktop | auth | rendered | FAIL | no heading |
| `/fluence/wiki/new` | desktop | auth | rendered | FAIL | no heading |
| `/helpdesk` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/helpdesk/sla/dashboard; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/letters` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/letters/templates/active; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/letters/templates` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/placeholders; authz: 403 GET /api/v1/letters/templates?page=0&size=20; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/letters/templates` | mobile | auth | rendered | FAIL | authz: 403 GET /api/v1/letters/templates?page=0&size=20; authz: 403 GET /api/v1/letters/placeholders; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/me/documents` | desktop | allow | session-lost | FAIL-session-lost | signed-in user sent to /auth/login |
| `/recruitment/job-boards` | desktop | allow | rendered | FAIL | not-found: 404 GET /api/v1/recruitment/jobs?status=OPEN; console(2): Failed to load resource: the server responded with a status of 404 () |
| `/reports/attrition` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/predictive-analytics/attrition/high-risk?minScore=50; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/reports/utilization` | desktop | allow | rendered | FAIL | no heading |
| `/settings/rbac` | desktop | auth | redirect | FAIL | authz: 403 GET /api/v1/permissions?pageable%5Bsize%5D=500; console(2): Failed to load resource: the server responded with a status of 403 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | authz: 403 GET /api/v1/auth/saml/config; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-de00-0000-0000-000000000099?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/dashboards/employee`, `/dashboards/executive`, `/executive`, `/integrations`, `/integrations/slack`, `/learning/certificates`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/budget`, `/admin/custom-fields`, `/admin/feature-flags`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/permissions`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/compensation`, `/compliance`, `/contracts/templates`, `/documents`, `/employees/import`, `/helpdesk/sla`, `/import-export`, `/nu-drive`, `/nu-mail`, `/payments`, `/payments/config`, `/predictive-analytics`, `/referrals`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`

Slowest: /expenses/approvals 153s, /expenses/settings 31s, /expenses/mileage 31s, /features 31s, /expenses/reports 31s
