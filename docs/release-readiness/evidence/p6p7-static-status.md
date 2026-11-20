Static code reading only; nothing was run. Verify UNCLEAR and STILL OPEN rows in the browser.

Base: current main (HEAD `54110ec1`). Fix commits examined: `d10bc9b9`, `16d80143`, `e0840b21`, `c9ee9e54`, `818a7405`, `495e9fe0`, `8bd65698`, `df64a0f9`, `d7241e6e`, `a18a956b`, `0b2a37e6`, `1aaeeb6e`. Paths are under `frontend/` or `backend/src/main/java/com/nulogic/` as written.

## P6 (Q-001 to Q-028)

| ID | Verdict | Evidence | Reason |
|---|---|---|---|
| Q-001 | FIXED | `app/admin/payroll/page.tsx:205-206`, `16d80143` | `runsError && !runsPage` renders `QueryErrorCard` with retry instead of the empty state. |
| Q-002 | FIXED | `app/announcements/page.tsx:409-410` | `activeError && !activeData` renders `QueryErrorCard`. |
| Q-003 | FIXED | `app/assets/page.tsx:769-770` | Error branch precedes the "No Assets Found" empty state. |
| Q-004 | FIXED | `app/admin/office-locations/page.tsx:401-402` | `isError` renders `QueryErrorCard`. |
| Q-005 | FIXED | `app/admin/holidays/page.tsx:316-317` | Query failure renders `QueryErrorCard`; `uiError` is only set by mutations. |
| Q-006 | FIXED | `app/recruitment/candidates/page.tsx:693-694` | `emptyState` is `QueryErrorCard` when the query failed. |
| Q-007 | FIXED | `app/departments/page.tsx:399-402` | `isDeptError && !deptData` renders `QueryErrorCard`. |
| Q-008 | FIXED | `app/timesheets/page.tsx:297-300` | Query error with no data renders `QueryErrorCard`. |
| Q-009 | FIXED | `16d80143` (`app/admin/employees/page.tsx`, `app/payroll/page.tsx`) | KPIs show an em dash on error; payroll header says "Payroll data unavailable". |
| Q-010 | FIXED | `lib/queryClient.ts:49-56` | Retry delay is now 500 ms and 4xx is not retried, so the error shows in seconds. |
| Q-011 | FIXED | `16d80143`, `app/admin/departments/page.tsx` | Card changed from `overflow-hidden` to `overflow-x-auto`; table scrolls. |
| Q-012 | FIXED | `16d80143`, `app/tax/declarations/page.tsx` | Table wrapped in `Table.ScrollContainer minWidth={640}`. |
| Q-013 | UNCLEAR | `16d80143`, `app/projects/calendar/page.tsx` | Wrap and `overflow-x-auto`/`min-w-[640px]` added; left-panel clipping at 390/768 needs a viewport check. |
| Q-014 | UNCLEAR | `16d80143` (`expenses`, `analytics/org-health`, `onboarding`) | Flex-wrap and `minmax(0,1fr)` tweaks only; the shell clip at 768 needs a visual check. |
| Q-015 | UNCLEAR | `16d80143` (`reports`, `workflows`, `learning/paths`) | Three of four routes got overflow fixes; `/recruitment/candidates` filter tiles untouched; needs a viewport check. |
| Q-016 | FIXED | `app/admin/holidays/page.tsx:13,416` | Add/Edit Holiday now uses Mantine `Modal` (dialog role, focus trap). |
| Q-017 | UNCLEAR | `components/ui/Card.tsx`, `components/ui/EmptyState.tsx` (h3 to h2) | Card and empty-state titles fixed, but raw `<h3>` remains after `<h1>` in `recognition/page.tsx:519,623,681`, `reports/scheduled/page.tsx:350`; needs axe. |
| Q-018 | UNCLEAR | `components/layout/shell/ShellFrame.tsx:226`, `app/admin/AdminLayoutInner.tsx:405` | No commit addresses it; admin layout still has its own `<main>`; cause on the other routes not found by reading. |
| Q-019 | UNCLEAR | `16d80143` (`aria-controls={undefined}` on Tabs.Tab in okr, pip, regularization) | Workaround added; whether Mantine honours the override needs axe. |
| Q-020 | FIXED | `app/helpdesk/tickets/page.tsx:312`, `components/payroll/BulkProcessingWizard.tsx:334,556`, `app/projects/gantt/page.tsx:368` | All three regions have `tabIndex={0} role="region"` and a label. |
| Q-021 | FIXED | `app/projects/gantt/page.tsx:322,341`, `app/projects/calendar/page.tsx:458-598,657`, `app/offboarding/fnf/page.tsx:302,317` | Icon buttons all carry `aria-label`. |
| Q-022 | FIXED | `16d80143`, `c9ee9e54` (`surveys`, `recruitment/pipeline`, `onboarding/templates`, `preboarding`, `offboarding/fnf`) | `aria-label` or `<label htmlFor>` added to each named control. |
| Q-023 | UNCLEAR | `tailwind.config.js:203` | No commit changed the accent-500 or link colour; contrast needs measuring. |
| Q-024 | UNCLEAR | `16d80143` (`admin/leave-requests`, `admin/leave-types`) | success/warning links moved to 700; `text-accent-700` links untouched; hover contrast needs measuring. |
| Q-025 | FIXED | `16d80143` (`admin/org-hierarchy/page.tsx`, `reports/page.tsx`) | Nested focusable button replaced by `aria-hidden` span; report-card kebab button removed. |
| Q-026 | UNCLEAR | `16d80143`, `components/dashboard/HolidayCarousel.tsx` | Carousel dots now 24 px hit area; the other small targets at 390 were not addressed or checked. |
| Q-027 | UNCLEAR | none | No dark-mode commit for these surfaces; the report itself says it may be an accent tint. |
| Q-028 | UNCLEAR | `818a7405`, `components/layout/shell/ShellFrame.tsx` | `document.title` is set from the active nav label; whether each Reports/Projects/Offboarding route has its own nav item needs a browser. |

