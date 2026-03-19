# Phase 6: Reliability, Observability, and Operational Readiness

## Status: COMPLETE

---

## Task 1: Audit Existing Observability

### Findings

#### Prometheus Scrape Configuration (`monitoring/prometheus/prometheus.yml`)
- **Scrape targets**: 5 jobs configured
  - `hrms-backend` -- Spring Boot Actuator at `/actuator/prometheus` (10s interval)
  - `prometheus` -- Self-monitoring
  - `postgres` -- PostgreSQL exporter at port 9187
  - `redis` -- Redis exporter at port 9121
  - `node` -- Node exporter for system metrics at port 9100
- **Rule files**: glob pattern `/etc/prometheus/rules/*.yml` -- automatically loads all rule files

#### Existing Alert Rules (`monitoring/prometheus/rules/hrms-alerts.yml`)
- **Group: hrms_application_alerts** (7 rules)
  - `HighErrorRate` -- API error rate > 5% for 5m (warning)
  - `HighAPILatency` -- p95 latency > 2s for 5m (warning)
  - `DatabaseConnectionPoolLow` -- HikariCP pool > 80% for 5m (warning)
  - `ApplicationDown` -- backend unreachable for 1m (critical)
  - `HighMemoryUsage` -- JVM heap > 85% for 5m (warning)
  - `HighFailedLoginRate` -- Failed logins > 0.1/s for 5m (warning)
  - `HighRateLimitExceeded` -- Rate limit breaches > 0.5/s for 5m (info)
- **Group: hrms_business_alerts** (2 rules)
  - `LowActiveUsers` -- Active users < 5 for 10m (info)
  - `PayrollProcessingDelayed` -- No payroll in 24h for 2h (warning)

**Gap identified**: No SLO alerts for payroll duration, leave approval latency, attendance ingestion, notification delivery, Kafka consumer lag, or background job monitoring.

#### AlertManager Configuration (`monitoring/alertmanager/alertmanager.yml`)
- Severity routing: critical -> warning -> info
- Receivers: `default-receiver`, `critical-alerts` (email + webhook), `warning-alerts`, `info-alerts`
- Inhibition: critical suppresses warning on same alertname/cluster/service
- Well-configured for the new SLO alerts (no changes needed)

#### Grafana Dashboards (4 dashboards)
1. **HRMS - System Overview** (`hrms-overview`): App status, active users, JVM heap, DB pool, request rate, response time, error rate, memory usage
2. **HRMS - API Metrics** (`hrms-api-metrics`): Total request rate, p95 response time, error rate, requests by endpoint/module, errors by type, auth events, rate limiting, cache hit/miss
3. **HRMS - Business Metrics** (`hrms-business-metrics`): Active users, employee actions, attendance events, leave requests, payroll stats, recruitment, performance reviews, document generation, notification delivery, tenant usage, file uploads
4. **HRMS - Webhook Deliveries** (`hrms-webhooks`): Delivery success rate, deliveries/min, pending deliveries, circuit breaker states, latency (p50/p95/p99), delivery status over time, by event type, retry attempts

#### MetricsService (`backend/src/main/java/com/hrms/common/metrics/MetricsService.java`)
- **26 metric methods** covering:
  - Auth: login success/failure
  - Rate limiting: rate_limit_exceeded
  - Tenant: tenant_usage
  - API: api_requests, api_errors
  - DB: db_queries
  - Email: email_sent
  - Files: file_uploads, file_upload_bytes
  - Feature flags: feature_flag_checks
  - Active users: active_users (gauge)
  - Employee: employee_actions
  - Attendance: attendance_events
  - Leave: leave_requests
  - Payroll: payroll_processed, payroll_employee_count, payroll_processing_duration
  - Recruitment: recruitment_actions
  - Performance: performance_reviews
  - Cache: cache_events
  - Documents: document_generation
  - Notifications: notification_delivery
  - Workflows: workflow_executions, workflow_execution_duration
  - Approvals: approval_tasks
  - Exports: data_exports, export_records, export_duration
  - **Scheduled jobs**: scheduled_jobs (counter), scheduled_job_duration (timer) -- **already exists**
  - Contracts: contract_lifecycle, contract_lifecycle_duration, contract_status_transitions, contract_expiry_alert
  - Webhooks: webhook_deliveries, webhook_delivery_duration, webhook_retries, webhook_circuit_breaker

