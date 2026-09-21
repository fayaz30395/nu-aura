# RV-2G06T26HR5H3: Competency framework review

> **Story:** US-2G055M7PB4XP
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Added CompetencyFramework/CompetencyRequirement entities+repos, CompetencyFrameworkService (CRUD), and CompetencyFrameworkController (/api/v1/performance/competency-frameworks, nested /{id}/requirements CRUD). Rewired SkillGapAnalysisService.getRequiredSkillsForRole to query the DB instead of a hardcoded per-role map - role-family classification (ENGINEER/MANAGER/PRODUCT/DEFAULT substring match) stays as logic in the service, but skill names/levels now live in the database. V327 migration creates both tables and seeds the exact same data the old hardcoded map had, per tenant, so behavior is unchanged until an admin edits it via the new CRUD API. Frontend's hardcoded 15-item array is out of scope for backend-lead - noted for frontend follow-up. Compiles clean.
