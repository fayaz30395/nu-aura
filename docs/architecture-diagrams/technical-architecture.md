# NU-AURA Platform — Technical Architecture

> For developers, architects, and engineering teams.
> Shows HOW the platform is built, the data flow, and system boundaries.

---

## System Architecture — Full Stack Overview

```mermaid
graph TB
    subgraph CLIENT["Client Layer"]
        direction LR
        BROWSER["Browser<br/>(Chrome / Safari / Firefox)"]
        MOBILE["Mobile Browser<br/>(Responsive PWA)"]
    end

    subgraph FRONTEND["Frontend — Next.js 14 (App Router)"]
        direction TB

        subgraph NEXT_EDGE["Edge / Middleware Layer"]
            MW["middleware.ts<br/>Auth gate, RBAC redirects,<br/>OWASP headers, rate limit headers"]
        end

        subgraph NEXT_APP["App Router (200+ Routes)"]
            direction LR
            PAGES["Page Components<br/>frontend/app/**/page.tsx"]
            LAYOUTS["Shared Layouts<br/>AppLayout, Sidebar, Header"]
            COMPS["123 UI Components<br/>frontend/components/"]
        end

        subgraph NEXT_STATE["State & Data Layer"]
            direction LR
            RQ["React Query v5<br/>Server State + Cache<br/>190 hook files"]
            ZS["Zustand<br/>Auth Store, UI Store"]
            RHF["React Hook Form + Zod<br/>Form State + Validation"]
        end

        subgraph NEXT_SERVICES["Service Layer"]
            AXIOS["Axios Client<br/>frontend/lib/api/client.ts<br/>Interceptors: JWT, Refresh, CSRF"]
            SERVICES["92 Service Files<br/>frontend/lib/services/"]
            HOOKS["190 Query Hooks<br/>frontend/lib/hooks/"]
        end

        subgraph NEXT_RT["Real-Time"]
            WS["WebSocket (STOMP + SockJS)<br/>Notifications, Live Updates"]
        end
    end

    subgraph BACKEND["Backend — Spring Boot 3.4.1 (Java 17)"]
        direction TB

        subgraph SEC["Security Filter Chain"]
            direction LR
            CORS["CORS Filter"]
            CSRF_F["CSRF Double-Submit<br/>Cookie Validation"]
            JWT_F["JWT Auth Filter<br/>Token Validation +<br/>Permission Loading"]
            RATE["Rate Limiter<br/>Bucket4j + Redis<br/>5/min auth, 100/min API"]
        end

        subgraph API_LAYER["API Layer — 143 Controllers"]
            direction LR
            REST["REST Controllers<br/>@RestController"]
            PERM["@RequiresPermission<br/>Method-level RBAC"]
            FEAT["@RequiresFeature<br/>Feature Flag Gates"]
        end

        subgraph APP_LAYER["Application Layer"]
            direction LR
            SVCB["209 Service Classes<br/>Business Logic"]
            MAP["MapStruct 1.6.3<br/>DTO ↔ Entity Mapping"]
            DTOS["454 DTOs<br/>Request / Response"]
        end

        subgraph DOMAIN_LAYER["Domain Layer"]
            direction LR
            ENT["265 Entities<br/>JPA / Hibernate"]
            REPO["260 Repositories<br/>Spring Data JPA"]
            SPEC["Specification Queries<br/>Dynamic Filtering"]
        end

        subgraph INFRA_LAYER["Infrastructure Layer"]
            direction LR
            KAFKA_P["Kafka Producer<br/>5 Topics + 5 DLT"]
            KAFKA_C["Kafka Consumer<br/>Event Handlers + DLT Handler"]
            JOBS["25 Scheduled Jobs<br/>@Scheduled (Quartz)"]
            ES_C["Elasticsearch Client<br/>Full-text Search"]
            MINIO_C["Google Drive Client<br/>File Storage"]
            SMTP_C["SMTP + Twilio<br/>Email + SMS"]
        end
    end

    subgraph DATA["Data & Infrastructure Layer"]
        direction LR

        subgraph PRIMARY_DB["PostgreSQL (Neon Cloud)"]
            PG["254 Tables<br/>Shared Schema<br/>Row-Level Security"]
            FW["Flyway Migrations<br/>V0–V91 (88 files)"]
        end

        REDIS["Redis 7<br/>Permission Cache<br/>Rate Limit Buckets<br/>Session Store"]

        KAFKA["Apache Kafka<br/>Confluent 7.6.0<br/>Event Streaming"]

        ELASTIC["Elasticsearch 8.11.0<br/>NU-Fluence Full-Text Search"]

        GDRIVE["Google Drive<br/>File Storage"]
    end

    subgraph MONITORING["Observability"]
        direction LR
        PROM["Prometheus<br/>28 Alert Rules<br/>19 SLOs"]
        GRAF["Grafana<br/>4 Dashboards"]
        ALERT["AlertManager<br/>Escalation Policies"]
    end

    CLIENT --> MW
    MW --> NEXT_APP
    NEXT_APP --> NEXT_STATE
    NEXT_STATE --> NEXT_SERVICES
    NEXT_SERVICES --> NEXT_RT
    AXIOS -->|"HTTPS + JWT + CSRF"| SEC
    SEC --> API_LAYER
    API_LAYER --> APP_LAYER
    APP_LAYER --> DOMAIN_LAYER
    DOMAIN_LAYER --> PG
    INFRA_LAYER --> KAFKA
    INFRA_LAYER --> ELASTIC
    INFRA_LAYER --> GDRIVE
    INFRA_LAYER --> SMTP_C
    BACKEND --> REDIS
    BACKEND --> MONITORING

    WS -->|"STOMP/SockJS"| BACKEND

    style CLIENT fill:#f8fafc,stroke:#475569,stroke-width:2px
    style FRONTEND fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style BACKEND fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style DATA fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style MONITORING fill:#fce7f3,stroke:#db2777,stroke-width:2px
```

