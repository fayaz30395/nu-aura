# US-2FZ92MB7FK23: Port PSAProject billing shape onto HRMS Project (billing_type, is_billable, default_billing_rate, client_id)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** projects table gains billing_type/is_billable/default_billing_rate/client_id with safe defaults; Project.java exposes them + BillingType enum copied from PSAProject; ProjectRequest/Response DTOs round-trip
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
