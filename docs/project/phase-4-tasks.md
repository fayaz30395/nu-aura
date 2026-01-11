# PHASE 4 — Tasks & Milestones (v2 - With Adjustments)

## Overview

This document outlines the implementation tasks organized into 6 milestones, with dependencies and size estimates. Updated with six targeted adjustments to reduce execution risk.

**Size Legend:**
- **S** = Small (straightforward, well-defined)
- **M** = Medium (moderate complexity, some integration)
- **L** = Large (complex, multiple components, significant testing)

---

## Phase 5 Start Criteria

Before implementing feature work, Phase 5 begins **only when**:

1. ✅ M1 baseline + migrations + CI are green
2. ✅ M2 authz middleware is enforcing permissions across at least 2 sample endpoints
3. ✅ Seeded permissions + default roles exist in DB
4. ✅ Bootstrap SUPER_ADMIN flow works end-to-end
5. ✅ Outbox pattern operational (can queue + process events)

---

## Milestone 1: Foundation & Technical Baselines

**Goal:** Set up project structure, build tools, database, CI, and cross-cutting technical standards.

**Exit Criteria:** "A new endpoint can be added with authorization, error format, audit logging, and tracing without inventing new patterns."

### 1A: Project Structure & Infrastructure

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M1-01 | Initialize monorepo structure | S | - | Create root with `backend/`, `frontend/`, `docs/`, `docker/`, `.github/` directories |
| M1-02 | Setup Spring Boot project | M | M1-01 | Java 21, Spring Boot 3.2, Gradle, base dependencies |
| M1-03 | Setup Vite React project | M | M1-01 | Vite 5, React 18, TypeScript 5, TailwindCSS, base structure |
| M1-04 | Configure Docker Compose | M | M1-01 | PostgreSQL 15, Redis 7, network configuration, health checks |
| M1-05 | Setup Flyway migrations | S | M1-02 | Migration structure, naming conventions, baseline config |
| M1-06 | Create V1-V8 migration scripts | L | M1-05 | All DDL from Phase 3 design |
| M1-07 | Configure Spring profiles | S | M1-02 | local, dev, prod profiles with appropriate configs |
| M1-08 | Configure Redis connection | S | M1-02, M1-04 | Spring Data Redis, connection pooling, health indicator |

### 1B: Cross-Cutting Technical Baselines

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M1-09 | Define API standards document | S | M1-02 | REST conventions, URL patterns, pagination contract, idempotency keys |
| M1-10 | Setup structured logging (Logback + JSON) | M | M1-02 | JSON format, MDC for traceId/requestId, log levels |
| M1-11 | Implement request context filter | M | M1-10 | RequestContext thread-local, request ID generation/propagation |
| M1-12 | Create base exception classes | S | M1-02 | BusinessRuleException, ValidationException, ResourceNotFoundException |
| M1-13 | Implement Problem+JSON handler | M | M1-12 | GlobalExceptionHandler with RFC 7807 format, error codes |
| M1-14 | Setup OpenAPI/Swagger | M | M1-02 | springdoc-openapi, API docs, schema generation |
| M1-15 | Configure CORS | S | M1-02 | CORS filter with configurable origins per profile |
| M1-16 | Configure security headers | S | M1-02 | X-Content-Type-Options, X-Frame-Options, CSP placeholder |
| M1-17 | Setup health endpoints | S | M1-02, M1-04, M1-08 | /health, /health/ready, /health/live with DB + Redis checks |
| M1-18 | Rate limiting baseline | M | M1-08 | Redis-based rate limiter, configurable per-endpoint |

### 1C: CI/CD Pipeline

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M1-19 | Setup GitHub Actions - Backend | M | M1-02 | Build, test, lint (Checkstyle), container build |
| M1-20 | Setup GitHub Actions - Frontend | M | M1-03 | Build, test, lint (ESLint), type check |
| M1-21 | Setup pre-commit hooks | S | M1-01 | Husky + lint-staged for formatting enforcement |

