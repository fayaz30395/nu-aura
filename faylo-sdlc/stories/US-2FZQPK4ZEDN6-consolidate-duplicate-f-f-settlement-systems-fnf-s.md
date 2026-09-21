# US-2FZQPK4ZEDN6: Consolidate duplicate F&F settlement systems (fnf.service.ts vs exit.service.ts backing /offboarding/fnf vs /offboarding/[id]/fnf)

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Single settlement backend serves both offboarding F&F surfaces, no duplicate data model
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-20)
