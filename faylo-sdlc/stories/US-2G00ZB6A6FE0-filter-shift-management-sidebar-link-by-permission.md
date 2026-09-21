# US-2G00ZB6A6FE0: Filter Shift Management sidebar link by permission - link is visible/clickable for roles with no shift access, page itself correctly blocks with Access Denied toast but the nav entry shouldn't be shown at all

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

- **AC1:** Shift Management nav entry only appears for roles with actual access, matching the pattern used elsewhere in the sidebar
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
