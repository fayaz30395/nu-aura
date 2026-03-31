# NU-AURA Platform — System Design & Architecture

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## System Context

```mermaid
graph TB
    subgraph Users
        EMP[Employee]
        MGR[Manager]
        HR[HR Admin]
        SA[Super Admin]
        PUB[Public User]
    end

    subgraph NU-AURA Platform
        FE[Next.js Frontend<br/>Port 3000]
        BE[Spring Boot Backend<br/>Port 8080]
        DB[(PostgreSQL 14+<br/>Neon Cloud)]
        REDIS[(Redis 7<br/>Cache + Rate Limiting)]
        KAFKA[Kafka 7.6<br/>Event Streaming]
        MINIO[MinIO 8.6<br/>File Storage]
    end

    subgraph External
        GMAIL[Gmail SMTP]
        GOOGLE[Google OAuth/Calendar/Meet]
        TWILIO[Twilio SMS]
        JOBBOARDS[Naukri / LinkedIn / Indeed]
        GROQ[Groq LLM<br/>Resume Parsing]
    end

    EMP & MGR & HR & SA --> FE
    PUB --> FE
    FE --> BE
    BE --> DB & REDIS & KAFKA & MINIO
    BE --> GMAIL & GOOGLE & TWILIO & JOBBOARDS & GROQ
```

---

## Container Architecture

```mermaid
graph LR
    subgraph Client
        BROWSER[Browser]
    end

    subgraph Edge
        MW[Next.js Middleware<br/>OWASP Headers + Auth Check]
    end

    subgraph Frontend Container
        PAGES[196 Pages<br/>App Router]
        HOOKS[85+ React Query Hooks]
        STORE[Zustand Auth Store]
        AXIOS[Axios Client<br/>Cookie Auth + CSRF]
    end

    subgraph Backend Container
        FILTERS[Security Filter Chain<br/>RateLimit → Tenant → JWT → CSRF]
        CTRL[139 Controllers<br/>71 Modules]
        SVC[188 Services<br/>Business Logic]
        REPO[254 Repositories<br/>JPA + Specifications]
    end

    subgraph Data Layer
        PG[(PostgreSQL<br/>RLS + tenant_id)]
        RD[(Redis<br/>Cache + Rate Limit)]
        KF[Kafka<br/>4 Topics + DLT]
        MN[MinIO<br/>S3 Files]
    end

    BROWSER --> MW --> PAGES
    PAGES --> HOOKS --> AXIOS
    AXIOS -->|HTTP + Cookies| FILTERS
    FILTERS --> CTRL --> SVC --> REPO
    REPO --> PG
    SVC --> RD & KF & MN
```

---

## Multi-Tenant Architecture

### Strategy: Shared Database, Shared Schema

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant TenantFilter
    participant JwtFilter
    participant Service
    participant DB

    Client->>Middleware: Request + JWT Cookie
    Middleware->>Middleware: Decode JWT → extract tenantId
    Middleware->>TenantFilter: X-Tenant-ID header
    TenantFilter->>TenantFilter: Set TenantContext (ThreadLocal)
    TenantFilter->>JwtFilter: Continue chain
    JwtFilter->>JwtFilter: Validate JWT + set SecurityContext
    JwtFilter->>Service: Authenticated request
    Service->>DB: Query WHERE tenant_id = :tenantId
    DB->>DB: PostgreSQL RLS enforces isolation
    DB->>Service: Tenant-scoped results
```

### Isolation Layers
1. **Application Layer**: `TenantContext` ThreadLocal, `TenantAwareAsyncTask` for background threads
2. **Query Layer**: JPA Specifications add `tenant_id` filter to all queries
3. **Database Layer**: PostgreSQL RLS policies (V36–V38) enforce at DB level
4. **Cache Layer**: Tenant-prefixed keys (`{tenantId}::{cacheName}::{key}`)

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Middleware
    participant Backend
    participant DB

    User->>Frontend: Login (email + password)
    Frontend->>Backend: POST /api/v1/auth/login
    Backend->>DB: Validate credentials
    DB->>Backend: User + roles + permissions
    Backend->>Backend: Generate JWT (1h) + Refresh (24h)
    Backend->>Frontend: Set-Cookie: accessToken (HttpOnly, Secure, SameSite)
    Backend->>Frontend: Set-Cookie: refreshToken (HttpOnly, Secure, SameSite)
    Frontend->>Frontend: Store user in Zustand (sessionStorage)

    Note over User,DB: Subsequent Requests
    Frontend->>Backend: Request + Cookies (withCredentials: true)
    Backend->>Backend: JWT Filter extracts token from cookie
    Backend->>Backend: Validate + set SecurityContext

    Note over User,DB: Token Refresh
    Frontend->>Backend: 401 Unauthorized (token expired)
    Frontend->>Backend: POST /api/v1/auth/refresh (refresh cookie)
    Backend->>Frontend: New accessToken + rotated refreshToken
    Frontend->>Backend: Retry original request
```

---

