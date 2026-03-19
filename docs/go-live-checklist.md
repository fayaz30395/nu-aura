# Go-Live Checklist

> Pre-production verification items. Each must be signed off before deploying to production.

---

## Infrastructure

- [ ] **PostgreSQL RLS policies applied** — V36, V37, V38 migrations enforce row-level security on all tenant-scoped tables
- [ ] **Flyway migrations applied** — V0 through V52 (49 total migration files). Verify with `flyway info` or `SELECT * FROM flyway_schema_history ORDER BY installed_rank`
- [ ] **Kafka topics created** with correct partitions — `approval-events`, `audit-events`, `employee-lifecycle-events`, `notification-events` + corresponding DLT topics. `KAFKA_AUTO_CREATE_TOPICS_ENABLE=false` requires manual creation
- [ ] **Redis configured** — Caching (session, RBAC permission cache) + Bucket4j rate limiting. Verify with `redis-cli ping`
- [ ] **MinIO/S3 buckets created** — File storage for documents, profile photos, attachments. Verify bucket policies
- [ ] **K8s manifests deployed** — 10 active manifests in `deployment/kubernetes/` (namespace, configmap, secrets, backend/frontend deployment+service, ingress, HPA, network-policy). Use profile `prod` (NOT `production`)
- [ ] **Environment variables set** — All secrets in K8s Secrets, not ConfigMap. See `deployment/kubernetes/secrets.yaml` template
- [ ] **SSL/TLS termination configured** — Via K8s Ingress or load balancer. All traffic HTTPS
- [ ] **Domain DNS configured** — A/CNAME records pointing to cluster ingress IP
- [ ] **HPA (Horizontal Pod Autoscaler) verified** — `deployment/kubernetes/hpa.yaml` scaling thresholds appropriate for expected load
- [ ] **Network policies applied** — `deployment/kubernetes/network-policy.yaml` restricts pod-to-pod traffic

## Security

