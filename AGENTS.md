# AGENTS.md — NU-AURA HRMS Platform

Instructions for AI coding agents working on the NU-AURA codebase. This document exists so you can ship correct, production-grade HR software without asking "what does this module do?" every 5 minutes.

NU-AURA is not a toy CRUD app. It runs real payroll, manages real employees, and handles real compliance. Every line you write affects someone's salary, leave balance, or employment record. Treat it accordingly.

---

## 1. What This Product Does

NU-AURA is a multi-tenant HRMS SaaS platform. One login, four product modules:

| Module | What It Solves | Who Uses It |
|--------|---------------|-------------|
| **NU-HRMS** | Core HR — employee records, org structure, attendance, leave, payroll, benefits, assets, expenses, loans, travel, documents | HR admins, payroll managers, employees (ESS), managers |
| **NU-Hire** | Recruitment — job postings, candidate pipeline, interview scheduling, offer letters, onboarding checklists, offboarding/FnF | Recruiters, hiring managers, new hires |
| **NU-Grow** | Talent — performance reviews, OKRs, 360 feedback, PIPs, LMS/training, recognition, surveys, wellness | HR, managers, employees, L&D teams |
| **NU-Fluence** | Knowledge — wiki, blogs, templates, Drive integration (Phase 2 — not built yet) | Everyone |

**Mental model:** Think of it as Keka, BambooHR, or Darwinbox — a single platform where an HR team runs their entire people operations from hire to retire.

---

## 2. HR Domain Context You Must Know

Before touching any module, understand the HR lifecycle this system models:

```
Recruit → Hire → Onboard → Manage → Pay → Develop → Retain → Offboard
   |         |        |         |       |       |          |         |
 NU-Hire  NU-Hire  NU-Hire  NU-HRMS  NU-HRMS NU-Grow  NU-Grow  NU-Hire
```

### Core HR Concepts

- **Employee** is the central entity. Almost everything links back to an employee record via `employee_id`. An employee belongs to exactly one tenant, one department, one designation, one reporting manager.
- **Org structure** = Tenant → Locations → Departments → Teams → Employees. This hierarchy drives data scoping, approval routing, and reporting.
- **Employee Self-Service (ESS)** = employees log in and manage their own leave, attendance, expenses, documents, payslips. They don't need HR for routine tasks.
- **Manager Self-Service (MSS)** = managers approve leave, review timesheets, conduct performance reviews, approve expenses — all through their dashboard.
- **Employment lifecycle events** (joining, confirmation, promotion, transfer, separation) are tracked with effective dates and published to Kafka (`employee-lifecycle-events`).

### Payroll — The Most Sensitive Module

Payroll is not just "salary / 12". It involves:

- **Salary structure** = a tree of components (Basic, HRA, DA, Special Allowance, PF, ESI, PT, TDS, etc.)
- **Each component** has a formula (e.g., `HRA = Basic * 0.4`) evaluated using SpEL in DAG dependency order
- **Statutory deductions** = PF (Provident Fund), ESI (Employee State Insurance), Professional Tax, TDS (Tax Deducted at Source) — these have government-mandated rules
- **Payroll run** = monthly batch process: lock attendance → calculate gross → apply deductions → compute net pay → generate payslips → post to GL
- **Arrears** = retroactive salary adjustments (e.g., appraisal effective from April, processed in July)
- **Full & Final (FnF)** = settlement calculation when an employee exits (pending salary + leave encashment - recovery)

**Rule: Never modify payroll calculation logic without understanding the full formula chain. A bug here means wrong salaries for real people.**

### Leave Management

- **Leave types** are tenant-configurable (Casual, Sick, Earned, Maternity, Paternity, Comp-off, LOP, etc.)
- **Leave policies** define accrual rules (monthly/quarterly/yearly), carry-forward limits, encashment rules, pro-rata for mid-year joiners
- **Leave balance** = accrued - consumed - lapsed + carry-forward. Tracked per employee per leave type per year.
- **Accrual** runs as a scheduled Cron job (monthly). Deduction happens transactionally when a leave request is approved.
- **Sandwich rule** = if an employee takes Friday + Monday off, the weekend counts as leave too. Configurable per policy.
- **Negative balance** = some tenants allow it (borrow against future accrual), some don't. Policy-driven.
- **Leave impacts payroll** — LOP (Loss of Pay) days reduce gross salary. This is a cross-module dependency.

