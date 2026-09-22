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

| Layer           | Technology                                          | Version    |
|-----------------|------------------------------------------------------|-----------|
| Backend         | Spring Boot                                           | 3.5.14    |
| Language        | Java                                                   | 21        |
| Frontend        | Next.js (App Router)                                   | 16        |
| Frontend runtime| React                                                   | 19        |
| UI Library      | Mantine                                                 | 9.x       |
| Styling         | Tailwind CSS                                            | 3.x       |
| Database        | PostgreSQL (Docker locally, Railway-hosted Postgres in prod) | 16/17 |
| Cache           | Redis                                                   | 7         |
| Event Streaming | Kafka (dormant façade — see below)                      | Confluent 7.6.0 |
| Search          | Elasticsearch (local dev only, off in prod)             | 8.11.0    |
| File Storage    | Google Drive (see `StorageProvider`); local dev `APP_STORAGE_PROVIDER=none` | — |
| Email (dev)     | Mailpit (SMTP `localhost:1025`, UI `localhost:8025`)    | —         |
| AI (Fluence chat) | Any OpenAI-compatible provider via `OPENAI_BASE_URL`  | —         |
| Monitoring      | Prometheus + Grafana + AlertManager                     | Latest    |

**On Kafka:** enabled in config but not the live event path — a transactional **outbox** pattern (poll + `FOR UPDATE SKIP LOCKED`) is what production actually uses. Don't build new features assuming Kafka delivery.

**On the AI provider:** `ai.openai.*` in `application.yml` is provider-agnostic by design (`api-key`/`base-url`/`model` are all env vars) — currently pointed at whichever OpenAI-compatible endpoint is configured in the deploy environment (Groq, xAI, etc.). Check the live `OPENAI_BASE_URL`/`OPENAI_MODEL` env vars rather than assuming a specific vendor.

## Repo layout

```
nu-aura/
├── backend/                        # Spring Boot monolith (Java 21, Maven)
│   ├── src/main/java/com/nulogic/  # Root package
│   │   ├── api/                    # REST controllers
│   │   ├── application/            # Services / orchestration
│   │   ├── domain/                 # Entities + enums
│   │   ├── infrastructure/         # Repos + Kafka + WebSocket
│   │   └── common/                 # Config, security, exceptions
│   └── src/main/resources/
│       └── db/migration/           # Flyway (V0–V330+)
├── frontend/                       # Next.js 16 App Router
│   ├── app/                        # ~286 pages
│   ├── components/                 # TSX components
│   ├── e2e/                        # Playwright specs
│   ├── lib/                        # Hooks, services, types, validations
│   └── middleware.ts               # Route protection + OWASP headers
├── infra/                          # Operational config
│   ├── deployment/                 # Deploy scripts / manifests
│   └── monitoring/                 # Prometheus, Grafana, AlertManager
├── scripts/                        # Namespaced dev tools
│   ├── dev/                        # start-dev, stop-dev
│   ├── db/                         # export/import, manual migrations, backups/
│   ├── docker/                     # docker utilities
│   ├── qa/                         # E2E orchestration, screenshot, AI tests
│   └── setup/                      # One-time host setup
├── docs/                           # Architecture, ADRs, runbooks, agents, design-system, qa
│   └── obsidian/                   # Numbered knowledge vault (00-Home.md is the entry point)
├── docker-compose.yml              # Dev: Redis, Zookeeper, Kafka, Elasticsearch, Mailpit, Prometheus, Grafana, AlertManager
├── docker-compose.prod.yml         # Production overlay
└── docker-compose.override.yml     # Local override
```

See [docs/obsidian/00-Home.md](docs/obsidian/00-Home.md) for the full documentation map (Obsidian vault — architecture, per-module deep dives, RBAC matrix, DB schema, DevOps, security, runbooks, ADRs).

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

> PostgreSQL runs in a local Docker container for dev (default port `5433` in most setups, see `start-backend.sh`), **not** the main `docker-compose.yml`. Production runs on Railway's own hosted Postgres.

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

**Database:**

```
DEV_DATABASE_URL=jdbc:postgresql://localhost:5432/hrms   # or whatever port your local PG container uses
DEV_DATABASE_USERNAME=hrms
DEV_DATABASE_PASSWORD=<password>
SPRING_PROFILES_ACTIVE=dev
```

Two runtime DB roles matter: the app connects as a **restricted, non-superuser RLS role**
(never the Postgres superuser — RLS-bypass would silently defeat multi-tenant isolation),
and Flyway migrations run under a separate privileged role.

**Security:**

```
JWT_SECRET=<64+ character random string>
APP_SECURITY_ENCRYPTION_KEY=<AES-256 key>
DEMO_CREDENTIALS_ENABLED=true   # dev/demo only — must be false in any real deployment
```

**AI (optional — Fluence chat feature):**

