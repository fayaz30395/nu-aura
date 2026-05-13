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

## Repo layout

```
nu-aura/
├── backend/                     # Spring Boot monolith (Java 21, Maven)
│   ├── src/main/java/com/hrms/  # Pre-Phase-4 root package (rename to com.nulogic in Phase 4)
│   │   ├── api/                 # REST controllers
│   │   ├── application/         # Services / orchestration
│   │   ├── domain/              # Entities + enums
│   │   ├── infrastructure/      # Repos + Kafka + WebSocket
│   │   └── common/              # Config, security, exceptions
│   └── src/main/resources/
│       └── db/migration/        # Flyway (V0–V171)
├── frontend/                    # Next.js 14 App Router
│   ├── app/                     # 261 pages
│   ├── components/              # TSX components
│   ├── lib/                     # Hooks, services, types, validations
│   └── middleware.ts            # Route protection + OWASP headers
├── infra/                       # Operational config (intro'd Phase 1)
│   ├── deployment/              # GCP cloudbuild, K8s manifests, deploy scripts
│   ├── monitoring/              # Prometheus, Grafana, AlertManager
│   └── mvn-local-deps/          # Locally-installed Maven artifacts (CI uses these)
├── scripts/                     # Namespaced dev tools
│   ├── dev/                     # start-dev, stop-dev
│   ├── db/                      # export/import, manual migrations, backups/
│   ├── docker/                  # docker utilities
│   ├── qa/                      # E2E orchestration, screenshot, AI tests
│   └── setup/                   # One-time host setup
├── docs/                        # Architecture, ADRs, runbooks, agents, design-system, qa
├── docker-compose.yml           # Dev: Redis, Zookeeper, Kafka, Elasticsearch, MinIO, Prometheus
├── docker-compose.prod.yml      # Production overlay
└── docker-compose.override.yml  # Local override
```

The repo follows the layout in [`docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md`](docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md).

---

## Setup

### Prerequisites

| Software       | Version | Purpose                       |
|----------------|---------|-------------------------------|
| Java           | 21+     | Backend runtime               |
| Maven          | 3.8+    | Backend build tool            |
| Node.js        | 18+     | Frontend runtime              |
| npm            | 9+      | Frontend package manager      |
| Docker         | 20+     | Container runtime             |
| Docker Compose | 2.0+    | Multi-container orchestration |
| Git            | 2.30+   | Version control               |

> PostgreSQL is hosted on **Neon cloud** for development. There is no local PostgreSQL in Docker Compose.

### 1. Clone Repository

```bash
git clone https://github.com/Fayaz-Deen/nu-aura.git
cd nu-aura
```

### 2. Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

**Database (Neon cloud):**

```
NEON_JDBC_URL=jdbc:postgresql://<host>/<db>?sslmode=require
NEON_DB_USERNAME=<username>
NEON_DB_PASSWORD=<password>
```

**Security:**

```
JWT_SECRET=<64+ character random string>
APP_SECURITY_ENCRYPTION_KEY=<AES-256 key>
```

