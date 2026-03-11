# Observability Quick Start

## Starting the Stack

```bash
# Start all services including Prometheus
docker-compose up -d

# Verify services are healthy
curl http://localhost:8080/actuator/health
curl http://localhost:9090
```

## Health Checks

### Quick Health Status

```bash
# Overall health
curl http://localhost:8080/actuator/health

# Liveness probe (for container restarts)
curl http://localhost:8080/actuator/health/liveness

# Readiness probe (for load balancer)
curl http://localhost:8080/actuator/health/readiness

# Specific service health
curl http://localhost:8080/actuator/health/db
curl http://localhost:8080/actuator/health/redis
curl http://localhost:8080/actuator/health/diskSpace
```

## Metrics

### Prometheus Web UI

Open: `http://localhost:9090`

### Query Examples

#### Login activity
```promql
# Login success rate (last 5 minutes)
sum(rate(auth_login_success[5m])) / sum(rate(auth_login{status=~"success|failure"}[5m]))

# Failed logins per minute
rate(auth_login_failure[1m])
```

#### API performance
```promql
# Request latency (95th percentile)
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))

# Requests per second
sum(rate(http_server_requests_seconds_count[1m]))
```

#### Database performance
```promql
# Database query rate
rate(db_queries_total[5m])

# Slow database queries
rate(http_server_requests_seconds_bucket{le="1"}[5m])
```

#### Cache performance
```promql
# Cache hit ratio
sum(cache_hits) / sum(cache_accesses)

# Cache miss rate
rate(cache_misses[5m])
```

## Viewing Logs

### Development

Console output (colored):
```bash
docker logs -f hrms-backend | grep -i "auth\|error"
```

### Production JSON Logs

Access via log aggregation tool (Datadog, Splunk, ELK, CloudWatch):

```json
{
  "@timestamp": "2026-03-11T10:45:23.456Z",
  "message": "User login successful",
  "level": "INFO",
  "logger": "com.hrms.application.auth.service.AuthService",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "550e8400-e29b-41d4-a716-446655440001",
  "correlationId": "req-12345-67890",
  "application": "hrms-backend"
}
```

## Adding Metrics to Code

### Record a counter (event count)

```java
@Autowired
private MetricsService metricsService;

// In your service
metricsService.recordLoginSuccess("google");
metricsService.recordApprovalTask(tenantId, "leave_request", "approved");
metricsService.recordFileUpload(tenantId, "pdf", fileSize);
```

### Record a timer (duration)

```java
Duration duration = Duration.ofMillis(System.currentTimeMillis() - startTime);
metricsService.recordWorkflowExecution(tenantId, "leave_approval", "success", duration);
```

### Record a gauge (snapshot value)

```java
metricsService.recordActiveUsers(currentActiveCount);
```

## Monitoring Checklist

### Development
- [ ] Login failures tracked
- [ ] API response times visible
- [ ] Cache hit/miss ratios improving
- [ ] No database timeouts
- [ ] Memory usage reasonable

### Pre-Production
- [ ] All health probes responding
- [ ] Metrics scraping working
- [ ] Log aggregation configured
- [ ] Alert rules defined
- [ ] Performance baselines established

### Production
- [ ] Liveness probes healthy
- [ ] Readiness probes passing
- [ ] Prometheus retention configured
- [ ] Log retention policies set
- [ ] On-call alerts active

## Troubleshooting

### Service unreachable?

```bash
docker ps | grep hrms
docker logs hrms-backend
curl http://localhost:8080/actuator/health
```

### Metrics not appearing?

```bash
# Check metrics endpoint directly
curl http://localhost:8080/actuator/prometheus | grep "your_metric_name"

# Check Prometheus targets
# Visit http://localhost:9090/targets
```

### High memory usage?

```bash
# Get JVM memory status
curl http://localhost:8080/actuator/health/application | jq .details

# Query memory growth
# In Prometheus: jvm_memory_used_bytes{area="heap"}
```

### Database health issues?

```bash
# Check database health
curl http://localhost:8080/actuator/health/db | jq .

# Check database directly
psql -h localhost -U hrms -d hrms_dev -c "SELECT 1;"
```

## Reference Documentation

- **Full Guide**: [docs/OBSERVABILITY.md](./OBSERVABILITY.md)
- **Health Checks**: Spring Boot Actuator docs
- **Metrics**: Micrometer documentation
- **Prometheus**: https://prometheus.io/docs/

## Common Alerts to Set Up

1. **High error rate**: `rate(api_errors[5m]) > 10`
2. **Database down**: `up{job="hrms-backend"} == 0`
3. **High memory**: `jvm_memory_used_bytes{area="heap"} > max * 0.9`
4. **Login failures**: `rate(auth_login_failure[5m]) / rate(auth_login[5m]) > 0.1`
5. **Slow requests**: `histogram_quantile(0.95, http_server_requests_seconds_bucket) > 1.0`
