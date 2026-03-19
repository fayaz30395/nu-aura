# NU-AURA Platform — Requirements Specification

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Functional Requirements

### FR-1: Authentication & Authorization

| ID | Requirement | Status |
|----|------------|--------|
| FR-1.1 | Email/password login with bcrypt hashing | Implemented |
| FR-1.2 | Google SSO (OAuth2) with token validation | Implemented |
| FR-1.3 | MFA via TOTP (Google Authenticator compatible) | Implemented |
| FR-1.4 | JWT access tokens (1h) in HttpOnly cookies | Implemented |
| FR-1.5 | Refresh token rotation (24h) with single-use enforcement | Implemented |
| FR-1.6 | RBAC with `module.action` permission strings (~300 permissions) | Implemented |
| FR-1.7 | 9 roles: SUPER_ADMIN, SYSTEM_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER, TEAM_LEAD, EMPLOYEE, RECRUITER, FINANCE | Implemented |
| FR-1.8 | Data scoping (GLOBAL/LOCATION/DEPARTMENT/TEAM/SELF/CUSTOM) | Implemented |
| FR-1.9 | SuperAdmin bypasses ALL permission checks | Implemented |
| FR-1.10 | Password reset via email link | Implemented |
| FR-1.11 | Session restoration from HttpOnly cookie on page reload | Implemented |
| FR-1.12 | CSRF double-submit cookie pattern | Implemented |

### FR-2: Employee Management

| ID | Requirement | Status |
|----|------------|--------|
| FR-2.1 | Employee CRUD with 40+ profile fields | Implemented |
| FR-2.2 | Employee directory with search, filter, sort | Implemented |
| FR-2.3 | Organizational hierarchy (reporting chain) | Implemented |
| FR-2.4 | Dotted-line manager relationships | Implemented |
| FR-2.5 | Employee skills tracking | Implemented |
| FR-2.6 | Custom fields (admin-defined, per module) | Implemented |
| FR-2.7 | Talent profiles with journey tracking | Implemented |
| FR-2.8 | Bulk data import (Keka format support) | Implemented |
| FR-2.9 | Employee lifecycle events (Kafka-driven) | Implemented |

### FR-3: Attendance Management

| ID | Requirement | Status |
|----|------------|--------|
| FR-3.1 | Clock-in/clock-out with time entries | Implemented |
| FR-3.2 | Attendance regularization requests | Implemented |
| FR-3.3 | Shift management with swap requests | Implemented |
| FR-3.4 | Compensatory off (comp-off) requests | Implemented |
| FR-3.5 | Team attendance view for managers | Implemented |
| FR-3.6 | Mobile attendance with geolocation | Implemented |
| FR-3.7 | Holiday calendar management | Implemented |
| FR-3.8 | Office location management | Implemented |
| FR-3.9 | Auto-regularization scheduler | Implemented |

### FR-4: Leave Management

| ID | Requirement | Status |
|----|------------|--------|
| FR-4.1 | Leave request with approval workflow | Implemented |
| FR-4.2 | Leave balance tracking per type | Implemented |
| FR-4.3 | Leave type configuration (admin) | Implemented |
| FR-4.4 | Leave policy management | Implemented |
| FR-4.5 | Monthly leave accrual (Cron job) | Implemented |
| FR-4.6 | Leave calendar view | Implemented |
| FR-4.7 | Leave encashment (payroll integration) | Implemented |
| FR-4.8 | Team leave view for managers | Implemented |

### FR-5: Payroll

| ID | Requirement | Status |
|----|------------|--------|
| FR-5.1 | Salary structure with components (SpEL formulas) | Implemented |
| FR-5.2 | Payroll run generation (monthly) | Implemented |
| FR-5.3 | Payslip generation with PDF export | Implemented |
| FR-5.4 | Statutory components (PF, ESI, PT, TDS) | Implemented |
| FR-5.5 | Leave deduction (LOP from attendance) | Implemented |
| FR-5.6 | Salary revision management | Implemented |
| FR-5.7 | Bulk payroll processing | Implemented |
| FR-5.8 | Payroll approval workflow | Implemented |
| FR-5.9 | Tax declarations | Implemented |

### FR-6: Performance Management

