# NU-AURA Platform Requirements

**Version:** 2.0
**Last Updated:** April 2026
**Status:** Active Development

---

## 1. Executive Summary

NU-AURA is a **multi-tenant SaaS HRMS platform** built as a bundle of four integrated
sub-applications sharing a single login, RBAC system, and services layer.

| Sub-App        | Domain                                                               | Status                                    |
|----------------|----------------------------------------------------------------------|-------------------------------------------|
| **NU-HRMS**    | Core HR, Attendance, Leave, Payroll, Benefits, Assets                | Active                                    |
| **NU-Hire**    | Recruitment, Preboarding, Onboarding, Offboarding                    | Active                                    |
| **NU-Grow**    | Performance, OKRs, 360 Feedback, LMS, Recognition, Surveys, Wellness | Active                                    |
| **NU-Fluence** | Wiki, Blogs, Templates, Drive, Search                                | Phase 2 (backend built, frontend pending) |

**Target:** 10 to 10,000 employees per tenant
**Stack:** Java 21 / Spring Boot 3.4.1 + Next.js 14 / TypeScript

---

## 2. Functional Requirements

### 2.1 NU-HRMS

#### Employee Management

- Create, update, soft-delete, and search employee records
- Mandatory fields: name, email, department, role, joining date
- Employee hierarchy and organizational chart (reporting lines, dotted-line managers)
- Export to Excel/CSV
- Employee codes auto-generated (EMP001, EMP002...)

#### Employee Self-Service (My Space)

- View personal profile (read-only for core fields)
- Update contact info and emergency contacts
- Access payslips, tax documents, and employment letters
- View leave balance and attendance summary
- **No permission gating** — all employees always see My Space sidebar items

#### Department Management

- Hierarchical parent-child department structures
- Department managers, cost centers, headcount tracking
- Department types: Engineering, Product, Sales, HR, Finance, etc.

#### Attendance

- Clock in/out via web with geolocation tracking
- Biometric integration for on-premise devices
- Remote work tracking with IP-based validation
- Automatic overtime calculation
- Late/early departure flagging with configurable grace periods
- Shift management: day, night, rotating, flexible patterns
- Shift swaps with approval workflows
- Shift roster generation per team/department
- Holiday calendars: national, regional, optional, restricted (per location)

#### Leave Management

- Leave types: Annual, Sick, Casual, Maternity, Paternity, Compensatory
- Accrual rules: yearly, monthly, quarterly
- Carry-forward limits and encashment policies
- Gender-specific leave types
- Auto-balance calculation before submission
- Multi-level approval chains
- Monthly scheduled accrual job (Quartz)
- Pro-rata calculation for mid-year joiners

#### Payroll

- Salary components: Basic, HRA, Allowances, Deductions
- Formula-based calculations using SpEL (Spring Expression Language)
- Dependency resolution (DAG) for component evaluation order
- Monthly payroll runs with arrears and one-time payments
- Salary revisions with effective dates
- Payslip generation (PDF via OpenPDF)
- Statutory reports: PF, ESI, Income Tax (Form 16)
- Multiple tax regime support (old vs new)
- All payroll operations wrapped in DB transactions

#### Benefits Administration

- Benefit plans: Health Insurance, Life Insurance, Retirement Plans
- Eligibility criteria (employment type, tenure, level)
- Annual open enrollment periods
- Dependent tracking for family coverage
- Self-enrollment with manager/HR approval
- Auto-enrollment for new hires
- Premium calculation integrated with payroll deductions

#### Asset Management

- Track laptops, monitors, keyboards, mobile devices
- Assign to employees with handover date
- Track condition (new, good, damaged)
- Return on resignation/termination
- Asset utilization reports

#### Additional Modules

- **Expenses** — submit, approve, reimburse expense claims
- **Loans** — employee loan requests, EMI deductions via payroll
- **Travel** — travel requests with approval workflows
- **Letters** — generate offer letters, experience letters, salary certificates from templates
- **Statutory & Tax** — PF, ESI, TDS management
- **Helpdesk** — internal employee support tickets
- **Timesheets** — project-based time logging
- **Projects & Resources** — project tracking, resource allocation

---

### 2.2 NU-Hire

#### Recruitment

- Job requisitions with position details and approval stages
- Sourcing channels: Job Boards (Naukri, LinkedIn, Indeed), Employee Referrals
- Candidate pipeline: Applied > Screening > Interview > Offer > Hired/Rejected
- Resume parsing (Apache Tika)
- Bulk import from Excel/CSV

#### Interview Management

- Schedule with Google Calendar integration
- Auto-generate Google Meet links
- Structured interviewer feedback forms
- Aggregated scoring for hiring decisions

#### Offer Management

