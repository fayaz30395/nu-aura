# Operations Runbook

This runbook provides procedures for common operational tasks for the Nu-Aura HRMS platform.

## Table of Contents

1. [Health Checks](#health-checks)
2. [Cache Management](#cache-management)
3. [Webhook Operations](#webhook-operations)
4. [Database Operations](#database-operations)
5. [Log Analysis](#log-analysis)
6. [Incident Response](#incident-response)
7. [Deployment Procedures](#deployment-procedures)
8. [Backup and Recovery](#backup-and-recovery)

---

## Health Checks

### Checking Application Health

```bash
# Full health status (requires actuator access)
curl -s http://localhost:8080/actuator/health | jq

# Liveness probe (for Kubernetes)
curl -s http://localhost:8080/actuator/health/liveness

# Readiness probe (for Kubernetes)
curl -s http://localhost:8080/actuator/health/readiness
```

### Health Indicators

| Indicator | Description | Critical Thresholds |
|-----------|-------------|---------------------|
| `db` | Database connectivity | Connection timeout > 5s |
| `redis` | Redis cache connectivity | PING failure |
| `webhook` | Webhook delivery queue | Pending > 500, Success rate < 70% |
| `diskSpace` | Disk usage | Usage > 90% |

### Response to Health Failures

**Database Health Down:**
1. Check database connectivity: `psql -h $DB_HOST -U $DB_USER -c "SELECT 1"`
2. Verify connection pool: Check HikariCP metrics in `/actuator/metrics/hikaricp.connections.active`
3. Check for connection exhaustion or deadlocks
4. Restart application if connections are stuck

**Redis Health Down:**
1. Verify Redis is running: `redis-cli ping`
2. Check Redis memory: `redis-cli info memory`
3. Application continues with cache bypass, but expect higher DB load

**Webhook Health Warning/Down:**
1. Check pending queue size in Grafana
2. Review failed deliveries for common errors
3. Consider pausing problematic webhooks

---

## Cache Management

### Viewing Cache Status

```bash
# Redis connection status
redis-cli ping

# View all tenant cache keys
redis-cli keys "tenant:*"

# View cache memory usage
redis-cli info memory
```

### Cache Invalidation

**Invalidate Specific Tenant Cache:**
```bash
# Pattern: tenant:{tenantId}:*
redis-cli keys "tenant:550e8400-e29b-41d4-a716-446655440000:*" | xargs redis-cli del
```

**Invalidate Specific Cache Type:**
```bash
# All department caches
redis-cli keys "tenant:*:departments:*" | xargs redis-cli del

# All employee caches
redis-cli keys "tenant:*:employees:*" | xargs redis-cli del
```

**Full Cache Flush (Use with caution):**
```bash
# Flush all caches - will increase DB load temporarily
redis-cli flushall
```

### Cache TTL Configuration

| Cache | Default TTL | Override Property |
|-------|-------------|-------------------|
| leaveTypes | 24h | `cache.ttl.leave-types` |
| departments | 4h | `cache.ttl.departments` |
| holidays | 24h | `cache.ttl.holidays` |
| employeeBasic | 15m | `cache.ttl.employee-basic` |
| webhooks | 30m | `cache.ttl.webhooks` |

---

## Webhook Operations

### Viewing Webhook Status

```bash
# List all webhooks for a tenant
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/webhooks" | jq

# View webhook delivery history
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/webhooks/{webhookId}/deliveries" | jq
```

### Retry Failed Deliveries

```bash
# Retry specific delivery
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/webhooks/deliveries/{deliveryId}/retry"

# Retry all failed deliveries for a webhook
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/webhooks/{webhookId}/retry-all"
```

### Pause/Resume Webhook

```bash
# Pause webhook (stops all deliveries)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/webhooks/{webhookId}/pause"

# Resume webhook
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/webhooks/{webhookId}/resume"
```

### Webhook Troubleshooting

**High Failure Rate:**
1. Check target endpoint availability
2. Review error messages in delivery history
3. Verify webhook secret hasn't changed
4. Check circuit breaker state in Grafana

**Circuit Breaker Open:**
1. Circuit opens after 5 consecutive failures
2. Remains open for 30 seconds before half-open
3. Single success closes circuit
4. If endpoint is truly down, consider pausing webhook

**Signature Verification Failures (at receiver):**
```python
# Python example for verifying webhook signatures
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

---

## Database Operations

### Connection Pool Monitoring

```bash
# View active connections
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq

# View pending connections
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.pending | jq

# View connection pool size
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections.max | jq
```

### Slow Query Investigation

```sql
-- Find long-running queries (PostgreSQL)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- Kill a specific query
SELECT pg_terminate_backend(pid);
```

### Database Maintenance

```sql
-- Analyze tables for query optimization
ANALYZE employees;
ANALYZE webhook_deliveries;

-- View table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Clean up old webhook deliveries (> 30 days)
DELETE FROM webhook_deliveries
WHERE created_at < NOW() - INTERVAL '30 days'
AND status IN ('DELIVERED', 'FAILED');
```

### Tenant Data Queries

```sql
-- List all tenants
SELECT id, name, subdomain, status FROM tenants;

-- Count records by tenant
SELECT tenant_id, COUNT(*) FROM employees GROUP BY tenant_id;

-- Check tenant isolation (should return 0)
SELECT COUNT(*) FROM employees e1, employees e2
WHERE e1.id = e2.id AND e1.tenant_id != e2.tenant_id;
```

---

## Log Analysis

### Finding Logs by Correlation ID

```bash
# Search logs by correlation ID
grep "correlationId\":\"abc-123" /var/log/hrms/application.log

# Using jq for JSON logs
cat /var/log/hrms/application.json | jq 'select(.correlationId == "abc-123")'
```

### Common Log Patterns

**Authentication Failures:**
```bash
grep "Authentication failed" /var/log/hrms/application.log | tail -20
```

**Webhook Delivery Errors:**
```bash
grep "Webhook delivery failed" /var/log/hrms/application.log | tail -20
```

**Slow Queries (if enabled):**
```bash
grep "SlowQuery" /var/log/hrms/application.log
```

### Log Levels

Runtime log level adjustment:
```bash
# Set DEBUG for specific package
curl -X POST "http://localhost:8080/actuator/loggers/com.nulogic.hrms.webhook" \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": "DEBUG"}'

# Reset to default
curl -X POST "http://localhost:8080/actuator/loggers/com.nulogic.hrms.webhook" \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": null}'
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 | Complete outage | 15 minutes | Database down, API unresponsive |
| P2 | Major degradation | 1 hour | Login failures, webhook queue backed up |
| P3 | Minor issue | 4 hours | Single tenant cache issues |
| P4 | Low impact | 24 hours | Dashboard metric discrepancy |

### P1 Incident Checklist

1. **Acknowledge** - Notify on-call team
2. **Assess** - Check health endpoints, logs, metrics
3. **Communicate** - Update status page
4. **Mitigate** - Apply immediate fix or rollback
5. **Resolve** - Confirm full recovery
6. **Document** - Create post-mortem

### Common Incident Scenarios

**API Unresponsive:**
1. Check pod/container status
2. Verify database connectivity
3. Check for memory/CPU exhaustion
4. Review recent deployments
5. Consider rollback

**High Error Rate:**
1. Check error logs for stack traces
2. Identify affected endpoints
3. Check downstream dependencies
4. Verify recent config changes

**Database Connection Exhaustion:**
1. Check HikariCP metrics
2. Look for connection leaks in logs
3. Identify long-running transactions
4. Consider temporary pool increase
5. Restart pods to clear stuck connections

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Database migrations reviewed
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] On-call notified

### Rolling Deployment

```bash
# Kubernetes rolling update
kubectl set image deployment/hrms-backend hrms=hrms:v1.2.3 --record

# Monitor rollout
kubectl rollout status deployment/hrms-backend

# Rollback if needed
kubectl rollout undo deployment/hrms-backend
```

### Database Migration

```bash
# Run Flyway migrations
./gradlew flywayMigrate

# Check migration status
./gradlew flywayInfo

# Rollback last migration (if undo script exists)
./gradlew flywayUndo
```

### Post-Deployment Verification

1. Check health endpoints return UP
2. Verify key user flows in staging
3. Monitor error rates for 15 minutes
4. Check Grafana dashboards for anomalies

---

## Backup and Recovery

### Database Backup

```bash
# Full database backup
pg_dump -h $DB_HOST -U $DB_USER -d hrms > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h $DB_HOST -U $DB_USER -d hrms | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Database Restore

```bash
# Restore from backup
psql -h $DB_HOST -U $DB_USER -d hrms < backup_20250210.sql

# Restore compressed backup
gunzip -c backup_20250210.sql.gz | psql -h $DB_HOST -U $DB_USER -d hrms
```

### Point-in-Time Recovery

For production, use PostgreSQL WAL archiving:
```bash
# Recover to specific timestamp
recovery_target_time = '2025-02-10 14:30:00 UTC'
```

### Redis Backup

```bash
# Trigger RDB snapshot
redis-cli bgsave

# Check save status
redis-cli lastsave
```

---

## Monitoring Quick Reference

### Key Grafana Dashboards

| Dashboard | Purpose |
|-----------|---------|
| HRMS Overview | General application health |
| HRMS Webhooks | Webhook delivery metrics |
| JVM Metrics | Memory, GC, threads |
| PostgreSQL | Database performance |

### Critical Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| High Error Rate | > 5% for 5min | Investigate error logs |
| Pod Memory High | > 85% | Check for memory leaks |
| Webhook Queue Depth | > 500 | Check failing endpoints |
| Database Connections | > 80% | Review connection usage |
| Response Time p99 | > 2s | Performance investigation |

### Useful Actuator Endpoints

```bash
# Application info
curl http://localhost:8080/actuator/info

# Environment properties
curl http://localhost:8080/actuator/env

# Thread dump
curl http://localhost:8080/actuator/threaddump

# Heap dump (use carefully)
curl -o heapdump.hprof http://localhost:8080/actuator/heapdump

# Prometheus metrics
curl http://localhost:8080/actuator/prometheus
```

---

## Contact Information

| Role | Contact |
|------|---------|
| On-Call Engineer | #hrms-oncall Slack channel |
| Platform Team | platform@nulogic.com |
| Database Team | dba@nulogic.com |

---

*Last updated: February 2026*
