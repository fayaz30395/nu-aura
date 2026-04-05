# NU-AURA Platform — Team Capabilities & Tooling

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Development Stack Proficiency

### Backend Engineering

| Skill             | Level        | Tooling                                            |
|-------------------|--------------|----------------------------------------------------|
| Java 17           | Expert       | Google Style Guide, 4-space indent, 120 char lines |
| Spring Boot 3.4   | Expert       | Auto-config, profiles, actuator, security          |
| Spring Security 6 | Expert       | JWT, OAuth2, RBAC, CSRF, filter chains             |
| Spring Data JPA   | Expert       | Specifications, custom queries, auditing           |
| PostgreSQL 14+    | Expert       | RLS, indexes, migrations, Neon cloud               |
| Flyway            | Expert       | SQL migrations (V0–V47), baseline, profiles        |
| Redis             | Advanced     | Caching, rate limiting, distributed locks          |
| Kafka             | Advanced     | Producers, consumers, DLT, idempotency             |
| WebSocket/STOMP   | Intermediate | Real-time notifications                            |
| MinIO (S3)        | Intermediate | File storage, pre-signed URLs                      |

### Frontend Engineering

| Skill                 | Level        | Tooling                                    |
|-----------------------|--------------|--------------------------------------------|
| TypeScript 5.9        | Expert       | Strict mode, no `any`, proper interfaces   |
| Next.js 14            | Expert       | App Router, middleware, server components  |
| React 18              | Expert       | Hooks, context, error boundaries           |
| Mantine 8.3           | Expert       | Component library, dark mode sync          |
| Tailwind CSS 3.4      | Expert       | Design tokens, CSS variables               |
| React Query 5.17      | Expert       | Hierarchical keys, mutations, invalidation |
| Zustand 4.4           | Advanced     | Auth store, sessionStorage persistence     |
| React Hook Form + Zod | Advanced     | Validation schemas, controlled forms       |
| TipTap                | Intermediate | Rich text editor (Fluence)                 |
| Framer Motion         | Intermediate | Micro-animations, page transitions         |
| Playwright 1.57       | Advanced     | E2E testing, fixtures, accessibility       |

### Infrastructure & DevOps

| Skill          | Level        | Tooling                                         |
|----------------|--------------|-------------------------------------------------|
| Docker         | Expert       | Multi-stage builds, compose, security hardening |
| Kubernetes     | Advanced     | GKE, deployments, HPA, network policies         |
| GCP            | Advanced     | Cloud Build, GCR, Cloud Armor, Managed Certs    |
| GitHub Actions | Advanced     | CI pipeline, security scanning                  |
| Prometheus     | Advanced     | Custom metrics, alert rules                     |
| Grafana        | Intermediate | Dashboard provisioning                          |
| AlertManager   | Intermediate | Severity-based routing                          |

---

## Development Tools

### Build & Runtime

| Tool           | Version    | Purpose                         |
|----------------|------------|---------------------------------|
| Maven          | 3.9+       | Backend build                   |
| Node.js        | 20         | Frontend runtime                |
| npm            | (bundled)  | Frontend package management     |
| JDK            | Temurin 17 | Java runtime                    |
| Docker         | Latest     | Containerization                |
| Docker Compose | v2         | Local development orchestration |

### Code Quality

| Tool              | Purpose               | Configuration                |
|-------------------|-----------------------|------------------------------|
| ESLint            | Frontend linting      | eslint-config-next           |
| TypeScript strict | Type checking         | tsconfig.json (strict: true) |
| JaCoCo            | Backend code coverage | Min 80% line coverage        |
| ArchUnit          | Architecture testing  | Layer dependency rules       |
| Trivy             | Security scanning     | CRITICAL + HIGH severity     |
| Logstash Encoder  | Structured logging    | JSON format in production    |

### Testing

| Tool             | Layer                    | Files                      |
|------------------|--------------------------|----------------------------|
| JUnit 5          | Backend unit/integration | 104 test files             |
| MockMvc          | Backend controller tests | @WebMvcTest                |
| Spring Boot Test | Backend integration      | @SpringBootTest            |
| Vitest           | Frontend unit            | Component + hook tests     |
| Testing Library  | Frontend component       | @testing-library/react     |
| Playwright       | E2E                      | 45+ specs in frontend/e2e/ |
| Axe Core         | Accessibility            | @axe-core/playwright       |

### Monitoring & Observability

| Tool         | Port | Purpose                                |
|--------------|------|----------------------------------------|
| Prometheus   | 9090 | Metrics collection (scrape 10s)        |
| Grafana      | 3001 | Dashboard visualization (3 dashboards) |
| AlertManager | 9093 | Alert routing (email/webhook)          |
| Actuator     | 8080 | Health checks, metrics endpoint        |
| Logback      | -    | Structured JSON logging                |

### External Services

| Service         | Purpose                 | Mode                  |
|-----------------|-------------------------|-----------------------|
| Neon Cloud      | Dev PostgreSQL          | Always active         |
| Gmail SMTP      | Email notifications     | Active                |
| Twilio          | SMS notifications       | Mock in dev           |
| Google OAuth    | SSO authentication      | Active                |
| Google Calendar | Calendar sync           | Optional              |
| Google Meet     | Video meetings          | Optional              |
| Groq (LLM)      | AI resume parsing, chat | Free tier             |
| Naukri API      | Job board sync          | Mock until configured |
| LinkedIn API    | Job board sync          | Mock until configured |
| Indeed API      | Job board sync          | Mock until configured |

---

## Startup Commands

### Local Development

```bash
# 1. Start infrastructure (Redis, Kafka, MinIO)
docker-compose up -d

# 2. Start backend (kills port 8080 if occupied)
cd backend && ./start-backend.sh

# 3. Start frontend (kills port 3000 if occupied)
cd frontend && npm run dev
```

### Production (Kubernetes)

```bash
# Apply manifests in order
kubectl apply -f deployment/kubernetes/namespace.yaml
kubectl apply -f deployment/kubernetes/configmap.yaml
kubectl apply -f deployment/kubernetes/secrets.yaml  # Must fill values first
kubectl apply -f deployment/kubernetes/backend-deployment.yaml
kubectl apply -f deployment/kubernetes/frontend-deployment.yaml
kubectl apply -f deployment/kubernetes/backend-service.yaml
kubectl apply -f deployment/kubernetes/frontend-service.yaml
kubectl apply -f deployment/kubernetes/ingress.yaml
kubectl apply -f deployment/kubernetes/hpa.yaml
kubectl apply -f deployment/kubernetes/network-policy.yaml
```

### Monitoring

```bash
cd monitoring && docker-compose up -d
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

---

## Coding Conventions

### Java (Backend)

- Google Style Guide
- 4-space indent, 120 char line length
- Lombok (@Data, @Builder, @Slf4j)
- MapStruct for DTO mapping
- @Transactional on service methods
- Soft deletes (is_deleted / deleted_at)
- UUID v4 for all primary keys

### TypeScript (Frontend)

- Strict mode (no `any`)
- Functional components only
- React Query hierarchical query keys
- Zod schemas for all form validation
- CSS: Tailwind utilities + Mantine components
- File naming: kebab-case for files, PascalCase for components

### Git

- Commit: `type(scope): subject` (e.g., `feat(leave): add balance calculation`)
- Branch: `feature/AURA-XXX-description`
- PR: Short title, summary + test plan in description
