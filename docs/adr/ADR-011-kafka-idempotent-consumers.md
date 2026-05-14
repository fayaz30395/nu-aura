# ADR-011: Kafka Idempotent Consumer Pattern

**Status:** Accepted
**Date:** 2026-05-14
**Decision Makers:** Backend Architecture
**Closes:** `docs/audit/kafka-idempotency-audit.md`
**Related:** ADR-007 (Payroll Saga), ADR-004 (Webhook Delivery)

---

## Context

NU-AURA uses Confluent Kafka 7.6.0 for cross-module events:

- `employee.lifecycle.*` — hire, transfer, exit
- `payroll.cycle.*` — saga steps (ADR-007)
- `leave.applied`, `leave.approved` — workflow triggers
- `webhook.outbox` — outbound delivery (ADR-004)
- `audit.event` — audit-trail emission

Kafka delivers **at-least-once**. Consumers will see duplicate messages when:

- A consumer crashes after processing a record but before committing the offset
- A consumer rebalance reassigns a partition mid-batch
- A producer retries on broker timeout (the broker had already accepted the previous send)

Without idempotency, duplicates cause real harm:

- A `payroll.disbursement.executed` replay double-pays an employee
- A `leave.approved` replay double-decrements the leave balance
- A `webhook.outbox` replay double-fires a customer's webhook

We've shipped both: the kafka-idempotency audit identified 14 consumers, 6 of which lacked
idempotency wrappers.

---

## Decision

**Every consumer that mutates state MUST wrap its handler in
`IdempotencyService.process(idempotencyKey, () -> handler)`.**

The idempotency key is the **event ID** (UUID emitted by the producer at publish time, carried
in the Kafka header `x-event-id`). The service uses Redis `SETNX` with a 24-hour TTL as the
dedup store, falling back to a PostgreSQL `idempotency_keys` table when Redis is unavailable.

### Canonical consumer shape

```java
@KafkaListener(topics = "leave.approved", groupId = "leave-balance-decrementer")
public void onLeaveApproved(ConsumerRecord<String, LeaveApprovedEvent> record) {
    String eventId = headerValue(record, "x-event-id")
        .orElseThrow(() -> new IllegalStateException("Missing x-event-id header"));

    idempotencyService.process(eventId, () -> {
        LeaveApprovedEvent event = record.value();
        leaveBalanceService.decrement(event.tenantId(), event.employeeId(), event.days());
        return null;
    });
}
```

The handler inside the lambda must be:

- **Synchronous** (no orphan async chains escape the idempotency window)
- **Transactional** for the DB writes it performs
- **Side-effect-free** for I/O outside the DB (no email sends, no webhook dispatches —
  those go through `webhook.outbox` and follow the outbox pattern)

### Producer contract

Producers MUST attach `x-event-id` as a UUID header at publish time. Producers SHOULD attach
`x-correlation-id` for tracing. The `EventPublisher` helper enforces this — direct
`KafkaTemplate.send()` calls without going through `EventPublisher` are flagged by a
SpotBugs custom detector (added in the wave-12 audit closeout).

---

## Rationale

### Alternatives considered

**A. Trust Kafka's "exactly-once semantics" (EOS) end-to-end.**
Rejected: EOS requires the entire pipeline (producer transactional ID + consumer
read_committed isolation + idempotent handler) to be configured correctly. One misconfigured
consumer breaks the guarantee silently. Plus EOS still doesn't help across the
DB/Kafka boundary — our handlers write to PostgreSQL, not back into Kafka.

**B. Use Kafka Streams with `processing.guarantee=exactly_once_v2`.**
Rejected for the same boundary reason, plus Kafka Streams isn't in our stack and would be
a heavy addition for the handful of consumers we have.

**C. Database-level uniqueness constraints on output rows.**
Useful as a third line of defense (we do this for `webhook_deliveries.event_id`), but doesn't
help for decrement-style operations like leave balance.

**D. Idempotency at the producer (transactional producer + idempotent producer).**
Already enabled — `enable.idempotence=true` in `producer.properties`. This prevents
producer-side duplicates from network retries. But the consumer can still see duplicates from
consumer-side crashes between handler completion and offset commit. So this is necessary but
insufficient.

### Why Redis + DB fallback

Redis `SETNX` is O(1) and adds ~0.5ms per message. Our throughput (peak ~200 msg/s across all
topics) is nowhere near Redis limits. The PostgreSQL fallback ensures we don't lose idempotency
when Redis is down — the same pattern as `CacheConfig` and `DistributedRateLimiter`. The
`IdempotencyService` chooses Redis if `redisHealth.isUp()` else PG.

---

## Consequences

### Positive

- Duplicate-replay safety regardless of producer or consumer crash patterns.
- Single chokepoint to audit (grep for `idempotencyService.process(` finds every protected
  handler).
- The 24-hour TTL is long enough to outlast any reasonable consumer-lag spike.

### Negative

- Every consumer call now does a Redis round-trip (~0.5ms p50, ~5ms p99).
- The 24-hour TTL means a duplicate that arrives 25 hours after the first will be re-processed.
  Acceptable: Kafka log retention is 7 days and our consumer-lag SLO is 1 hour.
- Forgetting to wrap a handler is a silent bug. Mitigated by the SpotBugs detector and a
  scheduled audit job that lists `@KafkaListener` methods without `idempotencyService` in
  their bytecode (added in wave-12).

### Mitigations

- SpotBugs custom rule `IdempotencyMissingDetector` (in `tools/spotbugs/`).
- A pre-commit hook (optional, runs in CI) that fails the build if a new `@KafkaListener`
  method does not contain `idempotencyService`.
- Quarterly review: grep `@KafkaListener` and confirm each appears in the idempotency
  registry.

---

## Idempotency Key Selection

The event ID, NOT the Kafka message offset, NOT a hash of the payload:

| Key choice           | Why we did NOT use it                                                       |
|----------------------|-----------------------------------------------------------------------------|
| Kafka offset         | Changes on rebalance; not stable across consumer restarts                   |
| Topic + partition + offset | Same; also leaks consumer-group internals                              |
| Hash of payload      | Same payload re-emitted intentionally (e.g., manual replay) would dedup     |
| Producer-supplied UUID (`x-event-id`) | Stable, producer-controlled, traceable. **✅ Chosen**          |

For commands the user explicitly wants re-executed (e.g., "re-run payroll cycle"), the
producer generates a **new** event ID. The dedup happens only when the SAME logical event is
delivered twice.

---

## Verification

Integration test: `IdempotentConsumerIntegrationTest#duplicateMessageProcessedOnce`. Publishes
the same event twice, asserts the side effect happens once.

A scheduled job `IdempotencyAuditScheduler` (every 24h) scans `@KafkaListener` annotations
via reflection and emits a metric `idempotency.consumer.coverage` (numerator: consumers
calling `idempotencyService.process`; denominator: total `@KafkaListener` methods). Alert
fires if coverage < 100%.

---

## Related Decisions

- [ADR-007](ADR-007-payroll-saga-pattern.md) — Saga steps are themselves Kafka events
- [ADR-004](ADR-004-webhook-delivery-system.md) — Outbox pattern relies on this
- [Audit: kafka-idempotency-audit.md](../audit/kafka-idempotency-audit.md) — closed by this ADR
