NEW-01 | FIXED | components/fluence/ActivityCard.tsx | Text wrapping the Badge (div) rendered as p; now component="div"
NEW-02 | SKIPPED | none | probed live at 390px: the "blocked" element is a 350px-tall card whose centre sits under the fixed bottom nav; all header buttons are unblocked. Probe false positive, not a defect
NEW-03 | FIXED | lib/queryClient.ts | 429 retry now waits for Retry-After (cap 10s) instead of 500ms; pages already make one call each, so no dedupe needed
NEW-04 | FIXED | app/employees/page.tsx | header buttons were Mantine Button (pale in dark); switched to shared ui/Button (primary uses --btn-primary-bg, others outline)
/benefits | FIXED | app/benefits/page.tsx, lib/hooks/queries/useBenefits.ts | flex credits now read from employee summary (flexCreditsAvailable), drops the 404 flex-allocation call; org dashboard query only runs with REPORT:VIEW (employee 403)
/reports/attrition | FIXED | lib/config/routes.ts | route required REPORT_VIEW/ANALYTICS_VIEW but API needs PREDICTIVE_ANALYTICS_VIEW; route now matches API and nav (tightened, no grants)
/letters/templates | FIXED | lib/config/routes.ts | added route rule LETTER_TEMPLATE_VIEW (matches API and nav is MANAGE); roles without it get the standard denied redirect
/tasks | NEEDS-DECISION | none | page already shows "no access" card on 403; pm TaskController is not in this repo so the required permission is unknown (employees hold PROJECT:VIEW and still get 403); cannot gate nav/query without guessing
/admin/roles (HR) | FIXED | app/admin/roles/page.tsx, lib/hooks/queries/useRoles.ts | permissions catalogue query only runs with PERMISSION:MANAGE; dropdown shows an access message otherwise