### Attendance

- **Clock-in/clock-out** with support for web check-in, biometric integration (future), GPS/geofencing (future)
- **Shift management** — employees are assigned shifts; late arrival / early departure rules are shift-relative
- **Regularization** = employee requests correction for a missed punch → manager approves → attendance record updated
- **Overtime** calculation based on hours beyond shift duration
- **Attendance feeds into payroll** (present days, LOP days, OT hours)

### Approvals — The Workflow Engine

Almost everything in HR requires approval:

| Request Type | Typical Flow |
|-------------|-------------|
| Leave request | Employee → Manager → HR (optional) |
| Expense claim | Employee → Manager → Finance |
| Attendance regularization | Employee → Manager |
| Asset request | Employee → IT Admin |
| Loan request | Employee → Manager → Finance → HR Head |
| Salary revision | Manager → HR Head → CXO |
| Offer letter | Recruiter → Hiring Manager → HR Head |

The approval engine is generic: `workflow_def` → `workflow_step` → `approval_instance` → `approval_task`. Workflows are data-driven and tenant-configurable. Do not hardcode approval logic.

### Performance & Reviews

- **Review cycles** are time-bound (quarterly, semi-annual, annual) with configurable stages: self-assessment → manager review → calibration → final rating
- **OKRs** (Objectives & Key Results) — goals cascade from org → department → team → individual
- **360 feedback** = peers, direct reports, and skip-level managers all provide input
- **PIP (Performance Improvement Plan)** = formal process for underperformers with milestones and deadlines
- **Bell curve / forced distribution** = some orgs enforce rating distribution (10% top, 70% middle, 20% bottom)
- **Performance impacts compensation** — ratings drive appraisal percentages. Another cross-module dependency.

### Recruitment (ATS)

- **Pipeline stages**: Sourced → Screened → Interview (multiple rounds) → Offer → Hired → Onboarded
- **Job requisition** = a department requests headcount → HR approves → job posted
- **Candidate** is separate from **Employee** until they accept an offer and are converted
- **Onboarding** = checklist-driven process (documents, IT setup, policy acknowledgment, buddy assignment)
- **Offboarding** = exit interview, knowledge transfer, asset return, FnF calculation, experience letter

---

## 3. Tech Stack (Locked — Do Not Change)

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript 5 (strict) |
| UI | Mantine 8 + Tailwind CSS 3 |
| Server state | TanStack React Query 5 |
| Client state | Zustand 4 (auth, UI only) |
| HTTP | Axios (existing client — never create new instances) |
| Forms | React Hook Form 7 + Zod |
| Animation | Framer Motion |
| Charts | Recharts |
| Rich text | TipTap |
| Testing | Playwright (E2E) + Vitest (unit) |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Java 17 + Spring Boot 3.4 + Maven |
| Database | PostgreSQL 16 (Neon cloud for dev) + Flyway (migrations) |
| Cache | Redis 7 |
| Messaging | Kafka 7.6 |
| File storage | MinIO 8.6 |
| Auth | JWT (JJWT 0.12.6) + Spring Security + OAuth2 |
| Mapping | MapStruct + Lombok |
| API docs | Springdoc OpenAPI |
| Realtime | WebSocket / STOMP |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Dev | Docker + Docker Compose |
| Prod | Kubernetes on GCP GKE |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana + AlertManager |
| Logging | Logstash Logback |

---

## 4. Architecture Decisions (Immutable)

These are settled. Do not re-evaluate, suggest alternatives, or "improve" them.

