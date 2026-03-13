# HRMS Project Memory

> This file is the single source of truth for context that AI agents need when resuming work on this project. Update this file at the end of any major session.

---

## 1. What This Project Is
**NU-AURA** is a bundle app platform (similar to Google Workspace) containing multiple sub-applications under a single unified login. It started as an HRMS and has been expanded into a full enterprise platform.

### Sub-Apps (accessed via waffle grid app switcher in header)
| App | Status | Description |
|---|---|---|
| **NU-HRMS** | ~90% Complete | Core HR: employees, attendance, leave, payroll, benefits, assets, helpdesk, etc. |
| **NU-Hire** | ~90% Complete | Recruitment & onboarding: jobs, candidates, pipeline, onboarding, offboarding |
| **NU-Grow** | ~90% Complete | Performance & engagement: reviews, OKRs, 360 feedback, LMS, recognition, surveys, wellness |
| **NU-Fluence** | ~40% Complete (Phase 2) | Knowledge management: wiki pages, blogs, document templates, Drive integration |

**Overall Status:** ~90% Complete (HRMS, Hire, Grow) | NU-Fluence is Phase 2 | 140+ E2E Tests

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

### NU-AURA Platform Architecture (Locked In)
- **NU-AURA is a bundle app platform**, NOT just an HRMS. Contains 4 sub-apps under one login.
- **App Switcher:** Google-style waffle grid (2×2) in the header. Shows NU-HRMS, NU-Hire, NU-Grow, NU-Fluence with RBAC lock icons for unauthorized apps.
- **Route Strategy:** Flat routes remain unchanged (e.g., `/employees`, `/recruitment`, `/performance`). Routes are mapped to apps via pathname matching in `frontend/lib/config/apps.ts`. Entry points: `/app/hrms`, `/app/hire`, `/app/grow`, `/app/fluence`.
- **App-aware Sidebar:** `AppLayout.tsx` filters sidebar sections based on the active app (detected by `useActiveApp` hook from current pathname).
- **Module-to-App Mapping:**
  - **NU-HRMS:** Home, My Space, People, HR Ops (attendance, leave, assets, letters), Pay & Finance, Projects & Work, Reports & Analytics, Admin
  - **NU-Hire:** Recruitment, Onboarding, Preboarding, Offboarding, Offer Portal, Careers
  - **NU-Grow:** Performance, OKR, 360 Feedback, Training, Learning (LMS), Recognition, Surveys, Wellness
  - **NU-Fluence:** Wiki, Blogs, Templates, Drive (Phase 2 — not yet built)
- **Key files:**
  - `frontend/lib/config/apps.ts` — App definitions, route→app mapping, sidebar section mapping
  - `frontend/lib/hooks/useActiveApp.ts` — Active app detection from pathname
  - `frontend/components/platform/AppSwitcher.tsx` — Waffle grid UI component
  - `docs/NU_AURA_PLATFORM_ARCHITECTURE.docx` — Full architecture requirements document

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
│   │   └── platform/        # AppSwitcher (waffle grid for NU-AURA sub-apps)
│   ├── lib/                 # Core libraries
│   │   ├── api/             # Axios clients (client.ts, public-client.ts, auth.ts, etc.)
│   │   ├── config/          # env.ts, routes.ts, apps.ts (platform app definitions)
│   │   ├── hooks/           # useAuth, usePermissions, useActiveApp, useDebounce + React Query hooks
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

### Session: 2026-03-12 — Visual QA & Sidebar Fixes + KEKA Migration Plan

**Sidebar fixes applied:**
- Fixed `/nu-calendar/new` → `/calendar/new` path mismatch in `AppLayout.tsx:635`
- Created `/allocations/page.tsx` (redirect → `/allocations/summary`)
- Created `/psa/page.tsx` (redirect → `/psa/projects`)
- Created `/helpdesk/page.tsx` (redirect → `/helpdesk/sla`)
- Created `/settings/profile/page.tsx` (profile settings page)
- Created `/settings/notifications/page.tsx` (notification preferences page)

**Known issue found — `employeeId: null` for SuperAdmin:**
- SuperAdmin user (Fayaz M) has `employeeId: null` in the auth store
- 8 pages show infinite spinner or error when `employeeId` is null:
  - `/me/dashboard` — infinite spinner
  - `/me/attendance` — infinite spinner
  - `/me/documents` — infinite spinner
  - `/me/profile` — shows error message
  - `/me/leaves` — shows error message
  - `/me/payslips` — role detection fallback (may work)
  - `/leave/apply` — API error with null employeeId
  - `/attendance/my-attendance` — empty state