### 1D: Frontend Foundation

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M1-22 | Setup frontend routing | M | M1-03 | React Router v6, protected routes placeholder, layout structure |
| M1-23 | Generate typed API client | M | M1-14, M1-03 | openapi-typescript-codegen or similar from OpenAPI spec |
| M1-24 | Configure frontend API interceptors | M | M1-23 | Request/response interceptors, error handling, auth header injection |
| M1-25 | Setup frontend state management | M | M1-03 | Zustand for global state, React Query for server state |
| M1-26 | Create UI component library base | M | M1-03 | Button, Input, Modal, Table, Card, Alert base components |
| M1-27 | Setup Storybook | M | M1-26 | Component documentation and visual testing |

**Milestone 1 Deliverables:**
- Working local development environment (docker-compose up)
- Database with all tables created
- Backend accepting requests with health endpoints
- Frontend loading with routing and typed API client
- CI pipeline running on push/PR
- Technical standards documented and enforced

---

## Milestone 2: Authentication, RBAC & Outbox Core

**Goal:** Implement Google SSO, JWT handling, complete RBAC policy engine, bootstrap admin flow, and outbox pattern.

**Exit Criteria:** "Authorization middleware enforces permissions on sample endpoints. Bootstrap SUPER_ADMIN works. Outbox can queue and process events."

### 2A: RBAC Foundation (Hard Gate)

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M2-01 | Create Permission entity & repository | S | M1-06 | JPA entity, Module/Action/Scope enums, repository |
| M2-02 | Create Role entity & repository | S | M1-06 | JPA entity with permission M:N relationship |
| M2-03 | Create User entity & repository | S | M1-06 | JPA entity with role M:N relationship, google_sub |
| M2-04 | Seed permissions migration (V9) | M | M2-01 | Generate all valid (module, action, scope) combinations |
| M2-05 | Seed default roles migration (V10) | M | M2-02, M2-04 | SUPER_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE with permissions |
| M2-06 | **Implement AuthorizationService (HARD GATE)** | L | M2-01, M2-02 | Policy evaluation, scope resolution, permission merging |
| M2-07 | Implement permission caching | M | M2-06, M1-08 | Redis cache for effective permissions, invalidation |
| M2-08 | Create @RequiresPermission annotation | M | M2-06 | Custom annotation: module, action, minScope |
| M2-09 | Implement authorization aspect/filter | M | M2-08 | AOP/filter to enforce permissions before controller |
| M2-10 | Test authz on 2 sample endpoints | M | M2-09 | Verify enforcement works before proceeding |

### 2B: Authentication

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M2-11 | Implement Google OIDC verification | M | M1-02 | GoogleAuthService with ID token validation |
| M2-12 | Implement domain allowlist check | S | M2-11 | Validate `hd` claim against config, reject invalid domains |
| M2-13 | Implement JWT generation | M | M1-02 | JwtService with access (15m) + refresh (7d) tokens |
| M2-14 | Create RefreshToken entity & repository | S | M1-06 | Hashed token storage, expiry, device info |
| M2-15 | Implement JWT validation filter | M | M2-13 | JwtAuthenticationFilter, populate SecurityContext |
| M2-16 | Implement AuthController | M | M2-11, M2-13 | `/auth/google`, `/auth/refresh`, `/auth/logout` |

### 2C: Bootstrap & Admin Protection

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M2-17 | Implement bootstrap SUPER_ADMIN flow | M | M2-03, M2-05 | CLI/migration to create first admin from config email |
| M2-18 | Implement last SUPER_ADMIN protection | S | M2-03 | Block removal/demotion of last active SUPER_ADMIN |
| M2-19 | Implement RoleController | M | M2-02, M2-09 | CRUD roles, permission assignment (SUPER_ADMIN only for create) |
| M2-20 | Implement UserRoleController | M | M2-03, M2-09 | Assign/remove roles, effective permissions view |
| M2-21 | Implement effective permissions preview | M | M2-06, M2-20 | Show merged permissions with source roles |

### 2D: Outbox Pattern (Foundation)

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M2-22 | Create Outbox entity & repository | S | M1-06 | JPA entity with status, retry_count, correlation_id |
| M2-23 | Implement OutboxPublisher | M | M2-22 | Service to write events to outbox within transaction |
| M2-24 | Implement OutboxProcessor (base) | M | M2-22 | Scheduled job to poll and process pending events |
| M2-25 | Implement retry policy | M | M2-24 | Exponential backoff, max retries, dead-letter status |
| M2-26 | Test outbox with dummy event | S | M2-24 | Verify queue → process → complete flow |

