# US-2FZFCXTHMV0F: Add missing size/length validation to UpdateWikiPageRequest (and blog equivalent)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** UpdateWikiPageRequest gets same @Size constraints as CreateWikiPageRequest (title/slug/excerpt/content); PUT with oversized content returns 400 like POST already does
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
