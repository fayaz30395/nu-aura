---
name: kafka-idempotency
tags: [kafka, idempotency, dedup, at-least-once, redis, setnx]
applies_to: [backend, event-listeners]
references: [ADR-011, audit/kafka-idempotency-audit.md]
---

# Kafka Idempotent Consumer

## When to use

You are adding a **new `@KafkaListener`** method that mutates state — writes to the DB, calls
an external API, or emits a follow-up event. If the handler is read-only or pure-side-effect
free, you can skip this pattern.

The cost of forgetting: at-least-once delivery means duplicates WILL arrive. Without this
pattern, a leave-balance decrement runs twice, a payroll payment fires twice.

## Canonical implementation

### Consumer

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LeaveApprovedConsumer {

    private final IdempotencyService idempotencyService;
    private final LeaveBalanceService leaveBalanceService;

    @KafkaListener(topics = "leave.approved", groupId = "leave-balance-decrementer")
    public void onLeaveApproved(ConsumerRecord<String, LeaveApprovedEvent> record) {
        // 1) Pull the producer-supplied event ID from the header
        String eventId = HeaderUtils.required(record, "x-event-id");

        // 2) Wrap the handler — exactly-once for THIS event ID
        idempotencyService.process(eventId, () -> handle(record.value()));
    }

    @Transactional
    void handle(LeaveApprovedEvent event) {
        leaveBalanceService.decrement(
            event.tenantId(),
            event.employeeId(),
            event.days()
        );
        // No external API calls here. If you need to email the employee, emit a
        // notification.send event and let the notification consumer handle it
        // (it has its own idempotency wrapper).
    }
}
```

### Producer

```java
@Service
@RequiredArgsConstructor
public class LeaveApprovedPublisher {

    private final EventPublisher publisher;  // Wraps KafkaTemplate; enforces x-event-id

    public void publish(LeaveApprovedEvent event) {
        publisher.publish("leave.approved", event.employeeId().toString(), event);
        // EventPublisher attaches x-event-id (UUID), x-correlation-id (from MDC),
        // and x-tenant-id headers automatically.
    }
}
```

## Anti-patterns

- **DON'T** use `record.offset()` or `record.partition() + record.offset()` as the
  idempotency key. Offsets are not stable across rebalances.
- **DON'T** put the idempotency wrapper INSIDE the transactional method. The dedup happens
  BEFORE the transaction starts so a duplicate doesn't even open a connection.
- **DON'T** call external APIs (email, webhook, SMS) inside the handler. Emit a follow-up
  event and let a separate consumer handle that. Each consumer has its own idempotency
  scope.
- **DON'T** use `KafkaTemplate.send()` directly — bypasses `EventPublisher` and the
  `x-event-id` header won't be set, breaking the contract.
- **DON'T** make the handler `async` or schedule work onto another executor. The
  idempotency wrapper guarantees exactly-once execution of the LAMBDA. If you fire-and-forget
  from inside, the side effect leaks the guarantee.

## Tests required

- Unit: `idempotencyService.process(sameKey, ...)` called twice → second call returns
  cached result without invoking the lambda
- Integration: publish same `LeaveApprovedEvent` (same `x-event-id`) twice via
  Testcontainers Kafka → leave balance decremented once
- Integration: kill Redis mid-test → idempotency falls back to PG `idempotency_keys` table

## Notes

- TTL: 24 hours. Kafka log retention is 7 days; consumer-lag SLO is 1 hour. 24h gives 23h
  margin.
- Redis goes down → `IdempotencyService` falls back to `idempotency_keys` PG table (same
  pattern as `CacheConfig`). The PG insert uses `ON CONFLICT (event_id) DO NOTHING`.
- Scheduled audit: `IdempotencyAuditScheduler` emits `idempotency.consumer.coverage` metric.
  Alert fires if any `@KafkaListener` method is missing the wrapper.
- Producer-side `enable.idempotence=true` is also set in `producer.properties` — that
  prevents producer-side duplicates from network retries. Belt AND suspenders.
