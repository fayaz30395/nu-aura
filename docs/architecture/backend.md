# NU-AURA Backend — Deep Architecture Reference

> Last updated: 2026-05-12 | Refreshed after sprint 1-7 wave-4 doc audit (S8-A)

## Overview

Modular monolith built with Spring Boot 3.4.1 on Java 21 (`<java.version>21</java.version>` in
`backend/pom.xml`; Docker images on Java 21 — see `fd1c677d`). Clean layered architecture: `api/` → `application/` → `domain/` → `infrastructure/`.
**173+ controllers, 230+ services, 295+ entities, 144 Flyway migrations (V0–V154).**

Sprints 1-7 (May 2026) closed 79 + 50 + critical-wave-3-to-5 + statutory + governance findings
across 6 audit waves. See `sprint-history.md` for the chronological decision log and
`security-controls.md` for the consolidated security posture.

---

## Package Structure

```
com.hrms/
├── api/                        # REST layer (controllers + DTOs)
│   └── {module}/controller/    # @RestController classes
│   └── {module}/dto/           # Request/Response DTOs + validators
├── application/                # Business logic layer
│   └── {module}/service/       # @Service classes (@Transactional)
├── domain/                     # Domain layer (JPA entities)
│   └── {module}/               # @Entity classes
├── infrastructure/             # Data access + external integrations
│   └── {module}/repository/    # JpaRepository interfaces
│   └── kafka/                  # Producers, consumers, config
│   └── notification/           # Email, SMS, WebSocket, webhooks
├── common/                     # Cross-cutting concerns
│   ├── config/                 # 28 Spring configurations
│   ├── security/               # JWT, RBAC, tenant isolation
│   ├── exception/              # Global exception handling
│   ├── validation/             # Custom validators
│   ├── cache/                  # Tenant-aware cache key generator
│   └── logging/                # Structured logging + audit
└── config/                     # WebSocket, async, scheduling configs
```

---

## Modules (71 Total)

admin, analytics, announcement, asset, attendance, audit, auth, benefits, budget, calendar, common,
compensation, compliance, contract, customfield, dashboard, dataimport, document, employee,
engagement, esignature, exit, expense, featureflag, helpdesk, home, integration, knowledge, leave,
letter, lms, loan, meeting, migration, mobile, monitoring, notification, onboarding, organization,
overtime, payment, payroll, performance, platform, preboarding, probation, project, psa, publicapi,
recognition, recruitment, referral, report, resourcemanagement, selfservice, shift, statutory,
survey, tax, timetracking, training, travel, user, wall, webhook, workflow, wellness

---

## Controllers by Module