| ID | Requirement | Status |
|----|------------|--------|
| FR-6.1 | Review cycles with configurable periods | Implemented |
| FR-6.2 | 360-degree feedback | Implemented |
| FR-6.3 | OKR (Objectives & Key Results) | Implemented |
| FR-6.4 | Performance Improvement Plans (PIP) | Implemented |
| FR-6.5 | 9-box calibration matrix | Implemented |
| FR-6.6 | Competency-based reviews | Implemented |
| FR-6.7 | 1-on-1 meetings | Implemented |

### FR-7: Recruitment (ATS)

| ID | Requirement | Status |
|----|------------|--------|
| FR-7.1 | Job posting creation and management | Implemented |
| FR-7.2 | Kanban pipeline board (drag-and-drop) | Implemented |
| FR-7.3 | Applicant tracking with stages | Implemented |
| FR-7.4 | Interview scheduling | Implemented |
| FR-7.5 | Offer letter generation | Implemented |
| FR-7.6 | Job board integration (Naukri, LinkedIn, Indeed) | Implemented |
| FR-7.7 | AI resume parsing (Groq LLM) | Implemented |
| FR-7.8 | Employee referral program | Implemented |
| FR-7.9 | Public careers page | Implemented |

### FR-8: Onboarding & Offboarding

| ID | Requirement | Status |
|----|------------|--------|
| FR-8.1 | Onboarding process with task checklists | Implemented |
| FR-8.2 | Onboarding templates (admin configurable) | Implemented |
| FR-8.3 | Preboarding portal (public, token-based) | Implemented |
| FR-8.4 | Exit interview management | Implemented |
| FR-8.5 | Full & final settlement (FnF) | Implemented |
| FR-8.6 | Exit clearance workflow | Implemented |
| FR-8.7 | Probation period tracking | Implemented |

### FR-9: Finance Modules

| ID | Requirement | Status |
|----|------------|--------|
| FR-9.1 | Expense claim with receipt upload | Implemented |
| FR-9.2 | Expense approval workflow | Implemented |
| FR-9.3 | Employee loan management | Implemented |
| FR-9.4 | Loan repayment tracking | Implemented |
| FR-9.5 | Travel request management | Implemented |
| FR-9.6 | Benefits enrollment | Implemented |
| FR-9.7 | Flex benefit allocation | Implemented |
| FR-9.8 | Asset management with assignment | Implemented |

### FR-10: Learning & Development

| ID | Requirement | Status |
|----|------------|--------|
| FR-10.1 | Course management (LMS) | Implemented |
| FR-10.2 | Course modules with content player | Implemented |
| FR-10.3 | Quiz and assessment | Implemented |
| FR-10.4 | Certificate generation | Implemented |
| FR-10.5 | Learning paths | Implemented |
| FR-10.6 | Training management | Implemented |
| FR-10.7 | Skill gap analysis | Implemented |

### FR-11: Knowledge Management (NU-Fluence)

| ID | Requirement | Status |
|----|------------|--------|
| FR-11.1 | Wiki spaces with pages (TipTap rich text) | Implemented |
| FR-11.2 | Blog posts with categories | Implemented |
| FR-11.3 | Document templates | Implemented |
| FR-11.4 | Full-text knowledge search | Implemented |
| FR-11.5 | AI chat widget (Groq LLM) | Implemented |
| FR-11.6 | Drive integration | Partial |
| FR-11.7 | Social wall with posts, comments, reactions | Implemented |

### FR-12: Platform Features

| ID | Requirement | Status |
|----|------------|--------|
| FR-12.1 | 4-app waffle grid switcher (HRMS, Hire, Grow, Fluence) | Implemented |
| FR-12.2 | App-aware sidebar navigation | Implemented |
| FR-12.3 | Multi-dashboard views (employee, manager, executive) | Implemented |
| FR-12.4 | Approval inbox (cross-module) | Implemented |
| FR-12.5 | Real-time notifications (WebSocket) | Implemented |
| FR-12.6 | Multi-channel notifications (email, SMS, in-app) | Implemented |
| FR-12.7 | Global search | Implemented |
| FR-12.8 | Announcement management | Implemented |
| FR-12.9 | Recognition & rewards | Implemented |
| FR-12.10 | Pulse surveys | Implemented |
| FR-12.11 | Wellness programs | Implemented |
| FR-12.12 | Calendar integration | Implemented |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target | Status |
|----|------------|--------|--------|
| NFR-1.1 | API response time (p95) | < 2 seconds | Monitored |
| NFR-1.2 | Page load time | < 3 seconds | Implemented |
| NFR-1.3 | Database slow query threshold | < 200ms | Configured |
| NFR-1.4 | Concurrent users per tenant | 1,000+ | Designed |
| NFR-1.5 | HPA autoscaling | 2-10 pods | Configured |