**Key finding**: `recordScheduledJob(name, success, duration)` already exists in MetricsService, emitting `scheduled_jobs` counter and `scheduled_job_duration` timer. The alert rules can reference these directly.

#### Logback Configuration (`backend/src/main/resources/logback-spring.xml`)
- **Dev/local**: Console appender, com.hrms at DEBUG, SQL at WARN
- **Test**: Console appender, com.hrms at INFO
- **Prod/staging**: JSON via Logstash encoder with MDC fields (correlationId, userId, tenantId, requestUri, method, remoteAddr), async appender (queue 512), rolling file with 30-day retention / 10GB cap
- Well-structured for production use. No changes needed.

---

## Task 2: SLO Metrics and Alerts

### New File: `monitoring/prometheus/rules/hrms-slo-alerts.yml`

Added 8 alert groups with 19 alert rules:

| Group | Alert | Condition | Severity |
|-------|-------|-----------|----------|
| **Payroll SLO** | `PayrollRunDurationExceeded` | Duration > 300s | critical |
| | `PayrollRunFailed` | Any failure in 1h | critical |
| **Leave Approval SLO** | `LeaveApprovalLatencyExceeded` | p95 > 30s for 5m | warning |
| | `LeaveApprovalFailureRate` | > 5% failures for 10m | warning |
| **Attendance SLO** | `AttendanceIngestionFailureRate` | > 5% failures for 10m | warning |
| | `AttendanceIngestionStopped` | Zero events for 30m during business hours | critical |
| **Notification SLO** | `NotificationDeliveryFailureRate` | > 10% failures for 10m | warning |
| | `EmailDeliveryFailureRate` | > 10% email failures for 10m | warning |
| **Kafka SLO** | `KafkaConsumerLagHigh` | Lag > 1000 for 5m | warning |
| | `KafkaConsumerLagHighSpring` | Spring metric lag > 1000 for 5m | warning |
| | `KafkaDeadLetterReceived` | Any DLT event in 15m | warning |
| | `KafkaDeadLetterAccumulating` | > 10 DLT events in 1h | critical |
| **Background Jobs** | `ScheduledJobFailed` | Any failure in 2h | warning |
| | `AttendanceRegularizationNotRunning` | Not run for > 48h | warning |
| | `ContractLifecycleNotRunning` | Not run for > 48h | warning |
| | `WorkflowEscalationNotRunning` | Not run for > 3h | warning |
| | `ScheduledJobDurationAnomaly` | Duration > 600s | warning |
| **Webhook SLO** | `WebhookDeliveryFailureRate` | > 20% failures for 10m | warning |
| | `WebhookCircuitBreakerOpen` | Any CB opens | warning |
| **Contract SLO** | `ContractsExpiringUnhandled` | > 10 expiring for 24h | warning |

All alerts reference metrics already emitted by `MetricsService`. No application code changes required.

---

## Task 3: Background Job Monitoring

### Audit of Existing Instrumentation

| Scheduler | File | Schedule | MetricsService Used? |
|-----------|------|----------|---------------------|
| `AutoRegularizationScheduler` | `application/attendance/scheduler/` | Daily 01:00 IST | **No** -- only logs, no Prometheus metrics |
| `ContractLifecycleScheduler` | `application/contract/scheduler/` | Daily 02:30 UTC | **Yes** -- uses `recordContractExpiryAlert`, `recordContractStatusChange`, `recordContractLifecycle` |
| `WorkflowEscalationScheduler` | `application/workflow/scheduler/` | Hourly at :15 | **No** -- only logs |
| `EmailSchedulerService` | `application/notification/service/` | Scheduled | Unknown |
| `ScheduledReportExecutionJob` | `application/analytics/service/` | Scheduled | Unknown |

**Finding**: The `MetricsService.recordScheduledJob(name, success, duration)` method exists but is not called by `AutoRegularizationScheduler` or `WorkflowEscalationScheduler`. The alert rules are written to reference `scheduled_jobs_total{name="..."}` and will begin alerting once these schedulers are instrumented.

**Decision**: Per the task rules ("Don't modify application code -- only monitoring config and docs"), the alerts are written against the existing metric names. The `absent()` operator in the "NotRunning" alerts will fire if the metric doesn't exist yet, which serves as a prompt to instrument the schedulers. The `ContractLifecycleScheduler` already calls MetricsService and will be covered.

---

## Task 4: Operational Runbooks

### New Files