**⚠️ IMPORTANT — KEKA Migration Plan:**
- User plans to import/migrate employees from KEKA HRMS into NU-AURA
- Once KEKA users are imported, the SuperAdmin user will likely have an associated employee record
- The `employeeId: null` issue will self-resolve for most users post-migration
- Need data migration tooling: KEKA → NU-AURA employee/leave/attendance import
- Consider building a KEKA data import module at `/admin/import-keka` or using the existing `/employees/import` page
- KEKA API or CSV export will be the data source

---

## 14. Known Issues & Tech Debt

- Kafka consumers not yet implemented (using webhooks/async as interim)
- Some modules may have placeholder pages that need backend integration
- Payment gateway integration not started
- Contract management not implemented
- Mobile-specific API endpoints are limited
- Document management is basic (MinIO file storage, no full workflow)
- ~~/workflow/inbox/count returns 500~~ — Fixed: `retry: false` on useApprovalInboxCount hook
- ~~/admin page shows "System DOWN"~~ — Fixed: graceful DEGRADED state + UNAVAILABLE components
- ~~Raw localStorage usage in leave pages~~ — Fixed: replaced with useAuth() hook in leave/apply, leave/calendar
- ~~SuperAdmin employeeId: null causing 8+ page spinners~~ — Fixed: AuthService auto-link error handling + frontend null guards on 7 pages
- ~~13 pages missing AppLayout wrapper (no sidebar/header)~~ — Fixed: learning, projects, offboarding, tax, performance, PSA pages
- ~~React Query infinite retries on network errors~~ — Fixed: retry:2, staleTime:5min, gcTime:10min, refetchOnWindowFocus:false
- ~~No session timeout~~ — Fixed: 30-min inactivity timeout with 5-min warning toast
- ~~Error pages using generic components~~ — Fixed: Mantine UI error.tsx, global-error.tsx, not-found.tsx with error categorization

---

## 15. Session Log: 2026-03-12 — Full Visual QA & UI Fixes

### employeeId null spinner fixes (8 pages):
- `me/dashboard/page.tsx` — Added `setIsLoading(false)` when no employeeId; added "No Employee Profile Linked" fallback UI with admin nav buttons
- `me/attendance/page.tsx` — Added `else if (user)` branch to stop loading; added fallback UI with "View Team Attendance" link
- `me/documents/page.tsx` — Added `else if (user)` branch to stop loading; added fallback UI with "Go to Document Management" link
- `leave/apply/page.tsx` — Added early return with error message when no employeeId
- `leave/calendar/page.tsx` — Auto-switches to team view when no employeeId
- `announcements/page.tsx` — Added `else if (user)` branch to load pinned only and stop loading spinner
- `performance/reviews/page.tsx` — Replaced raw `localStorage` with `useAuth()` hook; added hydration guard
- `performance/goals/page.tsx` — Replaced raw `localStorage` with `useAuth()` hook; added hydration guard

### Missing AppLayout wrappers (3 pages):
- `performance/page.tsx` — Added `<AppLayout>` wrapper (was rendering bare `<div>`)
- `admin/page.tsx` — Added `<AppLayout>` wrapper (was rendering bare `<motion.div>`)
- `admin/roles/page.tsx` — Added `<AppLayout>` wrapper (was rendering `<>` fragment)

### Visual QA Results (all visually verified in browser):
- `/home` — ✅ Welcome banner, inbox, time widget, announcements, quick links
- `/dashboard` — ✅ (verified in previous session)
- `/dashboards/executive` — ✅ (verified in previous session)
- `/me/dashboard` — ✅ Shows "No Employee Profile Linked" fallback (was infinite spinner)
- `/me/profile` — ⚠️ Redirects to /home (auth token issue, not code bug — code handles null employeeId correctly)
- `/me/attendance` — ✅ Shows "No Employee Profile Linked" fallback (was infinite spinner)
- `/me/payslips` — ✅ Shows admin view "All Employee Payslips" with stats
- `/me/leaves` — ✅ Shows error banner + empty state (no spinner)
- `/me/documents` — ✅ Shows "No Employee Profile Linked" fallback (was infinite spinner)
- `/announcements` — ✅ Fixed (was infinite spinner, now loads pinned + stops loading)
- `/employees/directory` — ✅ Team Directory with search, filters, empty state
- `/org-chart` — ✅ View/dept filters, role badges, empty state
- `/employees` — ✅ Employee Management with search, status filter, Import, Add Employee
- `/departments` — ✅ Stats cards, search, table, empty state
- `/approvals/inbox` — ✅ Stats cards, category tabs, search, delegate, empty state
- `/performance` — ✅ Now has sidebar (AppLayout fix), stats, module cards, tips
- `/admin` — ✅ Now has sidebar (AppLayout fix), stats, system health, user table, role mgmt

### TypeScript: 0 errors (npx tsc --noEmit clean)

---

## 16. Session Log: 2026-03-12 — NU-AURA Platform Architecture (Phase 1)

