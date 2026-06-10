# System Overview

NU-AURA is a **modular monolith**: one Next.js frontend, one Spring Boot backend, one
PostgreSQL database shared by all tenants and isolated by Row-Level Security. Asynchronous
work flows through Kafka; Redis serves caching, rate limiting, and multi-pod fan-out;
Elasticsearch powers NU-Fluence search.

## 1. System context (C4 level 1)

```mermaid
flowchart TB
    subgraph people["People"]
        EMP["Employee"]
        HR["HR / People Ops"]
        MGR["Manager / Dept Lead"]
        REC["Recruiter / Hiring Manager"]
        CAND["Candidate (external)"]
    end

    AURA["NU-AURA Platform<br/>HRMS · Hire · Grow · Fluence"]

    subgraph external["External Systems"]
        GOOGLE["Google Workspace<br/>OAuth 2.0 · Drive · Calendar"]
        SMTP["SMTP (email)"]
        TWILIO["Twilio (SMS)"]
        SLACK["Slack"]
        BOARDS["Job Boards<br/>Naukri · Indeed · LinkedIn"]
        BIO["Biometric Devices"]
        WEBHK["Tenant Webhook Consumers"]
    end

    EMP --> AURA
    HR --> AURA
    MGR --> AURA
    REC --> AURA
    CAND -->|"career page, offer portal,<br/>e-sign (public routes)"| AURA

    AURA -->|"login, file storage,<br/>calendar sync"| GOOGLE
    AURA -->|notifications| SMTP
    AURA -->|notifications| TWILIO
    AURA -->|alerts, notifications| SLACK
    AURA -->|job posting sync| BOARDS
    BIO -->|"punch events<br/>(polled every 2 min)"| AURA
    AURA -->|"HMAC-signed events"| WEBHK
```

## 2. Container diagram (C4 level 2)

```mermaid
flowchart TB
    BROWSER["Browser / Mobile Web"]

    subgraph platform["NU-AURA Platform"]
        FE["Frontend — Next.js 16.2 / React 19<br/>App Router, 264 pages<br/>standalone output, CSP middleware"]
        BE["Backend — Spring Boot 3.5.14 / Java 21<br/>modular monolith: 78 modules,<br/>178 controllers, ~1,757 endpoints"]
        PG[("PostgreSQL 16<br/>342 tables, shared schema,<br/>RLS per tenant_id")]
        RD[("Redis 7<br/>20+ named caches · token blacklist ·<br/>rate-limit buckets · WS pub/sub")]
        KF["Kafka (Confluent 7.6)<br/>6 topics + per-topic DLT"]
        ES[("Elasticsearch 8.11<br/>fluence-documents index")]
    end

    subgraph obs["Observability"]
        PROM["Prometheus 2.53"]
        GRAF["Grafana 11.2"]
        AM["AlertManager 0.27"]
    end

    BROWSER -->|HTTPS| FE
    FE -->|"REST /api/v1/* (rewrite)"| BE
    BROWSER -.->|"STOMP over SockJS /ws/*"| BE
    BE --> PG
    BE --> RD
    BE <--> KF
    BE --> ES
    PROM -->|"scrape /actuator/prometheus<br/>(bearer token)"| BE
    PROM --> AM
    GRAF --> PROM
    AM -->|Slack| SLACKCH["#nu-aura-alerts"]
```

**Why a monolith?** One deployable keeps transactions, RLS context, and the approval
workflow engine simple. Module boundaries are enforced in-package (ArchUnit tests) so a
future extraction along Kafka topic seams remains possible. See `docs/adr/` for the
decision record history.

## 3. Anatomy of a request

