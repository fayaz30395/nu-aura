# P1 route sweep - run NUAURA_TEST_P1_385218

- Commit: `f212ff78` · Browser: chromium 148.0.7778.96 / playwright 1.60.0 · FE http://localhost:3000 · BE http://localhost:8080 · 2026-11-18T18:59 -> 19:04
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

## employee (arun@nulogic.io; roles EMPLOYEE; 82 permissions) - 40 loads

Verdicts: PASS=30, FAIL=6, PASS-denied=2, REVIEW-denied=2

| failure class | page loads |
|---|---|
| spinner | 4 |
| authz | 2 |
| console | 2 |

| route | vp | expected | observed | verdict | detail |
|---|---|---|---|---|---|
| `/learning/paths` | desktop | allow | rendered | FAIL | spinner after 10s: 1 |
| `/settings/sso` | desktop | auth | redirect | FAIL | authz: 403 GET /api/v1/auth/saml/config; console(1): Failed to load resource: the server responded with a status of 403 () |
| `/training/my-learning` | desktop | auth | rendered | FAIL | spinner after 10s: 1 |

REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): `/projects/resource-conflicts`

Denied as expected (PASS-denied): `/offboarding/fnf`

Slowest: /learning/paths 16s, /training/my-learning 15s, /learning/paths 15s, /training/my-learning 15s, /departments 9s