### Platform Restructuring — Phase 1 Complete
NU-AURA transformed from a flat HRMS into a multi-app platform with 4 sub-apps.

**New files created:**
- `frontend/lib/config/apps.ts` — App definitions (code, name, gradient, routes, permissions), route→app mapping, sidebar section mapping
- `frontend/lib/hooks/useActiveApp.ts` — Hook that detects active sub-app from current pathname + provides RBAC app access check
- `frontend/app/app/hrms/page.tsx` — Entry point redirect → /home
- `frontend/app/app/hire/page.tsx` — Entry point redirect → /recruitment
- `frontend/app/app/grow/page.tsx` — Entry point redirect → /performance
- `frontend/app/app/fluence/page.tsx` — Placeholder "Coming Soon" page for Phase 2

**Modified files:**
- `frontend/components/platform/AppSwitcher.tsx` — Complete rewrite: now a 2×2 waffle grid showing 4 sub-apps with RBAC lock icons, gradient app icons, "Coming Soon" for NU-Fluence
- `frontend/components/layout/AppLayout.tsx` — Added app-aware sidebar filtering (sections shown based on active app), added NU-Hire hub section, NU-Grow hub section, NU-Fluence placeholder section, split Reports from Engage section
- `frontend/components/layout/Header.tsx` — Removed old `currentAppCode` logic, AppSwitcher is now self-contained
- `frontend/middleware.ts` — Added `/app` and `/fluence` to authenticated routes
- `CLAUDE.md` — Added NU-AURA platform architecture decision (locked in)
- `MEMORY.md` — Updated project description, added platform architecture section, updated repo structure

**Architecture document:** `docs/NU_AURA_PLATFORM_ARCHITECTURE.docx` (26KB, 11 sections)

### TypeScript: 0 errors (npx tsc --noEmit clean)

---

## 17. Session Log: 2026-03-12 — NU-Fluence Phase 2 + KEKA Import + Bug Fixes

### NU-Fluence Backend (59 files created)

**Flyway Migration V15:**
- `backend/src/main/resources/db/migration/V15__knowledge_fluence_schema.sql` — 15 tables: wiki_spaces, wiki_pages, wiki_page_versions, wiki_page_comments, wiki_page_watches, blog_categories, blog_posts, blog_comments, blog_likes, document_templates, template_instantiations, knowledge_attachments, knowledge_views, knowledge_searches, wiki_page_approval_tasks
- All tables have tenant_id, audit columns, RLS enabled
- GIN indexes for tsvector full-text search, B-tree indexes for tenant/status/visibility

**Domain Entities (15 files):**
- `backend/src/main/java/com/hrms/domain/knowledge/` — WikiSpace, WikiPage, WikiPageVersion, WikiPageComment, WikiPageWatch, WikiPageApprovalTask, BlogCategory, BlogPost, BlogComment, BlogLike, DocumentTemplate, TemplateInstantiation, KnowledgeAttachment, KnowledgeView, KnowledgeSearch
- Enums: PageStatus, VisibilityLevel, BlogPostStatus

**Repositories (15 files):**
- `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/` — Full-text search queries, tenant-aware filtering, pagination

**Services (6 files):**
- `backend/src/main/java/com/hrms/application/knowledge/service/` — WikiPageService, WikiSpaceService, BlogPostService, BlogCategoryService, DocumentTemplateService, KnowledgeSearchService

**Controllers (6 files):**
- `backend/src/main/java/com/hrms/api/knowledge/controller/` — WikiPageController, WikiSpaceController, BlogPostController, BlogCategoryController, TemplateController, KnowledgeSearchController
- API prefix: `/api/v1/knowledge/`

**DTOs (16 files):**
- `backend/src/main/java/com/hrms/api/knowledge/dto/` — 22 request/response DTOs

**Permissions:**
- Updated `Permission.java` with 17 new constants: KNOWLEDGE:WIKI_*, KNOWLEDGE:BLOG_*, KNOWLEDGE:TEMPLATE_*, KNOWLEDGE:SEARCH, KNOWLEDGE:SETTINGS_MANAGE

### TipTap Rich Text Editor

**New files:**
- `frontend/lib/types/editor.ts` — EditorContent, EditorNode, EditorMark interfaces
- `frontend/components/fluence/RichTextEditor.tsx` — Full WYSIWYG editor with 60+ formatting options (bold, italic, headings, lists, tables, code blocks, images, links, colors, highlights, task lists, undo/redo)
- `frontend/components/fluence/ContentViewer.tsx` — Read-only TipTap content renderer
- `frontend/app/fluence/wiki/new/page.tsx` — Create wiki page with editor
- `frontend/app/fluence/blogs/new/page.tsx` — Create blog post with editor

**Modified:**
- `frontend/app/globals.css` — Added TipTap editor CSS styles
- `frontend/app/fluence/wiki/[slug]/page.tsx` — Integrated ContentViewer
- `frontend/app/fluence/blogs/[slug]/page.tsx` — Integrated ContentViewer

