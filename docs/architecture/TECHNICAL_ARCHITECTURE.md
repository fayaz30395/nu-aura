# Technical Architecture Document

## 1. System Overview

### 1.1 Architecture Pattern

NU-AURA follows a **Modular Monolith** architecture, combining the simplicity of a monolithic deployment with the modularity of microservices.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Web App    │  │  Mobile PWA  │  │  Admin Panel │                   │
│  │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          LOAD BALANCER                                   │
│                    (Kubernetes Ingress / GCP LB)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Spring Boot Application                       │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │    │
│  │  │   Auth     │  │   Rate     │  │  Tenant    │  │  CORS     │  │    │
│  │  │  Filter    │  │  Limiter   │  │  Context   │  │  Filter   │  │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Employee │ │Attendance│ │ Leave   │ │ Payroll │ │Performance│          │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │ │ Module   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Project  │ │Benefits │ │Training │ │ Expense │ │  Asset  │           │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │ │ Module  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │    Redis    │  │   MinIO     │  │  External   │    │
│  │  Database   │  │    Cache    │  │   Storage   │  │   APIs      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Separation of Concerns** | Clear layer boundaries (API, Service, Repository) |
| **Domain-Driven Design** | Module organization by business domain |
| **SOLID Principles** | Interface-based design, single responsibility |
| **12-Factor App** | Config via environment, stateless services |
| **API-First** | OpenAPI specification, versioned endpoints |

---

## 2. Technology Stack

### 2.1 Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Spring Boot | 3.4.1 | Application framework |
| **Language** | Java | 17/21 | Backend language |
| **Build Tool** | Maven | 3.8+ | Dependency management |
| **ORM** | Hibernate/JPA | 6.4+ | Object-relational mapping |
| **Database** | PostgreSQL | 14+ | Primary data store |
| **Migrations** | Liquibase | 4.31.1 | Schema versioning |
| **Cache** | Redis | 6+ | Session and data cache |
| **Security** | Spring Security | 6.2+ | Authentication/Authorization |
| **JWT** | jjwt | 0.12.6 | Token management |
| **API Docs** | SpringDoc OpenAPI | 2.7.0 | Swagger documentation |
| **Mapping** | MapStruct | 1.6.3 | DTO transformations |
| **Rate Limiting** | Bucket4j | 8.7.0 | API throttling |
| **File Storage** | MinIO Client | 8.5.15 | S3-compatible storage |
| **PDF Generation** | OpenPDF | 2.0.3 | Document generation |
| **Excel** | Apache POI | 5.3.0 | Spreadsheet handling |
| **Email** | Spring Mail | 3.4.1 | Email notifications |
| **SMS** | Twilio | 10.1.0 | SMS notifications |
| **Metrics** | Micrometer | 1.12+ | Application metrics |

### 2.2 Frontend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js | 14.2.35 | React framework (App Router) |
| **Language** | TypeScript | 5.9.3 | Type-safe JavaScript |
| **UI Library** | Mantine UI | 8.3.10 | Component library |
| **Styling** | Tailwind CSS | 3.4.0 | Utility-first CSS |
| **State** | Zustand | 4.4.7 | Client state management |
| **Server State** | React Query | 5.17.0 | API state management |
| **Forms** | React Hook Form | 7.49.2 | Form handling |
| **HTTP Client** | Axios | 1.6.2 | API requests |
| **Charts** | Recharts | 3.5.0 | Data visualization |
| **Date Utils** | date-fns, dayjs | 3.0.6, 1.11.19 | Date manipulation |
| **Icons** | Lucide React | 0.561.0 | Icon library |
| **WebSocket** | STOMP.js | 7.2.1 | Real-time communication |
| **Testing** | Playwright | 1.57.0 | E2E testing |

### 2.3 Infrastructure Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Containerization** | Docker | Application packaging |
| **Orchestration** | Kubernetes | Container orchestration |
| **Cloud Platform** | GCP | Primary cloud provider |
| **CI/CD** | GitHub Actions | Automated pipelines |
| **Monitoring** | Prometheus + Grafana | Metrics and dashboards |
| **Alerting** | AlertManager | Alert management |
| **Logging** | Logback + Logstash | Structured logging |

---

## 3. Layered Architecture

### 3.1 Layer Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER (Controllers)                       │
│   • REST endpoint definitions                                        │
│   • Request validation                                               │
│   • Response transformation                                          │
│   • API documentation annotations                                    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Services)                      │
│   • Business logic implementation                                    │
│   • Transaction management                                           │
│   • Cross-cutting concerns                                           │
│   • Orchestration of domain operations                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER (Entities)                         │
│   • JPA entity definitions                                           │
│   • Business rules and invariants                                    │
│   • Value objects                                                    │
│   • Domain events                                                    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER (Repositories)                  │
│   • Data access abstraction                                          │
│   • JPA repository interfaces                                        │
│   • Custom queries                                                   │
│   • External service integrations                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Package Structure