| Module       | Controllers                                                                                                                    | Key Endpoints                                                             |
|--------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| auth         | AuthController, MfaController                                                                                                  | POST /api/v1/auth/login, /google, /mfa-login, /refresh                    |
| employee     | EmployeeController                                                                                                             | CRUD /api/v1/employees, /hierarchy, /subordinates                         |
| leave        | LeaveRequestController, LeaveBalanceController                                                                                 | CRUD /api/v1/leaves, /balance, /approve, /reject                          |
| attendance   | AttendanceController, MobileAttendanceController, HolidayController, CompOffController                                         | /api/v1/attendance, /holidays, /comp-off                                  |
| payroll      | PayrollController, PayrollStatutoryController                                                                                  | /api/v1/payroll, /payslips, /statutory                                    |
| recruitment  | RecruitmentController, JobBoardController, ApplicantController, AIRecruitmentController                                        | /api/v1/recruitment, /job-boards, /applicants                             |
| performance  | PerformanceRevolutionController, Feedback360Controller, OkrController                                                          | /api/v1/performance, /feedback360, /okr                                   |
| user         | UserController, RoleController, PermissionController                                                                           | /api/v1/users, /roles, /permissions                                       |
| knowledge    | WikiSpaceController, WikiPageController, BlogPostController, BlogCategoryController, TemplateController                        | /api/v1/wiki, /blogs, /templates                                          |
| notification | NotificationController, MultiChannelNotificationController, SmsNotificationController                                          | /api/v1/notifications, /sms                                               |
| mobile       | MobileApprovalController, MobileLeaveController, MobileDashboardController, MobileNotificationController, MobileSyncController | /api/v1/mobile/*                                                          |
| analytics    | AnalyticsController, AdvancedAnalyticsController, OrganizationHealthController, ScheduledReportController                      | /api/v1/analytics, /reports                                               |
| wall         | WallPostController, AnnouncementController                                                                                     | /api/v1/wall, /announcements                                              |
| project      | ProjectController, TaskController                                                                                              | /api/v1/projects, /tasks                                                  |
| expense      | ExpenseController                                                                                                              | /api/v1/expenses                                                          |
| asset        | AssetController                                                                                                                | /api/v1/assets                                                            |
| contract     | ContractController                                                                                                             | /api/v1/contracts                                                         |
| document     | DocumentController                                                                                                             | /api/v1/documents                                                         |
| training     | TrainingController                                                                                                             | /api/v1/training                                                          |
| wellness     | WellnessController                                                                                                             | /api/v1/wellness                                                          |
| admin        | SystemAuditLogController, EncryptionBackfillController, AdminPasswordResetController (sprint 6), TenantAdminController         | /api/v1/admin/audit-logs, /encryption-backfill, /password-reset, /tenants |
| payroll      | PayrollController, PayrollStatutoryController, **BonusController** (sprint 4)                                                  | /api/v1/payroll, /bonus, /statutory                                       |
| compliance   | ComplianceAuditController, **DsrController** (sprint 7-A — DSR scaffold)                                                       | /api/v1/compliance, /dsr/{export,erase,status}                            |

**REST Convention**: `/api/v1/{module}/{resource}` with standard CRUD + custom actions.

**New since V119 / sprint 1-6** (additions over the table above):

- `SystemAuditLogController` (admin) — query/export the central audit feed.
- `EncryptionBackfillController` (admin) — one-shot re-encryption job for legacy plaintext PII rows
  (deferred item #6 from sprint 3, delivered in sprint 4).
- `BonusController` (payroll) — split out of `PayrollController` per the mass-assignment DTO
  refactor.
- `DsrController` (compliance) — GDPR data-subject-request scaffold from sprint 7-A.
- `AdminPasswordResetController` (admin) — sprint 6 added a force-reset endpoint behind
  `PERMISSION_ADMIN_PASSWORD_RESET`; uses `AdminPasswordResetRequest` / `AdminPasswordResetResponse`
  DTOs.

---

## Security Architecture

### Filter Chain Order

1. **RateLimitingFilter** — IP-based rate limiting (Bucket4j)
2. **TenantFilter** — Extracts `X-Tenant-ID` header → `TenantContext` ThreadLocal
3. **JwtAuthenticationFilter** — Parses JWT from cookies/Authorization header → `SecurityContext`
4. **CSRF Protection** — Double-submit cookie (disabled in dev profile)
5. **CORS** — Configurable origins (default: localhost:3000, 3001)
6. **Security Headers** — HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy

### JWT Token Claims

```json
{
  "sub": "user-uuid",
  "email": "user@company.com",
  "tenantId": "tenant-uuid",
  "roles": ["EMPLOYEE", "MANAGER"],
  "permissions": ["employee.read", "leave.approve"],
  "permission_scopes": {"employee.read": "DEPARTMENT"},
  "app_code": "HRMS",
  "accessible_apps": ["HRMS", "HIRE", "GROW"],
  "iat": 1704978600,
  "exp": 1704982200
}
```

### RBAC Enforcement

- **SuperAdmin**: Hardcoded bypass in `CustomPermissionEvaluator` and `PermissionAspect`
- **@RequiresPermission**: AOP aspect checks `module.action` against JWT claims
- **DataScopeService**: JPA Specifications filter data by scope (GLOBAL → no filter, LOCATION →
  officeLocationId, DEPARTMENT → departmentId, TEAM → teamId, SELF → createdBy)
- **Authorization Coverage**: 98% (1,264 of 1,292 endpoints protected)

### Rate Limiting (Bucket4j)

| Endpoint Pattern               | Limit   | Key         |
|--------------------------------|---------|-------------|
| /api/v1/auth/**                | 5/min   | IP address  |
| /api/v1/wall/**                | 30/min  | User:Tenant |
| /api/v1/*/export, *.csv, *.pdf | 5/5min  | User:Tenant |
| /api/v1/webhooks/**            | 50/min  | IP address  |
| /api/** (default)              | 100/min | User:Tenant |

---

## Kafka Event System

### Topics

| Topic                        | Consumer                  | Purpose                             |
|------------------------------|---------------------------|-------------------------------------|
| `nu-aura.approvals`          | ApprovalEventConsumer     | Workflow state transitions          |
| `nu-aura.notifications`      | NotificationEventConsumer | Email, SMS, in-app delivery         |
| `nu-aura.audit`              | AuditEventConsumer        | Audit trail persistence             |
| `nu-aura.employee-lifecycle` | EmployeeLifecycleConsumer | Onboarding, transfers, terminations |
| `*.dlt`                      | DeadLetterHandler         | Failed event recovery               |

### Event Structure (BaseKafkaEvent)

```java
public class BaseKafkaEvent {
    String eventId;      // UUID for deduplication
    String eventType;    // Enum (APPROVAL_APPROVED, etc.)
    String tenantId;     // Multi-tenant isolation
    Instant timestamp;
    String source;       // "approval-service", etc.
}
```

### Configuration

- **Producer**: Idempotent (PID + sequence), Snappy compression
- **Consumer**: auto-offset-reset=earliest, max-poll-records=100, session.timeout=30s
- **Error Handling**: DefaultErrorHandler with exponential backoff
- **Deduplication**: FailedKafkaEventRepository stores eventIds

---

## WebSocket (Real-time)

- **Endpoint**: `/ws` with SockJS fallback
- **Broker**: Simple in-memory (`/topic/*`, `/app/*`)
- **Topics**: `/topic/notifications`, `/topic/approvals`, `/topic/feed`
- **Service**: `WebSocketNotificationService` broadcasts via `SimpMessagingTemplate`

---

## Scheduled Jobs

| Job                          | Schedule      | Purpose                                       |
|------------------------------|---------------|-----------------------------------------------|
| WorkflowEscalationScheduler  | Hourly        | Escalate pending approvals, send reminders    |
| EmailSchedulerService        | Every 5 min   | Batch-send queued emails                      |
| ScheduledReportExecutionJob  | Configurable  | Execute scheduled reports                     |
| ContractReminderService      | Daily         | Contract renewal/expiration reminders         |
| JobBoardIntegrationService   | Daily         | Sync job postings to Naukri, LinkedIn, Indeed |
| WebhookDeliveryService       | Every 10 min  | Retry failed webhook deliveries               |
| AutoRegularizationScheduler  | Monthly       | Auto-regularize attendance                    |
| ScheduledNotificationService | Every 15 min  | Process notification queue                    |
| LeaveAccrualService          | Monthly (1st) | Accrue monthly leave balance                  |
| PayrollScheduledService      | Monthly       | Generate/finalize payroll runs                |

All scheduled jobs use `TenantAwareAsyncTask` for tenant context propagation.

---

## Entity Design Patterns

### Base Entity Fields (All 295+ entities)

```java
@Id @GeneratedValue(strategy = GenerationType.UUID)
private UUID id;
private UUID tenantId;          // Multi-tenant isolation
private boolean isDeleted;      // Soft delete
private Instant deletedAt;      // Soft delete timestamp
@CreatedBy private String createdBy;
@CreatedDate private Instant createdAt;
@LastModifiedBy private String updatedBy;
@LastModifiedDate private Instant updatedAt;
```

### Key Entity Groups

**Organization**: Tenant, OrganizationUnit, Department, Position, SuccessionPlan, TalentPool

**Employee**: Employee, EmployeeSkill, EmploymentChangeRequest, EmployeeReferral

**Attendance**: AttendanceRecord, AttendanceTimeEntry, Holiday, OfficeLocation, CompOffRequest,
ShiftSwap

**Leave**: LeaveRequest, LeaveType, LeaveBalance, LeavePolicy

**Performance**: PerformanceReview, ReviewCycle, Feedback, OKR, KeyResult, PIP, Feedback360

**Recruitment**: JobPosting, Applicant, Interview, OfferLetter, JobBoard, Pipeline

**Payroll**: Payslip, SalaryStructure, SalaryComponent, SalaryRevision, LeaveEncashment,
GlobalPayrollRun

**Benefits**: BenefitPlan, BenefitEnrollment, BenefitClaim, FlexBenefitAllocation

**Workflow**: ApprovalInstance, ApprovalTask, WorkflowDefinition, WorkflowStep

**Knowledge/Fluence**: WikiSpace, WikiPage, BlogPost, BlogCategory, DocumentTemplate

**Social/Wall**: WallPost, PostComment, PostReaction, PollOption, PollVote, Announcement,
Recognition

---

## Exception Handling

### Custom Exceptions

| Exception                  | HTTP Status | Use Case                   |
|----------------------------|-------------|----------------------------|
| AuthenticationException    | 401         | Invalid credentials/MFA    |
| UnauthorizedException      | 403         | Missing permissions        |
| ResourceNotFoundException  | 404         | Entity not found           |
| DuplicateResourceException | 409         | Unique constraint violated |
| ValidationException        | 400         | Input validation failed    |
| BusinessException          | 500         | Business logic violation   |

### Error Response Format

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Employee not found with id: <uuid>",
  "details": [],
  "timestamp": "2026-03-19T10:00:00Z"
}
```

`GlobalExceptionHandler` (@ControllerAdvice) catches all exceptions and maps to `ErrorResponse`.

---

## Caching Strategy (Redis)

- **Backend**: `@Cacheable` with `tenantAwareKeyGenerator`
- **Key pattern**: `{tenantId}::{cacheName}::{key}`
- **TTL**: 1 hour (3600000ms)
- **Invalidation**: `@CacheEvict(allEntries=true)` on create/update
- **Cached services**: SecurityService, HolidayService, OfficeLocationService, WebhookService
- **Cache null values**: disabled

---

## Flyway Migrations (V0–V154, 144 files)

### Pre-sprint baseline (V0–V119)

| Range    | Description                                                                             |
|----------|-----------------------------------------------------------------------------------------|
| V0       | Core schema: tenants, users, roles, permissions, employees, leaves, attendance, payroll |
| V1–V7    | Performance reviews, exit interviews, project allocation, payroll statutory, LMS        |
| V8       | Demo seed data (gated by `demo` profile)                                                |
| V9       | Performance indexes (N+1 prevention)                                                    |
| V10      | Comp-off, shift swap, job boards                                                        |
| V11      | MFA, quiz, learning paths                                                               |
| V12–V14  | Recruitment offer workflow, app access, webhook delivery                                |
| V15      | Knowledge/Fluence schema (wiki, blogs, templates)                                       |
| V16–V18  | Contract management, payment gateway, document workflow                                 |
| V19      | Platform seed data (apps, permissions)                                                  |
| V20–V26  | Recruitment pipeline, audit backfill, Google Meet, RLS policies                         |
| V30      | Comprehensive demo seed data                                                            |
| V31–V33  | Dotted-line managers, failed Kafka events, knowledge indexes                            |
| V34      | Production hardening indexes                                                            |
| V35      | Foreign key constraints (referential integrity)                                         |
| V36–V38  | RLS policies (complete coverage)                                                        |
| V39–V47  | Indexes, AI logging, avatar URL, wall post IDs, soft delete indexes, FK constraints     |
| V48–V117 | Module-by-module hardening (payroll, recruitment, performance, wall, fluence)           |
| V118     | Recruitment agencies + scorecards                                                       |
| V119     | Wiki inline comments                                                                    |

### Sprint 1-7 high points (V120–V154)

| Migration | Title                                                                                   | Why it matters                                                                                                                                                                                                                                |
|-----------|-----------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| V120–V127 | Password history, demo password resets, missing-column fixes, wall_view permission seed | Operational cleanups across `recognitions`, `expense_claims`, `training_programs`, role-permission table.                                                                                                                                     |
| **V128**  | `fix_deleted_at_missing_tables`                                                         | Adds `deleted_at TIMESTAMPTZ` to 20 tables that had `is_deleted` but no timestamp — unblocks soft-delete audit + future hard-delete cron.                                                                                                     |
| V129      | Missing-column P2/P3 patch                                                              | Fills 12 columns flagged by the QA sweep regression.                                                                                                                                                                                          |
| V130–V133 | Seed feature flags + role-permission backfills                                          | `lms.enabled`, `lms_course.view` for EMPLOYEE, `analytics.view` for HR roles, P1 post-500 schema safety.                                                                                                                                      |
| **V134**  | `add_password_reset_token_hash`                                                         | Sprint 1 auth hardening — token stored as 256-bit BCrypt hash; legacy plaintext column kept for one release for rollback, then dropped.                                                                                                       |
| V140–V142 | Audit-column backfill                                                                   | Adds `created_at/by`, `updated_at/by` to historically inconsistent tables (integration_audit_log, etc.).                                                                                                                                      |
| **V143**  | `add_drive_file_id_mapping`                                                             | **CRITICAL Drive tenant isolation** — `drive_file_mapping(logical_path, drive_file_id, tenant_id)`; logical-path becomes the canonical handle, opaque Drive fileId is no longer returned to clients.                                          |
| **V144**  | `wallpost_deleted_to_is_deleted`                                                        | Normalizes the wall_post `deleted` column to `is_deleted` to match the rest of the soft-delete contract; backfill + drop old column.                                                                                                          |
| **V145**  | `add_claim_number_sequence`                                                             | `expense_claim_sequence(tenant_id, year_month)` + mileage equivalent — replaces in-JVM `synchronized` counter; atomic `INSERT … ON CONFLICT … RETURNING`.                                                                                     |
| **V146**  | `add_audit_log_impersonator_id`                                                         | `audit_logs.impersonator_id UUID NULL` — required for SuperAdmin tenant impersonation traceability (sprint 2 finding).                                                                                                                        |
| **V147**  | `encrypt_pii_columns`                                                                   | Widens columns covered by `EncryptedStringConverter` to AES-GCM ciphertext length: `BenefitDependent.{nationalId, passportNumber, phone, email, address, preExistingConditions}`, `TaxDeclaration.{previousEmployerPan,…}`, `User.mfaSecret`. |
| **V148**  | `add_uniqueness_and_sequences`                                                          | Unique constraint on `post_reactions(post_id, user_id)` (Wall double-react race), `wiki_page_versions(page_id, version_number)`; `employee_code_sequence` atomic table.                                                                       |
| **V149**  | `restore_fts_gin_indexes`                                                               | Re-materialises `search_vector tsvector` generated columns + GIN indexes on `wiki_pages` and `blog_posts` that V15 had left as TODOs. (Repository ILIKE migration still pending — see Open Items.)                                            |
| **V150**  | `leave_correctness`                                                                     | Sprint 4 — fixes leave-balance accounting: deletes orphaned `leave_balance` rows for archived employees; adds CHECK `available_days >= 0`; adds composite UNIQUE on `(employee_id, leave_type_id, year)`.                                     |
| **V151**  | `employee_search_trgm`                                                                  | Sprint 5 — `pg_trgm` GIN index on `employees(full_name, employee_code, email)` for fuzzy search; the existing ILIKE queries become index-backed without code changes.                                                                         |
| **V152**  | `add_body_text_columns`                                                                 | Splits stored HTML out of `wiki_pages.content`, `blog_posts.content`, `social_posts.content` into a separate plaintext `body_text` column used by FTS and notification previews.                                                              |
| **V153**  | `dsr_requests`                                                                          | Sprint 7-A scaffold — `dsr_requests(tenant_id, subject_user_id, type, status, requested_at, completed_at)` for GDPR/DPDP export and erasure requests; row-level policy mirrors `audit_logs`.                                                  |
| **V154**  | `onboarding_templates`                                                                  | Sprint 7 — `onboarding_templates`, `onboarding_template_tasks`, `employee_onboarding_runs`; replaces hard-coded NEW_HIRE checklists.                                                                                                          |

**Next migration**: V155

---

## Configuration (application.yml)

### Database

- PostgreSQL 14+ (Neon cloud dev, managed Postgres prod)
- HikariCP: 10 max (dev), 20 max (prod)
- Slow query threshold: 200ms

### Profiles

| Profile | CSRF     | Secure Cookies | Rate Limiting | SQL Logging |
|---------|----------|----------------|---------------|-------------|
| `dev`   | Disabled | Disabled       | In-memory     | Enabled     |
| `prod`  | Enabled  | Enabled        | Redis-backed  | Disabled    |

### External Integrations

- **Mail**: Gmail SMTP (port 587, STARTTLS)
- **SMS**: Twilio (mock mode in dev)
- **Job Boards**: Naukri, Indeed, LinkedIn APIs
- **AI**: Groq free tier (llama-3.1-8b-instant) for ATS resume parsing
- **Google**: OAuth2, Calendar, Meet

---

## Test Structure (104 files)

| Category           | Count | Focus                                           |
|--------------------|-------|-------------------------------------------------|
| Security tests     | 12    | JWT, MFA, RBAC, tenant isolation, rate limiting |
| Integration tests  | 21+   | Controller-to-service flows                     |
| Unit/API tests     | 30+   | Controller unit tests                           |
| Architecture tests | 2     | Layer dependency rules (ArchUnit)               |
| Config tests       | 3     | SecurityConfig, CacheConfig, RateLimitConfig    |

**Test Utilities**: TestSecurityConfig, TestCacheConfig, MockMvc, @SpringBootTest

---

## Maven Dependencies (Key)

| Category      | Libraries                                                     |
|---------------|---------------------------------------------------------------|
| Core          | Spring Boot 3.4.1, Spring Security 6.x, Spring Data JPA       |
| Database      | PostgreSQL driver, Flyway, HikariCP                           |
| Auth          | JJWT 0.12.6, Spring OAuth2 Jose                               |
| Messaging     | Spring Kafka                                                  |
| Cache         | Spring Data Redis (Lettuce)                                   |
| Rate Limiting | Bucket4j 8.7                                                  |
| Files         | MinIO 8.6, Apache POI 5.3, OpenPDF 2.0, Tika 3.2, Commons CSV |
| APIs          | Google API Client 2.2, Twilio 10.1                            |
| Observability | Micrometer Prometheus, Logstash Logback 7.4                   |
| Code Gen      | Lombok 1.18.36, MapStruct 1.6.3                               |
| Docs          | SpringDoc OpenAPI 2.7                                         |
| Testing       | ArchUnit 1.2.1, JaCoCo 0.8.13 (min 80% coverage)              |