### 2E: Audit Logging

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M2-27 | Implement AuditService | M | M1-06, M1-11 | Async audit logging with full context |
| M2-28 | Audit auth events | S | M2-16, M2-27 | LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, TOKEN_REFRESH |
| M2-29 | Audit IAM events | S | M2-19, M2-20, M2-27 | ROLE_CREATED, ROLE_ASSIGNED, ROLE_ASSIGN_DENIED |

### 2F: Frontend Auth

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M2-30 | Frontend: Google Sign-In button | M | M1-22 | Google Identity Services integration |
| M2-31 | Frontend: Auth context & hooks | M | M1-25, M2-30 | useAuth hook, token storage (memory + httpOnly refresh) |
| M2-32 | Frontend: Token refresh logic | M | M2-31 | Automatic refresh before expiry, retry on 401 |
| M2-33 | Frontend: Protected route wrapper | M | M2-31 | Route guard based on auth state + required permissions |
| M2-34 | Frontend: Role Management UI | L | M2-31, M1-26 | List roles, create/edit with permission matrix |
| M2-35 | Frontend: User Role Assignment UI | M | M2-34 | Assign roles to users, view effective permissions |

**Milestone 2 Deliverables:**
- Google SSO login working end-to-end
- JWT auth with refresh tokens
- RBAC policy engine enforcing permissions
- Bootstrap SUPER_ADMIN flow operational
- Outbox pattern ready for use
- Role management UI functional
- All auth/IAM actions audited

---

## Milestone 3: Organization & Employee Management

**Goal:** Implement org structure and complete employee lifecycle.

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M3-01 | Create Location entity & repository | S | M1-06 | JPA entity, timezone, working_days |
| M3-02 | Create Department entity & repository | S | M1-06 | JPA entity with parent/location refs, soft delete |
| M3-03 | Create Designation entity & repository | S | M1-06 | JPA entity with level/band |
| M3-04 | Implement LocationController | M | M3-01, M2-09 | CRUD with authorization |
| M3-05 | Implement DepartmentController | M | M3-02, M2-09 | CRUD with soft delete, hierarchy validation |
| M3-06 | Implement DesignationController | M | M3-03, M2-09 | CRUD with level handling |
| M3-07 | Create Employee entity & repository | M | M1-06 | JPA entity with all relationships, status lifecycle |
| M3-08 | Create EmployeeBankDetails entity | S | M1-06 | Separate confidential table, encrypted fields |
| M3-09 | Create EmployeeTaxDetails entity | S | M1-06 | Separate confidential table |
| M3-10 | Create EmployeeSalary entity | S | M1-06 | Effective date versioning |
| M3-11 | Implement scope-filtered queries | M | M3-07, M2-06 | Repository methods with SELF/TEAM/DEPT/ORG filtering |
| M3-12 | Implement EmployeeService | L | M3-07, M2-06 | Business logic, validation, status lifecycle |
| M3-13 | Implement manager loop prevention | S | M3-12 | Validate no cycles in manager hierarchy |
| M3-14 | Implement EmployeeController | L | M3-12, M2-09 | CRUD, self-update (limited fields), team view |
| M3-15 | Implement Employee directory endpoint | M | M3-14 | Public fields only, search/filter, excludes INACTIVE |
| M3-16 | Implement confidential field access | M | M3-08, M3-09, M3-10, M2-06 | Field-level policies per role |
| M3-17 | Implement CSV import service | L | M3-12 | Validation, dry-run mode, upsert by code/email |
| M3-18 | Implement CSV import controller | M | M3-17 | Upload, validate, execute endpoints |
| M3-19 | Link User creation with Employee | M | M3-12, M2-03, M2-23 | Auto-create User, assign EMPLOYEE role, queue onboarding email |
| M3-20 | Audit employee events | S | M3-14, M2-27 | EMPLOYEE_CREATED, UPDATED, STATUS_CHANGED, BULK_IMPORT |
| M3-21 | Frontend: Org Structure UI | M | M2-31 | Locations, Departments, Designations CRUD |
| M3-22 | Frontend: Employee List UI | L | M2-31, M1-26 | Table with filters, pagination, scope-aware data |
| M3-23 | Frontend: Employee Profile UI | L | M3-22 | View/edit profile, confidential field handling |
| M3-24 | Frontend: Employee Create/Edit Form | L | M3-22 | Full form with validation, manager selection |
| M3-25 | Frontend: My Team UI (Manager) | M | M3-22 | Direct reports view |
| M3-26 | Frontend: Employee Directory | M | M3-22 | Search, public info only |
| M3-27 | Frontend: CSV Import UI | M | M3-24 | Upload, preview errors, dry-run, execute |

