# US-2FZSYYN18GRX: Add sensitive document tier excluding manager-in-chain access (bank/PAN/Aadhaar/salary docs currently manager-accessible same as routine docs)

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** hard-gate
> **Status:** Verified
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Sensitive FileCategory tier restricted to HR+self only, manager-in-chain excluded
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
