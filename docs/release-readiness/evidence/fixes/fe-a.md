# fe-a batch result
ID | status | files changed | note
--- | --- | --- | ---
UI-007 | PARTIAL | frontend/components/layout/menuSections.tsx | nav gates aligned to API perms: Attrition=PREDICTIVE_ANALYTICS_VIEW, Fluence Analytics=KNOWLEDGE_TEMPLATE_READ, Travel=TRAVEL_VIEW_ALL (hides Travel for roles without VIEW_ALL, incl. own-request filing). Helpdesk SLA, departments, settings/sso already gated in code. /letters (nav already uses the same LETTER_TEMPLATE_VIEW the API needs; cause is role data) and /admin/roles (intentional) not changed
UI-006 | PARTIAL | frontend/lib/services/hrms/benefits.service.ts, benefits.service.test.ts | plan reads (all/active/by type) now use /benefits-enhanced and map to BenefitPlan; plan writes still on legacy /benefits (enhanced request needs plan category: NEEDS-DECISION). workload/job-boards done by core-api
UI-002 | FIXED | frontend/app/timesheets/page.tsx | empty-state message in Add Entry dialog when no PSA projects; seed data (dangling project id) not touched
F-009 | FIXED | app/fluence/templates, drive, analytics, dashboard, app/tasks page.tsx | 403 shows access message (QueryErrorCard/EmptyState) instead of empty state
G-012 | FIXED | app/performance/competency-matrix/_components/MyCompetenciesTab.tsx, lib/hooks/useCompetency.ts | skill-gap query enabled only with EMPLOYEE:READ; panel hidden otherwise
G-013 | FIXED | app/performance/revolution/page.tsx | same gate, Growth Opportunity card hidden
H-033 | FIXED (already) | none | Onboarding nav already requires ONBOARDING_VIEW; page gates query by canView
Q-009,Q-012..Q-015,Q-017..Q-026,UI-012,Q-021,Q-022 | ALREADY DONE | none | covered in fixes/a11y.md, a11y2.md, resp2.md; remaining ones are in excluded recruitment/onboarding folders
Q-027 | SKIPPED | none | needs visual decision (a11y2)
Q-028 | SKIPPED | none | needs per-page metadata design
