# HRMS Project Memory

> This file is the single source of truth for context that AI agents need when resuming work on this project. Update this file at the end of any major session.

---

## 1. What This Project Is
An internal enterprise HRMS platform (similar to KEKA / Darwinbox / BambooHR) being built for internal company use first, with plans to package and release as a commercial SaaS product for other companies.

**Status:** ~90% Complete | Production Ready | 140+ E2E Tests

---

## 2. Confirmed Tech Stack (Do Not Change)

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14.2.35 (App Router, TypeScript 5.9.3, strict mode) |
| UI Library | Mantine UI 8.3.x + Tailwind CSS 3.4.0 |
| State (Server) | TanStack React Query v5.17.0 |
| State (Client) | Zustand 4.4.7 |
| HTTP Client | Axios 1.6.2 — existing instance in `frontend/lib/api/client.ts` |
| Forms | React Hook Form 7.49.2 + Zod 3.22.4 |
| Charts | Recharts 3.5.0 |
| Animations | Framer Motion 12.23.24 |
| PDF Export | jsPDF 3.0.4 + jsPDF AutoTable 5.0.2 |
| Excel Export | ExcelJS 4.4.0 |
| Backend | Java 17, Spring Boot 3.x (monolith at `/backend/`) |
| Database | PostgreSQL 16 (Flyway migrations, 11 versions: V1–V11) |
| Cache | Redis 7 (Lettuce client, 1hr TTL) |
| File Storage | MinIO (S3-compatible, bucket: `hrms-files`) |
| Events | Kafka (event streaming for async workflows) |
| Rate Limiting | Bucket4j (Auth: 10/min, API: 100/min, Export: 5/5min) |
| DTO Mapping | MapStruct 1.6.3 |
| Metrics | Micrometer + Prometheus |
| SMS | Twilio (optional, mock mode available) |
| AI Features | OpenAI API (resume screening, JD generation) |
| Testing | Vitest + Playwright (frontend), JUnit + JaCoCo 80% (backend), ArchUnit |
| Infrastructure | Docker Compose (root), Kubernetes-ready Dockerfiles |

---

## 3. High-Level Architecture Decisions

### Multi-Tenancy
- Strategy: **Shared database, shared schema.**
- All tenant data tables have a `tenant_id` UUID column.
- PostgreSQL Row Level Security (RLS) enforces isolation automatically.
- Tenant resolved from `X-Tenant-ID` HTTP header.
- `TenantContext` stored in ThreadLocal on backend.

### RBAC
- Format: `module.action` permission strings (e.g., `employee.read`, `payroll.run`).
- Stored in: `role` → `role_permission` → `permission` tables in PostgreSQL.
- Enforced: `@RequiresPermission` annotation + `PermissionAspect` (AOP) on backend. Frontend hides/shows UI elements based on `permissions[]` array from the Zustand auth store.
- 300+ permission nodes defined.

### SuperAdmin Role
- **Bypasses ALL permission checks.** No module is restricted.
- Can view and edit data for ALL tenants, ALL users, and ALL modules.
- Implementation: In the Spring Security filter chain, check if `role == SUPER_ADMIN` before evaluating any `@RequiresPermission` annotations. In `frontend/middleware.ts`, SuperAdmin bypasses route guards.
- Lives at `/admin` route in the frontend.

### Authentication
- JWT tokens with HS512 signature (HttpOnly secure cookies).
- Refresh token rotation support.
- OAuth2: Google login integration.
- MFA: TOTP (Time-based One-Time Password) via `MfaService`.
- Account lockout: Redis-backed login attempt tracking.
- Token blacklist: JWT revocation support.

### Approval Workflow Engine
- Generic, data-driven, not module-specific.
- Tables: `workflow_def` → `workflow_step` → `approval_instance` → `approval_task`.
- Supports: sequential, parallel, conditional, and delegated approvals.
- Example: Leave: Employee → Manager → HR. Expense (>$500): Employee → Manager → Finance.