Every authenticated API call crosses these layers in order. Tenancy is established twice —
in the JWT filter (application scope) and on the database transaction (RLS scope).

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as Next.js middleware
    participant F as Servlet filter chain
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant P as PostgreSQL (RLS)

    B->>M: GET /app route or /api/v1 call
    M->>M: CSP nonce, OWASP headers, auth gating
    M->>F: proxy /api/v1/* to backend
    Note over F: RateLimitingFilter → TenantFilter →<br/>ApiKeyAuthenticationFilter →<br/>JwtAuthenticationFilter → CsrfDoubleSubmitFilter
    F->>F: validate JWT (httpOnly cookie),<br/>set TenantContext + permissions
    F->>C: authenticated request
    C->>C: "@RequiresPermission" RBAC + data-scope check
    C->>S: use case
    S->>R: query (tenant-filtered)
    R->>P: SQL within TenantRlsTransactionManager
    Note over P: SET LOCAL app.current_tenant_id = tenant<br/>RLS policies restrict rows
    P-->>B: response (audit event emitted to Kafka on writes)
```

## 4. Sub-app to module map

The four product surfaces share one backend; modules group as follows (78 total — the
representative ones):

| Surface | Backend modules |
|---------|-----------------|
| NU-HRMS | employee, attendance, shift, leave, payroll, tax, statutory, compensation, budget, expense, loan, payment, benefits, asset, document, helpdesk, announcement, organization, department, exit, probation, timetracking |
| NU-Hire | recruitment, referral, bgv, esignature, onboarding, preboarding, career |
| NU-Grow | performance, training/LMS, engagement, recognition, meeting, calendar |
| NU-Fluence | knowledge, wall, ai, search (Elasticsearch) |
| Platform | auth, user management, roles, admin, compliance/DSR, workflow, notification, webhook, integration, data import, migration, analytics, dashboard, monitoring, feature flags, public API, mobile API, websocket |

## 5. Asynchronous backbone

Kafka decouples write paths from slow or fan-out work. All topics have dead-letter twins
(`.dlt`, 7-day retention).

| Topic | Partitions | Retention | Purpose |
|-------|-----------:|-----------|---------|
| `nu-aura.approvals` | 3 | 24 h | Workflow approval events |
| `nu-aura.notifications` | 5 | 24 h | Multi-channel notification fan-out |
| `nu-aura.audit` | 10 | 30 d | Audit trail (high throughput) |
| `nu-aura.employee-lifecycle` | 2 | 24 h | Hire/exit/change events |
| `nu-aura.fluence-content` | 3 | 24 h | Elasticsearch indexing pipeline |
| `nu-aura.payroll-processing` | 2 | 24 h | Payroll runs (consumer concurrency = 1, serialized) |

Producers are idempotent (`acks=all`, snappy); consumers use manual commits with
exponential-backoff retry (1 s → 5 s → 25 s) before dead-lettering. Tenant context is
restored per record by `TenantContextRecordInterceptor`.

## 6. State stores and their jobs

| Store | Used for | Not used for |
|-------|----------|--------------|
| PostgreSQL 16 | System of record; 342 tables; RLS isolation; Flyway-managed schema | Search ranking, queues |
| Redis 7 | Tiered caches (30 s–24 h TTL), JWT blacklist, distributed rate limits (Bucket4j/Lua), idempotency keys, WebSocket cross-pod relay, edit locks | Durable data — every Redis consumer has a DB or in-memory fallback |
| Kafka | Async event transport, audit pipeline, payroll serialization | Request/response RPC |
| Elasticsearch | NU-Fluence full-text search (single `fluence-documents` index) | Source of truth — opt-in via `app.elasticsearch.enabled`; search degrades to pg_trgm when off |
| Google Drive | Tenant file storage (signed URLs, 24 h expiry) | Static assets |

## 7. Deployment shapes

The same containers run in three shapes (full detail in
[infrastructure.md](infrastructure.md)):

1. **Local dev** — Docker Compose (Redis, Kafka+Zookeeper, Elasticsearch, Prometheus,
   Grafana, AlertManager) with Neon cloud Postgres; backend and frontend run natively or
   under the `app` compose profile.
2. **Beta** — Frontend live on Vercel (`hrms-frontend-vert.vercel.app`); backend deployable
   to Render via `render.yaml` blueprint (free tier: no Elasticsearch, schedulers off).
3. **Production path** — GKE via Helm chart (`infra/deployment/helm/hrms`), HPA 2–10
   replicas, Kyverno admission policies, Cosign-signed images from GitHub Actions.
