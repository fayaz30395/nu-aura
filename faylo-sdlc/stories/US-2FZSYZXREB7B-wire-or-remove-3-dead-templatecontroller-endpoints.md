# US-2FZSYZXREB7B: Wire or remove 3 dead TemplateController endpoints (update, toggle-active, toggle-featured) - zero frontend callers

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

- **AC1:** Endpoints either have frontend UI or are removed as dead code
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
