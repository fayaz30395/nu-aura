# Production Observability Guide

This document describes the observability stack for the NU-AURA HRMS platform.

## Architecture Overview

The platform implements a comprehensive observability stack including:

- **Health Checks**: Spring Boot Actuator with custom health indicators
- **Metrics**: Micrometer Prometheus exporter
- **Structured Logging**: JSON logging via Logstash encoder (production)
- **Container Orchestration**: Prometheus for metrics scraping

## Health Checks

### Endpoints

Health information is exposed via Spring Boot Actuator:

```
GET /actuator/health
GET /actuator/health/liveness
GET /actuator/health/readiness
```

### Health Groups

#### Liveness Probe (`/actuator/health/liveness`)

Used for container restart decisions. Checks if the application is still running.

- **Probes**: `ping` only
- **Use Case**: Kubernetes liveness probe configuration
- **Quick Response**: Minimal overhead, very fast response

```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

#### Readiness Probe (`/actuator/health/readiness`)

Used for load balancer decisions. Checks if the application is ready to accept traffic.

- **Probes**: `db` (PostgreSQL), `redis`, `diskSpace`
- **Use Case**: Kubernetes readiness probe configuration
- **Dependencies**: Only traffic when all dependencies are healthy

```yaml
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Health Indicators

#### ApplicationHealthIndicator
- **Component**: JVM/Runtime information
- **Metrics**: Uptime, heap memory usage, available processors
- **Thresholds**:
  - Warning: >80% heap usage
  - Critical: >95% heap usage (returns DOWN)

#### DatabaseHealthIndicator
- **Component**: PostgreSQL connectivity
- **Metrics**: Response time, connection status
- **Thresholds**:
  - Warning: Response time >100ms

#### RedisHealthIndicator
- **Component**: Redis connectivity
- **Metrics**: PING response, memory usage (if available)
- **Thresholds**:
  - Warning: Response time >50ms

#### WebhookHealthIndicator
- **Component**: Webhook delivery system
- **Metrics**: Pending queue depth, success rate (last hour)
- **Thresholds**:
  - Warning: >100 pending deliveries OR <90% success rate
  - Critical: >500 pending deliveries OR <70% success rate

## Metrics

### Endpoints

Prometheus-format metrics are exposed at:

```
GET /actuator/prometheus
```

### Business Metrics

#### Authentication
- `auth_login`: Login attempts (tagged: `status=success|failure`, `method=password|google`)
- `auth_login_success`: Successful logins
- `auth_login_failure`: Failed login attempts
- `auth_google_sso_total`: Google SSO attempts
- `rate_limit_exceeded_total`: Rate limit violations

#### API Requests
- `http.server.requests`: HTTP request metrics (automatic via Micrometer)
  - Tags: `method`, `status`, `uri`
  - Quantiles: 50th, 95th, 99th percentile
  - SLOs: 50ms, 100ms, 200ms, 500ms, 1s, 2s

#### Workflows & Approvals
- `workflow_executions`: Workflow execution count (tagged: `tenant_id`, `type`, `status`)
- `workflow_execution_duration`: Execution duration histogram
- `approval_tasks`: Approval task events (tagged: `tenant_id`, `type`, `action`)

#### HR Operations
- `employee_actions`: Employee-related actions (tagged: `tenant_id`, `action`)
- `attendance_events`: Attendance punch-in/out events (tagged: `tenant_id`, `event_type`)
- `leave_requests`: Leave request events (tagged: `tenant_id`, `status`)
- `payroll_processed`: Payroll runs completed (tagged: `tenant_id`)
- `payroll_employee_count`: Employees processed in last payroll run
- `payroll_processing_duration`: Payroll execution time
- `performance_reviews`: Performance review events (tagged: `tenant_id`, `review_type`, `status`)

#### Data Operations
- `file_uploads`: File upload count (tagged: `tenant_id`, `type`)
- `file_upload_bytes`: Total bytes uploaded (tagged: `tenant_id`, `type`)
- `data_exports`: Data export events (tagged: `tenant_id`, `type`)
- `export_records`: Records exported (tagged: `tenant_id`, `type`)
- `export_duration`: Export execution time