## RBAC Data Model

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    USER }o--o{ ROLE : assigned
    ROLE }o--o{ PERMISSION : grants
    PERMISSION {
        uuid id
        string code "module.action (e.g., employee.read)"
        string resource
        string action
    }
    ROLE {
        uuid id
        string code "SUPER_ADMIN, HR_ADMIN, etc."
        string name
    }
    USER {
        uuid id
        uuid tenant_id
        string email
        string[] accessible_apps
    }

    ROLE ||--o{ DATA_SCOPE : defines
    DATA_SCOPE {
        string scope "GLOBAL, LOCATION, DEPARTMENT, TEAM, SELF"
        string permission_code
    }
```

### Data Scope Filtering
| Scope | Filter Applied |
|-------|---------------|
| GLOBAL / ALL | No additional filter |
| LOCATION | `WHERE office_location_id = :userLocationId` |
| DEPARTMENT | `WHERE department_id = :userDepartmentId` |
| TEAM | `WHERE team_id = :userTeamId` |
| SELF | `WHERE created_by = :userId OR employee_id = :userId` |
| CUSTOM | Custom JPA Specification |

---

## Approval Workflow Engine

```mermaid
graph TD
    WD[WorkflowDefinition<br/>name, type, auto_approve_threshold]
    WS1[WorkflowStep 1<br/>role: MANAGER, order: 1]
    WS2[WorkflowStep 2<br/>role: HR_ADMIN, order: 2]
    WS3[WorkflowStep 3<br/>role: FINANCE, order: 3]

    WD --> WS1 --> WS2 --> WS3

    AI[ApprovalInstance<br/>entity_type, entity_id, status]
    AT1[ApprovalTask 1<br/>assignee: manager-uuid]
    AT2[ApprovalTask 2<br/>assignee: hr-uuid]
    AT3[ApprovalTask 3<br/>assignee: finance-uuid]

    AI --> AT1 --> AT2 --> AT3

    AT1 -->|APPROVED| KF[Kafka: nu-aura.approvals]
    KF --> AT2
    AT3 -->|APPROVED| DONE[Entity Status: APPROVED]
    AT1 -->|REJECTED| REJ[Entity Status: REJECTED]
```

---

## Payroll Processing Flow

```mermaid
graph TD
    INIT[Initialize Payroll Run<br/>month, year, tenant]
    FETCH[Fetch Employees<br/>active, not terminated]
    CALC[Calculate Components<br/>SpEL formulas, DAG order]

    subgraph SpEL Engine
        BASIC[Basic Salary]
        HRA[HRA = Basic * 0.4]
        DA[DA = Basic * 0.12]
        PF[PF = Basic * 0.12]
        TAX[Tax = f(gross, declarations)]
        NET[Net = Gross - Deductions]
    end

    DEDUCT[Apply Leave Deductions<br/>LOP from attendance]
    STATUTORY[Statutory Components<br/>PF, ESI, PT, TDS]
    PAYSLIP[Generate Payslips]
    APPROVE[Approval Workflow]
    DISBURSE[Mark Disbursed]

    INIT --> FETCH --> CALC
    CALC --> BASIC --> HRA --> DA --> PF --> TAX --> NET
    NET --> DEDUCT --> STATUTORY --> PAYSLIP --> APPROVE --> DISBURSE
```

---

## Deployment Architecture (GCP GKE)

```mermaid
graph TB
    subgraph Internet
        USER[Users]
    end

    subgraph GCP
        subgraph "Cloud Armor"
            WAF[Security Policy<br/>DDoS + WAF]
        end

        subgraph "GKE Cluster (hrms-cluster)"
            subgraph "hrms namespace"
                ING[Ingress<br/>GCE + TLS + Static IP]

                subgraph "Backend"
                    BE1[Pod 1<br/>512Mi-1Gi]
                    BE2[Pod 2<br/>512Mi-1Gi]
                end

                subgraph "Frontend"
                    FE1[Pod 1<br/>256Mi-512Mi]
                    FE2[Pod 2<br/>256Mi-512Mi]
                end

                HPA[HPA<br/>2-10 pods<br/>CPU 70% / Mem 80%]
            end
        end

        PG[(Cloud SQL / Neon<br/>PostgreSQL 14+)]
        RD[(Memorystore<br/>Redis 7)]
        GCS[Cloud Storage<br/>MinIO Compatible]
    end

    USER --> WAF --> ING
    ING -->|/api/*| BE1 & BE2
    ING -->|/*| FE1 & FE2
    BE1 & BE2 --> PG & RD & GCS
    HPA -.->|autoscale| BE1 & BE2 & FE1 & FE2
```

### Kubernetes Resources
| Resource | File | Key Config |
|----------|------|-----------|
| Namespace | namespace.yaml | `hrms` with production labels |
| ConfigMap | configmap.yaml | 115 non-secret config values |
| Secrets | secrets.yaml | 80+ secret entries (template) |
| Backend Deployment | backend-deployment.yaml | 2 replicas, init container waits for DB |
| Frontend Deployment | frontend-deployment.yaml | 2 replicas, init container waits for backend |
| Backend Service | backend-service.yaml | ClusterIP, session affinity (3h) |
| Frontend Service | frontend-service.yaml | ClusterIP, session affinity |
| Ingress | ingress.yaml | GCE, static IP, managed cert, Cloud Armor |
| HPA | hpa.yaml | 2-10 pods, CPU 70% / Memory 80% |
| Network Policy | network-policy.yaml | Default deny + whitelist |

---

## Monitoring Architecture

```mermaid
graph LR
    BE[Backend<br/>/actuator/prometheus] -->|scrape 10s| PROM[Prometheus<br/>Port 9090]
    PROM --> GRAF[Grafana<br/>Port 3001]
    PROM --> AM[AlertManager<br/>Port 9093]
    AM -->|critical| EMAIL1[CTO + Critical Team]
    AM -->|warning| EMAIL2[Dev Team]
    AM -->|info| EMAIL3[Monitoring Team]

    GRAF --> D1[Overview Dashboard]
    GRAF --> D2[API Metrics Dashboard]
    GRAF --> D3[Business Metrics Dashboard]
```

### Alert Rules
| Alert | Condition | Severity |
|-------|-----------|----------|
| ApplicationDown | up == 0 for 1m | Critical |
| HighErrorRate | API errors > 5% for 5m | Warning |
| HighAPILatency | p95 > 2s for 5m | Warning |
| DatabaseConnectionPoolLow | usage > 80% for 5m | Warning |
| HighMemoryUsage | heap > 85% for 5m | Warning |
| HighFailedLoginRate | > 0.1/s for 5m | Warning |
| PayrollProcessingDelayed | none in 24h for 2h | Warning |

---

## Data Model Overview (Core Entities)

```mermaid
erDiagram
    TENANT ||--o{ EMPLOYEE : employs
    TENANT ||--o{ DEPARTMENT : has
    TENANT ||--o{ OFFICE_LOCATION : has

    DEPARTMENT ||--o{ EMPLOYEE : belongs_to
    EMPLOYEE ||--o{ LEAVE_REQUEST : submits
    EMPLOYEE ||--o{ ATTENDANCE_RECORD : records
    EMPLOYEE ||--o{ PAYSLIP : receives
    EMPLOYEE ||--o{ PERFORMANCE_REVIEW : reviewed_in
    EMPLOYEE ||--o{ EXPENSE_CLAIM : submits
    EMPLOYEE ||--o{ ASSET_ASSIGNMENT : assigned

    LEAVE_REQUEST ||--o{ APPROVAL_TASK : requires
    EXPENSE_CLAIM ||--o{ APPROVAL_TASK : requires

    WORKFLOW_DEFINITION ||--o{ WORKFLOW_STEP : defines
    APPROVAL_INSTANCE ||--o{ APPROVAL_TASK : contains

    JOB_POSTING ||--o{ APPLICANT : receives
    APPLICANT ||--o{ INTERVIEW : scheduled_for

    REVIEW_CYCLE ||--o{ PERFORMANCE_REVIEW : contains
    EMPLOYEE ||--o{ OKR : owns
    OKR ||--o{ KEY_RESULT : has

    WIKI_SPACE ||--o{ WIKI_PAGE : contains
    COURSE ||--o{ COURSE_MODULE : has
    COURSE ||--o{ COURSE_ENROLLMENT : enrolled
```

---

## CI/CD Pipeline

```mermaid
graph LR
    subgraph "GitHub Actions"
        PUSH[Push/PR] --> BUILD[Build + Test]
        BUILD --> SCAN[Trivy Security Scan]
        SCAN --> DOCKER[Docker Build]
    end

    subgraph "Google Cloud Build"
        TRIGGER[Trigger] --> IMG[Build Images]
        IMG --> GCR[Push to GCR]
        GCR --> K8S[Deploy to GKE]
        K8S --> VERIFY[Verify Rollout]
    end

    DOCKER -.->|main branch| TRIGGER
```

### Pipeline Steps
1. **Build**: Maven compile (backend) + npm ci + tsc + lint (frontend)
2. **Test**: JUnit + JaCoCo (backend) + vitest (frontend)
3. **Security**: Trivy filesystem scan (CRITICAL + HIGH)
4. **Docker**: Multi-stage builds (no push in CI, build validation only)
5. **Deploy** (Cloud Build): Build → Push GCR → Apply K8s manifests → Wait for rollout

---

## Architecture Decision Records (ADRs)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Multi-tenant shared DB + tenant_id + RLS | Accepted |
| ADR-002 | JWT in HttpOnly cookies + refresh rotation | Accepted |
| ADR-003 | Redis caching with tenant-prefixed keys + 1h TTL | Accepted |
| ADR-004 | Async webhook delivery with Redis queue + retry | Accepted |
| Build-Kit ADR-001 | Theme consolidation (Mantine + Tailwind) | Accepted |
| Build-Kit ADR-002 | JWT token optimization | Accepted |
| Build-Kit ADR-003 | Payroll saga pattern (SpEL + DAG) | Accepted |
| Build-Kit ADR-004 | Recruitment ATS gap analysis | Accepted |
| Build-Kit ADR-005 | Database connection pool sizing | Accepted |