| Decision | Detail |
|----------|--------|
| **Architecture** | Modular monolith. Single Spring Boot app, single Next.js app. Not microservices. |
| **Multi-tenancy** | Shared DB, shared schema. Every tenant-scoped table has `tenant_id UUID`. PostgreSQL RLS enforces isolation. |
| **RBAC** | JWT-based. Permissions as `module.action` strings (e.g., `employee.read`, `payroll.run`). Stored in `role_permission`. Frontend gates UI via `permissions[]` in Zustand. |
| **SuperAdmin** | Bypasses ALL permission checks in Spring Security and Next.js middleware. Cross-tenant access. |
| **Data scoping** | 5 levels: GLOBAL → LOCATION → DEPARTMENT → TEAM → OWN. Enforced by `DataScopeService`. |
| **Approvals** | Generic workflow engine. `workflow_def` → `workflow_step` → `approval_instance` → `approval_task`. Data-driven. |
| **Payroll engine** | SpEL formula-based. Components evaluated in DAG order. Always inside a DB transaction. |
| **Events** | Kafka topics: `approval-events`, `audit-events`, `employee-lifecycle-events`, `notification-events`. DLQ via `FailedKafkaEvent` table. |
| **Soft deletes** | All entities: `is_deleted BOOLEAN DEFAULT FALSE` + `deleted_at TIMESTAMP`. Never hard-delete. |
| **Primary keys** | UUID v4 everywhere. |
| **Migrations** | Flyway only. V0–V47 active. Next = V48. Legacy Liquibase in `db/changelog/` — do NOT touch. |

---

## 5. Repository Map

