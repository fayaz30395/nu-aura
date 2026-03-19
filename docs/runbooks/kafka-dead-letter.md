# Kafka Dead Letter Queue (DLQ) Runbook

## Purpose

Procedures for inspecting, triaging, replaying, and discarding Kafka events that have exhausted all retry attempts and landed in a dead letter topic (DLT). DLT events indicate processing failures that could not be recovered automatically.

---

## Architecture Overview

```
Producer --> Topic (e.g., nu-aura.approvals)
                |
                v
            Consumer (3 retries, exponential backoff)
                |
                | (all retries exhausted)
                v
            DLT Topic (e.g., nu-aura.approvals.dlt)
                |
                v
            DeadLetterHandler
                |
                +--> Prometheus counter: kafka_dlt_messages_total{topic="..."}
                +--> DB: failed_kafka_events table (PENDING_REPLAY)
                +--> Structured log: [DLT_ALERT]
```

### DLT Topics

| DLT Topic | Source Topic | Consumer Group |
|-----------|-------------|---------------|
| `nu-aura.approvals.dlt` | `nu-aura.approvals` | `hrms-approval-consumer` |
| `nu-aura.notifications.dlt` | `nu-aura.notifications` | `hrms-notification-consumer` |
| `nu-aura.audit.dlt` | `nu-aura.audit` | `hrms-audit-consumer` |
| `nu-aura.employee-lifecycle.dlt` | `nu-aura.employee-lifecycle` | `hrms-employee-lifecycle-consumer` |

### Event Lifecycle

```
PENDING_REPLAY  -->  REPLAYED  (admin replays to original topic)
       |
       +--->  IGNORED   (admin dismisses as non-recoverable)
```

---

## 1. Detection

DLT events trigger alerts. Check for:

- **Prometheus alert**: `KafkaDeadLetterReceived` or `KafkaDeadLetterAccumulating`
- **Grafana**: Business Metrics dashboard > check notification/workflow panels for anomalies
- **Application logs**: Search for `[DLT]` or `[DLT_ALERT]` log markers

```bash
# Search logs for DLT events
kubectl logs -l app=hrms-backend --tail=500 | grep "\[DLT\]"

# Check DLT metrics directly
curl -s http://localhost:8080/actuator/prometheus | grep kafka_dlt_messages
```

---

## 2. Inspect Failed Events

### Via Admin API (Preferred)

```bash
# List all PENDING_REPLAY events (default view)
curl -s "http://localhost:8080/api/v1/admin/kafka/failed-events" \
  -H "Authorization: Bearer <admin_jwt_token>" | jq .

# List events for a specific status
curl -s "http://localhost:8080/api/v1/admin/kafka/failed-events?status=PENDING_REPLAY&size=50" \
  -H "Authorization: Bearer <admin_jwt_token>" | jq .

# Get details for a specific event
curl -s "http://localhost:8080/api/v1/admin/kafka/failed-events/<event_id>" \
  -H "Authorization: Bearer <admin_jwt_token>" | jq .

# List suspected poison pills (replayed >3 times and still failing)
curl -s "http://localhost:8080/api/v1/admin/kafka/poison-pills" \
  -H "Authorization: Bearer <admin_jwt_token>" | jq .
```

### Via Database

```sql
-- Count pending events by topic
SELECT topic, COUNT(*) as pending_count
FROM failed_kafka_events
WHERE status = 'PENDING_REPLAY'
GROUP BY topic
ORDER BY pending_count DESC;

-- Inspect recent DLT events
SELECT id, topic, partition, "offset", status,
       payload, payload_truncated, error_message,
       replay_count, created_at, replayed_at
FROM failed_kafka_events
WHERE status = 'PENDING_REPLAY'
ORDER BY created_at DESC
LIMIT 20;

-- Find poison pills (replayed multiple times, still pending)
SELECT id, topic, replay_count, payload, created_at
FROM failed_kafka_events
WHERE replay_count > 3
AND status = 'PENDING_REPLAY'
ORDER BY replay_count DESC;
```

---

## 3. Triage Decision Tree

```
Is the event payload valid JSON?
  |
  +-- No --> IGNORE (corrupted/malformed message)
  |
  +-- Yes --> Can the root cause be identified?
                |
                +-- No --> IGNORE with investigation ticket
                |
                +-- Yes --> Has the root cause been fixed?
                              |
                              +-- No --> Fix first, then REPLAY
                              |
                              +-- Yes --> REPLAY
```

### Common Root Causes

