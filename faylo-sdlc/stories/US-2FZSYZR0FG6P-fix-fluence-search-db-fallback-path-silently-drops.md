# US-2FZSYZR0FG6P: Fix Fluence search: DB fallback path silently drops contentType/visibility filters when Elasticsearch unavailable, giving broader unfiltered results with no indication

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** DB fallback honors same filters as ES path, or caller is informed filters were ignored
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** pending
