# NU-AURA Platform

Enterprise-grade, multi-tenant SaaS bundle app platform for HR operations, recruitment, performance management, and knowledge collaboration.

**Status:** ~90% Complete | Stabilization Phase 7 Complete | Go-Live Gate Pending

## Platform Architecture

NU-AURA is a **bundle app platform** containing 4 sub-applications, accessed via a unified login and app switcher:

| Sub-App | Domain | Status |
|---------|--------|--------|
| **NU-HRMS** | Core HR (employees, attendance, leave, payroll, benefits, assets) | ~95% |
| **NU-Hire** | Recruitment & onboarding (ATS, pipeline, job boards) | ~92% |
| **NU-Grow** | Performance, learning & engagement (reviews, OKRs, 360, LMS) | ~90% |
| **NU-Fluence** | Knowledge management & collaboration (wiki, blogs) | Phase 2 (~85%) |

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Spring Boot | 3.4.1 |
| Language | Java | 17 |
| Frontend | Next.js (App Router) | 14.2.35 |
| UI Library | Mantine | 8.3.14 |
| Styling | Tailwind CSS | 3.4 |
| Database | PostgreSQL (Neon cloud dev) | 14+ |
| Cache | Redis | 7 |
| Event Streaming | Kafka (Confluent) | 7.6 |
| File Storage | MinIO | 8.6 |
| Testing | Playwright (E2E) + JUnit 5 | 1.57 |
| Monitoring | Prometheus + Grafana + AlertManager | Latest |

## Repository Structure

```
nu-aura/
├── backend/                    # Spring Boot monolith (Java 17, Maven)
│   ├── src/main/java/com/hrms/
│   │   ├── api/                # 71 controller packages (REST endpoints)
│   │   ├── application/        # 188 service classes (business logic)
│   │   ├── domain/             # 304 JPA entities
│   │   ├── infrastructure/     # 254 repositories + Kafka + WebSocket
│   │   └── common/             # Config, security, validation, exceptions
│   └── src/main/resources/
│       ├── application.yml     # Spring Boot config
│       └── db/migration/       # 49 Flyway migrations (V0–V52)
├── frontend/                   # Next.js 14 App Router
│   ├── app/                    # 196 pages
│   ├── components/             # 129 TSX components
│   ├── lib/                    # Services, hooks, types, validations
│   ├── e2e/                    # 36 Playwright E2E specs
│   └── middleware.ts           # Edge route protection + OWASP headers
├── modules/                    # Shared backend modules
│   ├── common/                 # TenantAwareAsyncTask, base classes
│   └── pm/                     # Project management sub-system
├── monitoring/                 # Observability stack
│   ├── prometheus/             # Scrape config + 28 alert rules (2 groups)
│   ├── grafana/                # 4 dashboards + provisioning
│   └── alertmanager/           # Routing, receivers, inhibition
├── deployment/
│   └── kubernetes/             # 10 active K8s manifests (GCP GKE)
├── docs/                       # Architecture, ADRs, runbooks, execution logs
├── scripts/                    # DB export/import, migration tools
├── docker-compose.yml          # Dev: Redis, Kafka, MinIO, Prometheus
├── docker-compose.prod.yml     # Production config
└── docker-compose.override.yml # Dev hot-reload
```

## Quick Start

### Prerequisites

- Java 17
- Node.js 18+
- Docker & Docker Compose
- Neon PostgreSQL credentials (or any PostgreSQL 14+ instance)

### 1. Start Infrastructure

```bash
# Start Redis, Kafka, MinIO, Prometheus
docker-compose up -d
```

> **Note:** PostgreSQL is hosted on Neon cloud (not in docker-compose). Set `NEON_JDBC_URL`, `NEON_DB_USERNAME`, `NEON_DB_PASSWORD` in a `.env` file at the repo root.

### 2. Start Backend

```bash
cd backend
./start-backend.sh
# Runs on http://localhost:8080
```

### 3. Start Frontend

```bash
cd frontend
npm install   # first time only
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables

**Backend** (set in `.env` or `application.yml`):
- `NEON_JDBC_URL` — PostgreSQL JDBC connection string
- `NEON_DB_USERNAME` / `NEON_DB_PASSWORD` — DB credentials
- `JWT_SECRET` — JWT signing key (64+ chars)
- `APP_SECURITY_ENCRYPTION_KEY` — Encryption key for sensitive data
- `PAYMENTS_ENABLED` — Payment gateway kill-switch (default: `false`)

**Frontend** (set in `frontend/.env.local`):
- `NEXT_PUBLIC_API_URL` — Backend URL (default: `http://localhost:8080/api/v1`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `NEXT_PUBLIC_DEMO_MODE` — Enable demo mode
- `NEXT_PUBLIC_PAYMENTS_ENABLED` — Payment UI visibility (default: `false`)

## Key Architecture Decisions

- **Multi-tenancy:** Shared DB, shared schema. `tenant_id` UUID on every table. PostgreSQL RLS enforces isolation.
- **Authentication:** JWT in HttpOnly cookies. Access token 1h, refresh token 24h. Google SSO via OIDC/PKCE.
- **Authorization:** RBAC with ~300 `module.action` permission strings. 9 roles. SuperAdmin bypasses all checks.
- **Events:** Kafka 4 topics (`approval-events`, `audit-events`, `employee-lifecycle-events`, `notification-events`) + dead letter queues.
- **Payroll:** SpEL formula engine with DAG-ordered component evaluation, always transactional.
- **Migrations:** Flyway only (V0–V52). Legacy Liquibase in `db/changelog/` is deprecated.

## Monitoring & Observability

| Tool | URL | Purpose |
|------|-----|---------|
| Swagger UI | `http://localhost:8080/swagger-ui.html` | API documentation |
| Prometheus | `http://localhost:9090` | Metrics scraping (5 targets) |
| Grafana | Import dashboards from `monitoring/grafana/` | 4 dashboards: Overview, API, Business, Webhooks |
| AlertManager | Configure via `monitoring/alertmanager/` | Severity-routed alerting |
| MinIO Console | `http://localhost:9001` | File storage management |

Alert rules: 9 application alerts + 19 SLO alerts in `monitoring/prometheus/rules/`.

Operational runbooks: `docs/runbooks/` (incident response, payroll correction, data correction, Kafka DLQ).

## Documentation

Detailed documentation is in [docs/](docs/):

- Architecture: `docs/architecture-diagrams/`, `docs/adr/`
- Operations: `docs/runbooks/`
- Stabilization: `docs/execution/phase-{0..7}.md`
- Technical baseline: `docs/technical-baseline.md`

## Deployment

| Platform | Config |
|----------|--------|
| Kubernetes (GCP GKE) | `deployment/kubernetes/` (10 manifests) |
| Docker Compose | `docker-compose.yml` / `docker-compose.prod.yml` |
| Google Cloud Build | `deployment/cloudbuild.yaml` |

## License

Proprietary — NuLogic Technologies

---

*Last Updated: March 2026*