```
OPENAI_API_KEY=<key for whichever OpenAI-compatible provider you use>
OPENAI_BASE_URL=https://api.groq.com/openai/v1   # or any other OpenAI-compatible endpoint
OPENAI_MODEL=<model id valid for that provider>
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

Starts: Redis (6379), Zookeeper (2181), Kafka (9092), Elasticsearch (9200), Mailpit (SMTP 1025, UI 8025), Prometheus (9090), Grafana, AlertManager. PostgreSQL is a separate local container, not part of this compose file — see `start-backend.sh` for how it's wired.

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
| Mailpit        | `http://localhost:8025` (catches all outbound dev email)                                |

### Default Login Credentials

With `DEMO_CREDENTIALS_ENABLED=true` (dev default), seeded demo accounts exist across all 10
roles under the `@nulogic.io` domain — check the seed migrations
(`V270`/`V286`/`V299`/`V314`/`V315`) for the current account list and password policy. Demo
accounts are **neutralized** (locked, unusable login) whenever `DEMO_CREDENTIALS_ENABLED=false`
— this is enforced both at Flyway migration time and at runtime login, not just one or the
other. Never rely on demo credentials existing in a non-dev environment.

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
cd backend && mvn test

# Run frontend lint + typecheck
cd frontend && npm run lint && npx tsc --noEmit
```

### Troubleshooting

| Problem                  | Solution                                                               |
|--------------------------|------------------------------------------------------------------------|
| Backend won't start      | Check `.env` has correct local DB credentials, and the DB container is running |
| Backend refuses to boot with an RLS error | App must connect as a restricted, non-superuser role — connecting as the Postgres superuser is deliberately rejected (RLS bypass) |
| Port 8080 in use         | `lsof -i :8080` and kill the process                                   |
| Port 3000 in use         | `lsof -i :3000` and kill the process                                   |
| Flyway migration error   | Check `backend/src/main/resources/db/migration/` for conflicts         |
| Redis connection refused | `docker-compose up -d redis`                                           |
| Kafka not connecting     | Ensure Zookeeper started first: `docker-compose up -d zookeeper kafka` |
| Frontend build errors    | Delete `frontend/.next/` and `node_modules/`, then `npm install`       |
| CORS errors              | Verify `NEXT_PUBLIC_API_URL` matches the backend URL                   |

---

## Key Architecture Decisions

- **Multi-tenancy:** Shared DB, shared schema. `tenant_id` UUID on every table. PostgreSQL Row-Level Security enforces isolation, keyed on a per-connection `app.current_tenant_id` session variable — request-scoped code sets this transaction-locally; long-running background jobs (schedulers) must set it explicitly per unit of work since there's no ambient request context.
- **Authentication:** JWT (JJWT 0.12.6) with httpOnly/Secure cookies, CSRF double-submit protection. Google OAuth 2.0 SSO. Account lockout after repeated failed logins.
- **Authorization:** custom `@RequiresPermission` annotation, `MODULE:ACTION`-style permission codes, 10 roles (SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN, RECRUITMENT_ADMIN, FINANCE_ADMIN, MANAGER, TEAM_LEAD, EMPLOYEE). SUPER_ADMIN bypasses all checks. `role_permissions` (DB) is the actual runtime enforcement source — not the Java-side role hierarchy config, which is display-only.
- **Events:** Kafka 5 topics (`approvals`, `notifications`, `audit`, `employee-lifecycle`, `fluence-content`) + 5 DLT topics.
- **Payroll:** SpEL formula engine with DAG-ordered component evaluation, always transactional.
- **Workflow:** Generic approval engine — `workflow_def` > `workflow_step` > `approval_instance` > `approval_task`.
- **Migrations:** Flyway only (V0–V330+). Legacy Liquibase deprecated.
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
| Mailpit       | `http://localhost:8025`                 | Caught dev email   |

## Documentation

| Document                                             | Description                                |
|-------------------------------------------------------|--------------------------------------------|
| [docs/obsidian/00-Home.md](docs/obsidian/00-Home.md) | **Knowledge Graph** — interlinked Obsidian vault: architecture, per-sub-app deep dives, RBAC matrix, DB schema/ERD, DevOps, security, testing, runbooks, ADRs, request/data flows |
| [CONTRIBUTING.md](CONTRIBUTING.md)                   | Development workflow and code standards    |
| [DESIGN.md](DESIGN.md)                               | Frontend design system, primitives, banned patterns |
| [PRODUCT.md](PRODUCT.md)                             | Product surface map and sub-app conventions |
| [infra/README.md](infra/README.md)                   | Operational config layout                  |

For **locating code** ("where is X defined", "what calls Y"), there's also a local graphify
code-knowledge-graph at `graphify-out/` (gitignored, code-only — rebuild with the `graphify`
CLI/skill if missing). It answers structural questions about the codebase; the Obsidian vault
above is for everything else (architecture, decisions, runbooks).

## Related

- [[docs/obsidian/00-Home|Knowledge Graph]] — Obsidian vault entry point
- [[CONTRIBUTING|Contributing Guide]] — branching, commits, standards
- [[MEMORY.md|Architecture Memory]] — living project state log

## License

Proprietary — NuLogic Technologies