```
com.nulogic.hrms/
├── common/                          # Shared utilities
│   ├── config/                      # Configuration classes
│   ├── security/                    # Security components
│   ├── exception/                   # Exception handling
│   ├── dto/                         # Common DTOs
│   └── util/                        # Utility classes
│
├── employee/                        # Employee module
│   ├── api/                         # Controllers
│   │   └── EmployeeController.java
│   ├── application/                 # Services
│   │   └── EmployeeService.java
│   ├── domain/                      # Entities
│   │   └── Employee.java
│   ├── infrastructure/              # Repositories
│   │   └── EmployeeRepository.java
│   └── dto/                         # Module DTOs
│       ├── EmployeeRequest.java
│       └── EmployeeResponse.java
│
├── attendance/                      # Attendance module
├── leave/                           # Leave module
├── payroll/                         # Payroll module
├── performance/                     # Performance module
├── recruitment/                     # Recruitment module
├── project/                         # Project management
├── benefits/                        # Benefits module
├── training/                        # Training/LMS module
├── expense/                         # Expense module
├── asset/                           # Asset management
├── engagement/                      # Engagement module
├── analytics/                       # Analytics module
└── notification/                    # Notifications
```

### 3.3 Frontend Structure

```
hrms-frontend/
├── app/                             # Next.js App Router pages
│   ├── (auth)/                      # Auth routes (login, etc.)
│   ├── (dashboard)/                 # Protected dashboard routes
│   │   ├── employees/               # Employee pages
│   │   ├── attendance/              # Attendance pages
│   │   ├── leave/                   # Leave pages
│   │   ├── payroll/                 # Payroll pages
│   │   ├── projects/                # Project pages
│   │   └── settings/                # Settings pages
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page
│
├── components/                      # Reusable components
│   ├── common/                      # Common components
│   ├── layout/                      # Layout components
│   ├── forms/                       # Form components
│   └── [module]/                    # Module-specific components
│
├── lib/                             # Utilities and services
│   ├── services/                    # API service classes
│   ├── types/                       # TypeScript interfaces
│   ├── utils/                       # Utility functions
│   ├── hooks/                       # Custom React hooks
│   └── store/                       # Zustand stores
│
└── public/                          # Static assets
```

---

## 4. Multi-Tenancy Architecture

### 4.1 Tenant Isolation Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                  │
│                                                                      │
│  ┌───────────┐    ┌──────────────┐    ┌───────────────────────┐    │
│  │  Client   │───▶│   Request    │───▶│   TenantFilter        │    │
│  │  Request  │    │   Headers    │    │   (Extract Tenant)    │    │
│  └───────────┘    │ X-Tenant-ID  │    └───────────────────────┘    │
│                   └──────────────┘              │                   │
│                                                  ▼                   │
│                                    ┌───────────────────────┐        │
│                                    │   TenantContext       │        │
│                                    │   (ThreadLocal)       │        │
│                                    └───────────────────────┘        │
│                                                  │                   │
│                                                  ▼                   │
│                                    ┌───────────────────────┐        │
│                                    │   JPA Entity Filter   │        │
│                                    │   (Auto-add tenant_id)│        │
│                                    └───────────────────────┘        │
│                                                  │                   │
│                                                  ▼                   │
│                                    ┌───────────────────────┐        │
│                                    │   Database Query      │        │
│                                    │   WHERE tenant_id = ? │        │
│                                    └───────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Tenant Context Implementation

```java
// TenantContext.java
public class TenantContext {
    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();

    public static UUID getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    public static void setCurrentTenant(UUID tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
```

### 4.3 Entity-Level Tenant Filtering