| Topic | Common Failure | Fix | Action |
|-------|---------------|-----|--------|
| `approvals.dlt` | Missing workflow definition | Create the workflow_def | Replay |
| `approvals.dlt` | Assignee user not found | Verify user exists, check tenant_id | Fix data, replay |
| `notifications.dlt` | Invalid email address | Fix the user's email | Replay |
| `notifications.dlt` | SMTP provider timeout | Transient -- safe to replay | Replay |
| `audit.dlt` | Payload too large | Truncated payload stored | Ignore (audit event lost) |
| `employee-lifecycle.dlt` | Missing employee record | Check if employee was deleted | Depends |

---

## 4. Replay Events

### Single Event Replay

```bash
# Replay a specific event to its original topic
curl -X POST "http://localhost:8080/api/v1/admin/kafka/replay/<event_id>" \
  -H "Authorization: Bearer <admin_jwt_token>"

# Expected: 204 No Content (success)
# 404: Event not found
# 409: Not in PENDING_REPLAY status, or poison pill guard (replayed >3 times)
```

### Batch Replay (Manual Process)

There is no bulk replay API to prevent accidental mass replay. For batch operations:

```sql
-- Step 1: Identify events to replay
SELECT id, topic, payload
FROM failed_kafka_events
WHERE status = 'PENDING_REPLAY'
AND topic = '<specific_dlt_topic>'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at;

-- Step 2: Replay each one via API (scripted)
-- for id in $(list_of_ids); do
--   curl -X POST "http://localhost:8080/api/v1/admin/kafka/replay/$id" \
--     -H "Authorization: Bearer <token>"
-- done
```

---

## 5. Ignore Events

### Single Event

```bash
# Mark an event as IGNORED (will not appear in PENDING_REPLAY queue)
curl -X POST "http://localhost:8080/api/v1/admin/kafka/ignore/<event_id>" \
  -H "Authorization: Bearer <admin_jwt_token>"

# Expected: 204 No Content
```

### Bulk Ignore (by Topic)

Use when an entire DLT topic contains known poison pills:

```bash
# Ignore all PENDING_REPLAY events for a specific topic
curl -X POST "http://localhost:8080/api/v1/admin/kafka/ignore-topic?topic=nu-aura.approvals.dlt" \
  -H "Authorization: Bearer <admin_jwt_token>" | jq .

# Response: {"topic": "nu-aura.approvals.dlt", "updatedCount": 42}
```

---

## 6. Verify After Replay

After replaying events, verify they were processed successfully:

```bash
# Check that no new DLT events appeared (i.e., replay didn't fail again)
curl -s "http://localhost:8080/api/v1/admin/kafka/failed-events?status=PENDING_REPLAY&size=5" \
  -H "Authorization: Bearer <admin_jwt_token>" | jq '.totalElements'

# Check application logs for successful processing
kubectl logs -l app=hrms-backend --tail=100 | grep "<event_id_or_entity_id>"
```

```sql
-- Verify the business action was completed
-- (example: for an approval event, check if the approval was processed)
SELECT id, status, completed_at
FROM approval_instances
WHERE id = '<entity_id_from_event_payload>';
```

---

## 7. Preventive Measures

### Monitor DLT Metrics

- **Alert**: `KafkaDeadLetterReceived` fires on any DLT arrival
- **Alert**: `KafkaDeadLetterAccumulating` fires when >10 in an hour (systemic issue)
- **Metric**: `kafka_dlt_messages_total{topic="..."}` -- track trend over time

### Regular DLQ Review

Schedule a weekly review of pending DLT events:

```sql
-- Weekly DLQ summary
SELECT topic,
       COUNT(*) FILTER (WHERE status = 'PENDING_REPLAY') as pending,
       COUNT(*) FILTER (WHERE status = 'REPLAYED') as replayed,
       COUNT(*) FILTER (WHERE status = 'IGNORED') as ignored,
       MIN(created_at) as oldest_pending
FROM failed_kafka_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY topic;
```

### Consumer Health Check

```bash
# Check consumer group lag for all groups
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups

# Check if consumers are assigned partitions
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe \
  --group hrms-approval-consumer
```

---

## 8. Emergency: DLT Consumer Stalled

If the DLT consumer itself is stalled (events piling up in DLT topics without being persisted):

```bash
# Step 1: Check DLT consumer group
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe \
  --group hrms-dlt-handler

# Step 2: If lag is growing, restart the application
kubectl rollout restart deployment/hrms-backend -n hrms

# Step 3: If still stalled, check for deserialization errors in logs
kubectl logs -l app=hrms-backend --tail=500 | grep "dltListenerContainerFactory\|DeadLetterHandler"
```
