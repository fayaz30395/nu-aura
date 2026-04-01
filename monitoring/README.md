# NU-AURA Monitoring Stack

Prometheus + Grafana + AlertManager observability stack for the NU-AURA platform.

## Components

| Component | Port | Purpose |
|-----------|------|---------|
| Prometheus | 9090 | Metrics scraping and storage |
| Grafana | 3001 | Dashboards and visualization |
| AlertManager | 9093 | Alert routing and notification |

## Quick Start

```bash
# Start with the main docker-compose (from repo root)
docker-compose up -d

# Prometheus is included in the default compose file
# For Grafana + AlertManager, use the monitoring compose:
cd monitoring
docker-compose up -d
```

## Prometheus

### Scrape Targets
- Spring Boot Actuator (`localhost:8080/actuator/prometheus`)
- Node Exporter (optional, `localhost:9100`)
- Redis Exporter (optional, `localhost:9121`)

### Alert Rules

**28 alert rules** in `prometheus/rules/`:

| Category | Count | Examples |
|----------|-------|---------|
| Application | 9 | High error rate, high latency, app down, failed logins |
| SLO | 19 | Availability, latency percentiles, error budgets |

Key alerts:
- API error rate > 5% for 5 minutes
- API latency p95 > 500ms
- Database connection pool > 90%
- Kafka consumer lag > 1000 messages
- Memory usage > 90%
- Rate limit breaches

## Grafana

### Dashboards (4)

1. **HRMS Overview** — Application health, request rate, error rate
2. **API Metrics** — Per-endpoint latency, throughput, error breakdown
3. **Business Metrics** — Active users, attendance, leave, payroll, recruitment
4. **Webhooks** — Webhook delivery success/failure rates

Dashboard JSON files in `grafana/dashboards/`. Auto-provisioned via `grafana/provisioning/`.

### Custom Metrics

```
# Authentication
auth_login_total{status="success|failure"}
auth_login_duration_seconds

# Business
hrms_active_users_total
hrms_attendance_clockin_total
hrms_leave_requests_total{status="pending|approved|rejected"}
hrms_payroll_runs_total
hrms_recruitment_candidates_total

# API
http_server_requests_seconds{method, uri, status}

# System
jvm_memory_used_bytes
hikaricp_connections_active
```

## AlertManager

Configured in `alertmanager/alertmanager.yml`:
- Severity-based routing (critical → immediate, warning → grouped)
- Email and Slack receivers (configure in alertmanager.yml)
- Inhibition rules to prevent alert storms

## Production Considerations

- Change default Grafana credentials (admin/admin)
- Enable HTTPS for all monitoring endpoints
- Consider Prometheus federation or remote storage (Thanos/Cortex) for HA
- Set up proper alert notification channels (PagerDuty, Slack, email)