```java
// Base entity with tenant
@MappedSuperclass
public abstract class TenantAwareEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @PrePersist
    public void setTenantOnCreate() {
        this.tenantId = TenantContext.getCurrentTenant();
    }
}
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                               │
│                                                                      │
│  ┌────────────┐                                                     │
│  │   User     │                                                     │
│  │  Login     │                                                     │
│  └─────┬──────┘                                                     │
│        │                                                            │
│        ▼                                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │             Authentication Options                          │    │
│  │  ┌──────────────────┐    ┌──────────────────┐              │    │
│  │  │  Email/Password  │    │   Google SSO     │              │    │
│  │  │  Authentication  │    │  (OIDC + PKCE)   │              │    │
│  │  └────────┬─────────┘    └────────┬─────────┘              │    │
│  │           │                       │                         │    │
│  │           └───────────┬───────────┘                         │    │
│  │                       ▼                                     │    │
│  │           ┌──────────────────────┐                          │    │
│  │           │  Validate Credentials │                         │    │
│  │           │  or Google Token      │                         │    │
│  │           └──────────┬───────────┘                          │    │
│  │                      ▼                                      │    │
│  │           ┌──────────────────────┐                          │    │
│  │           │  Generate JWT Tokens │                          │    │
│  │           │  (Access + Refresh)  │                          │    │
│  │           └──────────┬───────────┘                          │    │
│  └──────────────────────┼──────────────────────────────────────┘    │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Token Response                             │  │
│  │  {                                                            │  │
│  │    "accessToken": "eyJhbGciOiJIUzI1NiIs...",                 │  │
│  │    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",                │  │
│  │    "expiresIn": 3600,                                        │  │
│  │    "user": { ... }                                           │  │
│  │  }                                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION FLOW                                │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  API Request │───▶│  JWT Filter  │───▶│  Extract User +      │  │
│  │  + Bearer    │    │  Validation  │    │  Permissions         │  │
│  │  Token       │    │              │    │                      │  │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘  │
│                                                      │              │
│                                                      ▼              │
│                                          ┌──────────────────────┐  │
│                                          │  @RequiresPermission │  │
│                                          │  Annotation Check    │  │
│                                          └──────────┬───────────┘  │
│                                                      │              │
│                      ┌───────────────────────────────┼──────────┐  │
│                      ▼                               ▼          │  │
│           ┌──────────────────┐             ┌──────────────────┐ │  │
│           │  Permission      │             │  Scope Check     │ │  │
│           │  Exists?         │             │  (Data Filter)   │ │  │
│           └────────┬─────────┘             └────────┬─────────┘ │  │
│                    │                                │           │  │
│        ┌───────────┴───────────┐                   │           │  │
│        ▼                       ▼                    ▼           │  │
│  ┌───────────┐          ┌───────────┐       ┌───────────┐      │  │
│  │   ALLOW   │          │   DENY    │       │  Filter   │      │  │
│  │  Request  │          │  (403)    │       │  Results  │      │  │
│  └───────────┘          └───────────┘       │  by Scope │      │  │
│                                             └───────────┘      │  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Security Filters Chain

```java
// Security configuration order
1. CorsFilter                    // CORS headers
2. RateLimitFilter              // API rate limiting
3. TenantFilter                 // Tenant context extraction
4. JwtAuthenticationFilter      // JWT token validation
5. AuthorizationFilter          // Permission checking
6. ExceptionHandlerFilter       // Security exceptions
```

---

## 6. Data Flow Architecture

### 6.1 Request Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      REQUEST PROCESSING                              │
│                                                                      │
│  Client ──▶ Controller ──▶ Service ──▶ Repository ──▶ Database      │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  HTTP    │  │  Request │  │ Business │  │   JPA    │  │ SQL    ││
│  │  Request │  │  DTO     │  │  Logic   │  │  Entity  │  │ Query  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘│
│       │             │             │             │             │     │
│       ▼             ▼             ▼             ▼             ▼     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    TRANSFORMATION CHAIN                       │  │
│  │                                                               │  │
│  │  JSON ─▶ RequestDTO ─▶ Entity ─▶ ResponseDTO ─▶ JSON         │  │
│  │              │                        ▲                       │  │
│  │              │      MapStruct         │                       │  │
│  │              └────────────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Real-time Updates (WebSocket)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET ARCHITECTURE                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      STOMP over WebSocket                    │    │
│  │                                                              │    │
│  │   Client A ◄───────────────────────────────────► Server     │    │
│  │      │                                              │        │    │
│  │      │    SUBSCRIBE: /user/queue/notifications      │        │    │
│  │      │ ◄─────────────────────────────────────────── │        │    │
│  │      │                                              │        │    │
│  │      │    MESSAGE: { type: "LEAVE_APPROVED", ... }  │        │    │
│  │      │ ◄─────────────────────────────────────────── │        │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Message Topics                            │    │
│  │                                                              │    │
│  │  /topic/announcements     - Company-wide broadcasts         │    │
│  │  /user/queue/notifications - User-specific notifications    │    │
│  │  /topic/projects/{id}     - Project updates                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Caching Strategy

### 7.1 Cache Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CACHING ARCHITECTURE                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    L1: Application Cache                     │    │
│  │              (JVM Heap - Caffeine/EhCache)                   │    │
│  │                    TTL: Short (5 min)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    L2: Distributed Cache                     │    │
│  │                        (Redis)                               │    │
│  │                    TTL: Medium (30 min)                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    L3: Database                              │    │
│  │                   (PostgreSQL)                               │    │
│  │                  Source of Truth                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Cache Use Cases

| Cache Key Pattern | Data Cached | TTL |
|-------------------|-------------|-----|
| `user:{id}` | User profile data | 30 min |
| `permissions:{userId}` | User permissions | 15 min |
| `employee:{id}` | Employee details | 30 min |
| `leave-balance:{empId}` | Leave balances | 5 min |
| `config:{tenantId}` | Tenant configuration | 60 min |
| `session:{token}` | Session data | Token expiry |

---

## 8. Database Design

### 8.1 Schema Strategy

- **Single Database**: All tenants in one database
- **Row-Level Isolation**: `tenant_id` column on every table
- **UUID Primary Keys**: Distributed-friendly identifiers
- **Audit Columns**: `created_at`, `updated_at`, `created_by`, `updated_by`
- **Soft Deletes**: `deleted_at` for logical deletion

### 8.2 Index Strategy

```sql
-- Common index patterns
CREATE INDEX idx_tenant_id ON employees(tenant_id);
CREATE INDEX idx_tenant_dept ON employees(tenant_id, department_id);
CREATE INDEX idx_created_at ON employees(created_at DESC);
CREATE INDEX idx_email ON employees(email);
CREATE INDEX idx_full_text ON employees USING gin(to_tsvector('english', first_name || ' ' || last_name));
```

### 8.3 Connection Pooling

```yaml
# HikariCP configuration
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