## P7 (S-001 to S-006)

| ID | Verdict | Evidence | Reason |
|---|---|---|---|
| S-001 | FIXED | `api/employee/EmployeeController.java:321-334`, `api/employee/dto/EmployeeMinimalResponse.java`, `8bd65698` | `/employees/managers` returns the minimal DTO (id, code, name, designation, department, workEmail). |
| S-002 | ACCEPTED | `EmployeeController.java` `canViewFullProfile`, `EmployeeControllerTest` (`8bd65698`) | Detail is scoped by role; unit test passes; remainder accepted per instructions. |
| S-003 | FIXED | `frontend/next.config.js:12` | `poweredByHeader: false` (added in `16d80143`). |
| S-004 | FIXED | `common/exception/GlobalExceptionHandler.java:96` | Handler timestamps are UTC (`LocalDateTime.now(ZoneOffset.UTC)`); 403 uses `Instant.now()` (UTC, with `Z`). One zone now; the `Z` suffix still differs. |
| S-005 | FIXED | `8bd65698`, `common/config/SecurityConfig.java:212-219` | `DevSecurityConfig` deleted; actuator needs the scrape token or SUPER_ADMIN, only `/actuator/health` is public. |
| S-006 | FIXED | `8bd65698`, `common/config/SecurityConfig.java:222-223` | Swagger/api-docs require SUPER_ADMIN; the dev permit-all chain is gone. |

## UI-001 to UI-013

| ID | Verdict | Evidence | Reason |
|---|---|---|---|
| UI-001 | FIXED | `d10bc9b9`, `app/attendance/regularization/_components/WorkRequestsPanel.tsx` | Reason value read before the state updater runs (the null `currentTarget` cause). |
| UI-002 | STILL OPEN | `app/timesheets/page.tsx:471,745` ("Unknown Project" fallback kept); `75528a8b` predates the bug | Project list now comes from `/psa/projects`, but no commit seeds `psa_projects` or guards dangling ids; the demo data gap remains unless the DB changed. |
| UI-003 | FIXED | `d10bc9b9`, `a18a956b`; live-verified (HR create 201) | Backend permission aligned with the FE gate; list refreshes after create. |
| UI-004 | UNCLEAR | `d10bc9b9`, `app/me/documents/page.tsx:37-40` | Redirect now needs `!isAuthenticated && !user`; correct only if `isAuthenticated` is true at hydration, which needs a browser. |
| UI-005 | FIXED | `d10bc9b9`, `lib/services/hrms/calendar.service.ts` | Service unwraps `data`/`content` and always returns an array, so `events.forEach` is safe. |
| UI-006 | FIXED | `lib/services/hrms/benefits.service.ts:126-142`, `app/recruitment/job-boards/page.tsx:105`, `lib/hooks/queries/useResources.ts:204` | Benefits reads use `/benefits-enhanced`; job boards use `/recruitment/job-openings/status/OPEN` (exists in `RecruitmentController.java:56`); workload history is disabled for an empty id; benefits dashboard is permission-gated. |
| UI-007 | STILL OPEN | `app/reports/attrition/page.tsx:46-49`, `app/settings/sso/page.tsx:76`, `app/travel/page.tsx` | Most rows are now gated (letters, tasks, drive, helpdesk SLA, fluence, departments, skill gaps, V351 grants). Attrition and SSO still make the denied call; travel hides own requests behind `TRAVEL:VIEW_ALL`. Correction by orchestrator: the `/travel` part is already handled, `useTravelRequests` (`lib/hooks/queries/useTravel.ts:37-51`) falls back to the caller's own requests without TRAVEL:VIEW_ALL. Remaining: `/reports/attrition` and `/settings/sso` denied calls (Low, accepted for sso) |
| UI-008 | FIXED | `d10bc9b9`, `app/timesheets/page.tsx` `handleAddEntry` | Falls back to the current-week timesheet when none is selected. |
| UI-009 | FIXED | `d10bc9b9`, `lib/hooks/queries/useTimesheets.ts:91` | Submit invalidates `timesheetKeys.all`, which covers the employee list the badge reads. |
| UI-010 | FIXED | `d10bc9b9`, `lib/hooks/queries/useWall.ts:189` | Invalidation key `[...comments, postId]` now prefixes the real `commentList` key. |
| UI-011 | FIXED | `16d80143`, `components/custom-fields/CustomFieldsSection.tsx` | Section renders nothing without `CUSTOM_FIELD:VIEW`, so no 403 call. |
| UI-012 | FIXED | `components/ui/Card.tsx`, `components/ui/EmptyState.tsx` (h2), `fluence/templates/new` and `wiki/new` (sr-only h1), `app/projects/psa/page.tsx` (`PageDeniedFallback`) | All six listed routes now render a heading in the state the check saw. |
| UI-013 | STILL OPEN | `app/page.tsx:12-16`, `app/auth/login/page.tsx:371-381` | `/` always redirects to login, and login deliberately clears existing client auth; no commit changed this. Likely a product decision. |

## Counts

FIXED 31, UNCLEAR 12, STILL OPEN 3, ACCEPTED 1 (total 47).
STILL OPEN: UI-002, UI-007, UI-013.
