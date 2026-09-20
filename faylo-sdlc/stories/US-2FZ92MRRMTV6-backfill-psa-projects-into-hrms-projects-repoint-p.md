# US-2FZ92MRRMTV6: Backfill PSA projects into HRMS projects, repoint PSA frontend at shared invoice pipeline

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Draft
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Every psa_projects row has a matching projects row (by project_code) carrying billing fields; PSA invoice UI calls the new shared generate-invoice endpoint; old PSA endpoints @Deprecated not removed
  - **Verify:** shell true
  - **Verified:** pending