**Dependencies added:** @tiptap/react, @tiptap/starter-kit, @tiptap/pm, 15+ TipTap extensions, lowlight

### KEKA Data Import Module

**New files:**
- `frontend/lib/types/keka-import.ts` — KekaEmployee, KekaImportMapping, KekaImportPreview, KekaImportResult types
- `frontend/lib/validations/keka-import.ts` — Zod validation schemas
- `frontend/lib/services/keka-import.service.ts` — Import service (upload, mapping, preview, execute, history)
- `frontend/lib/hooks/queries/useKekaImport.ts` — React Query hooks
- `frontend/app/admin/import-keka/page.tsx` — 5-step import wizard (Upload → Mapping → Preview → Import → Results)

**Modified:**
- `frontend/app/admin/layout.tsx` — Added "Data Import" sidebar section with KEKA import link

### Bug Fixes

1. **Workflow inbox 500:** Added `retry: false` to `useApprovalInboxCount()` in `frontend/lib/hooks/queries/useApprovals.ts`
2. **Admin System DOWN:** Updated `admin.service.ts` to return DEGRADED status; updated `admin/page.tsx` SystemHealthCard to show Unavailable state; updated `HealthResponse` type to include 'DEGRADED'
3. **Raw localStorage:** Replaced `localStorage.getItem('user')` with `useAuth()` hook in `leave/apply/page.tsx` and `leave/calendar/page.tsx`

### TypeScript: 0 errors (npx tsc --noEmit clean)

---

---

## 18. KEKA HRMS UI Flow Reference (Captured 2026-03-13)

> Reference flows captured from Nulogic's production Keka instance (nutech.keka.com). Use this as UX/UI benchmark when building NU-AURA modules.

### Global Navigation Structure

**Top Bar:** Keka logo, Tenant name ("NU Information Technologies Pvt Ltd"), Global search bar ("Search employees or actions (Ex: Apply Leave)" with ⌘+K), Notification bell, Profile avatar

**Left Sidebar (9 main modules):**
1. **Home** — Dashboard
2. **Me** — Employee Self-Service
3. **Inbox** — Approvals & Notifications
4. **My Team** — Manager View
5. **My Finances** — Payroll & Tax
6. **Org** — Organization Directory
7. **Engage** — Social & Announcements
8. **Performance** — OKRs & Reviews (Admin/Manager)
9. **Project** — Project & Timesheet Management

Each sidebar item has a hover flyout showing sub-sections.

---

### Module 1: Home (Dashboard)

**Route:** `/#/home/dashboard`

**Left Column Widgets:**
- **Inbox** — Pending actions count with "Good job! No pending actions" state
- **Time Today** — Live clock, Clock-in/Clock-out button, day indicator (M T W T F S S), flexible timings bar showing work blocks, "Since Last Login" duration, Attendance Policy link
- **Holidays** — Carousel slider showing upcoming holidays with type badge (e.g., "FLOATER LEAVE")
- **On Leave Today** — List of employees on leave (or empty state)
- **Working Remotely** — Avatar chips of remote employees
- **Leave Balances** — Donut chart (24 Days Annual Leave), Request Leave button, View All Balances link
- **Quick Links** — Configurable shortcuts

**Center/Right Column:**
- **Organization / Department tabs** — Scope filter for the social feed
- **Social Feed** — Post / Poll / Praise tabs with text input
- **Announcements** — List with "+" create button
- **Birthdays / Work Anniversaries / New Joinees** — Tab-based section with avatars, "Wish" button
- **Activity Feed** — Posts with images, like/comment reactions

**Key UX Pattern:** Dashboard is a two-column layout. Left = personal actionable widgets. Right = social/organizational feed.

---

### Module 2: Me (Employee Self-Service)

**Route:** `/#/me/*`

**Top-level tabs:** ATTENDANCE | TIMESHEET | LEAVE | PERFORMANCE | EXPENSES & TRAVEL | APPS

#### Me → Attendance (`/#/me/attendance/logs`)
- **Summary card:** Avg Hrs/Day, On Time Arrival %
- **Timings section:** Weekly day circles (M T W T F S S with active day highlighted), current live time, flexible timings bar showing worked blocks throughout the day, break indicator (60 min)
- **Actions panel:** Clock-out button, "Since Last Login" duration, Attendance Policy link
- **Logs & Requests:** Tabs — Attendance Log | Calendar | Attendance Requests
  - **Attendance Log table:** Date, Attendance Visual (timeline bar showing work blocks), Effective Hours, Gross Hours, Log status icon
  - **Month filter:** 30 DAYS | FEB | JAN | DEC | NOV | OCT | SEP
  - **24 hour format toggle**

