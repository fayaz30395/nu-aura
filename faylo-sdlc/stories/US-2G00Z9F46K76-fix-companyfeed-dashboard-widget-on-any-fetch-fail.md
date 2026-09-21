# US-2G00Z9F46K76: Fix CompanyFeed dashboard widget: on ANY fetch failure (403/500/network) it silently renders hardcoded fake feed data (Priya Sharma, Arjun Patel etc.) as if real, worse than an empty state

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

- **AC1:** Fetch failure shows a real error/empty state, never fabricated content
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
