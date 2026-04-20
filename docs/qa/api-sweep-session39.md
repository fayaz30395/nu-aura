# API Sweep — Session 39 (2026-04-21)

**Pivot context:** Chrome extension was unavailable, so we ran an API-only sweep
against the backend instead of the planned browser-driven QA.

## Method
- Authenticated as Super Admin (fayaz.m@nulogic.io) — cookie-based JWT
- Extracted 224 real URLs from `frontend/lib/services/*.ts` via grep of `apiClient.*`
- Filtered to 80 GET-safe paths (excluded POST-only verbs: apply/reject/approve/import/etc)
- Fired each with 5s timeout, then re-ran 000-code results with 30s timeout

## Results (80 endpoints)
- **PASS: 58** — 200 response, valid payload
- **Slow but OK: 7** — return 200 if given more than 5s. Worth monitoring.
- **Expected non-200: 15**
  - 400 Missing Parameter: caller-side responsibility, not a bug (e.g. `/calendar/events/range` requires `startTime`)
  - 405 Method Not Allowed: POST-only endpoints I tested as GET (e.g. `/feedback`, `/benefits-enhanced/claims`)
  - 404 `/auth/saml/metadata`: SAML not configured in dev (expected)

## Slow endpoints to investigate

| Endpoint | Latency | Response size | Concern |
|---|---|---|---|
| `/dashboards/manager` | **28s** | 8 KB | Extremely slow — likely N+1 or missing cache |
| `/departments/hierarchy` | 17s | 7.6 KB | Tree-build with per-node queries? |
| `/departments` | 14s | 7.9 KB | Repeat of hierarchy load? |
| `/dashboards/employee` | 9s | 7.4 KB | Borderline |
| `/dashboards/executive` | 8s | 6.5 KB | Borderline |
| `/admin/users` | 7s | **189 KB** | Payload too large — no pagination |
| `/departments/active` | 1s | 7.6 KB | OK |

## Recommended next steps
1. Profile `/dashboards/manager` — check `ManagerDashboardService.java` (572 lines) for N+1 patterns, add `@Cacheable`
2. Add pagination to `/admin/users` — returning 189 KB as a single response is a scaling risk
3. Cache `/departments/hierarchy` — hierarchy is rarely changed; fits the 15-min tier
4. Re-run this sweep as other roles (Employee, Team Lead, HR Admin) to validate RBAC — couldn't complete without Chrome

## Endpoints passing in <5s (58)
Listed in `/tmp/api-sweep2.log` on the test host. Module coverage:
announcements, analytics, calendar, compliance, compensation, contracts,
expenses, fluence, helpdesk, letters, payroll, recruitment, settings,
surveys, time-tracking, travel, wall — all return 200.
