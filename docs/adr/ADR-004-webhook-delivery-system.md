# ADR-004: Reliable Webhook Delivery with Circuit Breaker

## Status
Accepted

## Context
The HRMS platform needs to notify external systems about events (employee changes, leave approvals, etc.) through webhooks. Requirements:
- At-least-once delivery guarantee
- Resilience against failing endpoints
- Signature verification for security
- Delivery tracking and retry mechanisms

### Options Considered

1. **Synchronous Delivery** - Block until delivery complete
2. **Message Queue** - RabbitMQ/Kafka for delivery
3. **Database-backed Async** - Store deliveries, async processing

## Decision
We chose **Option 3: Database-backed Async Delivery** with circuit breaker pattern.

## Rationale

### Why Database-backed?
- **Durability**: Deliveries survive application restarts
- **Auditability**: Complete delivery history for debugging
- **Simplicity**: No additional message queue infrastructure
- **Idempotency**: Database constraint prevents duplicates

### Why Not Message Queue?
- Added operational complexity not justified
- Current scale doesn't require message queue throughput
- Database approach provides sufficient reliability

## Implementation

### Delivery Flow
```
1. Event occurs (e.g., employee created)
2. Domain event published via ApplicationEventPublisher
3. WebhookDeliveryService receives event
4. For each subscribed webhook:
   a. Create WebhookDelivery record (PENDING)
   b. Attempt immediate delivery
   c. On success: Update status to DELIVERED
   d. On failure: Schedule retry with exponential backoff
```

### Circuit Breaker
```java
CircuitBreaker circuitBreaker = new CircuitBreaker(
    "webhook-" + webhookId,
    5,      // failure threshold
    2,      // success threshold to close
    Duration.ofSeconds(30)  // half-open timeout
);

if (!circuitBreaker.allowRequest()) {
    // Schedule retry instead of attempting delivery
    delivery.setStatus(RETRYING);
    delivery.setNextRetryAt(now.plusMinutes(5));
}
```

### States
| State | Behavior |
|-------|----------|
| CLOSED | Normal operation, requests pass through |
| OPEN | All requests fail fast, no delivery attempts |
| HALF_OPEN | Allow single request to test recovery |

### Retry Strategy (Exponential Backoff)
| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 15 minutes |
| 5 | 1 hour |

After 5 failures, webhook is paused (status = PAUSED).

### HMAC Signature
```java
String signature = "sha256=" + HmacUtils.hmacSha256Hex(
    webhookSecret,
    payload
);
headers.set("X-Webhook-Signature", signature);
```

### Idempotency
Each event has a unique `eventId`. Deliveries are deduplicated:
```sql
CREATE UNIQUE INDEX idx_delivery_idempotency
ON webhook_deliveries(webhook_id, event_id);
```

## Delivery Headers
```
X-Webhook-Signature: sha256=abc123...
X-Webhook-Event-Id: evt-550e8400-...
X-Webhook-Event-Type: EMPLOYEE_CREATED
X-Webhook-Timestamp: 1704978600000
Content-Type: application/json
```

## Monitoring

### Metrics
| Metric | Description |
|--------|-------------|
| `webhook.delivery.success` | Successful deliveries |
| `webhook.delivery.failure` | Failed deliveries |
| `webhook.delivery.duration` | Delivery latency histogram |
| `webhook.circuit.open` | Circuit breaker open events |

### Alerting
- Circuit breaker open for > 5 minutes
- Delivery success rate < 90%
- Delivery queue depth > 1000

## Consequences

### Positive
- Reliable at-least-once delivery
- Graceful degradation with circuit breaker
- Complete audit trail
- Simple operational model

### Negative
- Database storage for delivery history
- Scheduled job required for retries
- Potential delayed delivery during outages

### Mitigations
- Retention policy: Delete deliveries older than 30 days
- Retry scheduler runs every minute
- Manual retry endpoint for urgent cases

## Related Decisions
- ADR-001: Multi-Tenant Architecture
- ADR-003: Caching Strategy