### NFR-2: Security

| ID | Requirement | Status |
|----|------------|--------|
| NFR-2.1 | OWASP Top 10 compliance | Implemented |
| NFR-2.2 | CSRF protection (double-submit cookie) | Implemented |
| NFR-2.3 | XSS prevention (HttpOnly cookies, CSP headers) | Implemented |
| NFR-2.4 | SQL injection prevention (parameterized queries, JPA) | Implemented |
| NFR-2.5 | Rate limiting (auth: 5/min, API: 100/min) | Implemented |
| NFR-2.6 | Encryption at rest (AES-256-GCM) | Implemented |
| NFR-2.7 | Encryption in transit (TLS/HTTPS, HSTS) | Implemented |
| NFR-2.8 | Audit logging for all critical operations | Implemented |
| NFR-2.9 | Tenant data isolation (RLS + application layer) | Implemented |
| NFR-2.10 | Security headers (X-Frame-Options, nosniff, Referrer-Policy) | Implemented |
| NFR-2.11 | Trivy security scanning in CI | Implemented |
| NFR-2.12 | Non-root container execution | Implemented |

### NFR-3: Scalability

| ID | Requirement | Status |
|----|------------|--------|
| NFR-3.1 | Horizontal pod autoscaling (CPU 70%, Memory 80%) | Configured |
| NFR-3.2 | Stateless backend (no server-side sessions) | Implemented |
| NFR-3.3 | Redis distributed caching | Implemented |
| NFR-3.4 | Kafka event streaming (async processing) | Implemented |
| NFR-3.5 | Database connection pooling (HikariCP, max 20) | Configured |

### NFR-4: Reliability

| ID | Requirement | Status |
|----|------------|--------|
| NFR-4.1 | Health checks (liveness, readiness, startup) | Implemented |
| NFR-4.2 | Rolling deployments (maxSurge=1, maxUnavailable=0) | Configured |
| NFR-4.3 | Pod anti-affinity (spread across nodes) | Configured |
| NFR-4.4 | Dead letter topics for failed events | Implemented |
| NFR-4.5 | Webhook retry with exponential backoff | Implemented |
| NFR-4.6 | Redis persistence (appendonly) | Configured |
| NFR-4.7 | Graceful shutdown | Implemented |

### NFR-5: Observability

| ID | Requirement | Status |
|----|------------|--------|
| NFR-5.1 | Structured JSON logging (Logstash encoder) | Implemented |
| NFR-5.2 | Prometheus metrics (Micrometer) | Implemented |
| NFR-5.3 | Grafana dashboards (3 dashboards) | Implemented |
| NFR-5.4 | AlertManager with severity routing | Implemented |
| NFR-5.5 | Business metrics (auth, HR ops, payroll, recruitment) | Implemented |
| NFR-5.6 | Correlation IDs for request tracing | Implemented |

### NFR-6: Accessibility

| ID | Requirement | Status |
|----|------------|--------|
| NFR-6.1 | WCAG 2.1 AA compliance | E2E tested |
| NFR-6.2 | Keyboard navigation | Implemented |
| NFR-6.3 | Screen reader support | Partial |
| NFR-6.4 | Responsive design (mobile-first) | Implemented |
| NFR-6.5 | Dark mode support | Implemented |

---

## Compliance Requirements

| ID | Requirement | Status |
|----|------------|--------|
| CR-1 | Indian statutory compliance (PF, ESI, PT, TDS) | Implemented |
| CR-2 | Audit trail for all data modifications | Implemented |
| CR-3 | Soft deletes (no hard data deletion) | Implemented |
| CR-4 | Data encryption at rest and in transit | Implemented |
| CR-5 | Role-based data access (need-to-know) | Implemented |
| CR-6 | Tenant data isolation (no cross-tenant access) | Implemented |
| CR-7 | Compliance checklists and policies | Implemented |
| CR-8 | Policy acknowledgment tracking | Implemented |