**Frontend** (create `frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

See `.env.example` for the full list.

### 3. Start Infrastructure

```bash
docker-compose up -d
```

Starts 6 services: Redis (6379), Zookeeper (2181), Kafka (9092), Elasticsearch (9200), MinIO (9000/9001), Prometheus (9090).

### 4. Start Backend

```bash
cd backend
./start-backend.sh
```

Backend runs on `http://localhost:8080`. Flyway applies pending migrations on startup.

**Verify:** `curl http://localhost:8080/actuator/health`

### 5. Start Frontend

```bash
cd frontend
npm install    # first time only
npm run dev
```

Frontend runs on `http://localhost:3000`. Open `http://localhost:3000/auth/login`.

### 6. Verify Setup

| Check          | Command/URL                                                                             |
|----------------|-----------------------------------------------------------------------------------------|
| Backend health | `curl http://localhost:8080/actuator/health`                                            |
| Frontend loads | `http://localhost:3000`                                                                 |
| API docs       | `http://localhost:8080/swagger-ui.html`                                                 |
| Redis          | `docker exec -it nu-aura-redis-1 redis-cli ping`                                        |
| Kafka          | `docker exec -it nu-aura-kafka-1 kafka-topics --list --bootstrap-server localhost:9092` |
| MinIO          | `http://localhost:9001` (minioadmin/minioadmin)                                         |

### Default Login Credentials

After seed data (V171 migration) is applied, SuperAdmin accounts are available. Check the seed migration for credentials or create accounts via the signup flow.

### Quick Reference

```bash
# Start everything
./scripts/dev/start-dev.sh

# Stop everything
./scripts/dev/stop-dev.sh

# Run backend tests
cd backend && ./mvnw test

# Run frontend lint + typecheck
cd frontend && npm run lint && npx tsc --noEmit
```

### Troubleshooting

| Problem                  | Solution                                                               |
|--------------------------|------------------------------------------------------------------------|
| Backend won't start      | Check `.env` has correct Neon DB credentials                           |
| Port 8080 in use         | `lsof -i :8080` and kill the process                                   |
| Port 3000 in use         | `lsof -i :3000` and kill the process                                   |
| Flyway migration error   | Check `backend/src/main/resources/db/migration/` for conflicts         |
| Redis connection refused | `docker-compose up -d redis`                                           |
| Kafka not connecting     | Ensure Zookeeper started first: `docker-compose up -d zookeeper kafka` |
| Frontend build errors    | Delete `frontend/.next/` and `node_modules/`, then `npm install`       |
| CORS errors              | Verify `NEXT_PUBLIC_API_URL` matches the backend URL                   |

---

## Key Architecture Decisions

- **Multi-tenancy:** Shared DB, shared schema. `tenant_id` UUID on every table. PostgreSQL RLS enforces isolation.
- **Authentication:** JWT (JJWT 0.12.6) with 24h access token, 30-day refresh. Google OAuth 2.0 SSO. MFA via TOTP.
- **Authorization:** RBAC with 500+ `MODULE:ACTION` permissions. 9 roles (ESS, MGR, HRA, REC, PAY, FIN, ITA, SYS, UNA). SuperAdmin bypasses all checks.
- **Events:** Kafka 5 topics (`approvals`, `notifications`, `audit`, `employee-lifecycle`, `fluence-content`) + 5 DLT topics.
- **Payroll:** SpEL formula engine with DAG-ordered component evaluation, always transactional.
- **Workflow:** Generic approval engine — `workflow_def` > `workflow_step` > `approval_instance` > `approval_task`.
- **Migrations:** Flyway only (V0–V171, 162+ files). Legacy Liquibase deprecated.
- **Security hardening (Sprints 1–3, May 2026):** 79 wave-1 findings, ~50 wave-2 findings, and wave-3 regression follow-ups closed across auth, IDOR, injection, SSRF, Drive tenant isolation, dependencies, mass-assignment, and field-level AES-GCM encryption for PII. See `CHANGELOG.md` and `SECURITY.md`.

## Services (Development)

| Service       | URL                                     | Purpose            |
|---------------|-----------------------------------------|--------------------|
| Frontend      | `http://localhost:3000`                 | Next.js dev server |
| Backend       | `http://localhost:8080`                 | Spring Boot API    |
| Swagger UI    | `http://localhost:8080/swagger-ui.html` | API documentation  |
| Prometheus    | `http://localhost:9090`                 | Metrics            |
| MinIO Console | `http://localhost:9001`                 | File storage       |

## Documentation

| Document                                       | Description                                |
|------------------------------------------------|--------------------------------------------|
| [CONTRIBUTING.md](CONTRIBUTING.md)             | Development workflow and code standards    |
| [DESIGN.md](DESIGN.md)                         | Frontend design system, primitives, banned patterns (Studio Slate v2) |
| [PRODUCT.md](PRODUCT.md)                       | Product surface map and sub-app conventions |
| [docs/agents/](docs/agents/)                   | Agent documentation and team prompts       |
| [docs/adr/](docs/adr/)                         | Architecture Decision Records              |
| [docs/architecture/](docs/architecture/)       | Technical architecture analysis            |
| [docs/runbooks/](docs/runbooks/)               | Operational runbooks                       |
| [docs/design-system/](docs/design-system/)     | Design system, themes                      |
| [docs/team/roles/](docs/team/roles/)           | Engineering team role definitions          |
| [infra/README.md](infra/README.md)             | Operational config layout                  |

## License

Proprietary — NuLogic Technologies
