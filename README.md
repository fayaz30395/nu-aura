---
title: "NU-AURA Platform"
tags:
  - "type/moc"
  - "type/reference"
  - "layer/platform"
  - "area/architecture"
summary: "Top-level project overview covering platform architecture, technology stack, repo layout, local dev setup, and links to all major documentation areas."
---

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
| Backend         | Spring Boot                                     | 3.5.14  |
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
│       └── db/migration/        # Flyway (V0–V269)
├── frontend/                    # Next.js 16 App Router
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

See [docs/Home.md](docs/Home.md) for the full documentation map and [docs/architecture/](docs/architecture/) for the system design.

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

**Frontend local development** (create `frontend/.env.development.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

Do not put localhost values in `frontend/.env.local`; Next.js loads that file
during production builds and release packaging will fail.

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

# Check agent orchestration readiness
./scripts/agents/ready.sh

# Start/check Ruflo, then dry-run a feature swarm kickoff
./scripts/ruflo-start.sh
./scripts/ruflo-pipeline.sh feature "Add employee document expiry reminders"

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
- **Migrations:** Flyway only (V0–V269). Legacy Liquibase deprecated.
- **Security hardening (Sprints 1–3, May 2026):** 79 wave-1 findings, ~50 wave-2 findings, and wave-3 regression follow-ups closed across auth, IDOR, injection, SSRF, Drive tenant isolation, dependencies, mass-assignment, and field-level AES-GCM encryption for PII. See `CHANGELOG.md` and `SECURITY.md`.

### Accessibility (WCAG 2.1 AA, 2026-05-13/14)

Comprehensive a11y polish across the frontend (Phase 7, waves 1–6 + 11 rolling agent batches): 56 ad-hoc modals → canonical `<Modal>` (focus trap, Escape, aria-modal), ~400 form inputs gained `htmlFor`/`id` linkage, 87 heading-level swaps for proper hierarchy, 38 form fields with `aria-invalid`/`aria-describedby` for inline errors, 24 icon-only button aria-labels, skip-to-main-content nav, `<main>`/`<nav>`/`<aside>` landmarks, prefers-reduced-motion CSS, print stylesheet, live regions, and dozens more fixes (lint warnings 270 → 79). See `CHANGELOG.md` for full breakdown.

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
| [docs/Home.md](docs/Home.md)                   | Obsidian Map of Content — vault entry point |
| [docs/obsidian/00-Home.md](docs/obsidian/00-Home.md) | **Knowledge Graph** — interlinked Obsidian vault (architecture, modules, RBAC, DB, DevOps, security, runbooks, ADRs, flows) with Mermaid diagrams |
| [CONTRIBUTING.md](CONTRIBUTING.md)             | Development workflow and code standards    |
| [DESIGN.md](DESIGN.md)                         | Frontend design system, primitives, banned patterns (Studio Slate v2) |
| [PRODUCT.md](PRODUCT.md)                       | Product surface map and sub-app conventions |
| [docs/architecture/](docs/architecture/)       | Technical architecture (backend, frontend, data-flow) |
| [docs/reference/](docs/reference/)             | API, database schema, and migration reference |
| [docs/apps/](docs/apps/)                       | Per-sub-app deep dives (HRMS, Hire, Grow, Fluence) |
| [docs/patterns/README.md](docs/patterns/README.md) | Reusable code patterns                |
| [docs/setup/README.md](docs/setup/README.md)   | Local dev setup, build, test               |
| [infra/README.md](infra/README.md)             | Operational config layout                  |

## Related

- [[docs/Home|Home MoC]] — Obsidian vault entry point
- [[docs/README|Docs Index]] — documentation section index
- [[docs/architecture/README|Architecture Overview]] — detailed system-context map
- [[docs/setup/README|Local Dev Setup]] — developer environment guide
- [[CONTRIBUTING|Contributing Guide]] — branching, commits, standards
- [[MEMORY|Architecture Memory]] — living project state log

## License

Proprietary — NuLogic Technologies