```
nu-aura/
├── backend/
│   └── src/main/java/com/hrms/
│       ├── api/                    # REST controllers + request/response DTOs
│       │   ├── auth/               #   Login, register, refresh, password reset
│       │   ├── employee/           #   CRUD, profile, directory, bulk import
│       │   ├── leave/              #   Apply, approve, balance, policies, accrual
│       │   ├── attendance/         #   Clock in/out, regularization, shifts, overtime
│       │   ├── payroll/            #   Payroll run, components, payslips, statutory
│       │   ├── recruitment/        #   Jobs, candidates, interviews, offers, pipeline
│       │   ├── performance/        #   Reviews, OKRs, 360, PIP, goals, calibration
│       │   ├── department/         #   Department CRUD, org chart
│       │   ├── admin/              #   Roles, permissions, settings, audit logs
│       │   ├── approval/           #   Workflow definitions, tasks, delegation
│       │   ├── expense/            #   Claims, categories, approvals, reimbursement
│       │   ├── asset/              #   Assignment, tracking, return
│       │   ├── document/           #   Upload, templates, employee documents
│       │   ├── notification/       #   Email, in-app, push, preferences
│       │   ├── training/           #   Courses, enrollment, tracking, LMS
│       │   ├── loan/               #   Application, EMI, repayment
│       │   ├── travel/             #   Requests, itinerary, advances
│       │   ├── onboarding/         #   Checklists, tasks, document collection
│       │   ├── offboarding/        #   Exit, FnF, clearance, knowledge transfer
│       │   ├── benefits/           #   Plans, enrollment, claims
│       │   ├── project/            #   Project tracking, timesheets, allocation
│       │   ├── analytics/          #   Reports, dashboards, exports
│       │   └── settings/           #   Tenant config, company settings
│       ├── application/            # Business logic services
│       │   └── <module>/service/   #   Interface + impl/ for each module
│       ├── domain/                 # JPA entities + Spring Data repositories
│       │   └── <module>/           #   Entity classes + repository interfaces
│       ├── common/                 # Cross-cutting concerns
│       │   ├── config/             #   SecurityConfig, WebConfig, KafkaConfig, etc.
│       │   ├── security/           #   JWT filter, tenant resolver, permission evaluator
│       │   ├── exception/          #   Global exception handler, custom exceptions
│       │   └── util/               #   Date utils, file utils, encryption utils
│       └── infrastructure/         # External system adapters
│           ├── kafka/              #   Producers, consumers, DLQ handler
│           ├── storage/            #   MinIO file operations
│           ├── email/              #   SMTP / template-based email
│           └── sms/                #   Twilio integration
├── backend/src/main/resources/
│   ├── db/migration/               # Flyway: V0–V47 (next = V48)
│   ├── application.yml             # Base config
│   └── application-{profile}.yml   # demo, test, prod profiles
├── frontend/
│   ├── app/                        # Next.js App Router — 196 pages
│   │   ├── dashboard/              #   Home dashboard with widgets
│   │   ├── employees/              #   Employee list, profile, directory
│   │   ├── leave/                  #   Apply, calendar, balances, policies
│   │   ├── attendance/             #   Logs, regularization, shifts
│   │   ├── payroll/                #   Run payroll, payslips, components, statutory
│   │   ├── recruitment/            #   Jobs, candidates, pipeline, interviews
│   │   ├── performance/            #   Reviews, OKRs, goals, PIP
│   │   ├── training/               #   Courses, catalog, enrollment
│   │   ├── expenses/               #   Claims, reports, approvals
│   │   ├── assets/                 #   Inventory, assignments, requests
│   │   ├── documents/              #   Company docs, templates, employee docs
│   │   ├── onboarding/             #   Checklists, progress tracking
│   │   ├── offboarding/            #   Exit process, FnF, clearance
│   │   ├── projects/               #   Timesheets, allocation, tracking
│   │   ├── loans/                  #   Applications, EMI tracking
│   │   ├── travel/                 #   Requests, advances, settlements
│   │   ├── benefits/               #   Plans, enrollment
│   │   ├── analytics/              #   Reports, org analytics, headcount
│   │   ├── admin/                  #   Roles, permissions, feature flags, settings
│   │   ├── settings/               #   Company, location, department config
│   │   └── auth/                   #   Login, register, forgot password
│   ├── components/                 # 129 reusable TSX components (21 subdirs)
│   │   ├── common/                 #   Tables, modals, filters, search, status badges
│   │   ├── employees/              #   Profile cards, org chart, directory
│   │   ├── leave/                  #   Calendar, balance cards, request forms
│   │   ├── payroll/                #   Payslip viewer, salary breakdown, run wizard
│   │   ├── attendance/             #   Timeline, shift calendar, regularization form
│   │   ├── recruitment/            #   Pipeline board, candidate cards, interview scheduler
│   │   ├── performance/            #   Review forms, OKR tree, rating widgets
│   │   ├── platform/               #   AppSwitcher (waffle grid), Sidebar, Header
│   │   └── dashboard/              #   Widgets, charts, quick actions
│   ├── lib/
│   │   ├── api/                    # Axios clients: client.ts (auth), public-client.ts
│   │   ├── services/               # 91 API service files (one per module)
│   │   ├── hooks/                  # 85 hooks (14 core + 71 React Query)
│   │   ├── types/                  # 62 TypeScript interface files
│   │   ├── config/                 # apps.ts (sub-app routing), navigation config
│   │   ├── validations/            # Zod schemas for all forms
│   │   ├── contexts/               # React contexts (theme, tenant, etc.)
│   │   └── utils/                  # Date formatting, currency, file size, etc.
│   ├── e2e/                        # 36 Playwright E2E specs
│   └── middleware.ts               # Auth guard, route protection, tenant resolution
├── modules/                        # Shared Java modules (common/, pm/)
├── monitoring/                     # Prometheus, Grafana, AlertManager configs
├── deployment/kubernetes/          # 10 K8s manifests for GKE
├── docs/                           # 100+ documentation files
├── docker-compose.yml              # Dev: Redis, Kafka, Zookeeper, MinIO (NO postgres)
└── docker-compose.prod.yml         # Production variant
```

---

## 6. Code Rules (Break These and You Break Payroll)

### Universal

| Rule | Why |
|------|-----|
| Read existing code before modifying | Modules are interconnected. Leave impacts payroll. Attendance impacts leave. Understand dependencies first. |
| Never add dependencies without checking existing ones | `package.json` and `pom.xml` already have 100+ deps. The library you want probably exists. |
| All tenant-scoped data must include `tenant_id` | RLS won't protect data without it. Cross-tenant data leaks are unacceptable in HR software. |
| Soft delete only — never `DELETE FROM` | Employment records, payroll history, and audit trails are legally required to be retained. |
| Every monetary calculation must use `BigDecimal` (backend) or precise arithmetic (frontend) | Floating point errors in payroll = wrong salaries. Unacceptable. |

### Frontend

