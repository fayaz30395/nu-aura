# Observability Documentation Index

This directory contains comprehensive observability documentation for the NU-AURA HRMS platform.

## Quick Navigation

### For Getting Started (5 minutes)
1. Start here: **[OBSERVABILITY_QUICK_START.md](./OBSERVABILITY_QUICK_START.md)**
   - Quick start commands
   - Health check examples
   - Basic Prometheus queries
   - Common troubleshooting

### For Complete Reference (30 minutes)
2. Read next: **[OBSERVABILITY.md](./OBSERVABILITY.md)**
   - Architecture overview
   - All health indicators
   - Complete metrics catalog
   - Logging configuration
   - Kubernetes deployment
   - Alerting rules
   - Advanced troubleshooting

### For Implementation Details
3. Check: **[../OBSERVABILITY_CHANGES.md](../OBSERVABILITY_CHANGES.md)**
   - What was changed
   - How it was implemented
   - Backward compatibility notes
   - Future enhancements

## Key Endpoints

### Health Checks
- `/actuator/health` - Overall application health
- `/actuator/health/liveness` - Container restart decisions (minimal checks)
- `/actuator/health/readiness` - Load balancer decisions (comprehensive checks)
- `/actuator/health/db` - Database connectivity
- `/actuator/health/redis` - Redis connectivity
- `/actuator/health/diskSpace` - Disk space availability
- `/actuator/health/application` - JVM metrics and uptime

### Metrics
- `/actuator/prometheus` - Prometheus-format metrics export
- `http://localhost:9090` - Prometheus web UI (when running with docker-compose)

### Application Info
- `/actuator/info` - Application version and build information

## Quick Reference

### Health Groups

| Endpoint | Use Case | Probes |
|----------|----------|--------|
| `/health/liveness` | Container restart | ping |
| `/health/readiness` | Load balancer | db, redis, diskSpace |

### Key Metrics

| Metric | Purpose | Tags |
|--------|---------|------|
| `auth_login_success` | Track successful logins | method |
| `auth_login_failure` | Track failed logins | method, reason |
| `http.server.requests` | API performance | method, status, uri |
| `workflow_executions` | Workflow tracking | tenant_id, type, status |
| `cache.hits` / `cache.misses` | Cache performance | cache |
| `jvm_memory_used_bytes` | Memory usage | area |

### Prometheus Queries

**Login Success Rate**
```promql
rate(auth_login_success[5m]) / rate(auth_login[5m])
```

**API Latency (p95)**
```promql
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))
```

**Database Query Rate**
```promql
rate(db_queries_total[5m])
```

**Cache Hit Ratio**
```promql
sum(cache_hits) / sum(cache_accesses)
```

## Implementation Checklist

### Development
- [ ] Run `docker-compose up -d` to start Prometheus
- [ ] Verify health endpoints: `curl http://localhost:8080/actuator/health`
- [ ] Access Prometheus UI: `http://localhost:9090`
- [ ] Run queries to verify metrics collection

### Pre-Deployment
- [ ] Review alerting rules (in OBSERVABILITY.md)
- [ ] Configure log aggregation tool (Datadog/Splunk/ELK/CloudWatch)
- [ ] Plan retention policies
- [ ] Set up on-call alerts

### Kubernetes Deployment
- [ ] Update deployment YAML with liveness probe
- [ ] Update deployment YAML with readiness probe
- [ ] Configure Prometheus ServiceMonitor
- [ ] Set up log forwarding

## File Structure

```
docs/
├── OBSERVABILITY_INDEX.md          ← You are here
├── OBSERVABILITY_QUICK_START.md    ← Start with 5 min guide
└── OBSERVABILITY.md                ← Complete reference

../
└── OBSERVABILITY_CHANGES.md        ← Implementation details
└── prometheus.yml                  ← Prometheus config
└── docker-compose.yml              ← Updated with Prometheus
```

## Key Files in Backend

### Configuration
- `backend/src/main/resources/application.yml` - Health groups, metrics config
- `backend/src/main/resources/logback-spring.xml` - Structured logging

### Code
- `backend/src/main/java/com/hrms/common/metrics/MetricsService.java` - Metrics service
- `backend/src/main/java/com/hrms/common/config/MetricsConfig.java` - Metrics beans
- `backend/src/main/java/com/hrms/common/config/CacheMetricsConfig.java` - Cache metrics
- `backend/src/main/java/com/hrms/common/health/` - Health indicators
- `backend/src/main/java/com/hrms/application/auth/service/AuthService.java` - Auth metrics

## Troubleshooting Quick Links

### In OBSERVABILITY_QUICK_START.md
- Service unreachable?
- Metrics not appearing?
- High memory usage?
- Database health issues?

### In OBSERVABILITY.md
- Health Check Fails section
- Missing Metrics section
- Performance Impact section

## Support & References

### Official Documentation
- [Spring Boot Actuator](https://spring.io/guides/gs/actuator-service/)
- [Micrometer Metrics](https://micrometer.io/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Logstash Encoder](https://github.com/logfellow/logstash-logback-encoder)

### Related Documents
- Architecture: See `docs/build-kit/` for system design
- Deployment: See kubernetes manifests in infrastructure repo
- Monitoring: See alerting rules in OBSERVABILITY.md

## Recent Changes

**March 11, 2026** - Initial Implementation v1.0
- Added health groups (liveness/readiness probes)
- Expanded business metrics
- Integrated auth metrics
- Added Prometheus to docker-compose
- Created comprehensive documentation

## Future Enhancements

- OpenTelemetry integration for distributed tracing
- Service mesh observability (Istio/Linkerd)
- Custom application dashboards
- Anomaly detection alerts
- Database slow query automatic tracing

---

**Last Updated**: March 11, 2026
**Status**: Complete and Production Ready
**Version**: 1.0.0
