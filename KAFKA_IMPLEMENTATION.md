# Kafka Event Streaming Implementation for NU-AURA HRMS

## Overview

This document describes the Kafka-based event streaming implementation for the NU-AURA HRMS platform. The system replaces ad-hoc webhooks with a robust, scalable, and observable event-driven architecture.

## Architecture

### Event Flow

```
Domain Event (e.g., ApprovalDecisionEvent)
    ↓
EventPublisher (sends to Kafka)
    ↓
Kafka Topic (e.g., nu-aura.approvals)
    ↓
Kafka Consumer (e.g., ApprovalEventConsumer)
    ↓
Domain-specific handler (e.g., deduct leave balance)
    ↓
Acknowledgment (offset commit)
```

### Topics

The platform publishes and consumes events on four primary topics:

| Topic | Purpose | Partitions | Retention | Consumer Group |
|-------|---------|-----------|-----------|----------------|
| `nu-aura.approvals` | Approval workflow decisions (LEAVE, EXPENSE, ASSET, WIKI_PAGE) | 3 | 24h | `nu-aura-approvals-service` |
| `nu-aura.notifications` | Notifications via EMAIL, PUSH, IN_APP, SMS channels | 5 | 24h | `nu-aura-notifications-service` |
| `nu-aura.audit` | Audit trail for all domain actions | 10 | 30d | `nu-aura-audit-service` |
| `nu-aura.employee-lifecycle` | Employee milestones (HIRED, ONBOARDED, PROMOTED, TRANSFERRED, OFFBOARDED) | 2 | 24h | `nu-aura-employee-lifecycle-service` |

Each topic has a corresponding dead letter topic (`.dlt` suffix) for failed messages.

## Event Types

### 1. ApprovalEvent
Published when an approval workflow completes (APPROVED or REJECTED).

**Metadata by type:**
- **LEAVE**: `leaveRequestId`, `leaveType`, `days`, `leaveBalance`
- **EXPENSE**: `expenseClaimId`, `amount`, `category`, `paymentMethod`
- **ASSET**: `assetId`, `assetType`, `employeeId`
- **WIKI_PAGE**: `pageId`, `pageTitle`

**Consumer**: `ApprovalEventConsumer`
- On APPROVED (terminal): Deduct leave balance, update expense status, activate asset, publish wiki page
- On REJECTED: Log for audit; notification sent separately

### 2. NotificationEvent
Published to send notifications across multiple channels.

**Channels:**
- **EMAIL**: Uses templates and rendered data
- **PUSH**: Mobile/web push notifications
- **IN_APP**: In-app notification database records
- **SMS**: SMS via Twilio or similar

**Features:**
- Template-based rendering
- Exponential backoff retry on failure
- Priority levels (HIGH, NORMAL, LOW)
- Related entity tracking for linking

**Consumer**: `NotificationEventConsumer`
- Routes to channel-specific handlers
- Implements retry logic with exponential backoff
- Moves to DLT after max retries

### 3. AuditEvent
Published asynchronously for all significant domain actions.

**Captured fields:**
- User ID, action, entity type/ID
- Before/after state (as JSON)
- Request context (IP, user agent, method, URI)
- Execution metrics (duration, status code)

**Features:**
- Batch processing for high throughput
- Never blocks business operations (fire-and-forget)
- 30-day retention for compliance

**Consumer**: `AuditEventConsumer`
- Accumulates events in batches
- Bulk inserts to audit_logs table
- Logs errors but never throws (ensures high availability)

### 4. EmployeeLifecycleEvent
Published for major employee milestones.

**Event types:**
- **HIRED**: Employee record created
- **ONBOARDED**: Employee starts work (create leave balances, assign tasks)
- **PROMOTED**: Job title/compensation changed
- **TRANSFERRED**: Department/location/manager changed
- **OFFBOARDED**: Employee leaves (disable access, collect documents)

