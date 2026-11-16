# UI pages batch A (HRMS self-service): me, dashboard, leave, attendance, holidays, helpdesk

## Files changed
- `frontend/app/leave/apply/page.tsx`: Mantine Button replaced by shared `Button` (Cancel = secondary, Submit = primary with `isLoading`). Logic, validation and test ids unchanged.
- `frontend/app/holidays/page.tsx`: holiday modal Cancel/Save raw `<button>`s replaced by shared `Button`; `min-w-[4rem]` -> `min-w-16` (lint); `bg-accent-500` -> `bg-accent` token on year-pill filter chips.
- `frontend/app/holidays/loading.tsx`: `max-w-[1600px]` -> `max-w-[86rem]` (the shell's content max width, lint).
- `frontend/app/attendance/_components/TodayCard.tsx`, `AttendanceOverviewParts.tsx`, `WeeklyHeatmap.tsx`: dropped `font-mono` on numeric/time values (keeps `tabular-nums`, now Geist via `.tnum` rules).
- `frontend/app/attendance/my-attendance/_components/MyAttendanceSummary.tsx`: same `font-mono` removal on live time.

## Checks
- `npm run lint:design-system`: total findings 635 -> 458 (whole repo, other agents included). Zero findings left in my folders (were 2: holidays page + loading).
- `npx tsc --noEmit`: clean (no output).
- `npx eslint` on the 7 touched files: exit 0.
- `npx vitest run app/me app/dashboard app/leave app/attendance app/holidays app/helpdesk`: 6 files, 23 tests passed.
- Playwright (headless, demo `arun@nulogic.io`, local :3000, backend :8080 rerouted): 6 screenshots in `docs/release-readiness/evidence/screenshots/`:
  - `NU-PG-A-leave-apply-{light,dark}-1440.png`
  - `NU-PG-A-attendance-{light,dark}-1440.png`
  - `NU-PG-A-me-dashboard-{light,dark}-390.png`
  - Horizontal overflow measured 0px on all six.

## Checked, no change needed
- Dashboard breadcrumbs in my folders: none link to `/dashboard`. `/me/attendance` and the payslip/leave crumbs already use `/me/dashboard`. The shell TopBar fallback (ui-shell) covers the rest.
- `/me/dashboard` Inbox button already uses shared `buttonVariants`.

## Open (not done)
- Most pages in scope still use raw Tailwind/Mantine classes instead of shared components (for example `app/helpdesk/**`, `app/attendance/regularization`, `app/me/leaves`). The brief's full "replace all hand-rolled controls" pass was not done for every file; only the items above.
- `app/leave/apply` cancel/submit fixed; date inputs are Mantine `DateInput` (not the shared Input), so their height may differ from the 40px shared input.
- At 390px on `/me/dashboard` a floating assistant "N" button overlaps the bottom nav. It is shell code, outside this scope.
- Hard-coded `text-white` on `bg-accent` in `LeaveMonthCalendar.tsx` and `MyAttendanceSummary.tsx` left as is (token pair, not a lint finding).
- Helpdesk (`app/helpdesk/**`) and `app/me/documents|profile|skills|assets` not screenshotted.