| Rule | Enforcement |
|------|-------------|
| No `any` in TypeScript | Define interfaces in `lib/types/`. HR data has complex shapes — type them properly. |
| No new Axios instances | Use `lib/api/client.ts`. It handles auth tokens, tenant headers, and error interceptors. |
| All forms: React Hook Form + Zod | HR forms are complex (employee creation has 30+ fields). Uncontrolled inputs = data loss. |
| All data fetching: React Query | Stale payslips or leave balances shown to employees = support tickets. Cache invalidation matters. |
| API calls go through services → hooks | `lib/services/leaveService.ts` → `lib/hooks/useLeave.ts` → component. No shortcuts. |
| Zustand for auth/UI state only | Employee data, leave balances, payroll — all server state via React Query. |
| Mantine as base component library | Don't mix in Material UI, Ant Design, or raw HTML. Consistency matters. |

### Backend

| Rule | Enforcement |
|------|-------------|
| All endpoints must have unit tests | A broken leave-apply endpoint blocks 100% of leave requests for all tenants. |
| Flyway only for migrations | `db/changelog/` is dead Liquibase. V0–V47 exist. Next = V48. |
| Package structure must be followed | `api/` → `application/` → `domain/` → `common/` → `infrastructure/`. No service logic in controllers. |
| Lombok + MapStruct for boilerplate | Don't hand-write getters, setters, or DTO mapping. |
| Google Java Style Guide | 4-space indent, 120-char lines. |
| Payroll/salary changes require transaction wrapping | Partial payroll processing = some employees paid, some not. Use `@Transactional`. |
| Audit log all sensitive operations | Employee creation, salary changes, role changes, leave approval — all must emit audit events. |

---

## 7. Module Interaction Map

Understanding which modules depend on which prevents you from breaking things downstream:

```
                    ┌──────────────┐
                    │  ATTENDANCE  │
                    └──────┬───────┘
                           │ present days, LOP
                           ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  LEAVE   │─────▶│   PAYROLL    │◀─────│ PERFORMANCE  │
└──────────┘      └──────┬───────┘      └──────────────┘
  LOP days               │ salary info         rating → appraisal %
                         ▼
              ┌──────────────────┐
              │   LOAN / FnF     │
              └──────────────────┘
                EMI deduction, settlement

┌──────────────┐      ┌──────────────┐
│ RECRUITMENT  │─────▶│  ONBOARDING  │─────▶ Employee record created
└──────────────┘      └──────────────┘

┌──────────────┐
│ OFFBOARDING  │─────▶ FnF triggered → Payroll settlement → Employee deactivated
└──────────────┘

ALL MODULES ─────▶ APPROVAL ENGINE (generic workflow)
ALL MODULES ─────▶ NOTIFICATION SERVICE (email + in-app + WebSocket)
ALL MODULES ─────▶ AUDIT LOG (Kafka → audit-events topic)
```

**Critical cross-module flows:**
1. **Leave → Payroll**: Approved LOP leave reduces gross salary. If leave approval is broken, payroll runs will be wrong.
2. **Attendance → Payroll**: Present days and overtime hours feed directly into salary calculation.
3. **Performance → Compensation**: Final ratings determine appraisal percentages and salary revisions.
4. **Recruitment → Employee**: When a candidate is "hired", their record converts to an Employee entity. Data must map cleanly.
5. **Offboarding → FnF → Payroll**: Separation triggers full & final settlement — pending salary, leave encashment, loan recovery, asset return.

---

## 8. Key File Locations