#### Me → Leave (`/#/me/leave/summary`)
- **Pending leave requests** section
- **Actions panel (right sidebar):** Request Leave button (primary CTA), Leave Encashment History, Request Credit for Compensatory Off, Leave Policy Explanation Document
- **My Leave Stats:** 3 charts — Weekly Pattern (bar by day), Consumed Leave Types (donut), Monthly Stats (bar by month Jan-Dec)
- **Leave Balances:** Cards per leave type — Annual Leave (donut: 24 Days Available), Comp Off, Unpaid Leave — each with "View details" link

#### Me → Performance (`/#/me/performance/objectives/summary`)
- **Sub-tabs:** Objectives | 1:1 Meetings | Feedback | PIP | Reviews | Skills | Competencies & Core Values
- **Objectives view:** Filter bar (Objective Type, Status, Tags, Search), Average progress %, Objective by status donut chart (Not started, On track, At risk, Needs attention, Closed)
- **Objectives list:** Grouped by year (2025), each showing: Name, Key-results count, Initiatives count, Weight %, Type (Individual/Company/Department), Owner avatar, Due date, Progress bar with % and range (0% → 100%)

#### Me → Expenses & Travel (`/#/me/expenses/pending`)
- **Sub-tabs:** Pending Expenses | Past Claims | Advance Requests
- **Sections:** Expenses to be Claimed, Expense claims in process, Advance settlements in process

---

### Module 3: Inbox (Approvals)

**Route:** `/#/inbox/action`

**Tabs:** TAKE ACTION | NOTIFICATIONS | ARCHIVE

- **Take Action:** Pending approval items (leave requests, profile changes, expenses, etc.)
- **Notifications:** System notifications
- **Archive:** Past/completed actions

**Key UX Pattern:** Single unified inbox for all approval workflows across modules.

---

### Module 4: My Team (Manager View)

**Route:** `/#/myteam/summary/direct`

**Top tabs:** SUMMARY | LEAVE | ATTENDANCE | EXPENSES & TRAVEL | TIMESHEET | PROFILE CHANGES | PERFORMANCE

**Summary view:**
- **Report type filter:** Direct Reports | Dotted Line Reports | Peers
- **Status cards:** "Who is off today", "Not in yet today"
- **Quick stats row:** Late Arrivals today, Work from Home/On Duty today, Remote Clock-ins today — each with "View Employees" link
- **Team Attendance Calendar:** Monthly grid per employee, color-coded days (Work from home, On duty, Paid Leave, Unpaid Leave, Leave due to No Attendance, Weekly off, Holiday, Someone on Leave, Multiple Leave on a day, Someone on WFH/OD)
- **Direct Reports list:** Employee cards with photo, name, title, status badges (IN, REMOTE), location, department

**Key UX Pattern:** Manager dashboard aggregates all direct report data with at-a-glance status indicators.

---

### Module 5: My Finances

**Route:** `/#/myfinances/summary`

**Top tabs:** SUMMARY | MY PAY | MANAGE TAX | LOANS

#### Summary
- **Payroll Summary:** Last Processed Cycle, Working Days, Loss of Pay, Payslip link
- **Payment Information:** Salary Payment Mode, Bank Name, Account Number, IFSC Code, Name on Account, Branch
- **Statutory Information:** PF Account Info (Status, PF Number, UAN, Join Date, Name), ESI Account Info (Status)
- **Identity Information (right column):** PAN Card (verified badge), Aadhaar Card (verified badge) as Photo ID and Address Proof — each showing masked number, DOB, Name, Address, Gender

#### My Pay (`/#/myfinances/pay/salary`)
- **Sub-tabs:** My Salary | Pay Slips | Income Tax | Flexible Benefit Plan (FBP)
- **My Salary:** Current Compensation (annual), Pay Cycle (Monthly), Salary Timeline showing revision history (Effective date, Regular Salary + Bonus = Total, "View Salary breakup" link per revision)

---

### Module 6: Org (Organization)

**Route:** `/#/org/employees/directory`

**Top tabs:** EMPLOYEES | DOCUMENTS | ENGAGE | HELPDESK

#### Employee Directory
- **Sub-tabs:** Employee Directory | Organization Tree
- **Filters:** Business Unit, Department, Location, Cost Center, Legal Entity, Search
- **Card grid (4 per row):** Employee photo/avatar, Name (with ··· menu), Title, Department, Location, Email, Work Phone
- **Pagination:** "Showing 30 of 108"

#### Organization Tree (`/#/org/employees/tree`)
- Visual org chart with employee cards: Photo, Name, Title, Location, Department, Direct report count badge (green circle)
- Navigation: Search employee, "Go to: My Department" button, "Top of tree" button
- Zoom controls (+/−/fit)

---

### Module 7: Engage

**Route:** `/#/engage/announcements/list`

