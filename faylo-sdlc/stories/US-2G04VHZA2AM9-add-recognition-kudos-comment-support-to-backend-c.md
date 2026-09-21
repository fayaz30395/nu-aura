# US-2G04VHZA2AM9: Add recognition/kudos comment support to backend: comment entity + POST/GET/DELETE /recognition/{id}/comments endpoints, mirroring the existing Fluence wall/blog comment pattern - RecognitionController currently has zero comment support, blocking frontend US-2G00WCV11JFE

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

- **AC1:** Recognition posts support creating, listing, and deleting comments via the new endpoints
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