### Payroll Engine
- Formula-based using Spring Expression Language (SpEL).
- Components are evaluated in topological order (dependency graph).
- Entire run wrapped in a DB transaction.
- Key input feeds: Attendance (LOP days), Leave (approved days), Expenses (approved reimbursements), Loans (EMI values).
- Statutory deductions: PF, ESI, Professional Tax, TDS (dedicated controllers).

### Leave Accrual
- Scheduled Quartz cron job runs monthly on the 1st.
- Deduction happens inside a DB transaction at the moment of leave approval commit.

---

## 4. Repository Structure

```
/
├── frontend/                # Next.js 14 app
│   ├── app/                 # 59 major modules (see Section 9)
│   ├── components/          # 70+ shared UI components
│   │   ├── layout/          # AppLayout, Header, Sidebar, Breadcrumbs, GlobalSearch
│   │   ├── auth/            # AuthGuard, PermissionGate, MfaSetup, MfaVerification
│   │   ├── ui/              # Button, Input, Card, Modal, Badge, etc.
│   │   ├── charts/          # AttendanceTrend, HeadcountTrend, PayrollCost, etc.
│   │   ├── custom-fields/   # CustomFieldRenderer, CustomFieldsSection
│   │   ├── notifications/   # NotificationBell, ToastProvider, WebSocketProvider
│   │   ├── payroll/         # BulkProcessingWizard, PayslipCard
│   │   ├── performance/     # CalibrationMatrix, FeedbackForms
│   │   ├── projects/        # CalendarView, TaskDetailsModal
│   │   ├── resource-management/  # WorkloadHeatmap, CapacityDisplay
│   │   └── platform/        # AppSwitcher
│   ├── lib/                 # Core libraries
│   │   ├── api/             # Axios clients (client.ts, public-client.ts, auth.ts, etc.)
│   │   ├── config/          # env.ts, routes.ts
│   │   ├── hooks/           # useAuth, usePermissions, useDebounce + React Query hooks
│   │   ├── hooks/queries/   # useAdmin, useEmployees, useLeaves, useProjects, etc.
│   │   ├── services/        # 40+ service files (employee, leave, payroll, etc.)
│   │   ├── types/           # 50+ TypeScript type definition files
│   │   ├── validations/     # Zod schemas (auth, employee, attendance, leave, etc.)
│   │   ├── utils/           # date-utils, error-handler, logger, sanitize, type-guards
│   │   ├── constants/       # roles.ts
│   │   ├── contexts/        # WebSocketContext
│   │   ├── theme/           # mantine-theme.ts
│   │   └── test-utils/      # Testing utilities, fixtures
│   ├── middleware.ts         # Route protection + RBAC + OWASP security headers
│   ├── vitest.config.ts     # Unit test config
│   └── playwright.config.ts # E2E test config
├── backend/                 # Spring Boot monolith (Java 17)
│   └── src/main/java/com/hrms/
│       ├── api/             # 115+ REST controllers
│       ├── application/     # 135+ service classes
│       ├── domain/          # 60+ entity domains
│       ├── infrastructure/  # 220+ JPA repositories
│       └── common/          # Security, config, exceptions, logging, validation
│   └── src/main/resources/
│       ├── db/migration/    # Flyway: V1__init.sql through V11__mfa_quiz_learning_paths.sql
│       ├── application.yml  # Primary config
│       ├── application-dev.yml   # Dev profile
│       └── application-demo.yml  # Demo profile
├── docs/
│   └── build-kit/           # 21 architecture documents (00–17 + extras)
├── docker-compose.yml       # Dev: Postgres, Redis, MinIO, backend, frontend
├── docker-compose.override.yml  # Dev: hot reload, debug ports
├── docker-compose.prod.yml  # Production: secrets via .env, health checks
├── .env.production.example  # 109 environment variables documented
├── railway.json             # Railway deployment config
├── render.yaml              # Render deployment config
├── CLAUDE.md                # AI agent instructions (primary reference)
├── MEMORY.md                # This file — project context for agents
├── CONTRIBUTING.md           # Dev contribution guidelines
└── README.md                # Project overview
```