**Milestone 3 Deliverables:**
- Organization structure fully manageable
- Employee CRUD with full lifecycle
- CSV bulk import with validation
- Self-service profile updates (limited fields)
- Manager team view
- All actions properly scoped and audited

---

## Milestone 4: Leave & Attendance Management

**Goal:** Implement leave policies, applications, approvals, and attendance tracking.

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M4-01 | Create LeaveType entity & repository | S | M1-06 | Accrual config, carryover, balance requirements |
| M4-02 | Create LeaveBalance entity & repository | S | M1-06 | Year/type/employee, opening/accrued/used/pending |
| M4-03 | Create LeaveRequest entity & repository | S | M1-06 | Status workflow, calendar_event_id |
| M4-04 | Seed leave types migration (V11) | S | M4-01 | CL, SL, EL, WFH, LOP with configs |
| M4-05 | Implement LeaveBalanceService | M | M4-02 | Calculate available, deduct, adjust, pro-rate on DOJ |
| M4-06 | Implement leave day calculation | M | M4-05 | Exclude holidays/weekends based on leave type config |
| M4-07 | Implement LeaveRequestService | L | M4-03, M4-05, M4-06, M2-23 | Apply, approve, reject, cancel + queue notifications |
| M4-08 | Implement auto-approve rule | S | M4-07 | CL ≤1 day, no conflict → auto-approve |
| M4-09 | Implement LeaveController | L | M4-07, M2-09 | All endpoints with scope (my, team, org) |
| M4-10 | Create Holiday entity & repository | S | M1-06 | Date, type, location |
| M4-11 | Implement HolidayService | S | M4-10 | CRUD, prevent duplicate per location+date |
| M4-12 | Implement HolidayController | M | M4-11, M2-09 | CRUD with location filter |
| M4-13 | Audit leave events | S | M4-09, M2-27 | LEAVE_APPLIED, APPROVED, REJECTED, CANCELLED |
| M4-14 | Create Shift entity & repository | S | M1-06 | Start/end time, grace minutes |
| M4-15 | Create Attendance entity & repository | S | M1-06 | Date, check-in/out, status, is_late |
| M4-16 | Create Regularization entity & repository | S | M1-06 | Type, status, approval workflow |
| M4-17 | Implement AttendanceService | M | M4-15, M4-14 | Check-in/out, late detection, timezone handling |
| M4-18 | Implement RegularizationService | M | M4-16, M4-17, M2-23 | Submit, approve, update attendance + queue notifications |
| M4-19 | Implement regularization window policy | S | M4-18 | 7-day submission limit (configurable) |
| M4-20 | Implement AttendanceController | L | M4-17, M4-18, M2-09 | All endpoints with scope |
| M4-21 | Implement team attendance summary | M | M4-20 | Manager view: present/absent/leave/WFH counts |
| M4-22 | Audit attendance events | S | M4-20, M2-27 | CHECKIN, CHECKOUT, REGULARIZATION_* |
| M4-23 | Frontend: Leave Types Admin UI | M | M2-31 | Configure leave policies |
| M4-24 | Frontend: My Leave Balance UI | M | M2-31 | View own balances per type |
| M4-25 | Frontend: Apply Leave UI | M | M4-24 | Leave application form with date picker |
| M4-26 | Frontend: My Leave Requests UI | M | M4-25 | View own requests, cancel pending |
| M4-27 | Frontend: Team Leave Approvals UI | M | M4-26 | Manager approval interface |
| M4-28 | Frontend: Holiday Calendar UI | M | M2-31 | View/manage holidays by location |
| M4-29 | Frontend: My Attendance UI | M | M2-31 | Calendar view, check-in/out buttons |
| M4-30 | Frontend: Regularization UI | M | M4-29 | Submit, view own, manager approve |
| M4-31 | Frontend: Team Attendance UI | M | M4-29 | Manager team summary view |

