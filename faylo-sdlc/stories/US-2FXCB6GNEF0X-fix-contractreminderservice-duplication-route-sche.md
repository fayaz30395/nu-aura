# US-2FXCB6GNEF0X: Fix ContractReminderService duplication: route scheduler through it, add reminder read endpoints

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Verified
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** ContractLifecycleScheduler creates reminders via ContractReminderService.createOrUpdateExpiryReminder/createOrUpdateRenewalReminder instead of building ContractReminder entities inline; GET /contracts/reminders/today, GET /contracts/reminders/overdue, and PATCH /contracts/reminders/{id}/complete expose the service's existing read/complete methods
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
