# Nu-Aura HRMS Architecture

## System Overview

Nu-Aura HRMS is a comprehensive, enterprise-grade Human Resource Management System built with a modern microservices-ready architecture.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   Web Browser    │  │   Mobile App     │  │   3rd Party      │              │
│  │   (Next.js 14)   │  │   (React Native) │  │   Integrations   │              │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘              │
│           │                     │                      │                        │
│           └─────────────────────┼──────────────────────┘                        │
│                                 │                                               │
│                         ┌───────▼───────┐                                       │
│                         │   API Gateway  │                                       │
│                         │   (HTTPS/SSL)  │                                       │
│                         └───────┬───────┘                                       │
│                                                                                  │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────────┐
│                           BACKEND LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     Spring Boot Application                              │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │  Security   │  │   REST      │  │  Filters &  │  │  Exception  │     │    │
│  │  │  Filters    │  │  Controllers│  │ Interceptors│  │  Handlers   │     │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │    │
│  │         │                │                │                │            │    │
│  │  ┌──────▼────────────────▼────────────────▼────────────────▼──────┐     │    │
│  │  │                    SERVICE LAYER                                │     │    │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │     │    │
│  │  │  │ Employee   │ │ Attendance │ │  Payroll   │ │Performance │   │     │    │
│  │  │  │ Service    │ │ Service    │ │  Service   │ │ Service    │   │     │    │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │     │    │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │     │    │
│  │  │  │   Leave    │ │  Benefits  │ │ Recruitment│ │  Training  │   │     │    │
│  │  │  │  Service   │ │  Service   │ │  Service   │ │  Service   │   │     │    │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │     │    │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │     │    │
│  │  │  │  Wellness  │ │   Asset    │ │    Exit    │ │   Letter   │   │     │    │
│  │  │  │  Service   │ │  Service   │ │  Service   │ │  Service   │   │     │    │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │     │    │
│  │  └────────────────────────────────────────────────────────────────┘     │    │
│  │                              │                                           │    │
│  │  ┌───────────────────────────▼───────────────────────────────────┐      │    │
│  │  │                    REPOSITORY LAYER                            │      │    │
│  │  │              (Spring Data JPA Repositories)                    │      │    │
│  │  └───────────────────────────┬───────────────────────────────────┘      │    │
│  │                                                                          │    │
│  └──────────────────────────────┼───────────────────────────────────────────┘    │
│                                 │                                                │
└─────────────────────────────────┼────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────────────────────┐
│                            DATA LAYER                                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │
│  │    PostgreSQL    │  │      Redis       │  │      MinIO       │               │
│  │    Database      │  │      Cache       │  │   File Storage   │               │
│  │   (80+ Tables)   │  │ (Session/Cache)  │  │   (Documents)    │               │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘               │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with SSR |
| React | 18.x | UI library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 3.x | Utility-first CSS |
| Axios | 1.x | HTTP client |
| Lucide React | - | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 21 | Programming language |
| Spring Boot | 3.3.x | Application framework |
| Spring Security | 6.x | Authentication & Authorization |
| Spring Data JPA | 3.x | Data persistence |
| PostgreSQL | 16.x | Primary database |
| Hibernate | 6.x | ORM framework |
| JWT | - | Token authentication |
| Swagger/OpenAPI | 3.x | API documentation |

### Infrastructure (Ready)
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Redis | Caching & Sessions |
| MinIO/S3 | File storage |
| Elasticsearch | Search (planned) |

