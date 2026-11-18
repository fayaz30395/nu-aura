Residual sweep failures (p1-full-{hradmin,employee,manager}). Class: (a) ungated API call, (b) real bug, (c) sweep false positive.

/tasks (all roles) | (a) FIXED | app/tasks/page.tsx, lib/hooks/usePermissions.ts (TASK_VIEW), components/layout/menuSections.tsx | pm-module TaskController needs TASK:VIEW (read from pm-module jar; source not in repo), not PROJECT:VIEW. Query + nav gated on TASK:VIEW. TASK:VIEW is not granted to any role in backend seeds I could find: backend decision whether EMPLOYEE should get it.
/expenses/advances | (a) FIXED | useExpenses.ts, app/expenses/advances/page.tsx | all-advances query gated on EXPENSE_ADVANCE_MANAGE (same gate as the tab). API itself wants EXPENSE:VIEW_ALL or MANAGE.
/expenses/mileage | (a) FIXED | useMileage.ts, app/expenses/mileage/page.tsx | pending approvals gated on EXPENSE_APPROVE.
/leave/calendar | (a) FIXED | useLeaves.ts, app/leave/calendar/page.tsx | APPROVED-by-status only in team mode with LEAVE:VIEW_ALL/TEAM; Team toggle hidden otherwise.
/shifts/swaps | (a) FIXED | useShifts.ts, app/shifts/swaps/page.tsx | pending-approval gated on ATTENDANCE_APPROVE.
/tax/declarations | (a) FIXED | useTax.ts, app/tax/declarations/page.tsx | without STATUTORY:VIEW fetch own via /employee/{id} (allowed by TDS_DECLARE).
/travel | (a) FIXED | useTravel.ts, travel.service.ts, app/travel/page.tsx | without TRAVEL:VIEW_ALL use /travel/requests/my. Note: /my takes no filters, so status/type/search filters are ignored for those users.
/fluence/templates, /dashboard, /analytics (employee, manager) | (a) FIXED | 3 pages | gated on KNOWLEDGE:TEMPLATE_READ, show existing "no access to templates" message.
/projects/resource-conflicts | (a) FIXED | page.tsx | API needs EMPLOYEE:VIEW_ALL; page gate now requires it too (redirects denied=1), query enabled only with access.
/projects/psa/invoices, /projects/psa | (a)+(b) FIXED | both pages | non-admin returned null (no heading); now PageDeniedFallback. Invoices query enabled only for admin roles.
/departments, /team-directory (employee) | (a) FIXED | useEmployees.ts, both pages | GET /employees needs EMPLOYEE:VIEW_ALL/DEPARTMENT/TEAM. Departments: headcount query gated. Team directory: PageDeniedFallback when none.
/letters | (a) FIXED | useRecruitment.ts, app/letters/page.tsx | letters/templates gated on LETTER:TEMPLATE_VIEW, candidates on CANDIDATE:VIEW; PageDeniedFallback without LETTER:TEMPLATE_VIEW. HR_ADMIN also 403s on letters, so HR_ADMIN seems to lack LETTER:TEMPLATE_VIEW: backend seed issue, NEEDS backend/decision.
/reports/headcount (manager) | (a) FIXED | page.tsx | /analytics/* needs ANALYTICS:VIEW, route allows REPORT:VIEW. Query gated, PageDeniedFallback without ANALYTICS:VIEW.
/offboarding/fnf (employee, manager) | (b) FIXED | lib/config/routes.ts | no route entry, so it fell under /offboarding/[id] only in the sweep's expectation; added '/offboarding/fnf' EXIT_VIEW/EXIT_MANAGE so AuthGuard redirects denied=1.
/admin/profile (hradmin) | (b) FIXED | app/admin/profile/page.tsx | redirect shim had no heading; status text now h1.
/offboarding/fnf mobile (hradmin) | (c) FALSE POSITIVE | none | ERR_INCOMPLETE_CHUNKED_ENCODING on a dev-server chunk (35 failed requests), not an app fault.
/settings/security, /settings/sso (all roles) | (c) FALSE POSITIVE | none | only failure is a console 429 (rate limit during sweep); pages render an h1 and no API 403. Allowlist not changed.
/learning/paths, /training/my-learning (employee) | (c) NOT REPRODUCED | none | "spinner after 10s" with no http/console error; consistent with 429 retry/backoff under sweep load. Needs a re-run, not verified.
Verification: frontend `npx tsc --noEmit --pretty false` clean for touched files. No browser re-run.
