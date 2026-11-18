# P1 route sweep - run NUAURA_TEST_P1_385218

- Commit: `f212ff78` · Browser: chromium 148.0.7778.96 / playwright 1.60.0 · FE http://localhost:3000 · BE http://localhost:8080 · 2026-11-18T18:59 -> 19:02
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

## manager (sumit@nulogic.io; roles SKIP_LEVEL_MANAGER, MANAGER, REPORTING_MANAGER; 110 permissions) - 22 loads

Verdicts: PASS=18, PASS-denied=2, FAIL=2

| failure class | page loads |
|---|---|
| console | 2 |
| authz | 1 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/settings/sso` | desktop | auth | redirect | FAIL | authz: 403 GET /api/v1/auth/saml/config; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/settings/sso` | mobile | auth | redirect | FAIL | console(1): Failed to load resource: the server responded with a status of 429 () |

Denied as expected (PASS-denied): `/offboarding/fnf`

Slowest: /expenses/advances 8s, /projects/psa/invoices 6s, /reports/headcount 6s, /fluence/analytics 5s, /travel 5s
