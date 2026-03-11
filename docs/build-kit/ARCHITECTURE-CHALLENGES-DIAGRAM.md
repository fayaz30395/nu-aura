# Architecture Challenges - Visual Overview

---

## Challenge Dependency Graph

```mermaid
graph TB
    subgraph "Week 1: Foundation"
        A[ADR-005: DB Connection Pool<br/>CRITICAL<br/>8 hours]
    end

    subgraph "Week 2: Quick Wins"
        B[ADR-001: Theme Consolidation<br/>HIGH<br/>16 hours]
    end

    subgraph "Week 3: Security"
        C[ADR-002: JWT Optimization<br/>CRITICAL<br/>28 hours]
    end

    subgraph "Week 4-8: Data Integrity"
        D[ADR-003: Payroll Saga<br/>CRITICAL<br/>80 hours]
    end

    subgraph "Week 4-16: Feature Parity"
        E[ADR-004: ATS Gaps<br/>MEDIUM<br/>480 hours]
        E1[Phase 1: Kanban + Offers<br/>160 hours]
        E2[Phase 2: Communication<br/>120 hours]
        E3[Phase 3: Analytics<br/>80 hours]
        E4[Phase 4: Job Board<br/>120 hours]
        E --> E1 --> E2 --> E3 --> E4
    end

    A -->|Unblocks| B
    B -->|Improves DX| C
    C -->|Enables| D
    A -->|Parallel| D
    D -->|Parallel| E1

    style A fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px
    style C fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px
    style D fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px
    style B fill:#51cf66,stroke:#2f9e44,stroke-width:2px
    style E fill:#339af0,stroke:#1971c2,stroke-width:2px
```

---

## Impact vs. Effort Matrix

```mermaid
quadrantChart
    title Architecture Challenges - Prioritization Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Strategic Investments
    quadrant-2 Quick Wins
    quadrant-3 Low Priority
    quadrant-4 Time Sinks

    DB Connection Pool: [0.1, 0.95]
    Theme Consolidation: [0.2, 0.7]
    JWT Optimization: [0.3, 0.9]
    Saga Pattern: [0.6, 0.95]
    ATS Phase 1: [0.7, 0.85]
    ATS Phase 2-4: [0.9, 0.6]
```

---

## Current vs. Target State Architecture

### Before: Performance Bottlenecks

```mermaid
graph LR
    User[100 Users] -->|13KB JWT each| API[API Gateway]
    API -->|Queue 90 requests| Pool[DB Pool: 10 conn]
    Pool -->|9s wait time| DB[(PostgreSQL)]

    Payroll[Payroll Service] -->|Single Transaction| Email[Email Service]
    Email -->|Fails at Step 4| Rollback[Full Rollback]

    UI[Frontend] -->|2500+ dark: classes| Theme[Theme System]
    Theme -->|Hydration mismatch| Flash[Theme Flash]

    Recruiter[Recruiter] -->|No Pipeline| Basic[Basic CRUD]
    Basic -->|No Offers| Manual[Manual Process]

    style Pool fill:#ff6b6b,stroke:#c92a2a
    style Email fill:#ff6b6b,stroke:#c92a2a
    style Theme fill:#ffd43b,stroke:#f08c00
    style Basic fill:#ffd43b,stroke:#f08c00
```

### After: Optimized Architecture

```mermaid
graph LR
    User[100 Users] -->|560B JWT| API[API Gateway]
    API -->|Redis Cache| Auth[Auth Service]
    API -->|No queue| Pool[DB Pool: 60 conn]
    Pool -->|200ms response| DB[(PostgreSQL)]

    Payroll[Payroll Service] -->|Saga Orchestrator| Step1[Calculate Salaries]
    Step1 -->|Compensate on fail| Step2[Generate Payslips]
    Step2 --> Step3[Send Emails]
    Step3 --> Step4[Bank Queue]

    UI[Frontend] -->|500 classes| Theme[CSS Variables]
    Theme -->|No flash| Smooth[Smooth Transition]

    Recruiter[Recruiter] -->|Kanban| Pipeline[Visual Pipeline]
    Pipeline -->|DocuSign| Offers[E-Signature Offers]
    Pipeline -->|Analytics| Dashboard[Metrics Dashboard]

    style Pool fill:#51cf66,stroke:#2f9e44
    style Step2 fill:#51cf66,stroke:#2f9e44
    style Theme fill:#51cf66,stroke:#2f9e44
    style Pipeline fill:#51cf66,stroke:#2f9e44
```

---

