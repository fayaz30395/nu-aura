Q-001 | FIXED | frontend/app/admin/payroll/page.tsx | QueryErrorCard + retry on runs/structures, KPIs show "—" on error
Q-002 | FIXED | frontend/app/announcements/page.tsx | error card with retry instead of empty state
Q-003 | FIXED | frontend/app/assets/page.tsx | error card with retry instead of empty state; total uses ?? 0 (KPI zeros not changed)
Q-004 | FIXED | frontend/app/admin/office-locations/page.tsx | error card with retry
Q-005 | FIXED | frontend/app/admin/holidays/page.tsx | raw axios message removed, error card with retry
Q-006 | SKIPPED | none | file is under recruitment/, which the brief excludes
Q-007 | FIXED | frontend/app/departments/page.tsx | error card with retry
Q-008 | FIXED | frontend/app/timesheets/page.tsx | error card with retry when query fails and no data
Q-009 | SKIPPED | none | not in assigned scope beyond payroll admin page; /admin/employees and /payroll untouched
Q-010 | FIXED | frontend/lib/queryClient.ts, frontend/lib/hooks/queries/useExpenses.ts | global retryDelay 500ms; expenses backoff cap 10s to 3s. Not measured live.
Backend | NO CAUSE FOUND | none | evidence says 500 was forced by the test harness ("force 500 on /api/v1/*"), so no backend defect to fix
