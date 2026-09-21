# US-2G055M7PB4XP: Add backend support for a real competency framework: CompetencyFramework/CompetencyRequirement entity + CRUD endpoints, replacing the hardcoded 15-item array on the frontend and SkillGapAnalysisService's hardcoded required-skills-per-role (service itself has a comment admitting this should come from a real data source)

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Competency requirements per role/position are stored and queryable via the backend, not hardcoded in frontend or service code
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
