# US-2FYEQECB4258: Delete dead recruitment kanban routes (unreferenced [jobId]/kanban + stub redirect)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** app/recruitment/[jobId]/kanban/ (incl. OfferModal.tsx) and app/recruitment/kanban/ (5-line stub redirect) deleted - both confirmed unreferenced anywhere in nav/routes; /recruitment/pipeline remains the one live kanban
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