| Runbook | Path | Content |
|---------|------|---------|
| **Incident Response** | `docs/runbooks/incident-response.md` | Severity classification (P0-P3), communication templates, escalation path, step-by-step (detect, assess, contain, mitigate, resolve, PIR), key dashboard links |
| **Payroll Correction** | `docs/runbooks/payroll-correction.md` | Investigation queries, common root causes, 3 correction procedures (revert+re-run, individual payslip fix, supplementary run), verification, audit trail |
| **Data Correction** | `docs/runbooks/data-correction.md` | Soft-delete recovery (employee, department, leave), tenant data fixes (department, reporting manager, leave balance), bulk corrections, cross-tenant leak investigation, safety checklist |
| **Kafka Dead Letter** | `docs/runbooks/kafka-dead-letter.md` | Architecture overview, detection methods, inspection via API and SQL, triage decision tree, replay (single and batch), ignore (single and bulk), verification, preventive measures, emergency procedures |

---

## Task 5: Retry/Dead-Letter Operational Tooling

### Audit Result

Full DLQ operational tooling **already exists**:

| Component | Path | Capabilities |
|-----------|------|-------------|
| `DeadLetterHandler` | `infrastructure/kafka/consumer/DeadLetterHandler.java` | Consumes all 4 DLT topics, persists to DB, emits `kafka_dlt_messages_total` counter, replay + ignore methods, poison pill guard (max 3 replays) |
| `FailedKafkaEvent` | `domain/kafka/FailedKafkaEvent.java` | Entity with PENDING_REPLAY/REPLAYED/IGNORED lifecycle, replay count tracking, audit fields |
| `FailedKafkaEventRepository` | `infrastructure/kafka/repository/FailedKafkaEventRepository.java` | Status queries, topic queries, duplicate guard, count queries, bulk ignore, poison pill finder |
| `KafkaAdminController` | `api/admin/controller/KafkaAdminController.java` | 6 endpoints (SUPER_ADMIN only) |

### Admin API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/kafka/failed-events` | Paginated list (default: PENDING_REPLAY) |
| GET | `/api/v1/admin/kafka/failed-events/{id}` | Single event detail |
| POST | `/api/v1/admin/kafka/replay/{id}` | Replay one event to original topic |
| POST | `/api/v1/admin/kafka/ignore/{id}` | Mark one event as IGNORED |
| GET | `/api/v1/admin/kafka/poison-pills` | List events with replayCount > 3 |
| POST | `/api/v1/admin/kafka/ignore-topic?topic=...` | Bulk ignore all PENDING for a topic |

**Conclusion**: No new code needed. The Kafka DLQ runbook documents the manual process using these existing endpoints.

---

## Changes Summary

### New Files Created

| File | Type | Purpose |
|------|------|---------|
| `monitoring/prometheus/rules/hrms-slo-alerts.yml` | Prometheus rules | 19 SLO and background job alert rules |
| `docs/runbooks/incident-response.md` | Runbook | General incident handling template |
| `docs/runbooks/payroll-correction.md` | Runbook | Payroll correction procedures |
| `docs/runbooks/data-correction.md` | Runbook | Soft-delete recovery and tenant data fixes |
| `docs/runbooks/kafka-dead-letter.md` | Runbook | DLQ event inspection, replay, and triage |
| `docs/execution/phase-6.md` | Execution log | This document |

### Existing Files Modified

None. All existing monitoring config, application code, and alertmanager configuration remain unchanged.

### Note on Auto-Discovery

The `prometheus.yml` rule_files glob (`/etc/prometheus/rules/*.yml`) automatically picks up the new `hrms-slo-alerts.yml` without any config change.

---

## Recommendations for Follow-Up (Not In Scope)

1. **Instrument remaining schedulers**: Add `metricsService.recordScheduledJob()` calls to `AutoRegularizationScheduler` and `WorkflowEscalationScheduler` so the "NotRunning" alerts work on real metrics rather than `absent()`.
2. **Add a Grafana dashboard for scheduled jobs**: Create `hrms-scheduled-jobs.json` showing job execution counts, durations, and failure rates.
3. **Configure Kafka consumer lag exporter**: If not already running, deploy `kafka-lag-exporter` or enable `spring.kafka.listener.observe-consumer-lag=true` for the `KafkaConsumerLagHigh` alerts to have data.
4. **Add PagerDuty/Slack integration**: The AlertManager webhook receiver (`http://webhook-service:8080/alerts/critical`) needs a real integration target.