- Generate offer letters from templates
- E-signature via DocuSign
- Status tracking: Pending, Accepted, Rejected, Expired
- Auto-convert accepted offers to onboarding tasks

#### Preboarding Portal

- Unique access link sent to candidate on offer acceptance
- Self-service: personal info, bank details, tax IDs, document uploads
- Digital signature on offer letter and employment contract
- Admin dashboard: completion tracking, reminders, readiness status

#### Onboarding

- Auto-generated checklist on joining date
- Task assignment to HR, IT, and hiring manager
- Welcome email with first-day instructions
- Document collection, verification, and encrypted storage (MinIO)
- Mentor/buddy assignment

#### Offboarding

- Exit workflow with task assignment
- Asset return tracking
- Knowledge transfer documentation
- Exit interview scheduling
- Final settlement calculation

---

### 2.3 NU-Grow

#### Performance Reviews

- Review cycles: Annual, Half-Yearly, Quarterly
- Templates with sections: Goals, Competencies, Feedback
- Reviewers: Self, Manager, Peers, Skip-Level
- Deadlines with auto-reminders
- Calibration workflows

#### 360-Degree Feedback

- Peer nomination
- Anonymous/non-anonymous reviews
- Aggregated feedback scores
- Development plan generation

#### Goal Management (OKRs)

- Company, department, and individual OKRs
- Objective-Key Result alignment (cascade)
- Quarterly check-ins
- Progress tracking (% completion, actual vs target)

#### Learning Management (LMS)

- Course catalog: video lessons, documents, quizzes
- Prerequisites for advanced courses
- In-person training scheduling with calendar invites
- Completion certificates
- Skill taxonomy and gap analysis

#### Recognition & Rewards

- Peer appreciation with badges (Star Performer, Team Player, etc.)
- Public recognition feed
- Monthly award nominations
- Reward points: earn, accumulate, redeem (vouchers, extra leaves)
- Leaderboard for gamification

#### Surveys & Wellness

- Employee engagement surveys
- Pulse surveys with anonymous responses
- Wellness program tracking

---

### 2.4 NU-Fluence (Phase 2)

#### Wiki & Documentation

- Rich text editor (Tiptap with 17 extensions)
- Markdown, tables, code blocks, embedded media
- Version control with rollback
- Wiki spaces for departments/projects/topics
- Hierarchical page structure
- Full-text search via Elasticsearch
- Comments, @mentions, page watching

#### Blog Platform

- Internal blog posts with rich media
- Draft > Review > Published workflow
- Scheduled publishing
- Engagement tracking (views, likes, comments)

#### Template Library

- Reusable templates: meeting notes, project charters, RFCs
- Variable placeholders for auto-fill
- Cross-team sharing
- Usage metrics

---

## 3. Cross-Platform Features

### Approval Workflow Engine

- Generic engine: `workflow_def` > `workflow_step` > `approval_instance` > `approval_task`
- Data-driven (not hardcoded) — configurable steps and role-based routing
- Used across: Leave, Expenses, Assets, Recruitment, Performance, Loans, Travel

### Notification System

- In-app notifications via WebSocket (STOMP + SockJS)
- Email notifications (SMTP/SendGrid)
- SMS notifications (Twilio, mocked in dev)
- Kafka-driven async delivery

### Announcements

- Company-wide or department-scoped announcements
- Scheduling and expiry

### Reports & Analytics

- Module-specific reports with Excel/CSV export
- Dashboard analytics with Recharts
- Attendance reports, payroll summaries, recruitment funnels

### Calendar

- Integrated calendar view for leave, holidays, events, interviews

### Settings & Admin

- Role and permission management
- System configuration
- Audit log viewer

---

## 4. Non-Functional Requirements

### Performance

- API response time < 200ms (p95)
- Page load time < 2s on 4G
- Search results < 500ms (Elasticsearch)
- Support 10,000 concurrent users per tenant
- Process 100,000 payroll records in < 5 minutes

### Reliability

- 99.9% uptime SLA
- Automated health checks every 30 seconds
- PostgreSQL daily full + hourly incremental backups
- 30-day point-in-time recovery (PITR)
- Kafka dead-letter topics (DLT) with retry handling

### Monitoring

- Prometheus metrics: API latency, error rates, DB pool, Kafka lag, cache hit ratio
- Grafana dashboards (4): Application, Infrastructure, Database, Business
- AlertManager: 28 alert rules, 19 SLOs
- Structured JSON logging

### Compliance

- GDPR: data export, right to erasure (soft delete + anonymization), consent management
- Audit logs: all CRUD operations with before/after values, stored 7 years, immutable
- Data residency: region-specific deployments (US, EU, India)
- Local labor law compliance (PF, ESI, GDPR, CCPA)

---

## 5. Security Requirements

### Authentication