---

## 5. How to Start the Dev Environment

```bash
# Step 1: Start infrastructure (Postgres 16, Redis 7, MinIO)
docker-compose up -d

# Step 2: Start backend (Spring Boot on port 8080)
cd backend && ./start-backend.sh

# Step 3: Start frontend (Next.js on port 3000)
cd frontend && npm run dev

# Endpoints:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
# MinIO Console: http://localhost:9001
```

---

## 6. Architecture Reference Documents

All 21 architecture documents are in `docs/build-kit/`. Key references for agents:

| Doc | Use When |
|---|---|
| `00_MASTER_PLAN.md` | Understanding the execution roadmap |
| `01_SYSTEM_OVERVIEW.md` | Understanding the product and multi-tenancy model |
| `02_MODULE_ARCHITECTURE.md` | Understanding core HR module breakdown |
| `03_MICROSERVICE_ARCHITECTURE.md` | Understanding service responsibilities and Kafka events |
| `04_RBAC_PERMISSION_MATRIX.md` | Implementing any permission or role logic |
| `05_DATABASE_SCHEMA_DESIGN.md` | Understanding table structures |
| `06_PAYROLL_RULE_ENGINE.md` | Building payroll calculation logic |
| `07_LEAVE_POLICY_ENGINE.md` | Building leave accrual and deduction logic |
| `08_APPROVAL_WORKFLOW_ENGINE.md` | Building approval flow logic |
| `09_ORGANIZATION_HIERARCHY_ENGINE.md` | Org structure and reporting lines |
| `10_EVENT_DRIVEN_ARCHITECTURE.md` | Kafka event streaming design |
| `11_API_STANDARDS.md` | REST API conventions |
| `12_FRONTEND_ARCHITECTURE.md` | Next.js 14 component structure |
| `13_ENTERPRISE_UI_SYSTEM.md` | Mantine + Tailwind design system |
| `14_DEVOPS_ARCHITECTURE.md` | Docker + Kubernetes deployment |
| `15_OBSERVABILITY.md` | Logging, metrics, tracing |
| `16_TESTING_STRATEGY.md` | Unit, integration, E2E testing |
| `17_7_DAY_AI_EXECUTION_PLAN.md` | The parallel agent build plan |

---

## 7. Parallel Agent Build Strategy

When building large features or completing missing modules, split work into 5 concurrent Claude/Cursor sessions:

- **Agent A:** Auth, RBAC, SuperAdmin, route guards, sidebar permissions
- **Agent B:** Employee Hub (CRUD, profile, status management)
- **Agent C:** Leave management + Attendance (approval flows, check-in/out)
- **Agent D:** Payroll + Approval inbox
- **Agent E:** UI polish, loading/error states, missing page stubs

Each agent writes only to its own `frontend/app/<module>/` directory.

---

## 8. Critical Rules for All AI Agents

1. **Read first, extend second.** Never rewrite a file without reading its current state.
2. **Use the existing Axios client** in `frontend/lib/api/client.ts`. Never create a new HTTP instance.
3. **No TypeScript `any`.** Always define proper interfaces in `frontend/lib/types/`.
4. **All forms** must use React Hook Form + Zod (schemas in `frontend/lib/validations/`).
5. **All data fetching** must use React Query (`useQuery` / `useMutation`) via hooks in `frontend/lib/hooks/queries/`.
6. **Do not add npm packages** without checking if an equivalent already exists in `package.json`.
7. **SuperAdmin bypasses everything** — never add a permission check that blocks SuperAdmin.
8. **After every task** run: `cd frontend && npx tsc --noEmit` and fix all errors.
9. **Backend endpoints** must be covered by at least one unit test (JaCoCo enforces 80% coverage).
10. **Update MEMORY.md** after completing any significant task (see Section 12).

---

## 9. Frontend Module Status (59 Modules)

