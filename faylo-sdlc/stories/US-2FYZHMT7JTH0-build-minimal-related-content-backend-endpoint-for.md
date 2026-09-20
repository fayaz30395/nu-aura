# US-2FYZHMT7JTH0: Build minimal related-content backend endpoint for RelatedContent widget

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

- **AC1:** GET /knowledge/wiki/pages/{pageId}/related (or similar) returns same-space or tag-matched pages across WIKI/BLOG/TEMPLATE with id/title/excerpt/type/viewCount/likeCount/updatedAt, matching RelatedContent.tsx's RelatedItem shape; frontend wires it in on the wiki page view
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
