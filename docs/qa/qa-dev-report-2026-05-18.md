# NU-AURA UI Readiness Sweep - 2026-05-18

## Verdict

Not ready for broad user start yet.

The application boots, backend health is up, frontend serves successfully, many authenticated routes render, and several core flows work. Blocking issues remain in unauthenticated route protection, manual login validation, My Space self-service coverage, app-switcher routing, employee list/detail journey, goals/helpdesk route stability, and page latency.

## Environment Checked

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:3000`
- Backend health: `UP`
- Frontend root: `200 OK`
- Redis health: `UP`
- PostgreSQL health: `UP`, with warning: database health response time around `441-464ms`
- Docker: unavailable in this local session; Docker daemon socket was not reachable

## Static Gates

| Gate | Result | Notes |
| --- | --- | --- |
| `mvn -pl backend -DskipTests compile` | Passed | Backend compiled |
| `cd frontend && npx tsc --noEmit` | Passed | TypeScript passed |
| `cd frontend && npm run lint` | Passed with warnings | `attendance/page.tsx` unused `weekStats`; `expenses/page.tsx` unstable `useMemo` dependencies |

## Working

| Area | Evidence |
| --- | --- |
| Backend startup and health | Actuator health returned `UP` for app, database, Redis, readiness, liveness, webhook |
| Frontend startup and headers | Root returned `200 OK` with security headers and CSP |
| Demo-account authentication | SuperAdmin, HR Manager, Manager, Employee, Recruitment Admin, Team Lead demo login paths passed in the broad auth run before route failures dominated |
| Login/dashboard/sign-out journey | `e2e/generated/critical-journeys.spec.ts` passed |
| Attendance critical journey | `attendance page renders today widget` passed |
| Leave critical journey | `leave page shows balance or apply CTA` passed |
| Approvals critical journey | `approvals inbox loads` passed |
| HRMS entry point | `NU-HRMS entry point loads from app switcher` passed |
| Employee create form access | `HRMS CRUD - Can open employee creation form` passed |
| Recruitment dashboard/jobs page | `Recruitment dashboard / jobs list renders` passed |
| Recruitment job creation entry | `NU-Hire CRUD - Can open job posting creation form` passed |
| Performance dashboard | `Performance dashboard renders` passed |
| App switcher visibility | Button visible and all 4 sub-apps displayed |
| Many authenticated routes | Admin, analytics, approvals, assets, attendance, calendar, compensation, contracts, employees, dashboards, expenses, and Fluence routes rendered before the route-smoke sweep hit blockers |

## Not Working / Blocking

| Severity | Area | Evidence | Impact |
| --- | --- | --- | --- |
| Blocker | Anonymous route protection | Auth suite showed unauthenticated access to routes like `/dashboard`, `/employees`, `/leave`, `/recruitment`, `/performance`, `/admin` did not reliably redirect to login | Protected HRMS areas can expose app shells or stale content to anonymous users |
| Blocker | Manual login form validation/error UX | Login form element, invalid credential, empty form, and malformed email checks failed or timed out | Non-demo login path is not ready for users |
| Blocker | My Space self-service | Earlier role matrix showed broad `/me/*` access failures; focused run showed `/me/attendance` renders heading/URL but fails console-clean and "Today's Status" card checks | Self-service area is not dependable across roles |
| Blocker | Helpdesk routes | `/helpdesk`, `/helpdesk/knowledge-base`, `/helpdesk/sla` hung/fail in route-smoke | Helpdesk cannot be marked user-ready |
| Blocker | Goals route | `/goals` hung/fail in route-smoke; `/performance/goals` critical creation test timed out | Performance/OKR goal creation is not ready |
| High | App-switcher deep routing | NU-Hire and NU-Grow entry-point checks failed because final URL was not `/app/hire`, `/recruitment`, `/app/grow`, or `/performance` | Users may not land in the intended sub-app from switcher entry points |
| High | Employee list/detail journey | `navigate employees list and open detail` failed after about 90s | Employee browsing is not reliably ready despite route shell rendering |
| High | Cross-app auth preservation | `Navigating HRMS -> Hire -> Grow preserves authentication` timed out on `/employees` navigation | User movement across modules is fragile under load |
| High | HRMS dashboard content assertion | `/me/dashboard` loaded the authenticated shell/sidebar but no visible `h1`/`h2` appeared within 10s | Dashboard content readiness is inconsistent |
| High | Performance | Many route checks took 20-34s; some module tests took 1-2 minutes | User-perceived startup/navigation latency is too high for normal work |
| Medium | Browser test environment | Firefox executable is missing locally | Full cross-browser readiness cannot be claimed |

## Commands Run

```bash
curl http://localhost:8080/actuator/health
curl -I http://localhost:3000
mvn -pl backend -DskipTests compile
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npx playwright test e2e/generated/route-smoke.spec.ts --project=chromium --workers=4 --retries=0 --reporter=list,json
cd frontend && npx playwright test e2e/generated/critical-journeys.spec.ts e2e/sub-app-smoke.spec.ts e2e/my-space.spec.ts --project=chromium --workers=2 --retries=0 --reporter=list,json
cd frontend && npx playwright test e2e/sub-app-smoke.spec.ts --project=chromium --workers=2 --retries=0 --grep @critical --reporter=list
```

## Recommended Fix Order

1. Fix auth boundary behavior: anonymous redirects, logout/session invalidation, and manual email/password validation.
2. Fix My Space access and `/me/attendance` content/console errors for all roles.
3. Fix route hangs for `/goals`, `/performance/goals`, and helpdesk routes.
4. Fix app-switcher entry routing for NU-Hire and NU-Grow.
5. Stabilize employee list/detail navigation.
6. Investigate slow backend/database responses and route hydration latency.
7. Install missing Firefox Playwright browser before claiming cross-browser readiness.