---

## 9. API Design Standards

### 9.1 RESTful Conventions

| Operation | HTTP Method | URL Pattern | Example |
|-----------|-------------|-------------|---------|
| List | GET | `/resource` | `GET /employees` |
| Get One | GET | `/resource/{id}` | `GET /employees/123` |
| Create | POST | `/resource` | `POST /employees` |
| Update | PUT | `/resource/{id}` | `PUT /employees/123` |
| Partial Update | PATCH | `/resource/{id}` | `PATCH /employees/123` |
| Delete | DELETE | `/resource/{id}` | `DELETE /employees/123` |
| Custom Action | POST | `/resource/{id}/action` | `POST /leave/123/approve` |

### 9.2 Response Format

```json
// Success Response
{
  "status": "SUCCESS",
  "code": 200,
  "data": { /* payload */ },
  "message": "Operation successful",
  "timestamp": "2026-01-11T10:30:00Z"
}

// Error Response
{
  "status": "ERROR",
  "code": 400,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  },
  "timestamp": "2026-01-11T10:30:00Z"
}

// Paginated Response
{
  "status": "SUCCESS",
  "code": 200,
  "data": {
    "content": [ /* items */ ],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5
  }
}
```

### 9.3 API Versioning

```
Base URL: /api/v1/
Future:   /api/v2/
```

---

## 10. Observability

### 10.1 Logging Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LOGGING ARCHITECTURE                            │
│                                                                      │
│  Application ──▶ Logback ──▶ JSON Format ──▶ stdout                 │
│                                    │                                 │
│                                    ▼                                 │
│                          ┌─────────────────┐                        │
│                          │   Log Aggregator│                        │
│                          │  (Cloud Logging)│                        │
│                          └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

#### Log Levels
- **ERROR**: Application errors, exceptions
- **WARN**: Potentially harmful situations
- **INFO**: Significant application events
- **DEBUG**: Detailed information for debugging
- **TRACE**: Most detailed logging

#### Structured Log Format
```json
{
  "timestamp": "2026-01-11T10:30:00.000Z",
  "level": "INFO",
  "logger": "com.nulogic.hrms.employee.EmployeeService",
  "message": "Employee created",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "traceId": "abc123",
  "data": {
    "employeeId": "emp-456"
  }
}
```

### 10.2 Metrics

#### Application Metrics (Micrometer)
- Request count and latency (by endpoint)
- JVM metrics (heap, GC, threads)
- Database connection pool stats
- Cache hit/miss ratios
- Custom business metrics

#### Prometheus Endpoint
```
GET /actuator/prometheus
```

### 10.3 Health Checks

```
GET /actuator/health

{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "redis": { "status": "UP" },
    "diskSpace": { "status": "UP" }
  }
}
```

---

## 11. Scalability Considerations

### 11.1 Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────────┐
│                      KUBERNETES DEPLOYMENT                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Load Balancer                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│            ┌─────────────────┼─────────────────┐                    │
│            ▼                 ▼                 ▼                    │
│      ┌───────────┐     ┌───────────┐     ┌───────────┐            │
│      │  Pod 1    │     │  Pod 2    │     │  Pod 3    │            │
│      │  hrms-api │     │  hrms-api │     │  hrms-api │            │
│      └───────────┘     └───────────┘     └───────────┘            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │            HPA: Auto-scale 2-10 pods based on CPU            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Stateless Design

- No server-side session storage (JWT-based auth)
- External cache (Redis) for shared state
- External file storage (MinIO/S3)
- Database for persistence

### 11.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | < 200ms | P95 latency |
| Throughput | 1000 RPS | Per pod |
| Availability | 99.9% | Monthly uptime |
| Database Queries | < 100ms | Average |

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
