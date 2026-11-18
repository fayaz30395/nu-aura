# resp2 batch result

ID | status | files changed | note
--- | --- | --- | ---
Q-009 | FIXED | frontend/app/admin/employees/page.tsx, frontend/app/payroll/page.tsx | employees: Total/Active tiles show a dash on error; payroll: KPI row hidden on error and header says "Payroll data unavailable"
Q-012 | FIXED | frontend/app/tax/declarations/page.tsx | table wrapped in Table.ScrollContainer; no clip at 390 (playwright)
Q-013 | FIXED | frontend/app/projects/calendar/page.tsx | controls and header action rows wrap; month grid scrolls inside card; no shell clip at 768
Q-014 | FIXED | frontend/app/expenses/page.tsx, frontend/app/analytics/org-health/page.tsx | expenses header grid minmax(0,1fr); org-health header actions wrap; /onboarding excluded (not touched)
Q-015 | FIXED | frontend/app/learning/paths/page.tsx, frontend/app/analytics/org-health/page.tsx | path card title row wraps; engagement row wraps; /reports and /workflows done earlier; /recruitment excluded
Q-016 | FIXED | frontend/app/admin/holidays/page.tsx | dialog now Mantine Modal; verified role=dialog, aria-modal, Escape closes
Q-022 | PARTIAL | none new | scan of 21 non-excluded routes found no unlabeled inputs; remaining named routes (/recruitment/pipeline, /onboarding/templates, /preboarding) are in excluded folders

tsc: filtered to edited files, no errors.