**Milestone 4 Deliverables:**
- Leave types configurable with accrual rules
- Leave application/approval workflow working
- Auto-approve rules functional
- Holiday calendar per location
- Manual attendance with check-in/out
- Regularization workflow complete
- All scope-based access enforced

---

## Milestone 5: Google Integrations & Notifications

**Goal:** Implement Google Drive/Gmail/Calendar integrations and notification system.

### 5A: Google Connectivity (Isolated Risk)

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M5-01 | Implement GoogleCredentialsManager | M | M1-02 | Service account loading, DWD credential building |
| M5-02 | Implement secrets management pattern | M | M5-01 | Env-based + placeholder for vault integration |
| M5-03 | Implement GoogleDriveService (basic) | M | M5-01 | Test connection, create folder, basic upload |
| M5-04 | Implement GoogleGmailService (basic) | M | M5-01 | Test connection, send simple email |
| M5-05 | Implement GoogleCalendarService (basic) | M | M5-01 | Test connection, create/delete test event |
| M5-06 | Implement IntegrationController | M | M5-03, M5-04, M5-05 | Status endpoint, test connection per service |
| M5-07 | Implement circuit breaker | M | M5-06 | Resilience4j for Google API failures |
| M5-08 | Frontend: Integration Status UI | M | M2-31 | Admin view of Google integration health |

### 5B: Document Management

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M5-09 | Create DocumentType entity & repository | S | M1-06 | Code, name, is_confidential, allow_self_upload |
| M5-10 | Create Document entity & repository | S | M1-06 | Drive refs, version, classification |
| M5-11 | Seed document types migration (V12) | S | M5-09 | Offer letter, ID proof, salary slip, etc. |
| M5-12 | Implement GoogleDriveService (full) | L | M5-03 | Resumable upload, folder hierarchy, download |
| M5-13 | Implement DocumentService | L | M5-10, M5-12, M2-06 | Upload with RBAC, versioning, access control |
| M5-14 | Implement MIME/extension validation | S | M5-13 | Allowlist, size limits |
| M5-15 | Implement document access proxy | M | M5-13 | Stream through backend, time-limited |
| M5-16 | Implement DocumentController | L | M5-13, M2-09 | Upload, download, list with scope |
| M5-17 | Audit document events | S | M5-16, M2-27 | DOC_UPLOAD, VIEW, DOWNLOAD, ACCESS_DENIED |
| M5-18 | Frontend: Document Types Admin UI | M | M2-31 | Configure doc types |
| M5-19 | Frontend: Employee Documents UI | L | M3-23 | Upload, view, download for employee |
| M5-20 | Frontend: Self-Service Document Upload | M | M5-19 | Upload own allowed doc types |

### 5C: Email & Notifications

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M5-21 | Create EmailTemplate entity & repository | S | M1-06 | Code, version, subject, body_html, body_text |
| M5-22 | Seed email templates migration (V13) | M | M5-21 | Onboarding, leave approval/rejection, regularization |
| M5-23 | Implement EmailTemplateService | M | M5-21 | Load template, render variables, sanitize |
| M5-24 | Implement GoogleGmailService (full) | L | M5-04, M5-23 | Send templated email via DWD |
| M5-25 | Create EmailLog entity & repository | S | M1-06 | Track sent emails, status, gmail_message_id |
| M5-26 | Add EMAIL_SEND handler to OutboxProcessor | M | M2-24, M5-24 | Process queued emails |
| M5-27 | Create Notification entity & repository | S | M1-06 | In-app notifications, is_read |
| M5-28 | Implement NotificationService | M | M5-27, M2-23 | Create in-app notification + queue email |
| M5-29 | Implement NotificationController | M | M5-28, M2-09 | List unread, mark read, count |
| M5-30 | Wire notifications to leave workflow | M | M4-07, M5-28 | Notify on apply/approve/reject |
| M5-31 | Wire notifications to regularization | M | M4-18, M5-28 | Notify on submit/approve/reject |
| M5-32 | Wire onboarding email | M | M3-19, M5-28 | Send invite when employee created |
| M5-33 | Frontend: Notification Bell & Panel | M | M2-31 | Header bell, dropdown list, mark read |

