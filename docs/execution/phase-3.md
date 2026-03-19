# Phase 3: Contract Lifecycle Automation - Execution Tracking

## Status: COMPLETE

## Changes Made

### 1. Flyway Migration V49 (NEW)
- **File:** `backend/src/main/resources/db/migration/V49__contract_lifecycle_automation.sql`
- Added unique partial index `uq_contract_reminders_dedup` on `(contract_id, reminder_type, reminder_date) WHERE is_completed = false` for idempotent reminder creation
- Created `contract_lifecycle_config` table for per-tenant configuration (reminder windows, auto-expire/auto-renew toggles)
- Added composite index `idx_contracts_tenant_status_enddate` for scheduler's daily expiry scan
- Added index `idx_contract_reminders_tenant_pending` for scheduler's dedup lookups
- RLS policy on `contract_lifecycle_config`

### 2. ContractLifecycleScheduler (NEW)
- **File:** `backend/src/main/java/com/hrms/application/contract/scheduler/ContractLifecycleScheduler.java`
- Daily scheduled job (`@Scheduled`, cron configurable via `app.contract.lifecycle.cron`, default 02:30 UTC)
- Toggleable via `app.contract.lifecycle.enabled` property (default: true)
- **Auto-Expire:** Marks active contracts past end date as EXPIRED (skips auto-renewable ones)
- **Auto-Renew:** Extends auto-renewable contracts past end date by `renewalPeriodDays`
- **Reminder Creation:** Creates idempotent reminders at configurable day intervals (default: 30, 15, 7)
- **Notification Dispatch:** Sends in-app notifications for due/overdue reminders via existing `NotificationService`
- Per-tenant failure isolation (one tenant error does not block others)
- Structured logging with counts per step
- Metrics via existing `MetricsService` (`recordContractExpiryAlert`, `recordContractStatusChange`, `recordContractLifecycle`)
- Follows existing scheduler patterns (AutoRegularizationScheduler, WorkflowEscalationScheduler)

### 3. ContractRepository (EXTENDED)
- **File:** `backend/src/main/java/com/hrms/infrastructure/contract/repository/ContractRepository.java`
- Added `findActiveContractsExpiringBefore(tenantId, windowEnd)` - finds contracts within expiry window
- Added `findActiveContractsPastEndDate(tenantId)` - finds contracts needing auto-expiry

### 4. ContractReminderRepository (EXTENDED)
- **File:** `backend/src/main/java/com/hrms/infrastructure/contract/repository/ContractReminderRepository.java`
- Added `existsPendingReminder(contractId, reminderType, reminderDate)` - idempotency check
- Added `findUnnotifiedDueReminders(tenantId)` - finds reminders needing notification dispatch

### 5. ContractReminderService (UPDATED)
- **File:** `backend/src/main/java/com/hrms/application/contract/service/ContractReminderService.java`
- Removed stub `@Scheduled` methods (`autoCreateExpiryReminders`, `autoCreateRenewalReminders`) that had empty implementations
- Removed unused `@Scheduled` import
- Added note pointing to `ContractLifecycleScheduler` as the replacement

### 6. Unit Tests (NEW)
- **File:** `backend/src/test/java/com/hrms/application/contract/scheduler/ContractLifecycleSchedulerTest.java`
- 15 test cases covering:
  - Auto-expire: normal flow, skip auto-renewable, empty list, config disabled
  - Auto-renew: normal flow, missing renewal period
  - Reminder creation: normal flow, idempotency (two runs), renewal reminders for auto-renewable, past date filtering
  - Notification dispatch: normal flow, missing contract, missing recipient
  - Tenant isolation: contracts scoped to correct tenant, reminders stamped with correct tenant
  - Configuration: default days, custom days from DB
  - Edge cases: no end date, empty tenant list

## Idempotency Guarantees

1. **Application-level:** `existsPendingReminder()` check before every insert
2. **Database-level:** Unique partial index `uq_contract_reminders_dedup` prevents duplicates even under concurrent execution
3. **Notification-level:** `notifiedAt IS NULL` filter ensures each reminder is dispatched exactly once

## Observability

- Structured log lines at INFO level for job start/completion with aggregate counts
- Per-tenant ERROR logs with stack traces (do not halt other tenants)
- DEBUG-level per-contract/reminder logs
- Prometheus metrics via existing MetricsService:
  - `contract_lifecycle` counter (action=auto_expire/auto_renew)
  - `contract_status_transitions` counter
  - `contracts_expiring` gauge per tenant

## Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `app.contract.lifecycle.enabled` | `true` | Enable/disable the scheduler |
| `app.contract.lifecycle.cron` | `0 30 2 * * *` | Cron expression (UTC) |
| `contract_lifecycle_config.reminder_days_before_expiry` | `30,15,7` | Per-tenant, comma-separated |
| `contract_lifecycle_config.auto_expire_enabled` | `true` | Per-tenant toggle |
| `contract_lifecycle_config.auto_renew_enabled` | `true` | Per-tenant toggle |