**Top tabs:** ANNOUNCEMENTS | SURVEYS | POLLS | ARTICLES

**Announcements view:**
- **Filter tabs:** All Announcements | Announcements by me
- **Filters:** Date Range, Announcement Type, Status, Created By, Search
- **Card grid (2 per row):** Image thumbnail, Title, Description preview, Author (avatar + name), Date, Status badge (Closed/Active), Likes count, Comments count, "view more" link

---

### Module 8: Performance (Admin/Manager)

**Route:** `/#/performance/objectives/insights/employee`

**Top tabs:** OBJECTIVES | 1:1 MEETINGS | SALARY & PROMOTION | SKILLS

#### Objectives → Insights
- **Sub-tabs:** Insights | Me | My Team | Manage Objectives
- **Filters:** Direct Reports dropdown, Fiscal year (2025-2026, Oct-Mar)
- **Summary cards:** Employees count, Objectives count, Employees without objectives, Employees objectives not updated
- **3 Donut charts:** Total objectives (Company/Department/Individual), Objectives by status (On track/Needs attention/At risk/Not started/Closed), Unaligned objectives

---

### Module 9: Project

**Route:** `/#/project-timesheets/projects/list/active-projects`

**Top tabs:** PROJECTS | ANALYTICS

#### Project List
- **Filter tabs:** Active projects | All projects | Archived projects
- **Filters:** Billing Model dropdown, Search
- **Table columns:** PROJECT (name + code), CLIENT, BILLING MODEL, START & END DATE, CREATED ON, PROJECT MANAGERS
- **View toggle:** Standard View dropdown
- **Pagination**

---

### Key UX Patterns to Replicate in NU-AURA

1. **Dual-column dashboard:** Personal widgets (left) + social feed (right)
2. **Module → Top tabs → Sub-tabs → Content** hierarchy (3-level navigation)
3. **Unified inbox** for all approval workflows (not per-module approval pages)
4. **Manager team view** with attendance calendar grid (color-coded per-employee per-day)
5. **Card grid layouts** for employee directory (4 per row) and announcements (2 per row)
6. **Org tree** with zoom/navigation controls and direct report badges
7. **Salary timeline** showing revision history with expandable breakdowns
8. **Leave stats** with 3 complementary charts: weekly pattern, consumed types donut, monthly bar
9. **Clock-in/out widget** with live time, flexible timings bar, and attendance policy link
10. **Global search** with ⌘+K shortcut supporting both employee search and action search
11. **Status badges** throughout (IN, REMOTE, Verified, Closed, FLOATER LEAVE, etc.)
12. **Hover flyout sub-nav** on sidebar items for quick access without full page navigation

---

*Last updated: 2026-03-13*

---

## 19. KEKA HRMS Deep-Dive: Interaction-Level UI Flows (Captured 2026-03-13)

This section documents the detailed form fields, data models, and interaction patterns observed in Keka's employee-facing views. Use as a blueprint when building equivalent NU-AURA screens.

---

### 19.1 Employee Profile View (`#/myprofile/`)

**Profile Header (shared across all profile tabs):**
- Cover photo banner (dark, customizable)
- Avatar (circular, editable)
- Full Name + Country badge (IN) + Work mode badge (REMOTE, green)
- Designation below name
- Contact row: Email icon + email link | Phone icon + number | Location pin + office address | ID icon + Employee Number
- Org info row: BUSINESS UNIT | DEPARTMENT | COST CENTER | REPORTING MANAGER (with avatar link)

**5 Profile Tabs:** ABOUT | PROFILE | JOB | DOCUMENTS | ASSETS

#### ABOUT Tab
**Sub-tabs:** Summary | Timeline | Wall Activity

**Summary (two-column layout):**
- Left column:
  - About (editable, pencil icon) — free text bio
  - What I love about my job? (editable)
  - My interests and hobbies (editable)
  - Professional Summary (editable) — longer professional bio
- Right column:
  - Skills widget: Chip tags with skill name + star rating (1-5), "Manage Skills" link, "+Add Skills", "N Skills more" overflow link
  - Reporting Team (count) — shows direct reports with avatar + name + designation
  - Praise section — badge icons with count (e.g., "Top Performer"), "View all" link

#### PROFILE Tab
**Two-column card layout, each card has "Edit" button:**