### 5D: Calendar Integration

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M5-34 | Implement GoogleCalendarService (full) | L | M5-05 | Create, update, cancel events with idempotency |
| M5-35 | Create CalendarEvent entity & repository | S | M1-06 | Track event_id, related entity |
| M5-36 | Implement calendar event idempotency | M | M5-34 | Deterministic event IDs from entity keys |
| M5-37 | Add CALENDAR_EVENT handler to OutboxProcessor | M | M2-24, M5-34 | Process queued calendar operations |
| M5-38 | Wire calendar to leave approval | M | M4-07, M5-37 | Create event on approval, cancel on rejection |
| M5-39 | Audit integration events | S | M5-26, M5-37, M2-27 | EMAIL_SENT, EMAIL_FAILED, CAL_EVENT_* |

**Milestone 5 Deliverables:**
- Google Drive document storage working
- RBAC-controlled document access (no raw URLs)
- Email notifications via Gmail API
- Calendar events for approved leave
- In-app notification system
- Integration health monitoring
- Circuit breaker protecting against API failures

---

## Milestone 6: Announcements, Reports & Production Polish

**Goal:** Complete remaining features, reports, and production readiness.

### 6A: Announcements

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M6-01 | Create Announcement entity & repository | S | M1-06 | Title, content, target_scope, publish_at |
| M6-02 | Create AnnouncementReadStatus entity | S | M1-06 | Track read per user per announcement |
| M6-03 | Implement AnnouncementService | M | M6-01, M6-02, M2-06 | Create, publish, scope filtering |
| M6-04 | Implement AnnouncementController | M | M6-03, M2-09 | CRUD, list by scope, mark read |
| M6-05 | Wire announcement notifications | M | M6-03, M5-28 | Notify on publish |
| M6-06 | Audit announcement events | S | M6-04, M2-27 | ANNOUNCEMENT_CREATED, PUBLISHED |
| M6-07 | Frontend: Announcements List UI | M | M2-31 | View announcements, mark read |
| M6-08 | Frontend: Create Announcement UI | M | M6-07 | Admin create with scope selection, schedule |

### 6B: Reports

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M6-09 | Implement AuditLogController | M | M2-27, M2-09 | List, filter by action/actor/target/date |
| M6-10 | Implement audit log export (CSV) | M | M6-09 | Async export for large datasets |
| M6-11 | Implement Employee Directory Report | M | M3-14, M2-09 | CSV export with column selection, filters |
| M6-12 | Implement Leave Balance Report | M | M4-05, M2-09 | View/export by department |
| M6-13 | Implement Attendance Summary Report | M | M4-17, M2-09 | Date range, department filter |
| M6-14 | Implement Onboarding Status Report | M | M3-14, M5-13 | Pending employees, missing docs |
| M6-15 | Implement async report generation | M | M6-10 | Background job for large exports |
| M6-16 | Implement report download with expiry | M | M6-15 | 24-hour signed URLs, cleanup job |
| M6-17 | Implement ReportController | M | M6-11 to M6-16, M2-09 | All report endpoints |
| M6-18 | Frontend: Audit Log Viewer UI | L | M2-31 | Filterable log viewer, export |
| M6-19 | Frontend: Reports Dashboard UI | L | M2-31 | Generate/download reports |

### 6C: Settings & Scheduled Jobs

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M6-20 | Implement OrgSettingsService | S | M1-06 | Key-value settings store |
| M6-21 | Implement OrgSettingsController | M | M6-20, M2-09 | Get/update org settings |
| M6-22 | Implement ShiftController | M | M4-14, M2-09 | CRUD shifts |
| M6-23 | Implement leave accrual job | M | M4-05 | Monthly scheduled job for accrual |
| M6-24 | Implement FY carryover job | M | M4-05 | Annual lapse/carryover at FY end |
| M6-25 | Frontend: Org Settings UI | M | M2-31 | Configure org-level settings |

### 6D: Dashboard & Polish

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M6-26 | Frontend: Dashboard (Home) | L | M2-31 | Summary widgets, quick actions, announcements |
| M6-27 | Input sanitization review | M | All | XSS, injection prevention audit |
| M6-28 | Performance optimization | M | All | Query optimization, N+1 fixes, caching |
| M6-29 | Accessibility review | M | All Frontend | WCAG 2.1 AA compliance check |