- [ ] **JWT secret rotated** — `JWT_SECRET` must be a unique, random 64+ character string. NOT the default dev value
- [ ] **Encryption key rotated** — `APP_SECURITY_ENCRYPTION_KEY` must be a unique 32+ byte key for sensitive field encryption
- [ ] **CSRF double-submit cookie enabled** — Verify `SecurityConfig.java` CSRF configuration is active in prod profile
- [ ] **Rate limiting configured** — Bucket4j rate limits active. Default: 100 req/min per IP. See `backend/src/main/java/com/hrms/common/config/RateLimitConfig.java`
- [ ] **OWASP security headers in middleware** — `frontend/middleware.ts` sets CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Verify headers in response
- [ ] **Payment feature flag OFF** — `PAYMENTS_ENABLED=false` (backend) + `NEXT_PUBLIC_PAYMENTS_ENABLED=false` (frontend). Phase 2 hardened this with dual-layer gating
- [ ] **Mock services disabled or replaced** — `MockPaymentService` and `MockSmsService` must not be active in production. Verify Spring profiles
- [ ] **Google OAuth credentials** — Production `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured with correct redirect URIs
- [ ] **CORS origins restricted** — `FRONTEND_URL` set to production domain only. No `localhost` in production
- [ ] **Actuator endpoints secured** — `/actuator/prometheus` accessible only from monitoring namespace. Other actuator endpoints restricted

## Data

- [ ] **Flyway baseline verified** — `spring.flyway.baseline-on-migrate=true` for first deployment. DDL auto-validation: `spring.jpa.hibernate.ddl-auto=validate`
- [ ] **Demo seed data NOT applied** — V8 and V30 seed migrations are gated by `demo` Spring profile. Production profile must NOT include `demo`
- [ ] **Spring profile set to `prod`** — `SPRING_PROFILES_ACTIVE=prod`. NOT `dev`, `demo`, or `local`
- [ ] **Tenant isolation verified** — Run negative tests: access Tenant B data with Tenant A token. Expect 403/404. See `TenantIsolationNegativeTest.java` (Phase 5)
- [ ] **Initial tenant created** — At least one production tenant provisioned via admin API or direct DB insert
- [ ] **SuperAdmin account created** — Production SuperAdmin with strong credentials. See `promote-superadmin.sql`
- [ ] **Database backups configured** — Neon auto-backups or manual pg_dump schedule verified
- [ ] **Connection pool tuned** — HikariCP `maximum-pool-size` appropriate for expected concurrency (alert fires at 80% utilization)

## Monitoring

- [ ] **Prometheus scraping backend** — Actuator endpoint `/actuator/prometheus` returning metrics. Scrape interval 10s. See `monitoring/prometheus/prometheus.yml`
- [ ] **Grafana dashboards imported** — 4 dashboards from `monitoring/grafana/`: System Overview, API Metrics, Business Metrics, Webhooks
- [ ] **AlertManager routing configured** — `monitoring/alertmanager/alertmanager.yml` with real email/webhook/PagerDuty receivers (replace placeholder URLs)
- [ ] **SLO alerts active** — 19 rules in `monitoring/prometheus/rules/hrms-slo-alerts.yml` (Phase 6). Covers payroll, leave, attendance, notifications, Kafka, background jobs, webhooks, contracts
- [ ] **Application alerts active** — 9 rules in `monitoring/prometheus/rules/hrms-alerts.yml`. Covers error rate, latency, DB pool, memory, login failures, rate limiting
- [ ] **Runbooks reviewed by on-call team** — 4 runbooks in `docs/runbooks/`: incident-response, payroll-correction, data-correction, kafka-dead-letter
- [ ] **Log aggregation configured** — Logback JSON output (Logstash encoder) in `prod` profile. Centralized log collection (ELK, Loki, or equivalent) receiving logs
- [ ] **Structured logging verified** — MDC fields present: `correlationId`, `userId`, `tenantId`, `requestUri`. See `logback-spring.xml`

## Application

- [ ] **All critical module tests passing** — Auth, Employee, Leave, Attendance, Payroll, Recruitment, Performance, Contract, Dashboard, Analytics. Run: `mvn test -pl backend`
- [ ] **No hard-delete on financial entities** — Phase 1 converted PayrollRun, Payslip, SalaryStructure, Contract, LeaveType, Department, Holiday to soft-delete. Verify `softDelete()` usage
- [ ] **API contracts aligned** — Phase 4 fixed payroll/payment path mismatches. Frontend stubs (spotlight, linkedin, PM tasks) are documented and harmless (404 at runtime)
- [ ] **Background jobs configured** — Verify cron schedules:
  - Leave accrual: Quartz scheduler (monthly)
  - Attendance regularization: `AutoRegularizationScheduler` (daily 01:00 IST)
  - Contract lifecycle: `ContractLifecycleScheduler` (daily 02:30 UTC, `app.contract.lifecycle.enabled=true`)
  - Workflow escalation: `WorkflowEscalationScheduler` (hourly at :15)
- [ ] **Kafka consumers healthy** — 4 consumer groups running. DLQ handler active. Admin API at `/api/v1/admin/kafka/failed-events`
- [ ] **WebSocket connectivity** — STOMP endpoint accessible for real-time notifications
- [ ] **File upload working** — MinIO/S3 reachable from backend. Test document upload + download
- [ ] **Email service configured** — SMTP credentials set. Replace `MockSmsService` if SMS is needed
- [ ] **Frontend build succeeds** — `npm run build` in `frontend/` completes without errors
- [ ] **No console errors on critical pages** — Dashboard, employees, leave, attendance, payroll pages load without JS errors

## Sign-Off

| Area | Reviewer | Date | Status |
|------|----------|------|--------|
| Infrastructure | | | |
| Security | | | |
| Data | | | |
| Monitoring | | | |
| Application | | | |
| **Final Go/No-Go** | | | |
