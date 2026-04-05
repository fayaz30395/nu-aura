# NU-AURA Platform

Enterprise-grade, multi-tenant SaaS platform for HR operations, recruitment, performance management,
and knowledge collaboration.

## Platform Architecture

NU-AURA is a **bundle app platform** — 4 sub-applications behind a single login and app switcher:

| Sub-App        | Domain                                                            | Status                                    |
|----------------|-------------------------------------------------------------------|-------------------------------------------|
| **NU-HRMS**    | Core HR (employees, attendance, leave, payroll, benefits, assets) | Active                                    |
| **NU-Hire**    | Recruitment & onboarding (ATS, pipeline, job boards)              | Active                                    |
| **NU-Grow**    | Performance, learning & engagement (reviews, OKRs, 360, LMS)      | Active                                    |
| **NU-Fluence** | Knowledge management & collaboration (wiki, blogs)                | Phase 2 (backend built, frontend pending) |

## Technology Stack

| Layer           | Technology                                      | Version |
|-----------------|-------------------------------------------------|---------|
| Backend         | Spring Boot                                     | 3.4.1   |
| Language        | Java                                            | 21      |
| Frontend        | Next.js (App Router)                            | 14      |
| UI Library      | Mantine                                         | 7.x     |
| Styling         | Tailwind CSS                                    | 3.x     |
| Database        | PostgreSQL (Neon cloud dev, PostgreSQL 16 prod) | 16      |
| Cache           | Redis                                           | 7       |
| Event Streaming | Kafka (Confluent)                               | 7.6.0   |
| Search          | Elasticsearch                                   | 8.11.0  |
| File Storage    | MinIO (S3-compatible)                           | Latest  |
| Monitoring      | Prometheus + Grafana + AlertManager             | Latest  |

## Repository Structure

```
nu-aura/
├── backend/                    # Spring Boot monolith (Java 21, Maven)
│   ├── src/main/java/com/hrms/
│   │   ├── api/                # 143 controllers (REST endpoints)
│   │   ├── application/        # 209 services (business logic)
│   │   ├── domain/             # 265 entities + enums
│   │   ├── infrastructure/     # 260 repositories + Kafka + WebSocket
│   │   └── common/             # Config, security, validation, exceptions
│   └── src/main/resources/
│       └── db/migration/       # 88 Flyway migrations (V0–V91)
├── frontend/                   # Next.js 14 App Router
│   ├── app/                    # 200+ pages
│   ├── components/             # 123 TSX components
│   ├── lib/                    # 190 hooks, 92 services, types, validations
│   └── middleware.ts           # Route protection + OWASP headers
├── monitoring/                 # Prometheus (28 alerts, 19 SLOs) + Grafana (4 dashboards) + AlertManager
├── deployment/kubernetes/      # 10 K8s manifests (GCP GKE)
├── docs/                       # Architecture, ADRs, runbooks
├── scripts/                    # DB tools, migration utilities
├── docker-compose.yml          # Dev: Redis, Zookeeper, Kafka, Elasticsearch, MinIO, Prometheus
└── docker-compose.prod.yml     # Production config
```

## Quick Start

### Prerequisites

- Java 21+
- Node.js 18+
- Docker & Docker Compose
- Neon PostgreSQL credentials (or any PostgreSQL 16+ instance)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

> PostgreSQL is hosted on Neon cloud (not in docker-compose). Configure DB credentials in `.env` at
> repo root.

### 2. Start Backend

```bash
cd backend && ./start-backend.sh
# http://localhost:8080
```

### 3. Start Frontend

```bash
cd frontend && npm install && npm run dev
# http://localhost:3000
```

See [SETUP.md](SETUP.md) for detailed setup instructions and environment variables.

## Key Architecture Decisions

- **Multi-tenancy:** Shared DB, shared schema. `tenant_id` UUID on every table. PostgreSQL RLS
  enforces isolation.
- **Authentication:** JWT (JJWT 0.12.6) with 24h access token, 30-day refresh. Google OAuth 2.0 SSO.
  MFA via TOTP.
- **Authorization:** RBAC with 500+ `MODULE:ACTION` permissions. 9 roles (ESS, MGR, HRA, REC, PAY,
  FIN, ITA, SYS, UNA). SuperAdmin bypasses all checks.
- **Events:** Kafka 5 topics (`approvals`, `notifications`, `audit`, `employee-lifecycle`,
  `fluence-content`) + 5 DLT topics.
- **Payroll:** SpEL formula engine with DAG-ordered component evaluation, always transactional.
- **Workflow:** Generic approval engine — `workflow_def` > `workflow_step` > `approval_instance` >
  `approval_task`.
- **Migrations:** Flyway only (V0–V91, 88 files). Next migration: V92. Legacy Liquibase deprecated.

## Services (Development)

| Service       | URL                                     | Purpose            |
|---------------|-----------------------------------------|--------------------|
| Frontend      | `http://localhost:3000`                 | Next.js dev server |
| Backend       | `http://localhost:8080`                 | Spring Boot API    |
| Swagger UI    | `http://localhost:8080/swagger-ui.html` | API documentation  |
| Prometheus    | `http://localhost:9090`                 | Metrics            |
| MinIO Console | `http://localhost:9001`                 | File storage       |

## Documentation

| Document                                   | Description                                |
|--------------------------------------------|--------------------------------------------|
| [REQUIREMENTS.md](REQUIREMENTS.md)         | Functional and non-functional requirements |
| [SETUP.md](SETUP.md)                       | Detailed setup guide                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)         | Development workflow and code standards    |
| [SEED_DATA_README.md](SEED_DATA_README.md) | Seed data documentation                    |
| [docs/adr/](docs/adr/)                     | Architecture Decision Records              |
| [docs/build-kit/](docs/build-kit/)         | Architecture specifications (24 documents) |
| [docs/runbooks/](docs/runbooks/)           | Operational runbooks                       |
| [docs/architecture/](docs/architecture/)   | Technical architecture analysis            |

## License

Proprietary — NuLogic Technologies