---

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as Next.js Middleware
    participant FE as React App
    participant API as Spring Boot
    participant DB as PostgreSQL
    participant R as Redis

    Note over B,R: Login Flow
    B->>FE: POST /auth/login (email + password)
    FE->>API: POST /api/v1/auth/login
    API->>DB: Validate credentials + load roles
    DB-->>API: User + Roles (no permissions in JWT)
    API->>API: Generate JWT (roles only, < 4KB for cookie)
    API->>API: Set CSRF double-submit cookie
    API-->>FE: JWT + CSRF token + user profile
    FE->>FE: Zustand auth store updated

    Note over B,R: Authenticated Request Flow
    B->>MW: GET /employees (with JWT cookie)
    MW->>MW: Validate JWT, check route permissions
    MW-->>B: Allow (render page) or Redirect (/auth/login or /403)
    FE->>API: GET /api/v1/employees (JWT + CSRF header)
    API->>API: JwtAuthenticationFilter validates token
    API->>R: getCachedPermissions(userId)
    R-->>API: Permission set (module.action format)
    API->>API: @RequiresPermission check
    API->>DB: Query with tenant_id filter (RLS)
    DB-->>API: Tenant-scoped data only
    API-->>FE: JSON response

    Note over B,R: SuperAdmin Bypass
    API->>API: If role = SUPER_ADMIN → skip all permission checks
```

---

## Data Flow — Kafka Event Architecture

```mermaid
graph LR
    subgraph PRODUCERS["Event Producers (Backend Services)"]
        direction TB
        P1["Approval Service"]
        P2["Employee Service"]
        P3["Notification Service"]
        P4["Audit Service"]
        P5["Fluence Service"]
    end

    subgraph KAFKA_TOPICS["Kafka Topics"]
        direction TB
        T1["nu-aura.approvals"]
        T2["nu-aura.employee-lifecycle"]
        T3["nu-aura.notifications"]
        T4["nu-aura.audit"]
        T5["nu-aura.fluence-content"]
    end

    subgraph DLT["Dead Letter Topics"]
        direction TB
        D1["*.approvals.DLT"]
        D2["*.employee-lifecycle.DLT"]
        D3["*.notifications.DLT"]
        D4["*.audit.DLT"]
        D5["*.fluence-content.DLT"]
    end

    subgraph CONSUMERS["Event Consumers"]
        direction TB
        C1["Workflow Step Processor"]
        C2["Onboarding / Offboarding Automation"]
        C3["Email + SMS + Push Sender"]
        C4["Audit Log Writer"]
        C5["Elasticsearch Indexer"]
        C6["DLT Handler → FailedKafkaEvent table"]
    end

    P1 --> T1
    P2 --> T2
    P3 --> T3
    P4 --> T4
    P5 --> T5

    T1 --> C1
    T2 --> C2
    T3 --> C3
    T4 --> C4
    T5 --> C5

    T1 -.->|"3 retries failed"| D1
    D1 --> C6

    style KAFKA_TOPICS fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style DLT fill:#fee2e2,stroke:#dc2626,stroke-width:2px
