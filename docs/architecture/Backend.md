# NU-AURA Backend — Deep Architecture Reference

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Overview

Modular monolith built with Spring Boot 3.4.1 on Java 17. Clean layered architecture: `api/` → `application/` → `domain/` → `infrastructure/`. 71 modules, 139 controllers, 188 services, 304 entities, 254 repositories.

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

admin, analytics, announcement, asset, attendance, audit, auth, benefits, budget, calendar, common, compensation, compliance, contract, customfield, dashboard, dataimport, document, employee, engagement, esignature, exit, expense, featureflag, helpdesk, home, integration, knowledge, leave, letter, lms, loan, meeting, migration, mobile, monitoring, notification, onboarding, organization, overtime, payment, payroll, performance, platform, preboarding, probation, project, psa, publicapi, recognition, recruitment, referral, report, resourcemanagement, selfservice, shift, statutory, survey, tax, timetracking, training, travel, user, wall, webhook, workflow, wellness

---

## Controllers by Module

| Module | Controllers | Key Endpoints |
|--------|------------|---------------|
| auth | AuthController, MfaController | POST /api/v1/auth/login, /google, /mfa-login, /refresh |
| employee | EmployeeController | CRUD /api/v1/employees, /hierarchy, /subordinates |
| leave | LeaveRequestController, LeaveBalanceController | CRUD /api/v1/leaves, /balance, /approve, /reject |
| attendance | AttendanceController, MobileAttendanceController, HolidayController, CompOffController | /api/v1/attendance, /holidays, /comp-off |
| payroll | PayrollController, PayrollStatutoryController | /api/v1/payroll, /payslips, /statutory |
| recruitment | RecruitmentController, JobBoardController, ApplicantController, AIRecruitmentController | /api/v1/recruitment, /job-boards, /applicants |
| performance | PerformanceRevolutionController, Feedback360Controller, OkrController | /api/v1/performance, /feedback360, /okr |
| user | UserController, RoleController, PermissionController | /api/v1/users, /roles, /permissions |
| knowledge | WikiSpaceController, WikiPageController, BlogPostController, BlogCategoryController, TemplateController | /api/v1/wiki, /blogs, /templates |
| notification | NotificationController, MultiChannelNotificationController, SmsNotificationController | /api/v1/notifications, /sms |
| mobile | MobileApprovalController, MobileLeaveController, MobileDashboardController, MobileNotificationController, MobileSyncController | /api/v1/mobile/* |
| analytics | AnalyticsController, AdvancedAnalyticsController, OrganizationHealthController, ScheduledReportController | /api/v1/analytics, /reports |
| wall | WallPostController, AnnouncementController | /api/v1/wall, /announcements |
| project | ProjectController, TaskController | /api/v1/projects, /tasks |
| expense | ExpenseController | /api/v1/expenses |
| asset | AssetController | /api/v1/assets |
| contract | ContractController | /api/v1/contracts |
| document | DocumentController | /api/v1/documents |
| training | TrainingController | /api/v1/training |
| wellness | WellnessController | /api/v1/wellness |

**REST Convention**: `/api/v1/{module}/{resource}` with standard CRUD + custom actions.

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
- **DataScopeService**: JPA Specifications filter data by scope (GLOBAL → no filter, LOCATION → officeLocationId, DEPARTMENT → departmentId, TEAM → teamId, SELF → createdBy)
- **Authorization Coverage**: 98% (1,264 of 1,292 endpoints protected)

### Rate Limiting (Bucket4j)
| Endpoint Pattern | Limit | Key |
|-----------------|-------|-----|
| /api/v1/auth/** | 5/min | IP address |
| /api/v1/wall/** | 30/min | User:Tenant |
| /api/v1/*/export, *.csv, *.pdf | 5/5min | User:Tenant |
| /api/v1/webhooks/** | 50/min | IP address |
| /api/** (default) | 100/min | User:Tenant |

---

## Kafka Event System

### Topics
| Topic | Consumer | Purpose |
|-------|----------|---------|
| `nu-aura.approvals` | ApprovalEventConsumer | Workflow state transitions |
| `nu-aura.notifications` | NotificationEventConsumer | Email, SMS, in-app delivery |
| `nu-aura.audit` | AuditEventConsumer | Audit trail persistence |
| `nu-aura.employee-lifecycle` | EmployeeLifecycleConsumer | Onboarding, transfers, terminations |
| `*.dlt` | DeadLetterHandler | Failed event recovery |

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

| Job | Schedule | Purpose |
|-----|----------|---------|
| WorkflowEscalationScheduler | Hourly | Escalate pending approvals, send reminders |
| EmailSchedulerService | Every 5 min | Batch-send queued emails |
| ScheduledReportExecutionJob | Configurable | Execute scheduled reports |
| ContractReminderService | Daily | Contract renewal/expiration reminders |
| JobBoardIntegrationService | Daily | Sync job postings to Naukri, LinkedIn, Indeed |
| WebhookDeliveryService | Every 10 min | Retry failed webhook deliveries |
| AutoRegularizationScheduler | Monthly | Auto-regularize attendance |
| ScheduledNotificationService | Every 15 min | Process notification queue |
| LeaveAccrualService | Monthly (1st) | Accrue monthly leave balance |
| PayrollScheduledService | Monthly | Generate/finalize payroll runs |

All scheduled jobs use `TenantAwareAsyncTask` for tenant context propagation.

---

## Entity Design Patterns

### Base Entity Fields (All 304 entities)
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

**Attendance**: AttendanceRecord, AttendanceTimeEntry, Holiday, OfficeLocation, CompOffRequest, ShiftSwap

**Leave**: LeaveRequest, LeaveType, LeaveBalance, LeavePolicy

**Performance**: PerformanceReview, ReviewCycle, Feedback, OKR, KeyResult, PIP, Feedback360

**Recruitment**: JobPosting, Applicant, Interview, OfferLetter, JobBoard, Pipeline

**Payroll**: Payslip, SalaryStructure, SalaryComponent, SalaryRevision, LeaveEncashment, GlobalPayrollRun

**Benefits**: BenefitPlan, BenefitEnrollment, BenefitClaim, FlexBenefitAllocation

**Workflow**: ApprovalInstance, ApprovalTask, WorkflowDefinition, WorkflowStep

**Knowledge/Fluence**: WikiSpace, WikiPage, BlogPost, BlogCategory, DocumentTemplate

**Social/Wall**: WallPost, PostComment, PostReaction, PollOption, PollVote, Announcement, Recognition

---

## Exception Handling

### Custom Exceptions
| Exception | HTTP Status | Use Case |
|-----------|-------------|----------|
| AuthenticationException | 401 | Invalid credentials/MFA |
| UnauthorizedException | 403 | Missing permissions |
| ResourceNotFoundException | 404 | Entity not found |
| DuplicateResourceException | 409 | Unique constraint violated |
| ValidationException | 400 | Input validation failed |
| BusinessException | 500 | Business logic violation |

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

## Flyway Migrations (V0–V47)

| Range | Description |
|-------|-------------|
| V0 | Core schema: tenants, users, roles, permissions, employees, leaves, attendance, payroll |
| V1–V7 | Performance reviews, exit interviews, project allocation, payroll statutory, LMS |
| V8 | Demo seed data (gated by `demo` profile) |
| V9 | Performance indexes (N+1 prevention) |
| V10 | Comp-off, shift swap, job boards |
| V11 | MFA, quiz, learning paths |
| V12–V14 | Recruitment offer workflow, app access, webhook delivery |
| V15 | Knowledge/Fluence schema (wiki, blogs, templates) |
| V16–V18 | Contract management, payment gateway, document workflow |
| V19 | Platform seed data (apps, permissions) |
| V20–V26 | Recruitment pipeline, audit backfill, Google Meet, RLS policies |
| V30 | Comprehensive demo seed data |
| V31–V33 | Dotted-line managers, failed Kafka events, knowledge indexes |
| V34 | Production hardening indexes |
| V35 | Foreign key constraints (referential integrity) |
| V36–V38 | RLS policies (complete coverage) |
| V39–V47 | Indexes, AI logging, avatar URL, wall post IDs, soft delete indexes, FK constraints |

**Next migration**: V48

---

## Configuration (application.yml)

### Database
- PostgreSQL 14+ (Neon cloud dev, managed Postgres prod)
- HikariCP: 10 max (dev), 20 max (prod)
- Slow query threshold: 200ms

### Profiles
| Profile | CSRF | Secure Cookies | Rate Limiting | SQL Logging |
|---------|------|---------------|---------------|-------------|
| `dev` | Disabled | Disabled | In-memory | Enabled |
| `prod` | Enabled | Enabled | Redis-backed | Disabled |

### External Integrations
- **Mail**: Gmail SMTP (port 587, STARTTLS)
- **SMS**: Twilio (mock mode in dev)
- **Job Boards**: Naukri, Indeed, LinkedIn APIs
- **AI**: Groq free tier (llama-3.1-8b-instant) for ATS resume parsing
- **Google**: OAuth2, Calendar, Meet

---

## Test Structure (104 files)

| Category | Count | Focus |
|----------|-------|-------|
| Security tests | 12 | JWT, MFA, RBAC, tenant isolation, rate limiting |
| Integration tests | 21+ | Controller-to-service flows |
| Unit/API tests | 30+ | Controller unit tests |
| Architecture tests | 2 | Layer dependency rules (ArchUnit) |
| Config tests | 3 | SecurityConfig, CacheConfig, RateLimitConfig |

**Test Utilities**: TestSecurityConfig, TestCacheConfig, MockMvc, @SpringBootTest

---

## Maven Dependencies (Key)

| Category | Libraries |
|----------|-----------|
| Core | Spring Boot 3.4.1, Spring Security 6.x, Spring Data JPA |
| Database | PostgreSQL driver, Flyway, HikariCP |
| Auth | JJWT 0.12.6, Spring OAuth2 Jose |
| Messaging | Spring Kafka |
| Cache | Spring Data Redis (Lettuce) |
| Rate Limiting | Bucket4j 8.7 |
| Files | MinIO 8.6, Apache POI 5.3, OpenPDF 2.0, Tika 3.2, Commons CSV |
| APIs | Google API Client 2.2, Twilio 10.1 |
| Observability | Micrometer Prometheus, Logstash Logback 7.4 |
| Code Gen | Lombok 1.18.36, MapStruct 1.6.3 |
| Docs | SpringDoc OpenAPI 2.7 |
| Testing | ArchUnit 1.2.1, JaCoCo 0.8.13 (min 80% coverage) |