**Metadata examples:**
```json
// PROMOTED
{
  "oldJobTitle": "Junior Developer",
  "newJobTitle": "Senior Developer",
  "salaryIncrease": 50000,
  "effectiveDate": "2026-04-01"
}

// TRANSFERRED
{
  "oldDepartment": "Engineering",
  "newDepartment": "Product",
  "oldLocation": "Delhi",
  "newLocation": "Mumbai",
  "oldReportingManager": "uuid-1",
  "newReportingManager": "uuid-2"
}
```

**Consumer**: `EmployeeLifecycleConsumer`
- Creates leave balances on ONBOARDED
- Updates compensation on PROMOTED
- Manages access and document flow on OFFBOARDED
- Triggers downstream service integrations

## Event Publishing

### Using EventPublisher

```java
@Service
public class ApprovalService {
    @Autowired
    private EventPublisher eventPublisher;

    public void approveLeaveRequest(UUID requestId, UUID approverId) {
        // ... business logic ...

        eventPublisher.publishApprovalEvent(
            requestId,                          // approvalId
            taskId,                             // taskId
            "LEAVE",                            // approvalType
            "APPROVED",                         // status
            tenantId,
            approverId,
            requesterId,
            "Approved as requested",            // comments
            true,                               // isTerminal
            Map.of(
                "leaveRequestId", requestId.toString(),
                "leaveType", "SICK_LEAVE",
                "days", 3,
                "leaveBalance", 7
            )                                   // metadata
        );
    }
}
```

### From Domain Events

The `ApprovalDecisionEvent` (and other domain events) published via Spring's `ApplicationEventPublisher` can be forwarded to Kafka:

```java
// In WorkflowService.java
this.applicationEventPublisher.publishEvent(
    ApprovalDecisionEvent.of(
        this,
        tenantId,
        execution,
        step,
        "APPROVED",
        userId,
        comments
    )
);

// A separate listener can convert to Kafka:
@EventListener
public void onApprovalDecision(ApprovalDecisionEvent event) {
    eventPublisher.publishApprovalEvent(...);
}
```

## Event Consuming

### Idempotent Processing

Each consumer maintains an in-memory cache of processed event IDs. For distributed deployments, upgrade to Redis:

```java
// TODO: Implement distributed idempotency
// Redis key: "processed-events:" + eventId
// Value: timestamp
// TTL: 7 days
```

### Manual Acknowledgment

Consumers use manual offset commit (`AckMode.MANUAL`) to ensure offset only advances after successful processing:

```java
@KafkaListener(topics = KafkaTopics.APPROVALS, ...)
public void handleApprovalEvent(
    @Payload ApprovalEvent event,
    Acknowledgment acknowledgment) {

    try {
        processEvent(event);
        acknowledgment.acknowledge();  // Commit offset
    } catch (Exception e) {
        // Don't acknowledge; Kafka retries
        log.error("Processing failed", e);
        throw e;
    }
}
```

### Batch Processing (Audit Service)

Audit events use batch accumulation for efficiency:

```java
// Accumulate 50 events before persisting
synchronized (eventBatch) {
    eventBatch.add(event);
    if (eventBatch.size() >= BATCH_SIZE) {
        persistAuditBatch(eventBatch);
        eventBatch.clear();
    }
}
```

## Dead Letter Handling

Messages that fail all retries are moved to dead letter topics and handled by `DeadLetterHandler`:

1. **Logged**: Full error context logged at ERROR level
2. **Stored**: Failed event persisted to `failed_events` table (for manual inspection)
3. **Alerted**: Alert sent to monitoring system (Slack, PagerDuty, etc.)
4. **Replayed**: Via API endpoint to manually retry specific events

```java
// Replay a failed event
POST /api/kafka/dlt/replay/{failedEventId}
?targetTopic=nu-aura.approvals
```

## Configuration

### Docker Compose

Kafka is pre-configured in `docker-compose.yml`:

```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://kafka:9092
      # ... (see docker-compose.yml for full config)
```

### Application Properties

