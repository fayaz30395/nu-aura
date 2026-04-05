# Incident Response Runbook

## Purpose

General incident handling template for the NU-AURA platform. Covers severity classification,
communication protocols, escalation paths, and post-incident review.

---

## Severity Classification

| Level | Name     | Definition                             | Response Time | Examples                                                                 |
|-------|----------|----------------------------------------|---------------|--------------------------------------------------------------------------|
| P0    | Critical | Platform-wide outage or data loss risk | 15 min        | Application down, DB corruption, auth broken, payroll data loss          |
| P1    | High     | Major feature broken for all users     | 30 min        | Payroll run fails, attendance ingestion stopped, Kafka consumers stalled |
| P2    | Medium   | Feature degraded or broken for subset  | 2 hours       | Slow API responses, notification delivery failures, single-tenant issue  |
| P3    | Low      | Minor issue, workaround exists         | 8 hours       | UI cosmetic bug, non-critical scheduler skipped one run, stale cache     |

---

## Communication Template

### Initial Alert (Slack/Email)

```
INCIDENT: [P0/P1/P2/P3] — [Short Description]
Time detected: [UTC timestamp]
Impact: [What users/tenants are affected and how]
Current status: Investigating / Mitigating / Resolved
Incident lead: [Name]
Next update: [Time, typically 30 min for P0/P1]
```

### Status Update

```
UPDATE [N] — [P0/P1/P2/P3] — [Short Description]
Status: Investigating / Root cause identified / Mitigation in progress / Resolved
What we know: [1-3 bullet points]
What we're doing: [Current actions]
Next update: [Time]
```

---

## Escalation Path

```
On-call Engineer (0-15 min)
  |
  v
Engineering Lead (15-30 min, if P0/P1)
  |
  v
CTO / VP Eng (30-60 min, if P0 unresolved)
```

---

## Incident Response Steps

### 1. Detection and Triage

```bash
# Check application health
curl -s http://localhost:8080/actuator/health | jq .

# Check Prometheus alerts
# Navigate to Prometheus UI: http://prometheus:9090/alerts

# Check recent error logs
kubectl logs -l app=hrms-backend --tail=200 | grep -i error

# Check Grafana dashboards
# System Overview: http://grafana:3000/d/hrms-overview
# API Metrics: http://grafana:3000/d/hrms-api-metrics
```

### 2. Assess Impact

```sql
-- Check affected tenants (run on read replica if available)
SELECT t.name, t.id, COUNT(u.id) as user_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name
ORDER BY user_count DESC;

-- Check recent error audit entries
SELECT event_type, COUNT(*), MAX(created_at)
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
AND event_type LIKE '%ERROR%'
GROUP BY event_type;
```

### 3. Contain the Incident

**If API is overloaded:**

```bash
# Check connection pool usage
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq .

# Check thread pool
curl -s http://localhost:8080/actuator/metrics/jvm.threads.live | jq .
```

**If a specific tenant is causing issues:**

```sql
-- Identify high-activity tenants
SELECT tenant_id, COUNT(*) as request_count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY tenant_id
ORDER BY request_count DESC
LIMIT 10;
```

**If Kafka consumers are stalled:**

```bash
# Check consumer group lag
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group hrms-approval-consumer
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group hrms-notification-consumer
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group hrms-audit-consumer
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group hrms-employee-lifecycle-consumer
```

### 4. Mitigate

**Restart the application (K8s):**

```bash
kubectl rollout restart deployment/hrms-backend -n hrms
kubectl rollout status deployment/hrms-backend -n hrms --timeout=300s
```

**Scale up if under load:**

```bash
kubectl scale deployment/hrms-backend --replicas=3 -n hrms
```

**Kill long-running DB queries:**

```sql
-- Find long-running queries (>30 seconds)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
AND state != 'idle'
ORDER BY duration DESC;

-- Cancel a specific query (non-destructive)
SELECT pg_cancel_backend(<pid>);

-- Terminate if cancel doesn't work (use with caution)
-- SELECT pg_terminate_backend(<pid>);
```

### 5. Resolve and Verify

```bash
# Verify application health after fix
curl -s http://localhost:8080/actuator/health | jq .

# Verify no active alerts
# Check Prometheus: http://prometheus:9090/alerts

# Verify key metrics are back to normal
# Check Grafana dashboards
```

### 6. Post-Incident Review (PIR)

Conduct within 48 hours for P0/P1 incidents. Document:

1. **Timeline** -- What happened, when, in chronological order
2. **Root cause** -- Technical root cause, not blame
3. **Impact** -- Tenants affected, duration, data impact
4. **Detection** -- How was the incident detected? Alert? User report?
5. **Response** -- What was done to resolve? Was the runbook helpful?
6. **Action items** -- Specific follow-ups to prevent recurrence, assigned with deadlines

---

## Key Monitoring Links

| Dashboard          | URL                        | Purpose                                         |
|--------------------|----------------------------|-------------------------------------------------|
| System Overview    | `/d/hrms-overview`         | App status, JVM, DB pool, request rate          |
| API Metrics        | `/d/hrms-api-metrics`      | Request rate, latency, errors by endpoint       |
| Business Metrics   | `/d/hrms-business-metrics` | Employee, leave, payroll, attendance KPIs       |
| Webhook Deliveries | `/d/hrms-webhooks`         | Webhook success rate, latency, circuit breakers |
| Prometheus Alerts  | `/alerts`                  | Active and pending alerts                       |

## Key Actuator Endpoints

| Endpoint               | Purpose                      |
|------------------------|------------------------------|
| `/actuator/health`     | Application health check     |
| `/actuator/metrics`    | All available metrics        |
| `/actuator/prometheus` | Prometheus scrape endpoint   |
| `/actuator/info`       | Application info and version |