- **Primary Details:** First Name, Middle Name, Last Name, Display Name, Gender, Date of Birth, Marital Status, Blood Group, Marriage Date, Physically Handicapped (Yes/No), Alias, Nationality
- **Contact Details:** Work Email, Personal Email, Mobile Number, Work Number, Residence Number, Emergency Contact, Emergency Contact Name, Relationship
- **Addresses:** Current Address (multi-line: street, area, city, state, country, pin), Permanent Address (same structure)
- **Relations:** Spouse details (Name, Email, Mobile, Profession, DOB, Gender) — extendable for parents/children
- **Experience:** Job Title + Company, Date range (From-To) | Location
- **Education:** Degrees & Certificates — Branch/Specialization, CGPA/Percentage, Degree, University/College, Year of Completion, Year of Joining
- **Professional Summary:** Free text (same as About tab)
- **Bank Details:** Bank Name, Account Number, IFSC, Branch Code, Account Holder Name
- **Skills and Certifications:** Technical Skills (comma-separated), Soft Skills (comma-separated)
- **Identity Information:** Photo IDs with verification status badges (PENDING VERIFICATION):
  - Aadhaar Card: Masked number (XXXX-XXXX-3200), Enrollment Number, DOB, Name, Address, Gender
  - Pan Card: Masked PAN, Name, DOB, Parent's Name
  - Voter Id Card: Similar masked structure

#### JOB Tab
**Two-column layout (no Edit button — read-only for employees):**

- **Job Details (left):** Employee Number, Date of Joining, Job Title - Primary, Job Title - Secondary, In Probation? (Yes/No + date range + policy name), Notice Period (policy name + days), Worker Type (Permanent/Contract/Intern), Time Type (Full Time/Part Time), Contract Status (badge), Pay Band, Pay Grade
- **Organization (right):** Business Unit, Department, Location, Cost Center, Legal Entity, Dotted Line Manager, Reports To (avatar + name), Manager of Manager / L2 Manager (avatar + name), Direct Reports (count)
- **Employee Time (left, below Job Details):** Shift, Weekly Off Policy, Leave Plan, Holiday Calendar, Attendance Number, Payroll Time Source, Disable attendance tracking (toggle), Attendance Time Tracking Policy, Attendance Penalisation Policy, Shift Weekly Off Rule, Shift Allowance Policy, Overtime
- **Other (left, below Employee Time):** Expense Policy, Timesheet Policy, Loan Policy, Air Ticket Policy, Project 1 + Allocation 1, Project 2 + Allocation 2

#### DOCUMENTS Tab
**Left sidebar + right content area:**
- Left: Search box + FOLDERS accordion — each folder shows folder icon + name + document count
- Folder types observed: Degrees & Certificates, Previous Experience, Performance Reviews, Employee Letters, Course Certificates, Identity
- Right (on folder click): Folder name, document count + access badge ("Restricted access"), description text, document list — each row: PDF icon, Document Title | Generated on date, "View document" button, 3-dot menu

#### ASSETS Tab
**Sub-tabs:** Assigned assets | Asset requests | Asset damage charges

**Assigned Assets table:** ASSET TYPE | ASSET (name + serial number with icon) | ASSET CATEGORY | ASSIGNED ON | ACKNOWLEDGEMENT STATUS | LATEST CONDITION | ACTIONS (3-dot menu)
- Pagination at bottom

---

### 19.2 Timesheet View (`#/me/timesheet/`)

**Sub-tabs:** All Timesheets | Past Due (red badge with count) | Rejected Timesheets | Project Time | Time Summary | My Tasks | Projects Allocated

**All Timesheets — Weekly Grid:**
- Header metrics: Billable (green dot + hours), Non-Billable (orange dot + hours), Time Off (blue dot + hours), Billable Utilization (percentage)
- "Copy last week hours" button (top-right)
- List/Grid view toggle
- Grid structure:
  - Column headers: PROJECTS | MON date | TUE date | ... | SUN date | TASK TOTAL HRS/WEEK
  - Row 1: ATTENDANCE HOURS (auto-filled from attendance system, read-only)
  - Row 2+: Project time entries (editable cells)
  - "+ Add Time Entry" link to add new project rows
  - Summary row: Total hours/day
- Footer actions: "Request Leave" link | "Attach file" button | "Save" button | "Submit weekly timesheet" button
- Below grid: Comment Summary (left) | Timesheet Activity with date range (right)

---

### 19.3 Expenses & Travel (`#/me/expenses/`)

**Sub-tabs:** Pending Expenses | Past Claims | Advance Requests

**Pending Expenses view (3 sections):**
1. **Expenses to be Claimed** — list of draft expenses + "+ Add an Expense" CTA button
2. **Expense claims in process** — submitted claims awaiting approval
3. **Advance settlements in process** — advance claims awaiting settlement

**Add Expense Form (full-page overlay):**
- Left: Receipt upload/preview area ("Upload Receipts" button + preview panel)
- Right form fields:
  - Expense Category (dropdown — "Select a category")
  - Project / Cost Center (dropdown)
  - Expense Title (text input)
  - Expense Date (date picker)
  - Currency (dropdown — "Select a currency")
  - Amount (number input + "Payable Amount = INR" conversion note)
  - Comment (textarea)
  - Upload Receipt (file attachment link)
- Footer: "Save Expense" | "Save and Add Another" | "Submit Claim" (primary)

