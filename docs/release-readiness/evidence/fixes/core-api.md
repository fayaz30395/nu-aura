S-001 | FIXED | backend/.../application/employee/service/EmployeeService.java | /employees/managers now returns picker fields only (id, code, names, designation); pickers use id/fullName/employeeCode
S-002 | NEEDS-DECISION | none | MGR holds EMPLOYEE:VIEW_ALL, so full read is by design; decide scope (team) and whether edit form should be hidden when PUT is 403
S-003 | FIXED | frontend/next.config.js | poweredByHeader: false
S-004 | FIXED | backend/.../common/exception/GlobalExceptionHandler.java | error body timestamp now UTC (matches the 403 interceptor body); not compiled or run
S-005 | FIXED | backend/.../common/config/DevSecurityConfig.java | dev chain: only /actuator/health anonymous; info/metrics/prometheus need sign-in. Prod already safe (SUPER_ADMIN or scrape token)
S-006 | NEEDS-DECISION | none | Prod safe (SUPER_ADMIN, swagger disabled). Dev anonymous Swagger is deliberate in DevSecurityConfig; product call whether to require sign-in in dev
UI-002 | SKIPPED | none | needs demo PSA seed migration (psa_projects empty) or empty state in app/timesheets/page.tsx, which another worker is editing
UI-006 | NEEDS-DECISION | frontend/lib/hooks/queries/useResources.ts (workload only) | workload: history query now disabled for empty employee id. job-boards: already fixed in working tree (job-openings/status/OPEN). benefits: no /api/v1/benefits controller and legacy BenefitPlan shape differs from benefits-enhanced; needs either a controller or a page migration. flex active 404 = no allocation
UI-007 | NEEDS-DECISION | none | 11 routes, each needs menu vs permission choice across other workers' areas (travel, fluence, helpdesk, letters, tasks, LMS)
UI-011 | FIXED | frontend/components/custom-fields/CustomFieldsSection.tsx | renders nothing (no API call) without CUSTOM_FIELD:VIEW
UI-013 | NEEDS-DECISION | none | proxy.ts and login page deliberately avoid redirecting signed-in users (documented infinite-loop history); needs a design call
UI-001 | FIXED (re-checked) | none | in d10bc9b9 (WorkRequestsPanel)
UI-003 | FIXED (re-checked) | none | AnnouncementController now accepts SYSTEM_ADMIN or ANNOUNCEMENT_MANAGE
UI-004 | FIXED (re-checked) | none | d10bc9b9 me/documents
UI-005 | FIXED (re-checked) | none | d10bc9b9 calendar.service
UI-008 | FIXED (re-checked) | none | d10bc9b9 timesheets add-entry falls back to current week
UI-009 | FIXED (re-checked) | none | d10bc9b9 invalidates timesheet queries
UI-010 | FIXED (re-checked) | none | d10bc9b9 useWall
