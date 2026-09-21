# RV-2G090DKRMRTS: Frontend implementation review

> **Story:** US-2G00WDFM68RJ
> **Author:** faylo-frontend-engineer
> **Reviewer:** faylo-qa-automation-engineer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Both halves now complete. Team View (fixed earlier, commit 34642b0e): real subordinate data via useSubordinates instead of the manager's own data. Framework tab (this pass): backend's new /performance/competency-frameworks endpoint (US-2G055M7PB4XP) replaces the hardcoded 15-item FRAMEWORK_COMPETENCIES array entirely - deleted it along with the now-orphaned departmentOptions. New model is framework (name/roleFamily) -> requirements (skillName/requiredLevel), simpler than the old fake category/department shape, so the tab now filters by real framework + skill-name search instead of fake category/department dropdowns. Added competencyFrameworkService.listFrameworks(), useCompetencyFrameworks() hook, and CompetencyFramework/CompetencyRequirement types. tsc + eslint clean.
