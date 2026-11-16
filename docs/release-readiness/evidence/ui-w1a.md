# UI Wave 1 batch A (W1-01, W1-02, W1-03)

- W1-01 done: `formatDate` in `app/payroll/_components/types.ts` now passes the string straight to `formatDateCanonical` (no `new Date` re-wrap); null/undefined return `''`. Test `types.test.ts` passes (2/2, TZ=America/Sao_Paulo).
- W1-02 skipped: needs a backend DTO decision (plan D3); not implemented.
- W1-03 done: `getToday()` added to `lib/services/hrms/attendance.service.ts`, `useTodayAttendance` + `attendanceKeys.today()` in `lib/hooks/queries/useAttendance.ts`, check-in/out invalidate today's key, `useMyAttendance` reads today from the server. Test `useAttendance.today.test.tsx` passes (2/2). Deviation: uses `apiClient` via the service (the brief's "generated hook" returns a different response shape and the test mocks `apiClient.get`).
- Checks: `npx tsc --noEmit` exit 0; eslint on touched files 0 errors (test files are eslint-ignored); vitest over lib/services, lib/hooks/queries, app/me/attendance, app/payroll: 1587/1587 passed.