```

---

## Database Architecture — Multi-Tenant Isolation

```mermaid
graph TB
    subgraph APP["Application Layer"]
        SVC["Spring Boot Service<br/>Always includes tenant_id in queries"]
    end

    subgraph DB["PostgreSQL — Shared Schema, Row-Level Security"]
        direction TB

        subgraph TABLES["254 Tables — Key Entities"]
            direction LR
            T_EMP["employees<br/>tenant_id UUID"]
            T_DEPT["departments<br/>tenant_id UUID"]
            T_LEAVE["leave_requests<br/>tenant_id UUID"]
            T_PAY["payroll_runs<br/>tenant_id UUID"]
            T_AUDIT["audit_logs<br/>tenant_id UUID"]
        end

        RLS["PostgreSQL RLS Policies<br/>━━━━━━━━━━━━━━━━━━━━<br/>SET app.current_tenant = ?<br/>Policy: tenant_id = current_setting('app.current_tenant')"]

        FLY["Flyway Migrations<br/>V0 → V91 (88 files)<br/>Next: V92"]
    end

    subgraph CACHE["Redis 7 — Cache Layer"]
        direction LR
        PC["Permission Cache<br/>TTL: 5 min"]
        RL["Rate Limit Buckets<br/>Per-user, per-endpoint"]
        SESS["Session Data"]
    end

    SVC -->|"SET tenant_id"| RLS
    RLS --> TABLES
    SVC --> CACHE

    style DB fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style RLS fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    style CACHE fill:#fef3c7,stroke:#d97706,stroke-width:2px
```

---

## Frontend Architecture — Module Structure

```mermaid
graph TB
    subgraph FE["Next.js 14 — App Router"]
        direction TB

        subgraph ROUTING["Route Architecture"]
            direction LR
            MW2["middleware.ts<br/>Auth + RBAC gate"]
            APPS_CFG["apps.ts<br/>Route → App mapping"]
            ACTIVE["useActiveApp.ts<br/>Active app detection"]
        end

        subgraph SUB_APPS["Sub-App Route Groups"]
            direction LR

            HRMS_R["NU-HRMS Routes<br/>━━━━━━━━━━━━━━<br/>/me, /employees,<br/>/attendance, /leave,<br/>/payroll, /benefits,<br/>/expenses, /assets,<br/>/reports, /settings<br/>+ 30 more"]

            HIRE_R["NU-Hire Routes<br/>━━━━━━━━━━━━━━<br/>/recruitment,<br/>/onboarding,<br/>/preboarding,<br/>/offboarding,<br/>/careers, /referrals"]

            GROW_R["NU-Grow Routes<br/>━━━━━━━━━━━━━━<br/>/performance,<br/>/okr, /feedback360,<br/>/training, /learning,<br/>/recognition,<br/>/surveys, /wellness"]

            FLUENCE_R["NU-Fluence Routes<br/>━━━━━━━━━━━━━━<br/>/fluence/wiki,<br/>/fluence/blogs,<br/>/fluence/templates,<br/>/fluence/drive,<br/>/fluence/wall"]
        end

        subgraph UI_LAYER["Shared UI Layer"]
            direction LR
            MANTINE["Mantine UI<br/>Component Library"]
            TAILWIND["Tailwind CSS<br/>Utility Styling"]
            DESIGN["Design Tokens<br/>8px grid, Sky palette,<br/>IBM Plex fonts"]
            FRAMER["Framer Motion<br/>Page transitions,<br/>Micro-animations"]
        end

        subgraph DATA_LAYER["Data Layer"]
            direction LR
            RQ2["React Query v5<br/>━━━━━━━━━━━━━<br/>190 hooks<br/>92 services<br/>Automatic cache<br/>Optimistic updates"]
            ZS2["Zustand Stores<br/>━━━━━━━━━━━━━<br/>Auth (user, perms)<br/>UI (sidebar, theme)<br/>Notifications"]
            FORMS["React Hook Form<br/>+ Zod Schemas<br/>━━━━━━━━━━━━━<br/>Type-safe validation<br/>All forms use this"]
        end
    end

    MW2 --> SUB_APPS
    APPS_CFG --> SUB_APPS
    SUB_APPS --> UI_LAYER
    SUB_APPS --> DATA_LAYER

    style FE fill:#f0f4ff,stroke:#0369a1,stroke-width:2px
    style ROUTING fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style SUB_APPS fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