### Core & Auth
| Module | Route | Status |
|---|---|---|
| Auth (Login, Signup, Forgot Password) | `/auth/*` | ✅ Complete |
| Admin Panel (13 sub-modules) | `/admin/*` | ✅ Complete |
| Home Dashboard | `/home` | ✅ Complete |
| Settings + Security | `/settings/*` | ✅ Complete |
| Employee Self-Service | `/me/*` | ✅ Complete |

### HR Core
| Module | Route | Status |
|---|---|---|
| Employee Directory + CRUD | `/employees/*` | ✅ Complete |
| Department Management | `/departments` | ✅ Complete |
| Leave Management | `/leave/*` | ✅ Complete |
| Attendance (incl. mobile, comp-off, regularization) | `/attendance/*` | ✅ Complete |
| Payroll (payslips, bulk, statutory) | `/payroll/*` | ✅ Complete |
| Compensation Management | `/compensation` | ✅ Complete |
| Benefits Management | `/benefits` | ✅ Complete |

### Approvals & Workflows
| Module | Route | Status |
|---|---|---|
| Approval Inbox | `/approvals` | ✅ Complete |
| E-Signature Portal | `/sign/[token]` | ✅ Complete |
| Exit Interview Portal | `/exit-interview/[token]` | ✅ Complete |

### Recruitment & Lifecycle
| Module | Route | Status |
|---|---|---|
| Recruitment (jobs, candidates, pipeline, AI) | `/recruitment/*` | ✅ Complete |
| Onboarding (templates, checklists) | `/onboarding/*` | ✅ Complete |
| Preboarding Portal | `/preboarding` | ✅ Complete |
| Offer Portal | `/offer-portal` | ✅ Complete |
| Careers Portal (public) | `/careers` | ✅ Complete |
| Offboarding + FnF | `/offboarding/*` | ✅ Complete |

### Projects & Resources
| Module | Route | Status |
|---|---|---|
| Project Management (Gantt, calendar) | `/projects/*` | ✅ Complete |
| Resource Management (pool, capacity, workload) | `/resources/*` | ✅ Complete |
| PSA (timesheets, invoices) | `/psa/*` | ✅ Complete |
| Allocations | `/allocations` | ✅ Complete |

### Learning & Performance
| Module | Route | Status |
|---|---|---|
| LMS (courses, quiz, certificates, paths) | `/learning/*` | ✅ Complete |
| Training (catalog, my-learning) | `/training/*` | ✅ Complete |
| OKR Management | `/okr` | ✅ Complete |
| Performance (360, 9-box, calibration, PIP) | `/performance/*` | ✅ Complete |

### Analytics & Reports
| Module | Route | Status |
|---|---|---|
| Reports (builder, scheduled, attrition, etc.) | `/reports/*` | ✅ Complete |
| Analytics (org-health) | `/analytics/*` | ✅ Complete |
| Dashboards (employee, manager, executive) | `/dashboards/*` | ✅ Complete |

### Workplace Management
| Module | Route | Status |
|---|---|---|
| Timesheets | `/timesheets` | ✅ Complete |
| Time Tracking | `/time-tracking/*` | ✅ Complete |
| Calendar | `/calendar/*` | ✅ Complete |
| Travel Management | `/travel/*` | ✅ Complete |
| Expense Management | `/expenses` | ✅ Complete |
| Loan Management | `/loans/*` | ✅ Complete |
| Letter Generation | `/letters` | ✅ Complete |
| Asset Management | `/assets` | ✅ Complete |
| Helpdesk + SLA | `/helpdesk/*` | ✅ Complete |

### Communication & Engagement
| Module | Route | Status |
|---|---|---|
| Announcements | `/announcements` | ✅ Complete |
| Surveys | `/surveys` | ✅ Complete |
| 360 Feedback | `/feedback360` | ✅ Complete |
| Recognition | `/recognition` | ✅ Complete |
| Wellness Programs | `/wellness` | ✅ Complete |
| Nu-Mail | `/nu-mail` | ✅ Complete |
| Nu-Drive | `/nu-drive` | ✅ Complete |
| Nu-Calendar | `/nu-calendar` | ✅ Complete |