| What | Where |
|------|-------|
| Backend entry point | `backend/src/main/java/com/hrms/HrmsApplication.java` |
| Security config (RBAC, JWT, CORS) | `backend/src/main/java/com/hrms/common/config/SecurityConfig.java` |
| Auth controller (login, register) | `backend/src/main/java/com/hrms/api/auth/controller/AuthController.java` |
| Tenant RLS transaction manager | `backend/src/main/java/com/hrms/common/config/TenantRlsTransactionManager.java` |
| Data scope service | `backend/src/main/java/com/hrms/application/*/service/DataScopeService.java` |
| Payroll calculation engine | `backend/src/main/java/com/hrms/application/payroll/service/` |
| Leave accrual scheduler | `backend/src/main/java/com/hrms/application/leave/service/` |
| Kafka event publisher | `backend/src/main/java/com/hrms/infrastructure/kafka/` |
| Flyway migrations | `backend/src/main/resources/db/migration/V*.sql` |
| Spring config | `backend/src/main/resources/application.yml` |
| Frontend API client (authenticated) | `frontend/lib/api/client.ts` |
| Frontend API client (public) | `frontend/lib/api/public-client.ts` |
| Platform sub-app routing | `frontend/lib/config/apps.ts` |
| Active app detection | `frontend/lib/hooks/useActiveApp.ts` |
| App switcher (waffle grid) | `frontend/components/platform/AppSwitcher.tsx` |
| Frontend route middleware | `frontend/middleware.ts` |
| Docker dev stack | `docker-compose.yml` |
| K8s deployment manifests | `deployment/kubernetes/` |
| CI/CD pipeline | `.github/workflows/ci.yml` |

---

## 9. Development Setup

### Starting Everything

```bash
# 1. Infrastructure (Redis, Kafka, Zookeeper, MinIO — no postgres, DB is Neon cloud)
docker-compose up -d

# 2. Backend (Spring Boot — port 8080)
cd backend && ./start-backend.sh

# 3. Frontend (Next.js — port 3000)
cd frontend && npm run dev
```

### Ports

| Service | Port | Notes |
|---------|------|-------|
| Frontend | 3000 | Kill existing process if occupied |
| Backend | 8080 | Kill existing process if occupied |
| Redis | 6379 | |
| Kafka | 9092 | |
| MinIO | 9000 | Console on 9001 |

### Database

- **Dev**: Neon cloud PostgreSQL. Connection in `application.yml`. No local postgres container.
- **CI**: `postgres:16` service container (DB: `hrms_test`, user: `hrms`, password: `hrms_test`)
- **Prod**: PostgreSQL 16 on GCP