## JWT Token Optimization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Redis
    participant DB

    Note over User,DB: Current Flow (13KB JWT)
    User->>Frontend: Login
    Frontend->>API: Authenticate
    API->>DB: Load user + 50 permissions
    API-->>Frontend: JWT (13KB)
    loop Every API Request
        Frontend->>API: Request + 13KB JWT
        API->>API: Parse 13KB token (2-5ms)
    end

    Note over User,DB: Optimized Flow (560B JWT)
    User->>Frontend: Login
    Frontend->>API: Authenticate
    API->>DB: Load user + permissions
    API->>Redis: Cache permissions (sessionId)
    API-->>Frontend: JWT (560B) + sessionId
    loop Every API Request
        Frontend->>API: Request + 560B JWT (96% smaller)
        API->>API: Parse 560B token (0.5ms)
        API->>Redis: GET permissions (1ms)
        Redis-->>API: Cached permissions
    end

    Note over API,Redis: On Role Change
    API->>Redis: DELETE permissions cache
```

---

## Payroll Saga State Machine

```mermaid
stateDiagram-v2
    [*] --> INITIATED: Start Saga

    INITIATED --> CALCULATING: Execute Step 1
    CALCULATING --> CALCULATED: Success
    CALCULATING --> COMPENSATING: Failure

    CALCULATED --> GENERATING_PAYSLIPS: Execute Step 2
    GENERATING_PAYSLIPS --> PAYSLIPS_GENERATED: Success
    GENERATING_PAYSLIPS --> COMPENSATING: Failure

    PAYSLIPS_GENERATED --> SENDING_NOTIFICATIONS: Execute Step 3
    SENDING_NOTIFICATIONS --> NOTIFICATIONS_SENT: Success (best effort)

    NOTIFICATIONS_SENT --> UPDATING_BANK_QUEUE: Execute Step 4
    UPDATING_BANK_QUEUE --> BANK_QUEUE_UPDATED: Success
    UPDATING_BANK_QUEUE --> COMPENSATING: Failure

    BANK_QUEUE_UPDATED --> COMPLETED: Finalize

    COMPENSATING --> COMPENSATED: Rollback Complete
    COMPENSATING --> FAILED: Compensation Failed

    COMPLETED --> [*]
    COMPENSATED --> [*]
    FAILED --> [*]

    note right of SENDING_NOTIFICATIONS
        Eventual Consistency:
        Email failures logged
        but don't block workflow
    end note

    note right of COMPENSATING
        Reverse Order:
        4. Remove from bank queue
        3. Send failure email
        2. Delete payslips
        1. Clear calculations
    end note
```

---

## ATS Implementation Phases

```mermaid
gantt
    title Recruitment ATS - 12 Week Roadmap
    dateFormat YYYY-MM-DD
    section Phase 1: Critical
    Pipeline Entity & API        :p1a, 2026-03-18, 1w
    Kanban Board Frontend        :p1b, after p1a, 1w
    Offer Letter Templates       :p1c, after p1b, 1w
    DocuSign Integration         :p1d, after p1c, 1w

    section Phase 2: Communication
    Email Templates & Hub        :p2a, after p1d, 2w
    HackerRank Integration       :p2b, after p2a, 1w

    section Phase 3: Analytics
    Analytics Service            :p3a, after p2b, 1w
    Dashboard UI                 :p3b, after p3a, 1w

    section Phase 4: Job Board
    Public Job Listings          :p4a, after p3b, 1w
    Application Portal           :p4b, after p4a, 1w
    Candidate Self-Service       :p4c, after p4b, 1w
```

---

## Connection Pool Sizing Analysis

```mermaid
graph TB
    subgraph "Current State (10 Connections)"
        U1[100 Concurrent Users]
        U1 -->|Request 1-10| P1[Active: 10]
        U1 -->|Request 11-100| Q1[Queued: 90<br/>Wait: 9s avg]
        P1 --> DB1[(PostgreSQL<br/>CPU: 10%)]
        Q1 -.->|Waiting| P1
    end

    subgraph "Target State (60 Connections)"
        U2[100 Concurrent Users]
        U2 -->|Request 1-60| P2[Active: 48 avg]
        U2 -->|Request 61-100| P2A[Available: 12]
        P2 --> DB2[(PostgreSQL<br/>CPU: 50%)]
        P2A -.->|Buffer| P2
    end

    style Q1 fill:#ff6b6b,stroke:#c92a2a
    style P2 fill:#51cf66,stroke:#2f9e44
```

**Formula:**
```
max_pool_size = (peak_concurrent_requests / avg_db_time_per_request) × buffer
              = (100 / 0.2s) × 1.2
              = 60 connections