- JWT-based stateless auth (JJWT 0.12.6)
- Token expiry: 24h access, 30-day refresh
- Google OAuth 2.0 SSO
- MFA via TOTP (Twilio SMS for OTP)
- Password policy: 12+ chars, upper/lower/digit/special, history of 5, 90-day max age
- Account lockout after 5 failed attempts

### Authorization (RBAC)

- 500+ granular permissions in `MODULE:ACTION` format
- 9 roles: ESS, MGR, HRA, REC, PAY, FIN, ITA, SYS, UNA
- SuperAdmin bypasses all permission checks (cross-tenant access)
- JWT contains roles only (permissions loaded from DB at login — CRIT-001)
- Every user is an employee — roles are additive
- Backend: `@RequiresPermission` aspect + `@RequiresFeature` aspect
- Frontend: `usePermissions` hook hides/shows UI elements

### Multi-Tenant Isolation

- All tenant tables have `tenant_id UUID NOT NULL`
- PostgreSQL Row-Level Security (RLS) policies
- Application-level tenant filtering in all queries
- Cross-tenant access logged for compliance

### Rate Limiting (Bucket4j + Redis)

- Auth endpoints: 5/min per IP
- API endpoints: 100/min per user
- Export endpoints: 5 per 5 minutes

### Data Protection

- TLS 1.3 in transit
- AES-256 for sensitive fields (bank accounts, tax IDs)
- MinIO server-side encryption for files
- BCrypt (12 rounds) password hashing
- CSRF double-submit cookie
- OWASP security headers (frontend middleware + Spring Security)

---

## 6. Integration Requirements

| Integration                           | Purpose                                  | Auth            |
|---------------------------------------|------------------------------------------|-----------------|
| Google OAuth                          | SSO login                                | OAuth 2.0       |
| Google Calendar                       | Interview scheduling, meeting invites    | Service account |
| Twilio                                | SMS OTP, notifications (mocked in dev)   | API key         |
| DocuSign                              | E-signature for offer letters            | OAuth 2.0       |
| Job Boards (Naukri, LinkedIn, Indeed) | Post jobs, fetch applicants              | API key         |
| SMTP (SendGrid/SES)                   | Transactional emails                     | API key         |
| MinIO                                 | S3-compatible file storage               | Access key      |
| Elasticsearch                         | Full-text search (NU-Fluence)            | Internal        |
| Kafka                                 | Async event streaming (5 topics + 5 DLT) | Internal        |

### Kafka Topics

- `nu-aura.approvals` — workflow approval events
- `nu-aura.notifications` — in-app + email notifications
- `nu-aura.audit` — audit log events
- `nu-aura.employee-lifecycle` — onboarding, offboarding events
- `nu-aura.fluence-content` — wiki updates, search indexing
- Each topic has a corresponding `.dlt` dead-letter topic

---

## 7. Deployment

### Development

- Docker Compose: 8 services (Redis, Zookeeper, Kafka, Elasticsearch, MinIO, Prometheus, Backend,
  Frontend)
- PostgreSQL via Neon cloud (not in Docker)
- Start: `docker-compose up -d` then `./start-backend.sh` then `npm run dev`

### Production

- Kubernetes on GCP GKE (10 manifests in `deployment/kubernetes/`)
- PostgreSQL 16 (managed)
- Backend: 3 pods (auto-scale 3-10), 4 cores / 8GB per pod
- Frontend: 2 pods (auto-scale 2-5), 2 cores / 4GB per pod
- GitHub Actions CI/CD

---

## 8. Roadmap

| Phase       | Timeline | Deliverables                                                                |
|-------------|----------|-----------------------------------------------------------------------------|
| **Phase 2** | Q2 2026  | NU-Fluence frontend (wiki editor, search, blogs, templates)                 |
| **Phase 3** | Q3 2026  | Mobile apps — iOS (SwiftUI) + Android (Jetpack Compose)                     |
| **Phase 4** | Q4 2026  | AI analytics: attrition prediction, skill gap analysis, payroll forecasting |

---

## Glossary

| Term     | Definition                                                         |
|----------|--------------------------------------------------------------------|
| **RBAC** | Role-Based Access Control                                          |
| **RLS**  | PostgreSQL Row-Level Security for tenant isolation                 |
| **SpEL** | Spring Expression Language for payroll formula calculations        |
| **DAG**  | Directed Acyclic Graph for payroll component dependency resolution |
| **OKR**  | Objectives and Key Results goal-setting framework                  |
| **DLT**  | Dead Letter Topic for failed Kafka message processing              |
| **JWT**  | JSON Web Token for stateless authentication                        |
| **MFA**  | Multi-Factor Authentication                                        |
| **PITR** | Point-In-Time Recovery for database restoration                    |
