# HRMS Monitoring Stack

This directory contains the monitoring and observability setup for the HRMS Platform using Prometheus, Grafana, and AlertManager.

## Components

### Prometheus
- **Port**: 9090
- **Purpose**: Metrics collection and storage
- **Retention**: 30 days
- **Scrape Interval**: 15 seconds

### Grafana
- **Port**: 3001
- **Purpose**: Visualization and dashboards
- **Default Credentials**: admin/admin (change on first login)
- **Dashboards Included**:
  - HRMS Overview - System health and performance
  - API Metrics - API performance and errors
  - Business Metrics - Business KPIs and operational metrics

### AlertManager
- **Port**: 9093
- **Purpose**: Alert routing and management
- **Configuration**: See `alertmanager/alertmanager.yml`

### Optional Exporters
- **Node Exporter** (Port 9100): System/host metrics
- **PostgreSQL Exporter** (Port 9187): Database metrics
- **Redis Exporter** (Port 9121): Cache metrics
- **cAdvisor** (Port 8081): Container metrics

## Quick Start

### 1. Environment Variables

Create a `.env` file in the monitoring directory:

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password

# PostgreSQL Exporter
POSTGRES_USER=hrms_user
POSTGRES_PASSWORD=hrms_pass
POSTGRES_HOST=localhost
POSTGRES_DB=hrms

# Redis Exporter
REDIS_HOST=localhost
REDIS_PORT=6379

# AlertManager Email
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 2. Start the Monitoring Stack

```bash
# Start all services
docker-compose up -d

# Start only essential services (Prometheus + Grafana)
docker-compose up -d prometheus grafana

# View logs
docker-compose logs -f
```

### 3. Access Dashboards

- **Prometheus UI**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **AlertManager**: http://localhost:9093

### 4. Verify Metrics Collection

1. Ensure HRMS backend is running on port 8080
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify HRMS backend is in "UP" state
4. Access Grafana and view pre-configured dashboards

## Configuration

### Update Prometheus Targets

Edit `prometheus/prometheus.yml` to update scrape targets:

```yaml
scrape_configs:
  - job_name: 'hrms-backend'
    static_configs:
      - targets: ['your-backend-host:8080']
```

### Update Alert Rules

Edit `prometheus/rules/hrms-alerts.yml` to customize alerts.

### Update AlertManager

Edit `alertmanager/alertmanager.yml` to configure notification channels:
- Email
- Slack
- PagerDuty
- Webhooks

## Grafana Dashboards

### HRMS Overview (`hrms-overview.json`)
- Application status
- Active users
- JVM heap usage
- Database connection pool
- Request rate and response times
- Error rates
- Memory usage

### API Metrics (`hrms-api-metrics.json`)
- Total request rate
- Average response time (p95)
- Error rate
- Request rate by endpoint
- HTTP status codes distribution
- API requests by module
- Authentication events
- Rate limiting events
- Cache hit/miss ratio

### Business Metrics (`hrms-business-metrics.json`)
- Active users
- Employee actions
- Attendance events
- Leave requests
- Payroll processing
- Recruitment activity
- Performance reviews
- Document generation
- Notification delivery
- Tenant usage
- File upload volume

## Custom Metrics

The HRMS application exports custom business metrics:

### Authentication Metrics
- `auth_login_total` - Total login attempts
- `auth_login{status="success"}` - Successful logins
- `auth_login{status="failure"}` - Failed logins

### Business Metrics
- `active_users` - Current active users
- `employee_actions_total{action="..."}` - Employee actions
- `attendance_events_total{event_type="..."}` - Attendance events
- `leave_requests_total{status="..."}` - Leave requests
- `payroll_processed_total` - Payroll runs
- `recruitment_actions_total{action="..."}` - Recruitment activities
- `performance_reviews_total` - Performance reviews

### API Metrics
- `api_requests_total{module="...", operation="..."}` - API requests by module
- `api_errors_total{endpoint="...", error_type="..."}` - API errors
- `rate_limit_exceeded_total` - Rate limit violations

### System Metrics
- `http_server_requests_seconds` - HTTP request duration
- `jvm_memory_used_bytes` - JVM memory usage
- `hikaricp_connections_active` - Database connection pool

## Alert Rules

Default alerts configured:
- High error rate (> 5% for 5 minutes)
- High API latency (p95 > 2s for 5 minutes)
- Database connection pool low (> 80% for 5 minutes)
- Application down
- High memory usage (> 85% for 5 minutes)
- High failed login rate
- High rate limit breaches

## Maintenance

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```

### Update Dashboards
1. Edit JSON files in `grafana/` directory
2. Restart Grafana: `docker-compose restart grafana`

### View Prometheus Data
```bash
# Access Prometheus container
docker exec -it hrms-prometheus /bin/sh

# Check configuration
promtool check config /etc/prometheus/prometheus.yml
```

## Troubleshooting

### Metrics Not Appearing
1. Check HRMS backend is running: `curl http://localhost:8080/actuator/health`
2. Check Prometheus metrics endpoint: `curl http://localhost:8080/actuator/prometheus`
3. Verify Prometheus targets: http://localhost:9090/targets

### Grafana Dashboard Issues
1. Verify Prometheus datasource is configured
2. Check dashboard JSON syntax
3. Restart Grafana container

### Alert Not Firing
1. Check alert rules syntax in Prometheus UI
2. Verify AlertManager configuration
3. Check AlertManager logs: `docker-compose logs alertmanager`

## Production Considerations

1. **Security**:
   - Change default Grafana credentials
   - Use strong passwords for all services
   - Configure HTTPS/TLS
   - Implement authentication for Prometheus

2. **Scalability**:
   - Consider Prometheus federation for multiple instances
   - Use remote storage for long-term retention
   - Implement proper backup strategies

3. **High Availability**:
   - Run multiple Prometheus instances
   - Use Thanos or Cortex for HA setup
   - Deploy AlertManager in cluster mode

4. **Resource Management**:
   - Monitor disk usage for Prometheus TSDB
   - Set appropriate retention policies
   - Configure resource limits in docker-compose

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Spring Boot Actuator Metrics](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.metrics)