#### System Operations
- `tenant_usage`: Tenant-level usage counters (tagged: `tenant_id`, `operation`)
- `api_requests`: API requests by module (tagged: `module`, `operation`)
- `api_errors`: API errors (tagged: `endpoint`, `error_type`, `status_code`)
- `db_queries`: Database queries (tagged: `operation`, `table`)
- `email_sent`: Email delivery (tagged: `type`, `success`)

#### Caching
- `cache.hits`: Cache hit count (tagged: `cache`)
- `cache.misses`: Cache miss count (tagged: `cache`)
- `cache.accesses`: Total cache accesses (tagged: `cache`)
- `cache.latency`: Cache operation latency (tagged: `cache`)

#### Notifications & Webhooks
- `notification_delivery`: Notification send events (tagged: `channel`, `success`)
- `webhook_deliveries`: Webhook delivery count
- `webhook_pending`: Pending webhook deliveries (gauge)
- `webhook_success_rate`: Last hour webhook success rate

#### Feature Flags
- `feature_flag_checks`: Feature flag evaluations (tagged: `feature`, `enabled`)

#### Scheduled Jobs
- `scheduled_jobs`: Job execution count (tagged: `name`, `success`)
- `scheduled_job_duration`: Job execution duration

### Metric Tags

All metrics include standard tags for filtering and alerting:

- `application`: Application name (from `spring.application.name`)
- `region`: Deployment region (from `METRICS_REGION` env var, defaults to "default")
- `tenant_id`: Tenant identifier (multi-tenant isolation)
- `environment`: Active Spring profiles (injected from `SPRING_PROFILES_ACTIVE`)

## Structured Logging

### Configuration

Logging is configured in `logback-spring.xml` with profile-specific behavior:

#### Development Profile (`dev`)
- **Output**: Colored console output
- **Format**: Human-readable with timestamp, level, logger, message
- **Level**: DEBUG for `com.hrms.*`, INFO for Spring/Hibernate
- **Example**:
```
2026-03-11 10:45:23.456 DEBUG [main] com.hrms.application.auth.service.AuthService : User login successful for user@example.com
```

#### Production Profile (`prod`, `production`, `staging`)
- **Output**: JSON to stdout (for container log aggregation) + file backup
- **Format**: Logstash JSON encoder
- **Level**: INFO for applications, WARN for frameworks
- **JSON Fields**:
  - `@timestamp`: Event timestamp (UTC)
  - `message`: Log message
  - `logger`: Logger name
  - `level`: Log level
  - `thread`: Thread name
  - `stack_trace`: Exception stack trace (if applicable)
  - `correlationId`: Request correlation ID (if available)
  - `userId`: User ID from security context (if available)
  - `tenantId`: Tenant ID from context (if available)
  - `requestUri`: HTTP request URI
  - `method`: HTTP method (GET, POST, etc.)
  - `remoteAddr`: Client IP address
  - `application`: "hrms-backend"
  - `environment`: Active profiles

### MDC (Mapped Diagnostic Context)

The application uses MDC to populate context fields in logs:

```java
MDC.put("correlationId", UUID.randomUUID().toString());
MDC.put("userId", userPrincipal.getId());
MDC.put("tenantId", TenantContext.getCurrentTenant());
MDC.put("requestUri", request.getRequestURI());
MDC.put("method", request.getMethod());
MDC.put("remoteAddr", request.getRemoteAddr());
```

These fields are automatically included in all logs within the request context.

### Log Aggregation

For production deployments, consume JSON logs from stdout using:

- **Datadog**: Import JSON format natively
- **Splunk**: Use JSON sourcetype
- **ELK Stack**: Logstash input plugin for JSON
- **CloudWatch**: Log Insights for JSON parsing
- **Google Cloud Logging**: Native JSON support

Example production startup with log aggregation:

```bash
# Send logs to Datadog
docker run \
  -e SPRING_PROFILES_ACTIVE=prod \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -l com.datadoghq.tags.service=hrms-backend \
  -l com.datadoghq.tags.version=1.0.0 \
  hrms-backend:latest
```

## Prometheus Integration

### Setup

