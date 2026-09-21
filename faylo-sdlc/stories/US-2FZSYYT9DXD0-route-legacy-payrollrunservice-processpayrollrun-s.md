# US-2FZSYYT9DXD0: Route legacy PayrollRunService.processPayrollRun sync path through validateSalaryStructuresCoverage guard (currently skips pre-flight, silently undercounts on missing structures)

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

- **AC1:** Legacy sync path enforces same coverage validation as initiateProcessing, or is deprecated/removed if dead
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
