# NU-AURA Platform — AI Engineering Partner Context

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Platform Identity

**NU-AURA** is an enterprise-grade, multi-tenant SaaS bundle app platform containing 4 sub-applications:

| Sub-App | Domain | Status |
|---------|--------|--------|
| **NU-HRMS** | Core HR (employees, attendance, leave, payroll, benefits, assets) | Active (~95%) |
| **NU-Hire** | Recruitment & onboarding (ATS, pipeline, job boards, preboarding) | Active (~92%) |
| **NU-Grow** | Performance, learning & engagement (reviews, OKRs, 360, LMS, wellness) | Active (~90%) |
| **NU-Fluence** | Knowledge management & collaboration (wiki, blogs, templates) | Phase 2 (~85%) |

---

## Codebase Scale

| Dimension | Count |
|-----------|-------|
| Java files | 1,559+ |
| Controllers | 139 across 71 modules |
| Services | 188 (1,649 @Transactional methods) |
| JPA Entities | 304 |
| Repositories | 254 |
| Flyway migrations | V0–V47 (next: V48) |
| Frontend pages | 196 |
| React components | 129 in 21 directories |
| API service files | 94 |
| React Query hooks | 85+ (14 core + 71 query) |
| TypeScript type files | 62 |
| Zod validation schemas | 14 |
| E2E test specs | 45+ Playwright |
| Backend test files | 104 |

---

## Locked-In Architecture

These decisions are **final**. Do not re-evaluate unless explicitly asked.

### Multi-Tenancy
- Shared database, shared schema
- `tenant_id` UUID on every table
- PostgreSQL Row-Level Security (RLS) policies (V36–V38)
- `TenantContext` ThreadLocal propagation
- `X-Tenant-ID` header on every request
- `TenantAwareAsyncTask` for background jobs

### Authentication & Authorization
- JWT in HttpOnly cookies (not localStorage)
- CSRF double-submit cookie pattern
- Access token: 1h, Refresh token: 24h
- RBAC: `module.action` permission strings (~300 permissions)
- 9 roles: SUPER_ADMIN, SYSTEM_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE, + custom
- SuperAdmin bypasses ALL permission checks (backend filter chain + frontend middleware)
- Data scoping: GLOBAL / LOCATION / DEPARTMENT / TEAM / SELF / CUSTOM

### Event-Driven Architecture
- Kafka 4 topics: `nu-aura.approvals`, `nu-aura.notifications`, `nu-aura.audit`, `nu-aura.employee-lifecycle`
- Dead Letter Topics (DLT) for failed events
- Idempotent producer (exactly-once semantics)
- Event deduplication via `eventId`

### Approval Workflows
- Generic `approval_service` engine
- Data-driven: `workflow_def` → `workflow_step` → `approval_instance` → `approval_task`
- Configurable steps and role-based approvals

### Payroll Engine
- Formula-based using Spring Expression Language (SpEL)
- Components evaluated in dependency order (DAG)
- Always wrapped in DB transaction

---

## Tech Stack (Locked In)

### Backend
- Java 17 (NOT 21), Spring Boot 3.4.1, Maven
- PostgreSQL 14+ (Neon cloud dev), Flyway migrations
- Redis 7 (caching, rate limiting), MinIO 8.6 (file storage)
- Kafka 7.6 (event streaming), WebSocket/STOMP (real-time)
- JJWT 0.12.6 (JWT), Bucket4j 8.7 (rate limiting)
- Lombok, MapStruct, SpringDoc OpenAPI

### Frontend
- Next.js 14.2.35 (App Router), TypeScript 5.9.3 strict
- React 18.2, Mantine 8.3.14, Tailwind 3.4
- TanStack React Query 5.17, Zustand 4.4.7
- React Hook Form 7.51 + Zod 3.23, Axios 1.7
- Framer Motion (animations), TipTap (rich text)
- Recharts (charts), Playwright 1.57 (E2E)

### Infrastructure
- Docker + Docker Compose (dev/prod)
- Kubernetes on GCP GKE (10 active manifests)
- GitHub Actions + Google Cloud Build (CI/CD)
- Prometheus + Grafana + AlertManager (monitoring)

---

## Key File Locations