### 6E: Testing & Documentation

| ID | Task | Size | Dependencies | Description |
|----|------|------|--------------|-------------|
| M6-30 | Write unit tests - services | L | All | Target 70% coverage on services |
| M6-31 | Write integration tests - APIs | L | All | Critical path API coverage |
| M6-32 | Write security tests | M | M2-* | Auth, authorization, access denial scenarios |
| M6-33 | Create seed data script | M | All | Demo data for testing/demos |
| M6-34 | Write deployment documentation | M | All | Production deployment guide |
| M6-35 | Final security review | M | All | OWASP checklist verification |

**Milestone 6 Deliverables:**
- Announcements fully functional
- All reports available with export
- Audit log viewer with export
- Scheduled jobs for accrual/carryover
- Dashboard with summary widgets
- Security hardening complete
- Test coverage targets met
- Production-ready documentation

---

## Dependency Graph

```
M1 (Foundation + Baselines + CI)
    │
    ▼
M2 (Auth + RBAC Policy Engine + Outbox)  ◄── HARD GATE
    │
    ├──────────────────┬──────────────────┐
    ▼                  ▼                  ▼
M3 (Org/Employee)   M4 (Leave/ATT)    M5-A (Google Connectivity)
    │                  │                  │
    └──────────────────┴──────────────────┤
                                          ▼
                              M5-B/C/D (Docs, Email, Calendar)
                                          │
                                          ▼
                              M6 (Announcements, Reports, Polish)
```

---

## Task Summary by Milestone

| Milestone | Tasks | S | M | L |
|-----------|-------|---|---|---|
| M1: Foundation & Baselines | 27 | 8 | 17 | 2 |
| M2: Auth, RBAC & Outbox | 35 | 8 | 21 | 6 |
| M3: Org & Employee | 27 | 7 | 13 | 7 |
| M4: Leave & Attendance | 31 | 9 | 16 | 6 |
| M5: Google & Notifications | 39 | 9 | 20 | 10 |
| M6: Reports & Polish | 35 | 4 | 21 | 10 |
| **Total** | **194** | **45** | **108** | **41** |

---

## Critical Path

1. **M1-02** → **M1-06**: Database schema blocks all entities
2. **M1-14** → **M1-23**: OpenAPI → typed client enables parallel frontend
3. **M2-06** → **M2-09**: AuthzService is HARD GATE before any protected endpoints
4. **M2-22** → **M2-26**: Outbox pattern needed for notifications/email/calendar
5. **M3-07** → **M3-14**: Employee entity central to all modules
6. **M5-01** → **M5-03/04/05**: Google credentials unlock all integrations

---

## Parallel Work Streams (After M2 Gate)

| Stream A (Backend) | Stream B (Backend) | Stream C (Frontend) |
|--------------------|--------------------|---------------------|
| M3: Org & Employee | M4: Leave & Attendance | M2-F: Auth UI |
| M5-A: Google Connectivity | M5-B: Documents | M3-F: Org/Employee UI |
| M5-C: Email/Notifications | M5-D: Calendar | M4-F: Leave/ATT UI |
| M6-A: Announcements | M6-B: Reports | M5-F: Docs/Notifications UI |
| M6-C: Settings/Jobs | M6-E: Tests | M6-F: Dashboard/Polish |

---

## Contract-First Frontend Workflow

To enable true parallel development:

1. **OpenAPI as source of truth** (M1-14)
2. **Generate typed API client** (M1-23) - regenerate on spec changes
3. **Mock server for frontend** - MSW (Mock Service Worker) using OpenAPI spec
4. **CI validates spec** - ensure backend matches declared contract

Frontend can proceed with mocked APIs while backend implements.

---

**Adjustments Applied:**
1. ✅ Cross-cutting technical baselines added to M1
2. ✅ RBAC Policy Engine (M2-06) is explicit HARD GATE
3. ✅ Bootstrap SUPER_ADMIN flow (M2-17) and protection (M2-18) added
4. ✅ M5 split into Connectivity (5A) vs Workflows (5B/C/D)
5. ✅ Outbox pattern moved to M2 (M2-22 to M2-26)
6. ✅ Contract-first frontend workflow documented with typed client generation

---

**Phase 4 Tasks approved. Ready to proceed to Phase 5 (Implementation).**
