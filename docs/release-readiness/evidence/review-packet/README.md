# A7 review packet (Codex and Grok)

Range to review: `c9ee9e54^..fe828c00` on `main`. Backend: 11 files. Frontend: 57 files.
No secrets, session state or PII in this packet. Demo credentials are in `docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md` (not copied here).

## Review first (security, highest risk)
1. `EmployeeController.java`: scope-aware employee detail. `EMPLOYEE:VIEW_ALL` below ALL scope gets `EmployeeMinimalResponse`; full profile only for super admin, HR manager, EMPLOYEE:UPDATE at ALL, payroll roles, self or reporting chain. Check for IDOR and for any path that still returns the full DTO.
2. `SecurityConfig` and removal of `DevSecurityConfig`: swagger, prometheus and non-health actuator now require auth in every profile.
3. `OneOnOneMeetingController.searchParticipants` (`GET /meetings/participants/search`): tenant scope, ACTIVE only, 2-char minimum, 20-row cap.
4. Migrations V350 and V351: idempotent grants and per-tenant offer template seed. Check the RLS `set_config` pattern and scope values.

## Then
- `Objective.updateStatus`: COMPLETED is sticky.
- Frontend: queries gated by API permission, `routes.ts` entries, 429 retry in `queryClient.ts`.

## Evidence
- `../bug-register.md`: all findings and the 2026-11-19 decision table.
- `../p1-full-hradmin.md`: full sweep, 1494 loads, 8 FAIL (429 console noise).
- `../fixes/*.md`: per-fix notes.
- `../scripts/e2e/`: harness. `FE_URL` env overrides the frontend address.

## Findings log (fill in; do not mark a phase reviewed without it)
| Reviewer | Date | Finding | Decision (fixed / rejected + reason / deferred + owner) |
|---|---|---|---|
| Codex | NOT RUN | | |
| Grok | NOT RUN | | |

## Known open
Backend integration tests need Docker (not run here). Unit `com.nulogic.api.employee.controller.EmployeeControllerTest`: 20 tests pass, including the S-002 detail-view case. Frontend `tsc --noEmit` clean. `vitest` and `next build` not run this round. S-002 remainder accepted (see register).