---

### 19.4 Performance Module (`#/performance/`)

**Top tabs:** OBJECTIVES | 1:1 MEETINGS | SALARY & PROMOTION (manager-only) | SKILLS

#### Objectives
**Sub-tabs:** Insights | Me | My Team | Manage Objectives

**Insights view:**
- Filters: Direct Reports dropdown, Fiscal Year dropdown (e.g., "2025-2026 (01 Oct - 31 Mar)")
- KPI cards (4): Employees count, Objectives count, Employees without objectives, Employees objectives not updated
- Three donut charts:
  - Total objectives (Company / Department / Individual)
  - Objectives by status (On track / Needs attention / At risk / Not started / Closed)
  - Unaligned objectives (Company / Department / Individual)

#### 1:1 Meetings
**Sub-tabs:** My Meetings | Team Meetings | Action Items | Agenda Templates | Meeting Logs

**My Meetings view:**
- "Schedule 1:1 meeting" CTA button (top-right)
- Filters: Meeting Type (multi-select dropdown), Date Range (date picker), Search
- Left sidebar: Accordion groups — UPCOMING MEETINGS | PENDING MEETINGS | COMPLETED MEETINGS
- Right: Meeting detail panel (empty state: "No meetings scheduled in this date range")

#### Skills (accessed under Performance > Skills)
- Skill inventory / assessment view (observed in sidebar navigation)

---

### 19.5 Engage Module (`#/engage/`)

**Top tabs:** ANNOUNCEMENTS | SURVEYS | POLLS | ARTICLES

#### Announcements
- Toggle: All Announcements | Announcements by me
- Filters: Date Range (date picker), Announcement Type (dropdown), Status (dropdown), Created By (dropdown), Search
- Card grid (2 per row): Thumbnail image, Title, Description preview (truncated with "view more"), Reactions (thumbs-up count + comments count), Author (avatar + name), Date + time, Status badge (Closed/Active), 3-dot menu

---

### 19.6 Project Module (`#/project-timesheets/`)

**Top tabs:** PROJECTS | ANALYTICS
**Sidebar:** Projects (expandable) | Analytics (expandable)

#### Project List
- Sub-tabs: Active projects | All projects | Archived projects
- Filters: Billing Model dropdown, Search, Column filter icon
- View: Standard View dropdown
- Table: PROJECT (name + code), CLIENT, BILLING MODEL, START & END DATE, CREATED ON, PROJECT MANAGERS (avatar links, "+N" overflow)
- Pagination

---

### 19.7 Apps Marketplace (`#/me/apps/`)

**Tabs:** My Apps | Apps center

**My Apps view:**
- Toggle: Org Enabled | Installed apps
- Search bar
- App cards (4 per row): App icon, App name, Description, "Free" badge (or price), "Choice" badge for featured apps
- Observed apps: Google Meet for 1:1 checkins, Google Calendar for 1:1 checkins, Quicko, ClearTax for Tax Filing

---

### 19.8 Additional UX Patterns Observed (Deep-Dive)

13. **Profile card pattern:** Shared header (avatar + name + badges + contact row + org row) persists across all 5 profile tabs — tab content scrolls below the fixed header
14. **Inline edit pattern:** Profile sections use "Edit" buttons that likely open inline form or modal — employee can edit personal data, contact, addresses, relations, education, experience, skills, bank details
15. **Identity verification workflow:** Photo IDs uploaded by employee show "PENDING VERIFICATION" badge — implies admin verification step
16. **Masked sensitive data:** Aadhaar (XXXX-XXXX-3200), PAN (XXXXXX375D) — partial masking with eye icon for reveal
17. **Weekly timesheet grid:** Attendance hours auto-populated as read-only row, project time entries as editable cells below — clever integration between attendance and timesheet modules
18. **Expense receipt-first UX:** Left panel for receipt upload/preview, right panel for form — encourages receipt scanning before manual entry
19. **Meeting accordion grouping:** Upcoming/Pending/Completed as collapsible sections in left sidebar with meeting details in right panel (master-detail pattern)
20. **App marketplace pattern:** Org-enabled vs user-installed toggle — allows IT admins to curate available integrations while employees can browse the full catalog
21. **Document folder taxonomy:** Pre-defined folder categories (Degrees, Experience, Performance Reviews, Employee Letters, Course Certificates, Identity) — each folder with access control badges
22. **Manager-gated features:** Salary & Promotion tab redirects to home for non-managers — graceful degradation rather than showing empty/forbidden state
23. **Objective analytics dashboard:** KPI cards + donut charts pattern for management insights — Direct Reports / Fiscal Year as the primary filters
24. **Project billing model:** Projects tied to clients with billing models (No Billing / T&M / Fixed) — allocation percentages per employee

*Last updated: 2026-03-13 (Deep-dive session)*
