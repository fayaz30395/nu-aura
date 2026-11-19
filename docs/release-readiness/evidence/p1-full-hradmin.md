# P1 route sweep - run NUAURA_TEST_P1_580001

- Commit: `d7241e6e` · Browser: chromium 148.0.7778.96 / playwright 1.60.0 · FE http://localhost:3001 · BE http://localhost:8080 · 2026-11-19T22:49 -> 23:33
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

Verdicts: PASS=266, PASS-denied=182, REVIEW-denied=46, FAIL=4

| failure class | page loads |
|---|---|
| console | 4 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/settings/security` | desktop | auth | rendered | FAIL | console(4): Failed to load resource: the server responded with a status of 429 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/admin/employees`, `/app/hire`, `/contracts/new`, `/dashboards/employee`, `/fluence/wiki/new`, `/integrations`, `/integrations/slack`, `/leave/admin`, `/leave/team`, `/payroll`, `/payroll/payslips`, `/projects/resource-conflicts`, `/recruitment/agencies`, `/recruitment/jobs`, `/recruitment/pipeline`, `/reports/utilization`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`, `/settings/rbac`, `/statutory/filings`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/benefit-plans`, `/admin/budget`, `/admin/custom-fields`, `/admin/departments`, `/admin/feature-flags`, `/admin/holidays`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/leave-requests`, `/admin/leave-types`, `/admin/office-locations`, `/admin/org-hierarchy`, `/admin/payroll`, `/admin/permissions`, `/admin/profile`, `/admin/reports`, `/admin/roles`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/admin/users`, `/analytics`, `/analytics/org-health`, `/attendance/team`, `/biometric-devices`, `/compensation`, `/compliance`, `/contracts/templates`, `/dashboard`, `/dashboards/executive`, `/dashboards/manager`, `/employees`, `/employees/change-requests`, `/employees/directory`, `/employees/import`, `/executive`, `/expenses/approvals`, `/expenses/reports`, `/expenses/settings`, `/helpdesk/sla`, `/import-export`, `/leave/approvals`, `/letters/templates`, `/lwf`, `/nu-mail`, `/offboarding`, `/offboarding/dashboard`, `/offboarding/exit-interviews`, `/offboarding/fnf`, `/offboarding/settlements`, `/onboarding/new`, `/onboarding/templates`, `/overtime`, `/payments`, `/payments/config`, `/payroll/bulk-processing`, `/payroll/components`, `/payroll/runs`, `/payroll/salary-structures`, `/payroll/statutory`, `/performance/9box`, `/performance/calibration`, `/performance/pip`, `/preboarding`, `/predictive-analytics`, `/probation`, `/recruitment`, `/recruitment/candidates`, `/recruitment/career-page`, `/recruitment/interviews`, `/recruitment/job-boards`, `/reports`, `/reports/attrition`, `/reports/builder`, `/reports/headcount`, `/reports/leave`, `/reports/payroll`, `/reports/scheduled`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/statutory`, `/tax`, `/workflows`

Slowest: /learning/paths 16s, /training/my-learning 15s, /training/my-learning 15s, /me/leaves 15s, /learning/paths 15s

## hradmin (admin@nulogic.io; roles HR_ADMIN; 207 permissions) - 498 loads

Verdicts: PASS=406, PASS-denied=70, REVIEW-denied=20, FAIL=2

| failure class | page loads |
|---|---|
| console | 2 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/dashboards/employee`, `/dashboards/executive`, `/executive`, `/integrations`, `/integrations/slack`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/budget`, `/admin/custom-fields`, `/admin/feature-flags`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/permissions`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/compensation`, `/compliance`, `/contracts/templates`, `/documents`, `/employees/import`, `/expenses/reports`, `/expenses/settings`, `/helpdesk/sla`, `/import-export`, `/nu-drive`, `/nu-mail`, `/payments`, `/payments/config`, `/predictive-analytics`, `/referrals`, `/reports/attrition`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`

Slowest: /admin/departments 7s, /admin 7s, /admin/profile 7s, /admin/leave-types 6s, /admin/leave-requests 6s

## manager (sumit@nulogic.io; roles SKIP_LEVEL_MANAGER, MANAGER, REPORTING_MANAGER; 110 permissions) - 498 loads

Verdicts: PASS=292, PASS-denied=160, REVIEW-denied=44, FAIL=2

| failure class | page loads |
|---|---|
| console | 2 |
| authz | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/settings/sso` | desktop | auth | redirect | FAIL | authz: 403 GET /api/v1/auth/saml/config; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/settings/sso` | mobile | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/admin/employees`, `/admin/leave-requests`, `/admin/reports`, `/app/hire`, `/contracts/new`, `/dashboards/employee`, `/fluence/wiki/new`, `/integrations`, `/integrations/slack`, `/payroll`, `/payroll/payslips`, `/recruitment/agencies`, `/recruitment/candidates`, `/recruitment/jobs`, `/recruitment/pipeline`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`, `/settings/rbac`, `/statutory/filings`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/benefit-plans`, `/admin/budget`, `/admin/custom-fields`, `/admin/departments`, `/admin/feature-flags`, `/admin/holidays`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/leave-types`, `/admin/office-locations`, `/admin/org-hierarchy`, `/admin/payroll`, `/admin/permissions`, `/admin/profile`, `/admin/roles`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/admin/users`, `/analytics`, `/analytics/org-health`, `/biometric-devices`, `/compensation`, `/compliance`, `/contracts/templates`, `/dashboard`, `/dashboards/executive`, `/documents`, `/employees/change-requests`, `/employees/import`, `/executive`, `/expenses/reports`, `/expenses/settings`, `/helpdesk`, `/helpdesk/sla`, `/helpdesk/tickets`, `/import-export`, `/letters`, `/letters/templates`, `/lwf`, `/nu-drive`, `/nu-mail`, `/offboarding`, `/offboarding/dashboard`, `/offboarding/exit-interviews`, `/offboarding/fnf`, `/offboarding/settlements`, `/onboarding/new`, `/onboarding/templates`, `/overtime`, `/payments`, `/payments/config`, `/payroll/bulk-processing`, `/payroll/components`, `/payroll/runs`, `/payroll/salary-structures`, `/payroll/statutory`, `/performance/calibration`, `/performance/pip`, `/preboarding`, `/predictive-analytics`, `/probation`, `/recruitment`, `/recruitment/career-page`, `/recruitment/job-boards`, `/referrals`, `/reports/attrition`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`, `/statutory`, `/tax`, `/tax/declarations`

Slowest: /departments 7s, /admin/reports 6s, /analytics 6s, /shifts/my-schedule 6s, /admin/departments 6s
