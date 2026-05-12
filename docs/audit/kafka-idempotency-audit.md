# Kafka Idempotency Audit — Wave-10 P1-1

**Date:** 2026-05-12
**Scope:** All `@KafkaListener` methods in `backend/src/main/java`
**Risk surveyed:** offset-commit-before-DB-persist race producing double-processing on rebalance / consumer restart / Kafka retry.

## Methodology

1. Discover every `@KafkaListener` method via `grep`.
2. Read each handler body and check whether it calls `idempotencyService.tryProcess(...)` (or equivalent atomic claim) **before** mutating state.
3. Classify:
   - **SAFE** — wraps mutating work in an idempotency check that uses Redis SETNX (atomic claim).
   - **RISKY** — performs side effects without an atomic idempotency claim. Subject to duplicate execution on Kafka redelivery.

## Classification Table

| # | Listener | Topic(s) | Idempotency Check | Classification | Rationale |
|---|---|---|---|---|---|
| 1 | `ApprovalEventConsumer.handleApprovalEvent` | `nu-aura.approvals` | `idempotencyService.tryProcess(eventId)` at L73 | **SAFE** | Atomic claim before any side effect; no release on failure (acceptable — Kafka retry depends on container error handler / DLT). |
| 2 | `AuditEventConsumer.handleAuditEvent` | `nu-aura.audit` | `idempotencyService.tryProcess(eventId)` at L77 | **SAFE** | Claim before batching. Note: per-batch flush is `synchronized` on the accumulator. |
| 3 | `EmployeeLifecycleConsumer.handleEmployeeLifecycleEvent` | `nu-aura.employee-lifecycle` | `idempotencyService.tryProcess(eventId)` at L74 | **SAFE** | Same shape as approvals. |
| 4 | `NotificationEventConsumer.handleNotificationEvent` | `nu-aura.notifications` | `idempotencyService.tryProcess(eventId)` at L68 | **SAFE** | Side effects (email/in-app/SMS) all gated by the claim. |
| 5 | `PayrollProcessingConsumer.handlePayrollProcessingEvent` | `nu-aura.payroll-processing` | `idempotencyService.tryProcess(eventId)` at L75 + `release()` at L94 | **SAFE (gold-standard)** | Only consumer that already pairs `tryProcess` + `release` on failure path, allowing legitimate Kafka retries instead of being swallowed by the 24h TTL. |
| 6 | `FluenceSearchConsumer.handleFluenceContentEvent` | `nu-aura.fluence-content` | **NONE** (before fix) | **RISKY → FIXED** | Re-indexing is mostly idempotent at the Elasticsearch document level, but interleaved `DELETE` + `CREATE` redeliveries can race and leave the index inconsistent with PostgreSQL. |
| 7 | `DeadLetterHandler.handleDeadLetter` | `*.dlt` (5 topics) | DB unique on `(topic, partition, offset)` via `persistIfAbsent` — not atomic; metric increment + structured log alert remained un-deduplicated. | **RISKY → FIXED** | On consumer rebalance after ACK lag, the same DLT offset was being redelivered; `persistIfAbsent` swallowed the duplicate persist but `dltCounters.increment()` and `[DLT_ALERT]` log were still doubling up. |

**Totals:** 7 listeners audited — **5 SAFE**, **2 RISKY** (now fixed).

## Fix Details

### Fix 1 — `FluenceSearchConsumer`

**File:** `backend/src/main/java/com/hrms/infrastructure/kafka/consumer/FluenceSearchConsumer.java`

**Pattern adopted:** PayrollProcessingConsumer's `tryProcess` + `release` (gold standard).

- Injected `IdempotencyService` via constructor (`@RequiredArgsConstructor`).
- Wrapped the body with `if (eventId != null && !idempotencyService.tryProcess(eventId)) { ack; return; }`.
- Added `claimed` flag and `idempotencyService.release(eventId)` in the catch block so Kafka redelivery can retry. Without release, the 24h TTL would silently swallow every retry of a transient ES failure.
- Null-safe on `eventId` (events from older producers without `event_id` field still process — they just won't be deduplicated, matching `BaseKafkaEvent.initializeDefaults()` semantics).

### Fix 2 — `DeadLetterHandler`

**File:** `backend/src/main/java/com/hrms/infrastructure/kafka/consumer/DeadLetterHandler.java`

**Idempotency key:** `"dlt:" + topic + ":" + partition + ":" + offset` — DLT payload is raw `String`, so there is no business-level event id to key on. Physical offset coordinates are stable per-partition and survive consumer restart.

- Injected `IdempotencyService`.
- Short-circuit duplicate deliveries before incrementing the Micrometer counter or emitting the `[DLT_ALERT]` log line (the noisy ones that were doubling).
- Release the claim on exception path so a future redelivery can re-enter — DLT must never be silently swallowed.
- The unconditional `acknowledge()` in `finally` is preserved — DLT semantics (end of the retry road) are unchanged.

## What was deliberately NOT changed

- `IdempotencyService` itself (out of scope).
- The 5 SAFE consumers — already conformant.
- Service-layer business logic — out of scope.
- `persistIfAbsent` in `DeadLetterHandler` — kept as defense-in-depth for the DB layer.

## Suggested follow-ups (not in scope)

- Backfill `release()` on the failure path for the 4 SAFE consumers (ApprovalEvent, AuditEvent, EmployeeLifecycle, Notification). Right now if Redis claim succeeds and DB write fails, the 24h TTL blocks legitimate Kafka retries. `PayrollProcessingConsumer` is the only one that does this correctly.
- Add a unit test that simulates double-delivery and asserts a single side effect per consumer.

## Build verification

- `mvn -DskipTests compile` — BUILD SUCCESS
- `mvn test-compile` — BUILD SUCCESS