### Organization & Compliance
| Module | Route | Status |
|---|---|---|
| Organization Chart | `/organization-chart` | ✅ Complete |
| Org Hierarchy | `/org-hierarchy` | ✅ Complete |
| Statutory Compliance | `/statutory` | ✅ Complete |
| Tax Declarations | `/tax/*` | ✅ Complete |

---

## 10. Backend Module Status

### Implemented (115+ Controllers, 135+ Services, 220+ Repositories)

| Domain | Controllers | Key Features |
|---|---|---|
| Auth + MFA | 2 | JWT, Google OAuth, TOTP, Account lockout |
| Employee + Directory | 6 | CRUD, import, change requests, talent profiles |
| Leave | 3 | Requests, types, balances, accrual scheduler |
| Attendance | 4 | Check-in/out, mobile, comp-off, office locations |
| Payroll | 3 | Runs, payslips, PDF generation, statutory (PF/ESI/PT/TDS) |
| Recruitment | 4 | Jobs, applicants, job boards, AI screening |
| Performance | 7 | Reviews, goals, 360 feedback, OKRs, PIP, calibration |
| Projects + Resources | 3 | Projects, resource allocation, timesheets |
| LMS | 3 | Courses, enrollments, quizzes, completions |
| Onboarding/Exit | 3 | Onboarding tasks, preboarding, exit + FnF |
| Shifts | 2 | Shift management, shift swaps |
| Expenses | 1 | Claims, line items |
| Benefits | 2 | Plans, enrollments, claims |
| Assets | 1 | Asset tracking, assignments |
| Notifications | 3 | Email, SMS (Twilio), multi-channel, WebSocket |
| User/Role/Permission | 4 | RBAC management, notification preferences |
| Organization | 3 | Org units, tenants, platform management |
| Analytics/Reports | 6 | KPIs, dashboards, custom reports, scheduled reports |
| Workflow | 1 | Generic approval engine |
| Social Wall | 1 | Posts, comments, reactions, polls |
| Training | 1 | Programs, attendees |
| Wellness | 1 | Programs, challenges, health logs |
| Travel | 1 | Travel requests |
| Helpdesk | 2 | Tickets, SLA management |
| Calendar | 1 | Events, integrations |
| Surveys | 2 | Survey management, analytics |
| Compliance | 1 | Policies, tracking |
| Statutory | 5 | PF, ESI, Professional Tax, TDS, contributions |
| Tax | 1 | Declarations |
| Letters | 1 | Template-based letter generation |
| eSignature | 1 | Document signing |
| Engagement | 2 | Pulse surveys, 1-on-1 meetings |
| Recognition | 1 | Employee recognition |
| Referrals | 1 | Referral program, policies |
| PSA | 3 | Projects, timesheets, invoices |
| Loans | 1 | Employee loans, repayments |
| Compensation | 1 | Compensation reviews |
| Overtime | 1 | Overtime management |
| Budgets | 1 | Budget planning |
| Time Tracking | 1 | Time entries |
| Self-Service | 1 | Document requests, profile updates |
| Webhooks | 1 | Event delivery with retry |
| Integrations | 1 | Third-party API management |
| Feature Flags | 1 | Dynamic feature toggling |
| File Upload | 1 | MinIO integration |
| Custom Fields | 1 | Dynamic field definitions |
| Monitoring | 1 | Prometheus metrics, health checks |
| Audit Logs | 1 | Compliance audit trail |
| Data Migration | 1 | Data import/migration |
| Home/Dashboard | 2 | Dashboard data aggregation |
| Export | 1 | Excel/PDF export |
| Public APIs | 2 | Career portal, offer portal |