### Frontend Environment (4 vars only)

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<oauth-client-id>
NEXT_PUBLIC_DEMO_MODE=true|false
NODE_ENV=development
```

No NextAuth. No Clerk. No Auth0 frontend SDK. Auth is JWT from the backend.

---

## 10. CI Pipeline

GitHub Actions on pushes/PRs to `main` and `develop`:

| Job | What It Does | Failure = |
|-----|-------------|-----------|
| Backend | `mvn clean compile` → `mvn test` (test profile + postgres:16) → JaCoCo coverage | Broken API or business logic |
| Frontend | `npm ci` → `npm run lint` → `tsc --noEmit` → `npm run test:run` → `npm run build` | Type errors, lint violations, broken pages |
| Security | Trivy vulnerability scan (CRITICAL + HIGH) | Known CVEs in dependencies |
| Docker | Build images (main branch only, no registry push) | Dockerfile issues |

All 4 must pass before merging.

---

## 11. Conventions

| What | Convention |
|------|-----------|
| Commits | `type(scope): subject` — e.g., `feat(payroll): add arrears calculation`, `fix(leave): correct sandwich rule logic` |
| Branches | `feature/AURA-XXX-description` |
| TypeScript | Strict mode, functional components, hierarchical React Query keys (`['employees', employeeId, 'leave-balance']`) |
| Java | Google Style Guide, 4-space indent, 120-char lines |
| SQL migrations | `V48__description_with_underscores.sql`, always include `tenant_id`, `is_deleted`, `deleted_at` |

---

## 12. Multi-Agent Parallel Work Strategy

Split by vertical HR modules to avoid conflicts:

| Agent | HR Domain | Frontend Scope | Backend Scope |
|-------|----------|----------------|---------------|
| A | Auth, RBAC, Admin | `app/auth/`, `app/admin/` | `api/auth/`, `api/admin/` |
| B | Employee Core | `app/employees/`, `app/departments/` | `api/employee/`, `api/department/` |
| C | Time & Absence | `app/leave/`, `app/attendance/` | `api/leave/`, `api/attendance/` |
| D | Compensation | `app/payroll/`, `app/compensation/`, `app/loans/` | `api/payroll/`, `api/compensation/`, `api/loan/` |
| E | Talent Acquisition | `app/recruitment/`, `app/onboarding/`, `app/offboarding/` | `api/recruitment/`, `api/onboarding/`, `api/offboarding/` |
| F | Talent Management | `app/performance/`, `app/training/` | `api/performance/`, `api/training/` |
| G | Operations | `app/expenses/`, `app/assets/`, `app/travel/`, `app/projects/` | `api/expense/`, `api/asset/`, `api/travel/`, `api/project/` |

### Conflict Zones (Coordinate Before Editing)

| File | Why It's Shared |
|------|----------------|
| `SecurityConfig.java` | Endpoint security rules for all modules |
| `middleware.ts` | Frontend route protection for all pages |
| `apps.ts` | Sub-app route mapping |
| `docker-compose.yml` | Dev infrastructure |
| `db/migration/V*.sql` | Sequential Flyway versions — claim your number first |
| `lib/types/employee.ts` | Most modules reference the Employee type |

---

## 13. Common Recipes

### Adding a Backend Endpoint

```
1. Controller     → api/<module>/controller/<Module>Controller.java
2. Request DTO    → api/<module>/dto/<Module>Request.java
3. Response DTO   → api/<module>/dto/<Module>Response.java
4. Service iface  → application/<module>/service/<Module>Service.java
5. Service impl   → application/<module>/service/impl/<Module>ServiceImpl.java
6. Entity         → domain/<module>/<Entity>.java  (if new table)
7. Repository     → domain/<module>/<Entity>Repository.java  (if new table)
8. Migration      → db/migration/V48__add_<table>.sql  (if schema change)
9. Unit test      → src/test/java/com/hrms/api/<module>/controller/<Module>ControllerTest.java
```

### Adding a Frontend Page

```
1. Page           → app/<module>/page.tsx
2. Types          → lib/types/<module>.ts
3. API service    → lib/services/<module>Service.ts
4. React Query    → lib/hooks/queries/use<Module>.ts
5. Zod schema     → lib/validations/<module>.ts  (if forms)
6. Route config   → lib/config/apps.ts  (if new module route)
```

### Adding a Flyway Migration

```
1. Check current max in db/migration/ — currently V47
2. Next = V48: create V48__description.sql
3. Always include:
   - tenant_id UUID NOT NULL
   - is_deleted BOOLEAN DEFAULT FALSE
   - deleted_at TIMESTAMP
   - created_at / updated_at TIMESTAMP
   - RLS policy: CREATE POLICY ... USING (tenant_id = current_setting('app.tenant_id')::uuid)
4. NEVER modify existing migrations — they're immutable once applied
```

### Emitting a Domain Event

```java
// In your service implementation:
@Autowired private EventPublisher eventPublisher;

// After the business action completes:
eventPublisher.publish("employee-lifecycle-events",
    new EmployeeEvent(EventType.PROMOTED, employeeId, tenantId, details));
```

Available topics: `approval-events`, `audit-events`, `employee-lifecycle-events`, `notification-events`

---

## 14. What Not to Do

| Mistake | Consequence |
|---------|------------|
| Hard-delete employee records | Legal violation. Employment records must be retained for years. |
| Skip `tenant_id` on a new table | Data leaks between tenants. Every HR record is confidential. |
| Use `double`/`float` for money | Payroll rounding errors. Use `BigDecimal`. |
| Hardcode approval steps | Every tenant has different org hierarchy. Use the workflow engine. |
| Modify existing Flyway migrations | Checksum mismatch breaks all deployments. Migrations are immutable. |
| Create new Axios instance | Loses auth token, tenant header, and error handling. |
| Use `any` in TypeScript | HR data structures are complex. Untyped data = runtime crashes on employee pages. |
| Put business logic in controllers | Controllers are thin. Logic goes in `application/` service layer. |
| Skip audit logging on sensitive ops | Salary changes, role changes, terminations — all must be audited for compliance. |
| Ignore cross-module dependencies | Changing leave balance calculation without checking payroll impact = wrong salaries. |