Prometheus is included in `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

Start with:

```bash
docker-compose up -d prometheus
```

### Access Prometheus UI

Navigate to: `http://localhost:9090`

### Scrape Configuration

Backend metrics are scraped from `/actuator/prometheus`:

```yaml
scrape_configs:
  - job_name: 'hrms-backend'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['backend:8080']
    scrape_interval: 10s
```

### Sample Queries

#### Login Failures

```promql
rate(auth_login{status="failure"}[5m])
```

#### API Request Latency (p95)

```promql
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))
```

#### Workflow Success Rate

```promql
sum(rate(workflow_executions{status="success"}[5m]))
/
sum(rate(workflow_executions[5m]))
```

#### Database Query Rate

```promql
rate(db_queries_total[5m])
```

#### Cache Hit Ratio

```promql
sum(cache_hits) / sum(cache_accesses)
```

#### Webhook Delivery Status

```promql
notification_delivery{channel="webhook", success="true"}
```

## Alerting Rules

### Recommended Alert Conditions

```yaml
groups:
  - name: hrms_alerts
    rules:
      # Application health
      - alert: HighMemoryUsage
        expr: |
          jvm_memory_used_bytes{area="heap"}
          /
          jvm_memory_max_bytes{area="heap"} > 0.85
        for: 5m

      # Authentication issues
      - alert: HighLoginFailureRate
        expr: |
          rate(auth_login_failure[5m])
          /
          (rate(auth_login_success[5m]) + rate(auth_login_failure[5m])) > 0.1
        for: 5m

      # API performance
      - alert: SlowAPIRequests
        expr: |
          histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m])) > 1.0
        for: 10m

      # Database connectivity
      - alert: DatabaseDown
        expr: up{job="hrms-backend"} == 0
        for: 1m

      # Webhook delivery
      - alert: WebhookQueueDepth
        expr: webhook_pending > 500
        for: 10m
```

## Kubernetes Integration

### Liveness & Readiness Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hrms-backend
spec:
  template:
    spec:
      containers:
      - name: hrms-backend
        image: hrms-backend:latest
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
```

### Prometheus ServiceMonitor (Prometheus Operator)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hrms-backend
spec:
  selector:
    matchLabels:
      app: hrms-backend
  endpoints:
  - port: metrics
    path: /actuator/prometheus
    interval: 30s
```

## Performance Considerations

### Metric Cardinality

Be careful with high-cardinality tags:

- ✅ Good: `method=POST,status=200` (limited values)
- ❌ Bad: `user_id=<uuid>` (unbounded cardinality)

### Sampling

For high-volume endpoints, consider sampling:

```java
@Scheduled(fixedRate = 1000)
public void sampleMetrics() {
    // Sample every 1000th request instead of all
}
```

### Garbage Collection

Monitor GC pauses via JVM metrics:

```promql
rate(jvm_gc_pause_seconds_sum[5m])
```

## Troubleshooting

### Health Check Fails

1. Check individual health endpoints:
   ```bash
   curl http://localhost:8080/actuator/health/db
   curl http://localhost:8080/actuator/health/redis
   curl http://localhost:8080/actuator/health/diskSpace
   ```

2. Review logs:
   ```bash
   docker logs hrms-backend | grep -i health
   ```

### Missing Metrics

1. Verify Prometheus scraping:
   - Navigate to http://localhost:9090/targets
   - Check scrape status for `hrms-backend`

2. Check metric names:
   ```bash
   curl http://localhost:8080/actuator/prometheus | grep auth_login
   ```

### Performance Impact

1. Reduce scrape frequency in `prometheus.yml`:
   ```yaml
   scrape_interval: 30s  # increased from 15s
   ```

2. Disable slow query logging:
   ```yaml
   spring.jpa.properties.hibernate.session.events.log.LOG_QUERIES_SLOWER_THAN_MS: 5000
   ```

3. Reduce log level:
   ```yaml
   logging.level.com.hrms: WARN
   ```

## References

- [Spring Boot Actuator Documentation](https://spring.io/guides/gs/actuator-service/)
- [Micrometer Documentation](https://micrometer.io/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Logstash Logback Encoder](https://github.com/logfellow/logstash-logback-encoder)
- [Kubernetes Probe Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