## Module Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                         API MODULES                                    │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │     CORE        │  │    EMPLOYEE     │  │   ATTENDANCE    │       │
│  │  - Auth         │  │  - CRUD         │  │  - Check-in/out │       │
│  │  - Tenant       │  │  - Directory    │  │  - Shifts       │       │
│  │  - RBAC         │  │  - Import       │  │  - Overtime     │       │
│  │  - Audit        │  │  - Custom Fields│  │  - Geofencing   │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │     LEAVE       │  │    PAYROLL      │  │   PERFORMANCE   │       │
│  │  - Requests     │  │  - Salary       │  │  - Goals/OKRs   │       │
│  │  - Balances     │  │  - Payslips     │  │  - Reviews      │       │
│  │  - Holidays     │  │  - Tax          │  │  - 360 Feedback │       │
│  │  - Policies     │  │  - Compliance   │  │  - Recognition  │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │   RECRUITMENT   │  │    BENEFITS     │  │    TRAINING     │       │
│  │  - Jobs         │  │  - Plans        │  │  - Programs     │       │
│  │  - Candidates   │  │  - Enrollments  │  │  - LMS          │       │
│  │  - Interviews   │  │  - Claims       │  │  - Certificates │       │
│  │  - Onboarding   │  │  - Flex         │  │  - Skills       │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │    WELLNESS     │  │     ASSETS      │  │      EXIT       │       │
│  │  - Programs     │  │  - Inventory    │  │  - Offboarding  │       │
│  │  - Challenges   │  │  - Assignment   │  │  - Clearance    │       │
│  │  - Health Logs  │  │  - Recovery     │  │  - F&F          │       │
│  │  - Leaderboard  │  │  - Tracking     │  │  - Interviews   │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │    LETTERS      │  │   ENGAGEMENT    │  │   ANALYTICS     │       │
│  │  - Templates    │  │  - Announce     │  │  - Dashboards   │       │
│  │  - Generation   │  │  - Surveys      │  │  - Reports      │       │
│  │  - Workflow     │  │  - Social Feed  │  │  - Predictive   │       │
│  │  - E-Sign       │  │  - 1-on-1       │  │  - Export       │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SECURITY FLOW                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────────┐         │
│   │  Client  │───►│ JWT Filter   │───►│ SecurityContext  │         │
│   │ Request  │    │              │    │                  │         │
│   └──────────┘    └──────────────┘    └────────┬─────────┘         │
│                                                 │                    │
│                                                 ▼                    │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                  Permission Check                         │      │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │      │
│   │  │ Role-Based  │  │ Permission  │  │ Tenant      │       │      │
│   │  │ Access      │  │ Annotation  │  │ Isolation   │       │      │
│   │  │ Control     │  │ @Requires   │  │ Filter      │       │      │
│   │  └─────────────┘  └─────────────┘  └─────────────┘       │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ROLES:                                                             │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │ SUPER_ADMIN → HR_ADMIN → MANAGER → EMPLOYEE               │     │
│   │     │            │          │          │                  │     │
│   │     └──────────────────────────────────┘                  │     │
│   │              (Role Hierarchy)                             │     │
│   └───────────────────────────────────────────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                      REQUEST FLOW                                      │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   1. Client Request                                                    │
│      │                                                                 │
│      ▼                                                                 │
│   2. Security Filter (JWT Validation + Tenant Context)                 │
│      │                                                                 │
│      ▼                                                                 │
│   3. REST Controller (Request Validation + DTO Mapping)                │
│      │                                                                 │
│      ▼                                                                 │
│   4. Service Layer (Business Logic + Transaction)                      │
│      │                                                                 │
│      ▼                                                                 │
│   5. Repository Layer (Data Access)                                    │
│      │                                                                 │
│      ▼                                                                 │
│   6. Database (PostgreSQL with Tenant Filter)                          │
│      │                                                                 │
│      ▼                                                                 │
│   7. Response DTO → JSON → Client                                      │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