```

---

## Backend Architecture — Layered Package Structure

```mermaid
graph TB
    subgraph PKG["com.hrms — Backend Package Structure"]
        direction TB

        subgraph API["api/ — Controller Layer"]
            direction LR
            CTRL["143 REST Controllers<br/>@RestController<br/>@RequiresPermission"]
            DTOS2["454 DTOs<br/>Request + Response objects"]
        end

        subgraph APPLICATION["application/ — Service Layer"]
            direction LR
            SVC2["209 Service Classes<br/>Business orchestration"]
            MAPPERS["MapStruct Mappers<br/>DTO ↔ Entity conversion"]
        end

        subgraph DOMAIN["domain/ — Entity Layer"]
            direction LR
            ENTITIES["265 JPA Entities<br/>Domain models"]
            REPOS["260 Repositories<br/>Spring Data JPA"]
        end

        subgraph COMMON["common/ — Cross-Cutting"]
            direction LR
            SEC_CFG["SecurityConfig.java<br/>Filter chain, CORS, CSRF"]
            ASPECTS["Permission + Feature Aspects<br/>AOP-based RBAC enforcement"]
            KAFKA_CFG["Kafka Config<br/>5 topics, DLT handling"]
        end

        subgraph INFRASTRUCTURE["infrastructure/ — External Integrations"]
            direction LR
            KAFKA_I["Kafka Producers + Consumers"]
            ES_I["Elasticsearch Integration"]
            STORAGE["Google Drive / MinIO Client"]
            MAIL["Email (SMTP) + SMS (Twilio)"]
        end
    end

    API --> APPLICATION
    APPLICATION --> DOMAIN
    COMMON -.->|"aspects, filters"| API
    INFRASTRUCTURE -.->|"async events"| APPLICATION

    style PKG fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style API fill:#dbeafe,stroke:#2563eb
    style APPLICATION fill:#e0f2fe,stroke:#0284c7
    style DOMAIN fill:#d1fae5,stroke:#059669
    style COMMON fill:#fee2e2,stroke:#dc2626
    style INFRASTRUCTURE fill:#f3e8ff,stroke:#7c3aed
```

---

## Infrastructure — Docker + Kubernetes

```mermaid
graph TB
    subgraph DEV["Development (Docker Compose)"]
        direction LR
        D_REDIS["Redis 7"]
        D_ZK["Zookeeper"]
        D_KAFKA["Kafka"]
        D_ES["Elasticsearch"]
        D_PROM["Prometheus"]
        D_FE["Frontend<br/>(npm run dev)"]
        D_BE["Backend<br/>(./start-backend.sh)"]
        D_NEON["Neon Cloud<br/>(External PostgreSQL)"]
    end

    subgraph PROD["Production (GKE Kubernetes)"]
        direction TB

        subgraph K8S["Kubernetes Cluster"]
            direction LR
            K_FE["Frontend Pod<br/>Next.js"]
            K_BE["Backend Pod<br/>Spring Boot"]
            K_REDIS["Redis Pod"]
            K_KAFKA["Kafka Cluster"]
            K_ES["Elasticsearch Cluster"]
        end

        subgraph OBS["Observability Stack"]
            direction LR
            K_PROM["Prometheus<br/>28 alerts, 19 SLOs"]
            K_GRAF["Grafana<br/>4 dashboards"]
            K_ALERT["AlertManager"]
        end

        PG_PROD["PostgreSQL 16<br/>(Managed)"]
    end

    K8S --> PG_PROD
    K8S --> OBS

    style DEV fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style PROD fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style K8S fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style OBS fill:#fce7f3,stroke:#db2777,stroke-width:2px
```

---

## Quick Reference — Codebase Scale

| Metric | Count |
|---|---|
| Frontend page routes | 200+ |
| Frontend components | 123 |
| React Query hooks | 190 |
| Service files | 92 |
| Backend controllers | 143 |
| Backend services | 209 |
| JPA entities | 265 |
| Repositories | 260 |
| DTOs | 454 |
| Database tables | 254 |
| Flyway migrations | 88 (V0–V91) |
| Kafka topics | 5 + 5 DLT |
| Scheduled jobs | 25 |
| RBAC permissions | 500+ |
| K8s manifests | 10 |
| Prometheus alert rules | 28 |
| Grafana dashboards | 4 |

---

## Key File Locations for Developers

| What | Where |
|---|---|
| Route → App mapping | `frontend/lib/config/apps.ts` |
| Auth middleware | `frontend/middleware.ts` |
| API client (Axios) | `frontend/lib/api/client.ts` |
| Zustand auth store | `frontend/lib/stores/auth-store.ts` |
| Design tokens | `frontend/styles/design-tokens.css` |
| Security config | `backend/.../common/config/SecurityConfig.java` |
| Permission aspect | `backend/.../common/aspect/PermissionAspect.java` |
| Kafka config | `backend/.../common/config/KafkaConfig.java` |
| Flyway migrations | `backend/src/main/resources/db/migration/V*.sql` |
| Docker Compose | `docker-compose.yml` (repo root) |
| K8s manifests | `deployment/kubernetes/` |
| Monitoring | `deployment/monitoring/` |