### Database Migrations (Flyway)
| Version | Description |
|---|---|
| V1 | Complete schema initialization (196 KB) |
| V2 | Performance review columns |
| V3 | Exit interview public tokens |
| V4 | Project allocation columns |
| V5 | LMS completions |
| V6 | Payroll statutory columns |
| V7 | Report templates |
| V8 | Demo seed data |
| V9 | Performance indexes |
| V10 | Comp-off, shift swap, job boards |
| V11 | MFA, quiz, learning paths |

### Not Yet Implemented
- Payment gateway integration (Stripe/Razorpay)
- GraphQL API layer
- Kafka consumer workers (currently using webhooks/async)
- Contract lifecycle management
- Advanced predictive analytics

---

## 11. Cross-Cutting Infrastructure

### Security Stack
- `JwtTokenProvider` + `JwtAuthenticationFilter` (HS512)
- `ApiKeyService` + `ApiKeyAuthenticationFilter`
- `TenantFilter` + `TenantContext` (ThreadLocal)
- `CustomPermissionEvaluator` + `PermissionAspect` (AOP)
- `FeatureFlagAspect` (feature toggles)
- `AccountLockoutService` (Redis-backed)
- `TokenBlacklistService` (JWT revocation)
- `DataScopeService` (row-level security enforcement)
- `DistributedRateLimiter` (Bucket4j + Redis)

### Observability
- Structured JSON logging (Logstash encoder)
- Prometheus metrics via Micrometer
- Spring Boot Actuator endpoints
- Slow query logging (>200ms threshold)
- Request/response logging filters
- Audit log service for compliance

### Configuration Profiles
- `application.yml` — Base config
- `application-dev.yml` — Dev (debug logging, insecure cookies, CSRF disabled)
- `application-demo.yml` — Demo environment
- `.env.production.example` — 109 production variables documented

---

## 12. Memory Update Protocol (MANDATORY)

### Why This Exists
When multiple AI agents work in parallel, stale context causes bugs: duplicate code, wrong patterns, missed dependencies. This protocol prevents that.

### Rules for All Agents

1. **Before Starting Any Task:**
   - Read `MEMORY.md` and `CLAUDE.md` first.
   - Check the module status tables to understand what already exists.
   - Identify which files you'll touch and read them before modifying.

2. **During Task Execution (Parallel Updates):**
   - After completing each significant sub-task, append a note to Section 13 (Session Log) with:
     - What was changed (files, modules)
     - Any new dependencies added
     - Any new API endpoints created
     - Any schema changes (new Flyway migration)
   - This lets other parallel agents see your changes in near-real-time.

3. **After Completing a Task:**
   - Update module status in Section 9 or 10 if a module's status changed.
   - Update Section 4 (Repository Structure) if new directories were created.
   - Add new architecture decisions to Section 3 if applicable.
   - Clear your entries from Section 13 (Session Log) and merge into permanent sections.

4. **Conflict Prevention:**
   - Never modify files outside your assigned module directory.
   - If you need a shared component (in `components/` or `lib/`), check if it already exists first.
   - If you must create a shared utility, prefix your session log entry with `⚠️ SHARED:` so other agents notice.

5. **Error Prevention Checklist (Run After Every Task):**
   - `cd frontend && npx tsc --noEmit` — fix all TypeScript errors
   - Verify no duplicate exports or imports were created
   - Verify no `any` types were introduced
   - Verify React Hook Form + Zod is used for all forms
   - Verify React Query is used for all data fetching
   - Verify existing Axios client is used (no new instances)
   - Verify SuperAdmin is not blocked by any new permission check

---

## 13. Session Log (Active Work Tracker)

> Agents: Add entries here during active work. Clear after merging into permanent sections.

_No active sessions._

---

## 14. Known Issues & Tech Debt

- Kafka consumers not yet implemented (using webhooks/async as interim)
- Some modules may have placeholder pages that need backend integration
- Payment gateway integration not started
- Contract management not implemented
- Mobile-specific API endpoints are limited
- Document management is basic (MinIO file storage, no full workflow)

---

*Last updated: 2026-03-10*