Set via environment variables or `kafka.properties`:

```properties
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092
SPRING_KAFKA_PRODUCER_ACKS=all
SPRING_KAFKA_CONSUMER_AUTO_OFFSET_RESET=earliest
```

## Monitoring & Observability

### Metrics

Spring Boot Actuator exposes Kafka metrics:

```
GET http://localhost:8080/actuator/metrics

# Example metrics
kafka.consumer.bytes-consumed-total
kafka.consumer.fetch-latency-avg
kafka.consumer.records-lag
kafka.producer.record-send-total
kafka.producer.record-error-total
```

### Logging

Set log levels in `application.yml`:

```yaml
logging:
  level:
    org.apache.kafka: WARN
    org.springframework.kafka: INFO
    com.hrms.infrastructure.kafka: DEBUG
```

### Health Checks

Kafka health is exposed via Actuator:

```
GET /actuator/health/kafka
```

## Integration Checklist

- [ ] Add `spring-kafka` dependency to `pom.xml`
- [ ] Update `application.yml` with Kafka bootstrap servers
- [ ] Start Kafka: `docker-compose up -d zookeeper kafka`
- [ ] Integrate EventPublisher into approval/notification/employee services
- [ ] Implement domain-specific handlers in consumers (see TODO comments)
- [ ] Add failed_events table schema for DLT handling
- [ ] Create Redis keys for distributed idempotency (if multi-instance)
- [ ] Set up monitoring dashboards (Prometheus/Grafana)
- [ ] Configure alerts for DLT messages

## Common Integration Points

### Approval Service
```java
@Service
public class ApprovalService {
    @Autowired
    private EventPublisher eventPublisher;

    public void completeApprovalTask(UUID taskId, String decision) {
        // ... workflow logic ...
        eventPublisher.publishApprovalEvent(...);
    }
}
```

### Notification Service
```java
@Service
public class NotificationService {
    @Autowired
    private EventPublisher eventPublisher;

    public void sendApprovalNotification(UUID userId, String message) {
        eventPublisher.publishNotificationEvent(
            userId,
            "EMAIL",
            "Approval Update",
            message,
            null, null, tenantId, ...
        );
    }
}
```

### Employee Service
```java
@Service
public class EmployeeService {
    @Autowired
    private EventPublisher eventPublisher;

    public void onboardEmployee(UUID employeeId, LocalDate startDate) {
        // ... create employee ...
        eventPublisher.publishEmployeeLifecycleEvent(
            employeeId,
            "ONBOARDED",
            ...
        );
    }
}
```

## Production Considerations

1. **Multi-broker setup**: Use 3+ Kafka brokers with replication factor 3 for HA
2. **Distributed idempotency**: Migrate from in-memory to Redis
3. **Monitoring**: Configure Prometheus scraping and Grafana dashboards
4. **Alerting**: Set up PagerDuty/Slack integration for DLT messages
5. **Retention policies**: Adjust based on compliance requirements
6. **Backup**: Regular Kafka broker snapshots for disaster recovery
7. **Performance tuning**: Adjust partitions, batch sizes, compression based on throughput
8. **Schema registry**: Consider Confluent Schema Registry for versioning (future)

## Troubleshooting

### Consumer lag increasing
- Increase consumer concurrency: `spring.kafka.listener.concurrency`
- Increase batch size: `spring.kafka.consumer.max-poll-records`
- Add more partitions to topic
- Check downstream service performance (database, API calls)

### Messages in DLT
- Inspect `failed_events` table for error details
- Check consumer logs for root cause
- Fix underlying issue (missing dependency, database connection, etc.)
- Replay via `/api/kafka/dlt/replay/{eventId}`

### High latency
- Check Kafka broker CPU/memory
- Reduce message size or enable compression
- Increase network bandwidth

## References

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Spring Kafka Documentation](https://spring.io/projects/spring-kafka)
- [Event-Driven Architecture Pattern](https://microservices.io/patterns/data/event-driven-architecture.html)