```

---

## Theme Architecture Migration

```mermaid
graph LR
    subgraph "Before: Tailwind Dark Classes"
        C1[Component A]
        C2[Component B]
        C3[Component C]

        C1 -->|bg-white dark:bg-gray-800| T1[Hardcoded]
        C2 -->|text-gray-900 dark:text-white| T1
        C3 -->|border-gray-200 dark:border-gray-700| T1

        T1 -->|2500+ instances| Duplication[Code Duplication]
        T1 -->|Hydration mismatch| Flash[Theme Flash]
    end

    subgraph "After: CSS Variables System"
        C4[Component A]
        C5[Component B]
        C6[Component C]

        C4 -->|bg-surface| V1[CSS Variables]
        C5 -->|text-text-primary| V1
        C6 -->|border-border| V1

        V1 -->|Single source| Root[":root" & ".dark"]
        Root -->|Smooth 200ms| Transition[Theme Transition]
        Root -->|SSR cookie| NoFlash[No Flash]
    end

    style Duplication fill:#ff6b6b,stroke:#c92a2a
    style Flash fill:#ff6b6b,stroke:#c92a2a
    style Root fill:#51cf66,stroke:#2f9e44
    style NoFlash fill:#51cf66,stroke:#2f9e44
```

---

## Performance Improvement Summary

```mermaid
graph TD
    subgraph "Current Performance Issues"
        I1[JWT: 13.3KB tokens]
        I2[API: 9s latency p95]
        I3[Theme: Hydration flash]
        I4[Payroll: 10% rollback rate]
        I5[Connections: 100% exhausted]

        style I1 fill:#ff6b6b,stroke:#c92a2a
        style I2 fill:#ff6b6b,stroke:#c92a2a
        style I3 fill:#ffd43b,stroke:#f08c00
        style I4 fill:#ff6b6b,stroke:#c92a2a
        style I5 fill:#ff6b6b,stroke:#c92a2a
    end

    subgraph "Target Performance"
        T1[JWT: 560B tokens<br/>96% reduction]
        T2[API: 200ms latency<br/>97.8% faster]
        T3[Theme: 0ms flash<br/>100% smooth]
        T4[Payroll: 1% saga failure<br/>99% success]
        T5[Connections: 60-80% utilized<br/>Scalable]

        style T1 fill:#51cf66,stroke:#2f9e44
        style T2 fill:#51cf66,stroke:#2f9e44
        style T3 fill:#51cf66,stroke:#2f9e44
        style T4 fill:#51cf66,stroke:#2f9e44
        style T5 fill:#51cf66,stroke:#2f9e44
    end

    I1 -.->|ADR-002| T1
    I2 -.->|ADR-005| T2
    I3 -.->|ADR-001| T3
    I4 -.->|ADR-003| T4
    I5 -.->|ADR-005| T5
```

---

## Resource Allocation Timeline

```mermaid
gantt
    title Engineering Resource Allocation - 12 Weeks
    dateFormat YYYY-MM-DD
    section Backend Team
    DB Connection Pool (1 eng)    :b1, 2026-03-18, 1w
    JWT Optimization (1 eng)      :b2, after b1, 1w
    Saga Pattern (1 senior)       :b3, after b2, 5w

    section Frontend Team
    Theme Migration (1 eng)       :f1, 2026-03-25, 4d
    ATS Phase 1 Frontend (1 eng)  :f2, after f1, 3w

    section Full-Stack Team
    ATS Phase 1 Backend (1 eng)   :fs1, 2026-04-15, 4w
    ATS Phase 2 (2 eng)           :fs2, after fs1, 3w
    ATS Phase 3 (2 eng)           :fs3, after fs2, 2w
    ATS Phase 4 (2 eng)           :fs4, after fs3, 3w

    section DevOps
    Redis Setup (0.5 eng)         :d1, 2026-03-18, 2d
    Monitoring Dashboards (0.5)   :d2, 2026-03-20, 1w
    DB Instance Upgrade (0.5)     :d3, 2026-03-18, 1d
```

---

## Cost-Benefit Analysis

### One-Time Development Costs

| ADR | Hours | Cost (@$75/hr) |
|-----|-------|----------------|
| ADR-001 | 16 | $1,200 |
| ADR-002 | 28 | $2,100 |
| ADR-003 | 80 | $6,000 |
| ADR-004 | 480 | $36,000 |
| ADR-005 | 8 | $600 |
| **Total** | **612** | **$45,900** |

### Ongoing Infrastructure Costs

| Item | Current | New | Incremental |
|------|---------|-----|-------------|
| PostgreSQL (db.t3.large) | $60/mo | $120/mo | +$60/mo |
| DocuSign | $0 | $25/mo | +$25/mo |
| HackerRank | $0 | $300/mo | +$300/mo |
| **Total** | **$60/mo** | **$505/mo** | **+$445/mo** |

### ROI Calculation

```
Annual Infrastructure Cost: $5,340
One-Time Development: $45,900
Total Year 1 Cost: $51,240

Benefits:
- 10x user scalability (10 → 100 users)
- 95% ATS feature parity → Enterprise sales readiness
- 97% latency improvement → Better retention

Break-Even: 1 additional enterprise customer @ $10K/year
```

---

**Document Owner:** Architecture Team
**Last Updated:** 2026-03-11
**Related:** [ADR Index](./ADR-INDEX.md) | [Summary](./CRITICAL-ARCHITECTURE-CHALLENGES-SUMMARY.md)
