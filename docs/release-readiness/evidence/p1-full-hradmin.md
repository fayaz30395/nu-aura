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

## hradmin (admin@nulogic.io; roles HR_ADMIN; 205 permissions) - 498 loads

Verdicts: PASS=397, PASS-denied=72, FAIL=9, REVIEW-denied=20

| failure class | page loads |
|---|---|
| console | 8 |
| authz | 6 |
| no | 2 |
| failed-requests | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/admin/profile` | desktop | allow | rendered | FAIL | no heading |
| `/letters` | desktop | allow | rendered | FAIL | authz: 403 GET /api/v1/letters?page=0&size=20; authz: 403 GET /api/v1/letters/templates/active; console(4): Failed to load resource: the server responded with a status of 403 () |
| `/offboarding/fnf` | mobile | allow | rendered | FAIL | console(36): Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING; failed-requests(35): GET http://localhost:3000/_next/static/chunks/node_modules_next_dist_05y3oi5z9mc_3._.js net::ERR_INCOMPLETE_CHUNKED_ENCODING; no head |
| `/settings/security` | mobile | auth | rendered | FAIL | console(4): Failed to load resource: the server responded with a status of 429 () |
| `/settings/sso` | desktop | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |
| `/tasks` | desktop | auth | rendered | FAIL | authz: 403 GET /api/v1/pm/tasks/assignee/48000000-de00-0000-0000-000000000099?pageable%5Bpage%5D=0&pageable%5Bsize%5D=100; console(2): Failed to load resource: the server responded with a status of 403 () |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/dashboards/employee`, `/dashboards/executive`, `/executive`, `/integrations`, `/integrations/slack`, `/resources`, `/resources/availability`, `/resources/pool`, `/resources/workload`, `/security`

Denied as expected (PASS-denied): `/admin`, `/admin/audit`, `/admin/budget`, `/admin/custom-fields`, `/admin/feature-flags`, `/admin/implicit-roles`, `/admin/import-keka`, `/admin/integrations`, `/admin/integrations/webhooks`, `/admin/permissions`, `/admin/settings`, `/admin/shifts`, `/admin/system`, `/compensation`, `/compliance`, `/contracts/templates`, `/documents`, `/employees/import`, `/expenses/reports`, `/expenses/settings`, `/helpdesk/sla`, `/import-export`, `/letters/templates`, `/nu-drive`, `/nu-mail`, `/payments`, `/payments/config`, `/predictive-analytics`, `/referrals`, `/reports/attrition`, `/resources/approvals`, `/resources/capacity`, `/settings/security/api-keys`, `/shifts`, `/shifts/definitions`, `/shifts/patterns`

Slowest: /offboarding/settlements 23s, /me/leaves 11s, /fluence/my-content 10s, /me/skills 10s, /leave/admin 10s