## Database Schema (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CORE ENTITIES                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  tenants ──┬── users ──── roles ──── permissions                        │
│            │                                                             │
│            ├── employees ──┬── departments                               │
│            │               ├── attendance_records                        │
│            │               ├── leave_requests                            │
│            │               ├── payroll_records                           │
│            │               ├── performance_reviews                       │
│            │               ├── benefits_enrollments                      │
│            │               ├── training_enrollments                      │
│            │               ├── asset_assignments                         │
│            │               ├── wellness_logs                             │
│            │               ├── exit_processes                            │
│            │               └── generated_letters                         │
│            │                                                             │
│            ├── configurations ──┬── leave_types                          │
│            │                    ├── salary_structures                    │
│            │                    ├── benefit_plans                        │
│            │                    ├── letter_templates                     │
│            │                    └── workflow_definitions                 │
│            │                                                             │
│            └── reference_data ──┬── holidays                             │
│                                 ├── office_locations                     │
│                                 └── shifts                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  app/                                                                    │
│  ├── (auth)/                    # Authentication pages                   │
│  │   ├── login/                                                          │
│  │   └── register/                                                       │
│  │                                                                       │
│  ├── dashboard/                 # Main dashboard                         │
│  ├── employees/                 # Employee management                    │
│  ├── attendance/                # Attendance tracking                    │
│  ├── leave/                     # Leave management                       │
│  ├── payroll/                   # Payroll processing                     │
│  ├── performance/               # Performance reviews                    │
│  ├── recruitment/               # Recruitment ATS                        │
│  ├── benefits/                  # Benefits administration                │
│  ├── training/                  # Training/LMS                           │
│  ├── wellness/                  # Wellness programs                      │
│  ├── assets/                    # Asset management                       │
│  ├── offboarding/               # Exit management                        │
│  ├── letters/                   # Letter generation                      │
│  ├── projects/                  # Project management                     │
│  └── settings/                  # System settings                        │
│                                                                          │
│  components/                                                             │
│  ├── ui/                        # Reusable UI components                 │
│  │   ├── Button, Card, Modal                                             │
│  │   ├── Input, Select, Badge                                            │
│  │   └── Table, Tabs, Dialog                                             │
│  │                                                                       │
│  └── layout/                    # Layout components                      │
│      ├── AppLayout                                                       │
│      ├── Sidebar                                                         │
│      └── Header                                                          │
│                                                                          │
│  lib/                                                                    │
│  ├── services/                  # API services                           │
│  │   ├── employee.service.ts                                             │
│  │   ├── attendance.service.ts                                           │
│  │   ├── payroll.service.ts                                              │
│  │   └── ... (20+ services)                                              │
│  │                                                                       │
│  ├── types/                     # TypeScript types                       │
│  │   ├── employee.ts                                                     │
│  │   ├── attendance.ts                                                   │
│  │   └── ... (20+ type files)                                            │
│  │                                                                       │
│  └── api/                       # API client configuration               │
│      └── client.ts                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION DEPLOYMENT                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌────────────────┐                                │
│                        │   Load Balancer │                               │
│                        │   (Nginx/ALB)   │                               │
│                        └────────┬───────┘                                │
│                                 │                                        │
│              ┌──────────────────┼──────────────────┐                     │
│              │                  │                  │                     │
│              ▼                  ▼                  ▼                     │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │   Frontend        │ │   Frontend        │ │   Frontend        │      │
│  │   Container       │ │   Container       │ │   Container       │      │
│  │   (Next.js)       │ │   (Next.js)       │ │   (Next.js)       │      │
│  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘      │
│            │                     │                     │                 │
│            └─────────────────────┼─────────────────────┘                 │
│                                  │                                       │
│                                  ▼                                       │
│                        ┌────────────────┐                                │
│                        │  API Gateway   │                                │
│                        └────────┬───────┘                                │
│                                 │                                        │
│              ┌──────────────────┼──────────────────┐                     │
│              │                  │                  │                     │
│              ▼                  ▼                  ▼                     │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │   Backend         │ │   Backend         │ │   Backend         │      │
│  │   Container       │ │   Container       │ │   Container       │      │
│  │   (Spring Boot)   │ │   (Spring Boot)   │ │   (Spring Boot)   │      │
│  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘      │
│            │                     │                     │                 │
│            └─────────────────────┼─────────────────────┘                 │
│                                  │                                       │
│            ┌─────────────────────┼─────────────────────┐                 │
│            ▼                     ▼                     ▼                 │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │   PostgreSQL      │ │      Redis        │ │      MinIO        │      │
│  │   (Primary/       │ │   (Cluster)       │ │   (Distributed)   │      │
│  │    Replica)       │ │                   │ │                   │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

| Pattern | Usage |
|---------|-------|
| **Repository Pattern** | Data access abstraction |
| **Service Layer** | Business logic encapsulation |
| **DTO Pattern** | Data transfer between layers |
| **Factory Pattern** | Complex object creation |
| **Builder Pattern** | Fluent entity construction |
| **Strategy Pattern** | Configurable algorithms |
| **Observer Pattern** | Event handling (Workflows) |
| **Decorator Pattern** | Security annotations |

## API Statistics

| Metric | Count |
|--------|-------|
| Total API Modules | 47 |
| Total Endpoints | 200+ |
| Database Tables | 80+ |
| Frontend Pages | 30+ |
| Frontend Services | 25+ |

---

**Last Updated**: December 8, 2025
