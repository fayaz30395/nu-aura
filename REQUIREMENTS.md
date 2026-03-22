# NU-AURA Platform - Requirements Specification

**Version:** 1.0
**Last Updated:** March 22, 2026
**Status:** Active Development (Beta Launch Ready)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Data Model](#data-model)
7. [Security Requirements](#security-requirements)
8. [Integration Requirements](#integration-requirements)
9. [Deployment Requirements](#deployment-requirements)
10. [Future Roadmap](#future-roadmap)

---

## 1. Executive Summary

NU-AURA is an **enterprise-grade, multi-tenant SaaS platform** designed as a **bundle app system** containing four integrated sub-applications for comprehensive workforce management:

- **NU-HRMS** - Core HR Management
- **NU-Hire** - Recruitment & Onboarding
- **NU-Grow** - Performance & Learning
- **NU-Fluence** - Knowledge Management (Phase 2)

**Target Market:** Small to enterprise businesses (10-10,000 employees per tenant)
**Deployment Model:** Cloud-native SaaS with single-tenant option
**Technology Stack:** Java 21 + Spring Boot 3.4.1 (Backend) | Next.js 14 + TypeScript (Frontend)

---

## 2. Platform Overview

### 2.1 Platform Architecture

NU-AURA operates as a **unified platform** with modular sub-applications:

```
┌─────────────────────────────────────────────────┐
│            NU-AURA Platform (Single Login)      │
├─────────────┬─────────────┬─────────────┬───────┤
│   NU-HRMS   │  NU-Hire    │  NU-Grow    │ Fluence│
│  (Core HR)  │(Recruitment)│(Performance)│(Wiki)  │
└─────────────┴─────────────┴─────────────┴────────┘
│                                                   │
└──────────── Shared Services Layer ───────────────┘
  • Authentication & Authorization (RBAC)
  • Multi-Tenancy Management
  • Workflow Engine
  • Notification Service
  • File Storage (MinIO)
  • Search (Elasticsearch)
  • Event Streaming (Kafka)
```

### 2.2 Key Design Principles

1. **Single Sign-On (SSO)** - One login for all sub-apps
2. **App-Aware Navigation** - Sidebar adapts to active sub-app context
3. **Shared RBAC** - Unified permission system across all modules
4. **Event-Driven** - Kafka-based async workflows for scalability
5. **Multi-Tenant Isolation** - PostgreSQL RLS + application-level tenant filtering

---

## 3. Functional Requirements

### 3.1 NU-HRMS (Core HR Management)

#### 3.1.1 Employee Management

**FR-HRMS-001: Employee Lifecycle**
- **Create** employee records with mandatory fields (name, email, department, role, joining date)
- **Update** employee information (personal, professional, contact)
- **View** employee hierarchy (organizational chart, reporting lines)
- **Delete** (soft delete) employee records
- **Search** employees by name, email, employee code, department
- **Export** employee data to Excel/CSV

**FR-HRMS-002: Department Management**
- Create hierarchical department structures (parent-child relationships)
- Assign department managers and cost centers
- Track department headcount and budget allocation
- Support department types: Engineering, Product, Sales, HR, Finance, etc.

**FR-HRMS-003: Employee Self-Service**
- View personal profile (read-only for core fields)
- Update contact information and emergency contacts
- Access payslips, tax documents, and employment letters
- View leave balance and attendance summary
- **No permission required** - all employees can access "My Space" sidebar items

#### 3.1.2 Attendance Management

**FR-HRMS-010: Attendance Tracking**
- **Clock In/Out** via web interface with geolocation tracking
- **Biometric Integration** for on-premise attendance devices
- **Remote Work** tracking with IP-based validation
- **Overtime Calculation** automatic based on clock hours
- **Late/Early Departure** flagging with configurable grace periods

**FR-HRMS-011: Shift Management**
- Define multiple shift patterns (day, night, rotating, flexible)
- Assign employees to shifts with start/end times
- Support shift swaps with approval workflows
- Generate shift rosters for teams/departments

**FR-HRMS-012: Holiday Calendar**
- Define national, regional, optional, and restricted holidays
- Support multiple holiday calendars per location
- Auto-deduct holidays from work days in attendance reports

#### 3.1.3 Leave Management

**FR-HRMS-020: Leave Types**
- Configure leave types: Annual, Sick, Casual, Maternity, Paternity, Compensatory
- Define accrual rules (yearly, monthly, quarterly)
- Set carry-forward limits and encashment policies
- Gender-specific leave types (Maternity, Paternity)

**FR-HRMS-021: Leave Request Workflow**
- Submit leave requests with dates and reason
- Auto-calculate available balance before submission
- Route to reporting manager for approval
- Support multi-level approval chains
- Email/in-app notifications at each workflow stage

**FR-HRMS-022: Leave Accrual**
- Monthly scheduled job for accrual credit
- Pro-rata calculation for mid-year joiners
- Auto-deduction on approved leave
- Balance carry-forward at year-end per policy

#### 3.1.4 Payroll Management

**FR-HRMS-030: Payroll Components**
- Define salary components: Basic, HRA, Allowances, Deductions
- Support formula-based calculations using SpEL (Spring Expression Language)
- Dependency resolution (DAG) for component evaluation order
- Tax calculation (Income Tax, Professional Tax)

**FR-HRMS-031: Payroll Processing**
- Generate monthly payroll runs for all employees
- Support salary revisions with effective dates
- Handle arrears and one-time payments
- Generate payslips (PDF) with itemized breakdown

**FR-HRMS-032: Compliance & Reporting**
- Generate statutory reports: PF, ESI, Income Tax (Form 16)
- Support multiple tax regimes (old vs new)
- Export payroll data for accounting systems
- Maintain audit trail for all payroll changes

#### 3.1.5 Benefits Administration

**FR-HRMS-040: Benefit Plans**
- Create benefit plans: Health Insurance, Life Insurance, Retirement Plans
- Define eligibility criteria (employment type, tenure, level)
- Set enrollment periods (annual open enrollment)
- Track dependent information for family coverage

**FR-HRMS-041: Enrollment Workflow**
- Employee self-enrollment during open periods
- Manager/HR approval for plan changes
- Auto-enrollment for new hires based on eligibility
- Premium calculation and payroll deduction integration

#### 3.1.6 Asset Management

**FR-HRMS-050: IT Asset Tracking**
- Track laptops, monitors, keyboards, mobile devices
- Assign assets to employees with handover date
- Track asset condition (new, good, damaged)
- Support asset return on resignation/termination
- Generate asset utilization reports

---

### 3.2 NU-Hire (Recruitment & Onboarding)

#### 3.2.1 Recruitment Management

**FR-HIRE-001: Job Requisitions**
- Create job requisitions with position details (title, department, level, count)
- Define hiring workflow with approval stages
- Set sourcing channels: Job Boards, LinkedIn, Employee Referrals
- Track requisition status: Draft, Approved, On Hold, Closed

**FR-HIRE-002: Candidate Pipeline**
- Add candidates from multiple sources (job board API, manual upload, referrals)
- Parse resumes using Apache Tika for text extraction
- Track candidate stages: Applied → Screening → Interview → Offer → Hired/Rejected
- Bulk import candidates from Excel/CSV

**FR-HIRE-003: Interview Management**
- Schedule interviews with calendar integration (Google Calendar API)
- Auto-generate Google Meet links for virtual interviews
- Send interview invitations via email
- Collect interviewer feedback with structured forms
- Aggregate scores for hiring decision

**FR-HIRE-004: Offer Management**
- Generate offer letters from templates
- E-signature integration (DocuSign) for offer acceptance
- Track offer status: Pending, Accepted, Rejected, Expired
- Auto-convert accepted offers to onboarding tasks

#### 3.2.2 Preboarding

**FR-HIRE-010: Pre-Onboarding Portal**
- Send unique access link to candidate email upon offer acceptance
- Self-service portal for candidates to submit:
  - Personal information (address, phone, emergency contact)
  - Bank details (account number, IFSC code)
  - Tax identification (PAN, Aadhaar)
- Upload documents: ID proof, address proof, education certificates
- Digital signature on offer letter and employment contract

**FR-HIRE-011: Admin Monitoring**
- View all preboarding candidates in centralized dashboard
- Track completion status per candidate (% complete)
- Send reminder emails for pending submissions
- Mark candidate as "Onboarding Ready" when all documents received
- Cancel invitation if candidate declines offer

#### 3.2.3 Onboarding

**FR-HIRE-020: Onboarding Workflow**
- Auto-generate onboarding checklist on joining date
- Assign tasks to HR, IT, and hiring manager:
  - Create employee account (email, system access)
  - Assign laptop and peripherals
  - Schedule orientation sessions
  - Assign mentor/buddy
- Track task completion with due dates
- Send welcome email with first-day instructions

**FR-HIRE-021: Document Collection**
- Request additional documents (passport size photo, blood group certificate)
- Verify submitted documents against originals
- Store verified documents in MinIO with encryption
- Maintain document audit trail (uploaded by, verified by, date)

---

### 3.3 NU-Grow (Performance & Learning)

#### 3.3.1 Performance Reviews

**FR-GROW-001: Review Cycles**
- Create review cycles: Annual, Half-Yearly, Quarterly
- Define review templates with sections (Goals, Competencies, Feedback)
- Assign reviewers (Self, Manager, Peers, Skip-Level)
- Set review deadlines and auto-reminders

**FR-GROW-002: Self-Assessment**
- Employee completes self-assessment form
- Rate performance on goals and competencies (1-5 scale)
- Add qualitative comments for each section
- Submit for manager review

**FR-GROW-003: Manager Review**
- Manager reviews self-assessment
- Provides ratings and comments
- Conduct one-on-one review meeting
- Submit final review to HR/Skip-Level for calibration

**FR-GROW-004: 360-Degree Feedback**
- Nominate peers for feedback
- Anonymous/non-anonymous peer reviews
- Aggregate feedback scores
- Generate development plan based on feedback

#### 3.3.2 Goal Management (OKRs)

**FR-GROW-010: OKR Framework**
- Create company, department, and individual OKRs
- Define Objectives (qualitative) and Key Results (measurable)
- Align individual OKRs with team/company OKRs
- Track progress with quarterly check-ins

**FR-GROW-011: Goal Tracking**
- Update key result progress (% completion, actual vs target)
- Add status notes and blockers
- Manager reviews and provides coaching
- Auto-archive completed goals at cycle end

#### 3.3.3 Learning Management System (LMS)

**FR-GROW-020: Course Catalog**
- Create online courses with video lessons, documents, quizzes
- Categorize courses by skill, department, level
- Define prerequisites for advanced courses
- Track course enrollment and completion

**FR-GROW-021: Training Programs**
- Schedule in-person training sessions
- Send calendar invites to participants
- Track attendance and post-training assessments
- Issue certificates on course completion

**FR-GROW-022: Skill Development**
- Define skill taxonomy (technical, soft skills, domain)
- Employee self-assessment of current skill levels
- Recommend courses based on skill gaps
- Track skill progression over time

#### 3.3.4 Recognition & Rewards

**FR-GROW-030: Peer Recognition**
- Send appreciation messages to colleagues (badges: Star Performer, Team Player)
- Public recognition feed visible to team/company
- Manager can nominate employees for monthly awards
- Track recognition metrics per employee

**FR-GROW-031: Rewards Program**
- Define reward tiers (Bronze, Silver, Gold)
- Allocate reward points for achievements
- Redeem points for gift vouchers, extra leaves, merchandise
- Generate leaderboard for gamification

---

### 3.4 NU-Fluence (Knowledge Management) - Phase 2

#### 3.4.1 Wiki & Documentation

**FR-FLUENCE-001: Content Creation**
- Create wiki pages with rich text editor (Tiptap - 17 extensions)
- Support Markdown formatting, tables, code blocks
- Embed images, videos, and file attachments
- Version control for page edits with rollback capability

**FR-FLUENCE-002: Organization**
- Create wiki spaces for departments, projects, or topics
- Hierarchical page structure (parent-child pages)
- Tag pages for easy discovery
- Full-text search powered by Elasticsearch

**FR-FLUENCE-003: Collaboration**
- Comment on wiki pages for discussions
- @mention teammates for notifications
- Page watching to get updates on changes
- Collaborative editing with conflict resolution

#### 3.4.2 Blog Platform

**FR-FLUENCE-010: Company Blog**
- Publish internal blog posts (company updates, tech blogs, thought leadership)
- Support featured images and rich media
- Categorize posts by topic (Engineering, Product, Culture)
- Like, comment, and share posts

**FR-FLUENCE-011: Author Management**
- Designate blog authors and editors
- Draft → Review → Published workflow
- Schedule posts for future publishing
- Track blog analytics (views, engagement)

#### 3.4.3 Template Library

**FR-FLUENCE-020: Document Templates**
- Create reusable templates: Meeting notes, Project charters, RFCs
- Variable placeholders for auto-fill (employee name, date, project name)
- Share templates across teams
- Track template usage metrics

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-PERF-001: Response Time**
- API response time < 200ms for 95th percentile
- Page load time < 2s on 4G network
- Search results < 500ms for Elasticsearch queries

**NFR-PERF-002: Scalability**
- Support 10,000 concurrent users per tenant
- Handle 500,000 employees across all tenants
- Process 100,000 payroll records in < 5 minutes

**NFR-PERF-003: Database**
- Query optimization with indexed columns (tenant_id, employee_id, status)
- Connection pooling: HikariCP with max 50 connections
- Read replicas for reporting queries

### 4.2 Reliability

**NFR-REL-001: Availability**
- 99.9% uptime SLA (< 8.76 hours downtime/year)
- Automated health checks every 30 seconds
- Auto-restart on failure with exponential backoff

**NFR-REL-002: Data Durability**
- PostgreSQL automated backups (daily full + hourly incremental)
- Point-in-time recovery (PITR) for last 30 days
- Multi-region replication for disaster recovery

**NFR-REL-003: Monitoring**
- Prometheus metrics collection (API latency, error rates, resource usage)
- Grafana dashboards for real-time monitoring
- AlertManager for critical alerts (email, Slack)

### 4.3 Security

**NFR-SEC-001: Authentication**
- JWT-based stateless authentication
- Token expiry: 24 hours (refresh token valid for 30 days)
- Support Google OAuth 2.0 for SSO
- Multi-Factor Authentication (MFA) via TOTP

**NFR-SEC-002: Authorization (RBAC)**
- Role-based access control with 500+ granular permissions
- Permission format: `MODULE:ACTION` (e.g., `EMPLOYEE:READ`, `PAYROLL:WRITE`)
- SuperAdmin role bypasses all permission checks (full tenant access)
- Frontend UI elements hidden based on user permissions

**NFR-SEC-003: Data Encryption**
- TLS 1.3 for data in transit
- AES-256 encryption for sensitive fields (bank account, tax ID)
- MinIO server-side encryption for file storage
- Password hashing: BCrypt with 12 rounds

**NFR-SEC-004: Multi-Tenancy Isolation**
- PostgreSQL Row-Level Security (RLS) policies on all tenant tables
- Application-level tenant filtering in all queries
- No cross-tenant data leakage (verified by security audits)

**NFR-SEC-005: Rate Limiting**
- Auth endpoints: 5 requests/min per IP (Bucket4j + Redis)
- API endpoints: 100 requests/min per user
- Export endpoints: 5 requests per 5 minutes
- Brute-force protection: Account lockout after 5 failed login attempts

### 4.4 Compliance

**NFR-COMP-001: GDPR Compliance**
- Right to access: Employee data export API
- Right to erasure: Soft delete with anonymization option
- Data portability: Export in JSON/CSV format
- Consent management for data processing

**NFR-COMP-002: Audit Logging**
- Log all critical operations (create, update, delete) with:
  - User ID, Tenant ID, Timestamp
  - Action performed, Entity affected
  - Before/after values (for updates)
- Audit logs stored for 7 years (compliance requirement)
- Immutable audit trail (append-only, no deletion)

**NFR-COMP-003: Data Residency**
- Support region-specific deployments (US, EU, India)
- Data stored in same geographic region as tenant
- Compliance with local labor laws (PF, ESI, GDPR, CCPA)

---

## 5. Technical Architecture

### 5.1 Technology Stack (Locked In)

#### 5.1.1 Frontend
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript 5.3 (strict mode)
UI Library: Mantine UI 7.x
Styling: Tailwind CSS 3.x
State Management:
  - Server State: React Query (TanStack)
  - Global Client State: Zustand (auth, UI preferences)
Forms: React Hook Form + Zod validation
HTTP Client: Axios (existing client in frontend/lib/)
Rich Text: Tiptap (17 extensions)
Charts: Recharts
Icons: Lucide React + Tabler Icons
Drag & Drop: @hello-pangea/dnd
WebSocket: STOMP + SockJS
```

#### 5.1.2 Backend
```yaml
Language: Java 21 (latest LTS)
Framework: Spring Boot 3.4.1
Database: PostgreSQL 16 (Neon cloud for dev, self-hosted for prod)
Cache: Redis 7 (permissions, rate limiting, sessions)
Message Queue: Apache Kafka 7.6.0 (Confluent)
Search: Elasticsearch 8.11.0 (NU-Fluence full-text search)
File Storage: MinIO (S3-compatible)
ORM: Spring Data JPA + Hibernate
DTO Mapping: MapStruct 1.6.3
JWT: JJWT 0.12.6
PDF Generation: OpenPDF 2.0.3
Excel Processing: Apache POI 5.3.0
API Docs: SpringDoc OpenAPI 2.7.0
Rate Limiting: Bucket4j 8.7.0
```

#### 5.1.3 Infrastructure
```yaml
Containerization: Docker + Docker Compose
Orchestration: Kubernetes (GKE)
Monitoring: Prometheus + Grafana + AlertManager
Logging: Logstash JSON format
CI/CD: GitHub Actions
Cloud Provider: GCP (production), Neon DB (development)
```

### 5.2 System Architecture

#### 5.2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                  │
│  • App Router (200 pages)                            │
│  • 190 API hooks + 92 service files                  │
└──────────────────┬───────────────────────────────────┘
                   │ HTTPS/WSS
┌──────────────────▼───────────────────────────────────┐
│              Backend (Spring Boot)                   │
│  • 143 Controllers                                   │
│  • 209 Services                                      │
│  • 265 Entities + 260 Repositories                   │
└──────┬───────────┬───────────┬──────────┬────────────┘
       │           │           │          │
    ┌──▼──┐    ┌──▼──┐    ┌──▼──┐   ┌──▼──┐
    │ PG  │    │Redis│    │Kafka│   │MinIO│
    │SQL  │    │     │    │     │   │     │
    └─────┘    └─────┘    └─────┘   └─────┘
```

#### 5.2.2 Backend Package Structure

```
com.hrms/
├── api/                    # REST Controllers (143 files)
│   ├── employee/
│   ├── attendance/
│   ├── leave/
│   ├── payroll/
│   └── ...
├── application/            # Business Logic Services (209 files)
│   ├── employee/service/
│   ├── payroll/service/
│   └── ...
├── domain/                 # Entities & Enums (265 files)
│   ├── employee/
│   ├── leave/
│   └── ...
├── infrastructure/         # External Integrations
│   ├── integration/
│   │   ├── docusign/
│   │   ├── twilio/
│   │   └── elasticsearch/
│   └── repository/        # JPA Repositories (260 files)
└── common/                 # Shared Utilities
    ├── config/
    ├── security/
    ├── exception/
    └── util/
```

### 5.3 Database Schema

**Total Tables:** 265 (across 15 functional modules)

#### 5.3.1 Core Tables
- `tenant` - Multi-tenant master data
- `organization` - Company/organization details
- `department` - Hierarchical department structure
- `employee` - Employee master records
- `user` - Authentication credentials
- `role` - RBAC roles
- `permission` - Granular permissions (500+ entries)
- `role_permission` - Role-permission mapping

#### 5.3.2 Attendance Module (18 tables)
- `attendance_record` - Daily clock in/out
- `shift_def` - Shift patterns
- `shift_assignment` - Employee shift mapping
- `holiday` - Holiday calendar
- `leave_request` - Leave applications
- `leave_type` - Leave type configuration
- `leave_balance` - Employee leave balance

#### 5.3.3 Payroll Module (25 tables)
- `payroll_component` - Salary components
- `payroll_run` - Monthly payroll execution
- `payslip` - Generated payslips
- `statutory_deduction` - PF, ESI, Tax
- `salary_revision` - Salary change history

#### 5.3.4 Recruitment Module (22 tables)
- `job_requisition` - Job openings
- `candidate` - Applicant database
- `interview_schedule` - Interview calendar
- `offer` - Offer letters
- `preboarding_candidate` - Pre-onboarding data

#### 5.3.5 Workflow Engine (12 tables)
- `workflow_def` - Workflow templates
- `workflow_step` - Workflow stages
- `approval_instance` - Workflow execution instances
- `approval_task` - Individual approval tasks

**Migration Status:**
- Flyway V0-V62 applied (63 migrations)
- Next migration: V63
- Legacy Liquibase migrations deprecated (DO NOT USE)

---

## 6. Data Model

### 6.1 Core Entities

#### 6.1.1 Employee
```java
Employee {
  UUID id;
  UUID tenantId;
  String employeeCode; // Auto-generated: EMP001, EMP002
  String firstName;
  String lastName;
  String email;
  LocalDate dateOfBirth;
  String phoneNumber;
  EmploymentType employmentType; // FULL_TIME, PART_TIME, CONTRACT, INTERN
  EmployeeStatus status; // ACTIVE, ON_LEAVE, ON_NOTICE, TERMINATED
  EmployeeLevel level; // ENTRY, MID, SENIOR, LEAD, MANAGER, DIRECTOR, VP, C_LEVEL
  UUID departmentId;
  UUID managerId; // Reporting manager
  UUID dottedLineManagerId; // Matrix reporting (optional)
  LocalDate joiningDate;
  LocalDate confirmationDate;
  LocalDate exitDate;
  LocalDateTime createdAt;
  LocalDateTime updatedAt;
}
```

#### 6.1.2 Department
```java
Department {
  UUID id;
  UUID tenantId;
  String code; // DEPT-ENG, DEPT-HR
  String name;
  String description;
  UUID parentDepartmentId; // Hierarchical structure
  UUID managerId;
  DepartmentType type; // ENGINEERING, PRODUCT, SALES, HR, etc.
  String location;
  String costCenter;
  Boolean isActive;
}
```

#### 6.1.3 Leave Request
```java
LeaveRequest {
  UUID id;
  UUID tenantId;
  UUID employeeId;
  UUID leaveTypeId;
  LocalDate startDate;
  LocalDate endDate;
  BigDecimal daysApplied;
  String reason;
  LeaveStatus status; // PENDING, APPROVED, REJECTED, CANCELLED
  UUID approverId;
  LocalDateTime approvedAt;
  String approverComments;
  UUID workflowInstanceId; // Link to approval workflow
}
```

#### 6.1.4 Payroll Component
```java
PayrollComponent {
  UUID id;
  UUID tenantId;
  String code; // BASIC, HRA, DA, PF
  String name;
  ComponentType type; // EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION
  CalculationType calculationType; // FIXED, PERCENTAGE, FORMULA
  String formula; // SpEL: "BASIC * 0.4" for HRA
  Integer evaluationOrder; // DAG dependency order
  Boolean isTaxable;
  Boolean isStatutory; // PF, ESI, PT
}
```

### 6.2 Enumerations

#### 6.2.1 Employee Enums
```java
enum EmploymentType { FULL_TIME, PART_TIME, CONTRACT, INTERN, CONSULTANT }
enum EmployeeStatus { ACTIVE, ON_LEAVE, ON_NOTICE, TERMINATED, RESIGNED }
enum EmployeeLevel { ENTRY, MID, SENIOR, LEAD, MANAGER, DIRECTOR, VP, C_LEVEL }
```

#### 6.2.2 Leave Enums
```java
enum LeaveStatus { PENDING, APPROVED, REJECTED, CANCELLED }
enum LeaveType.GenderSpecific { MALE, FEMALE, ALL }
enum LeaveType.AccrualType { YEARLY, MONTHLY, QUARTERLY, NO_ACCRUAL }
```

#### 6.2.3 Attendance Enums
```java
enum AttendanceStatus { PRESENT, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, WEEK_OFF }
enum Holiday.HolidayType { NATIONAL, REGIONAL, OPTIONAL, RESTRICTED, FESTIVAL, COMPANY_SPECIFIC }
```

---

## 7. Security Requirements

### 7.1 RBAC System

#### 7.1.1 Permission Model
- **Format:** `MODULE:ACTION` (e.g., `EMPLOYEE:READ`, `PAYROLL:APPROVE`)
- **Modules:** 25+ (Employee, Attendance, Leave, Payroll, Benefits, Recruitment, etc.)
- **Actions:** READ, CREATE, UPDATE, DELETE, APPROVE, MANAGE, EXPORT
- **Total Permissions:** 500+ granular permissions

#### 7.1.2 Role Hierarchy
```
SuperAdmin (All permissions, cross-tenant access)
  ├── CEO
  │   ├── Department Head
  │   │   ├── Manager
  │   │   │   ├── Team Lead
  │   │   │   │   └── Employee (Self-service permissions)
  ├── HR Admin (HR module full access)
  ├── Payroll Admin (Payroll module full access)
  └── IT Admin (System configuration access)
```

#### 7.1.3 Permission Enforcement

**Backend:**
```java
@RequiresPermission(Permission.EMPLOYEE_CREATE)
public ResponseEntity<EmployeeResponse> createEmployee(@RequestBody CreateEmployeeRequest request) {
  // Permission checked by PermissionAspect before method execution
}
```

**Frontend:**
```typescript
const { hasPermission } = usePermissions();

{hasPermission('EMPLOYEE:CREATE') && (
  <Button onClick={openCreateModal}>Add Employee</Button>
)}
```

**Key Rules:**
1. **SuperAdmin bypasses all checks** - Can access all data across all tenants
2. **JWT contains roles only** - Permissions loaded from DB on login (CRIT-001 fix)
3. **Every user is an employee** - Roles are additive; all users see "My Space" sidebar
4. **Sidebar "MY SPACE" items have NO permission requirements** - Always visible

### 7.2 Multi-Tenant Security

#### 7.2.1 Tenant Isolation
- All tenant-scoped tables have `tenant_id UUID NOT NULL` column
- PostgreSQL RLS policies enforce row-level filtering:
  ```sql
  CREATE POLICY tenant_isolation ON employee
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
  ```
- Application sets tenant context in PostgreSQL session:
  ```java
  SET app.current_tenant = 'tenant-uuid'
  ```

#### 7.2.2 Cross-Tenant Prevention
- **All queries auto-filtered by tenant_id** via JPA `@Where(clause = "tenant_id = :tenantId")`
- **SuperAdmin exception:** Can query across tenants for admin operations
- **Audit logging:** All cross-tenant access logged for compliance

---

## 8. Integration Requirements

### 8.1 External Integrations

#### 8.1.1 Google OAuth
- **Purpose:** Single Sign-On (SSO) authentication
- **Scopes:** `profile`, `email`, `openid`
- **Implementation:** `@react-oauth/google` (frontend) + JWT exchange (backend)

#### 8.1.2 Google Calendar API
- **Purpose:** Interview scheduling, meeting invites
- **Features:** Create events, send invitations, generate Meet links
- **Auth:** Service account with domain-wide delegation

#### 8.1.3 Twilio SMS
- **Purpose:** OTP for MFA, SMS notifications
- **Implementation:** Twilio SDK 10.1.0
- **Dev Mode:** Mock SMS (logs to console instead of actual send)

#### 8.1.4 DocuSign
- **Purpose:** E-signature for offer letters, contracts
- **Workflows:** Send envelope → Candidate signs → Webhook callback on completion
- **Auth:** OAuth 2.0 (Authorization Code Grant)

#### 8.1.5 Job Board Integrations
- **Naukri.com, LinkedIn Jobs, Indeed:** Post jobs, fetch applicants
- **Implementation:** REST API with API key authentication
- **Sync Frequency:** Hourly scheduled job

#### 8.1.6 SMTP Email
- **Purpose:** Transactional emails (password reset, notifications, payslips)
- **Provider:** SendGrid / AWS SES / SMTP relay
- **Templates:** Thymeleaf email templates

### 8.2 Internal Event Streaming (Kafka)

#### 8.2.1 Kafka Topics
```yaml
Topics:
  - nu-aura.approvals          # Workflow approval events
  - nu-aura.notifications      # In-app + email notifications
  - nu-aura.audit              # Audit log events
  - nu-aura.employee-lifecycle # Onboarding, offboarding events
  - nu-aura.fluence-content    # Wiki page updates, search indexing

Dead Letter Topics (DLT):
  - nu-aura.approvals.dlt
  - nu-aura.notifications.dlt
  - nu-aura.audit.dlt
  - nu-aura.employee-lifecycle.dlt
  - nu-aura.fluence-content.dlt
```

#### 8.2.2 Event Examples

**Employee Lifecycle Event:**
```json
{
  "eventType": "EMPLOYEE_ONBOARDING_COMPLETED",
  "tenantId": "tenant-uuid",
  "employeeId": "emp-uuid",
  "timestamp": "2026-03-22T10:30:00Z",
  "metadata": {
    "departmentId": "dept-uuid",
    "managerId": "mgr-uuid",
    "joiningDate": "2026-03-15"
  }
}
```

**Approval Event:**
```json
{
  "eventType": "LEAVE_REQUEST_APPROVED",
  "tenantId": "tenant-uuid",
  "approvalInstanceId": "approval-uuid",
  "approverId": "mgr-uuid",
  "entityType": "LEAVE_REQUEST",
  "entityId": "leave-uuid",
  "timestamp": "2026-03-22T14:45:00Z"
}
```

---

## 9. Deployment Requirements

### 9.1 Docker Compose (Development)

**Services:**
- **Redis:** Port 6379 (cache, rate limiting, sessions)
- **Zookeeper:** Port 2181 (Kafka dependency)
- **Kafka:** Port 9092 (event streaming)
- **Elasticsearch:** Port 9200 (full-text search)
- **MinIO:** Port 9000 (file storage), 9001 (console)
- **Prometheus:** Port 9090 (metrics)
- **Backend:** Port 8080 (Spring Boot)
- **Frontend:** Port 3000 (Next.js dev server)

**Start Command:**
```bash
docker-compose up -d
cd backend && ./start-backend.sh
cd frontend && npm run dev
```

**Note:** PostgreSQL NOT in Docker Compose (uses Neon cloud database)

### 9.2 Kubernetes (Production)

#### 9.2.1 Manifests
```
deployment/kubernetes/
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-deployment.yaml
├── frontend-service.yaml
├── redis-statefulset.yaml
├── kafka-statefulset.yaml
├── elasticsearch-statefulset.yaml
├── minio-statefulset.yaml
├── ingress.yaml
└── configmap.yaml
```

#### 9.2.2 Resource Requirements

**Backend Pods:**
- CPU: 2 cores (request), 4 cores (limit)
- Memory: 4GB (request), 8GB (limit)
- Replicas: 3 (auto-scale 3-10 based on CPU)

**Frontend Pods:**
- CPU: 1 core (request), 2 cores (limit)
- Memory: 2GB (request), 4GB (limit)
- Replicas: 2 (auto-scale 2-5)

**Persistent Volumes:**
- PostgreSQL: 500GB SSD (RDS/Cloud SQL)
- Redis: 50GB
- Kafka: 200GB
- Elasticsearch: 100GB
- MinIO: 1TB

### 9.3 Monitoring & Alerting

#### 9.3.1 Prometheus Metrics
```yaml
Metrics Collected:
  - api_request_duration_seconds (histogram)
  - api_errors_total (counter by category, type, status)
  - db_connection_pool_active (gauge)
  - kafka_consumer_lag (gauge)
  - cache_hit_ratio (gauge)
  - payroll_processing_duration_seconds (histogram)
```

#### 9.3.2 Alert Rules (28 total)
```yaml
High Priority:
  - API Error Rate > 5% for 5 minutes
  - Database Connection Pool > 90% for 2 minutes
  - Kafka Consumer Lag > 1000 messages
  - Disk Usage > 85%
  - Memory Usage > 90%

Medium Priority:
  - API Latency p95 > 500ms
  - Cache Hit Ratio < 80%
  - SSL Certificate Expiry < 7 days
```

#### 9.3.3 Grafana Dashboards (4 total)
1. **Application Metrics:** API latency, throughput, error rates
2. **Infrastructure Metrics:** CPU, memory, disk, network
3. **Database Metrics:** Query performance, connection pool, replication lag
4. **Business Metrics:** Payroll runs, leave approvals, onboarding completion

---

## 10. Future Roadmap

### 10.1 Phase 2 (Q2 2026) - NU-Fluence Frontend

**Status:** Backend complete, frontend routes defined, UI not started

**Deliverables:**
- Wiki page editor with Tiptap rich text
- Full-text search with Elasticsearch integration
- Blog post creation and publishing workflow
- Template library with variable substitution
- Collaborative editing with conflict resolution

**Estimated Timeline:** 8 weeks

### 10.2 Phase 3 (Q3 2026) - Mobile Apps

**Platforms:** iOS (Swift/SwiftUI) + Android (Kotlin/Jetpack Compose)

**Features:**
- Employee self-service (view profile, payslips, attendance)
- Clock in/out with geolocation
- Leave request submission
- Push notifications for approvals
- Offline mode for attendance marking

**Estimated Timeline:** 12 weeks

### 10.3 Phase 4 (Q4 2026) - Advanced Analytics

**Features:**
- AI-powered attrition prediction
- Skill gap analysis and learning recommendations
- Payroll cost forecasting
- Recruitment funnel optimization
- Interactive dashboards (Tableau/Power BI embedded)

**Estimated Timeline:** 10 weeks

### 10.4 Technical Debt (Ongoing)

**Test Fixes:**
- Fix 11 skipped tests (Java 21 API compatibility)
- Increase test coverage to 85% (currently 80%)
- Add integration tests for critical workflows

**Performance Optimization:**
- Implement GraphQL for mobile apps (reduce over-fetching)
- Add Redis caching for frequently accessed data
- Database query optimization (identify N+1 queries)

**Security Hardening:**
- Implement API rate limiting per tenant
- Add IP whitelisting for admin operations
- Security audit for OWASP Top 10 vulnerabilities

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **RBAC** | Role-Based Access Control - Permission system based on roles |
| **Multi-Tenancy** | Single application serving multiple organizations (tenants) with data isolation |
| **SaaS** | Software as a Service - Cloud-hosted subscription software |
| **OKR** | Objectives and Key Results - Goal-setting framework |
| **SpEL** | Spring Expression Language - Formula language for payroll calculations |
| **DAG** | Directed Acyclic Graph - Dependency resolution for payroll components |
| **RLS** | Row-Level Security - PostgreSQL feature for tenant data isolation |
| **JWT** | JSON Web Token - Stateless authentication token format |
| **MFA** | Multi-Factor Authentication - Two-step verification for security |
| **PITR** | Point-In-Time Recovery - Database restoration to specific timestamp |
| **DLT** | Dead Letter Topic - Kafka topic for failed message processing |

---

## Appendix B: API Endpoint Summary

### Employee Module (12 endpoints)
```
POST   /api/v1/employees               # Create employee
GET    /api/v1/employees               # List employees (paginated)
GET    /api/v1/employees/search        # Search employees
GET    /api/v1/employees/me            # Get current user's profile
GET    /api/v1/employees/{id}          # Get employee by ID
GET    /api/v1/employees/{id}/hierarchy  # Get org chart
GET    /api/v1/employees/{id}/subordinates  # Get direct reports
GET    /api/v1/employees/managers      # Get manager dropdown list
PUT    /api/v1/employees/{id}          # Update employee
DELETE /api/v1/employees/{id}          # Soft delete employee
```

### Leave Module (10 endpoints)
```
POST   /api/v1/leave-requests          # Submit leave request
GET    /api/v1/leave-requests          # List leave requests
GET    /api/v1/leave-requests/{id}     # Get leave request details
PUT    /api/v1/leave-requests/{id}/cancel  # Cancel leave request
POST   /api/v1/leave-requests/{id}/approve  # Approve leave request
POST   /api/v1/leave-requests/{id}/reject   # Reject leave request
GET    /api/v1/leave-balance           # Get employee leave balance
GET    /api/v1/leave-types             # List leave types
```

### Payroll Module (8 endpoints)
```
POST   /api/v1/payroll/run             # Execute payroll run
GET    /api/v1/payroll/runs            # List payroll runs
GET    /api/v1/payroll/runs/{id}       # Get payroll run details
GET    /api/v1/payslips                # List employee payslips
GET    /api/v1/payslips/{id}           # Get payslip by ID
GET    /api/v1/payslips/{id}/pdf       # Download payslip PDF
POST   /api/v1/salary-revisions        # Create salary revision
GET    /api/v1/salary-revisions        # List salary revisions
```

### Recruitment Module (15 endpoints)
```
POST   /api/v1/recruitment/jobs        # Create job requisition
GET    /api/v1/recruitment/jobs        # List job openings
GET    /api/v1/recruitment/jobs/{id}   # Get job details
POST   /api/v1/recruitment/candidates  # Add candidate
GET    /api/v1/recruitment/candidates  # List candidates
GET    /api/v1/recruitment/candidates/{id}  # Get candidate details
PUT    /api/v1/recruitment/candidates/{id}/stage  # Move candidate stage
POST   /api/v1/recruitment/interviews  # Schedule interview
PUT    /api/v1/recruitment/interviews/{id}/feedback  # Submit feedback
POST   /api/v1/recruitment/offers      # Create offer letter
PUT    /api/v1/recruitment/offers/{id}/status  # Update offer status
```

**Total API Endpoints:** 143 controllers across all modules

---

## Appendix C: Database Migration History

### Flyway Migration Timeline

| Version | Description | Date | Status |
|---------|-------------|------|--------|
| V0 | Initial schema | 2025-08-15 | Applied |
| V1-V10 | Core modules (employee, dept, roles) | 2025-08-20 | Applied |
| V11-V30 | Attendance, leave, payroll | 2025-09-10 | Applied |
| V31-V50 | Recruitment, benefits, assets | 2025-10-15 | Applied |
| V51-V60 | Performance, learning, recognition | 2025-11-20 | Applied |
| V61 | NU-Fluence schema | 2025-12-05 | Applied |
| V62 | WebSocket notification tables | 2026-01-10 | Applied |
| **V63** | **Next migration slot** | Pending | - |
| V64 | Reserved for hotfixes | - | - |
| V65 | Reserved for Phase 2 | - | - |

**Note:** V67 and V68 created during beta launch readiness (RBAC permission fixes) but NOT YET APPLIED. Requires backend restart.

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-22 | Claude Sonnet 4.5 | Initial comprehensive requirements document |

---

**End of Requirements Specification**