### Backend
| Purpose | Path |
|---------|------|
| Security config | `backend/src/main/java/com/hrms/common/config/SecurityConfig.java` |
| JWT filter | `backend/src/main/java/com/hrms/common/security/JwtAuthenticationFilter.java` |
| JWT provider | `backend/src/main/java/com/hrms/common/security/JwtTokenProvider.java` |
| Data scope service | `backend/src/main/java/com/hrms/common/security/DataScopeService.java` |
| Tenant context | `backend/src/main/java/com/hrms/common/security/TenantContext.java` |
| Kafka config | `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java` |
| Kafka topics | `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaTopics.java` |
| WebSocket config | `backend/src/main/java/com/hrms/config/WebSocketConfig.java` |
| Global exception handler | `backend/src/main/java/com/hrms/common/exception/GlobalExceptionHandler.java` |
| Application config | `backend/src/main/resources/application.yml` |
| Flyway migrations | `backend/src/main/resources/db/migration/V*.sql` |

### Frontend
| Purpose | Path |
|---------|------|
| Axios client | `frontend/lib/api/client.ts` |
| Public client | `frontend/lib/api/public-client.ts` |
| Auth store (Zustand) | `frontend/lib/hooks/useAuth.ts` |
| Permissions hook | `frontend/lib/hooks/usePermissions.ts` |
| Active app hook | `frontend/lib/hooks/useActiveApp.ts` |
| Middleware | `frontend/middleware.ts` |
| Platform config | `frontend/lib/config/apps.ts` |
| App switcher | `frontend/components/platform/AppSwitcher.tsx` |
| Auth guard | `frontend/components/auth/AuthGuard.tsx` |
| Permission gate | `frontend/components/auth/PermissionGate.tsx` |
| Error boundary | `frontend/components/errors/ErrorBoundary.tsx` |
| Mantine theme | `frontend/lib/theme/mantine-theme.ts` |
| Tailwind config | `frontend/tailwind.config.js` |

---

## Non-Negotiable Code Rules

1. **Never rewrite what already exists** — read first, then extend
2. **Never create a new Axios instance** — use `frontend/lib/api/client.ts`
3. **Never use `any` in TypeScript** — define proper interfaces
4. **All forms: React Hook Form + Zod** — no uncontrolled inputs
5. **All data fetching: React Query** — no raw `useEffect` + `fetch`
6. **All backend endpoints: at least one unit test**
7. **No new npm packages** without checking `package.json` first
8. **Flyway only** — `db/changelog/` is legacy Liquibase, DO NOT USE
9. **No NextAuth** — custom JWT + cookies implementation
10. **Ports: 3000 (frontend), 8080 (backend)** — kill existing processes if occupied

---

## Project Structure

```
nu-aura/
├── backend/src/main/java/com/hrms/
│   ├── api/                    # 71 controller packages (REST endpoints)
│   ├── application/            # 188 service classes (business logic)
│   ├── domain/                 # 304 JPA entities
│   ├── infrastructure/         # 254 repositories + Kafka + WebSocket
│   └── common/                 # Config, security, validation, exceptions
├── backend/src/main/resources/
│   ├── application.yml         # Spring Boot configuration
│   └── db/migration/V*.sql     # Flyway migrations (V0–V47)
├── frontend/
│   ├── app/                    # 196 Next.js pages (App Router)
│   ├── components/             # 129 TSX components in 21 dirs
│   ├── lib/
│   │   ├── api/                # Axios client + 10 API modules
│   │   ├── services/           # 84 service files
│   │   ├── hooks/              # 14 core + 71 query hooks
│   │   ├── types/              # 62 TypeScript type files
│   │   ├── validations/        # 14 Zod schemas
│   │   ├── config/             # Platform + app config
│   │   └── theme/              # Mantine theme + dark mode
│   ├── e2e/                    # 45+ Playwright specs
│   └── middleware.ts           # Edge route protection + OWASP headers
├── modules/
│   ├── common/                 # Shared base classes (TenantAwareAsyncTask)
│   └── pm/                     # Project management sub-system
├── monitoring/                 # Prometheus, Grafana, AlertManager
├── deployment/kubernetes/      # 12 K8s manifests (GCP GKE)
├── docs/                       # Architecture docs, ADRs, diagrams
├── scripts/                    # DB export/import, startup scripts
├── docker-compose.yml          # Dev environment
├── docker-compose.prod.yml     # Production environment
└── docker-compose.override.yml # Dev hot-reload config
```

---

## Demo Environment

- **Demo tenant**: Acme Corp (`tenant_id: 00000000-0000-0000-0000-000000000001`)
- **Demo seed**: V8 + V30 migrations (gated by `demo` Spring profile)
- **Dev DB**: Neon cloud PostgreSQL (no local postgres in docker-compose)
- **K8s profile**: `prod` (NOT `production`)
- **DDL auto**: `validate` (Flyway manages schema)
