# US-2G01V1SFKH4D: Wire or remove orphaned pages with no nav entry and no in-app links: projects/calendar, projects/gantt, projects/resource-conflicts (868/461/185 lines each, fully built but unreachable), and integrations + integrations/slack (only linked from public marketing page, not the authenticated app sidebar)

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

- **AC1:** Each page either gets a real nav entry / in-app link, or is removed if genuinely obsolete
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
