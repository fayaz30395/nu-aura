# NU-AURA HRMS Platform — Requirements Overview

**Last Updated:** March 4, 2026
**Status:** Living document — updated as priorities shift
**Audience:** Engineering, Product, QA

---

## 1. What We Are Building

**NU-AURA** is an enterprise-grade, **multi-tenant Human Resource Management System (HRMS)** with integrated Project Management capabilities. It is a Keka-inspired SaaS platform targeting Indian SMEs and mid-market companies.

### Core Value Proposition
- One platform for the full employee lifecycle: hire → onboard → manage → pay → grow → exit
- Multi-tenant SaaS: a single deployment serves multiple organizations with strict data isolation
- Role-aware: 9 roles, 300+ permissions, scope-based data access (not just RBAC but row-level security)
- Modern UX: Compact, Keka-style light theme, responsive across desktop/tablet/mobile

---

## 2. Architecture at a Glance

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.4 / Java 21 — Modular Monolith |
| Frontend | Next.js 14 / TypeScript / Mantine 8.3 / Tailwind |
| Database | PostgreSQL 14+ (row-level tenant isolation) |
| Cache | Redis |
| File Storage | MinIO (S3-compatible) |
| Auth | JWT + Google OAuth 2.0 |
| Real-time | WebSocket via STOMP/SockJS |
| Testing | Playwright (E2E, 140+ specs) + JUnit 5 |
| Infra | Docker, Kubernetes, GCP, CI/CD via Cloud Build |

**Pattern:** Modular Monolith — domain-organized modules (not microservices) with clear separation of API → Application → Domain → Infrastructure layers.

---

## 3. Modules & Completion Status

### Core HR Modules

| Module | Backend | Frontend | Overall | Notes |
|--------|:-------:|:--------:|:-------:|-------|
| Authentication & RBAC | ✅ | ✅ | **95%** | JWT, Google SSO, 9 roles, 300+ permissions |
| Employee Management | ✅ | ✅ | **90%** | Directory, hierarchy, bulk import, org chart |
| Attendance & Time Tracking | ✅ | ✅ | **92%** | Check-in/out, regularization, shifts, bulk import |
| Leave Management | ✅ | ✅ | **93%** | Policies, balances, multi-level approvals, calendar |
| Payroll | ✅ | ✅ | **88%** | Salary structures, payslips, PF/ESI/TDS, bulk run |
| Performance (OKRs/Reviews) | ✅ | ✅ | **85%** | OKRs, 360 feedback, review cycles, appraisals |
| Recruitment / ATS | ✅ | ✅ | **87%** | Job postings, pipeline, interviews, referrals |
| Benefits | ✅ | ✅ | **80%** | Plans, enrollment, eligibility, wellness |
| Expenses | ✅ | ✅ | **90%** | Claims, approvals, payment tracking, analytics |
| Training / LMS | ✅ | ⚠️ | **75%** | Catalog, enrollment; missing progress & assessments |
| Documents | ✅ | ✅ | **85%** | Upload, e-signature, MinIO storage |
| Analytics & Reports | ✅ | ✅ | **88%** | Role dashboards, KPIs, export |
| Settings & Config | ✅ | ✅ | **82%** | Org config, feature flags, notifications |

### Fully Complete Modules (100%)
Onboarding, Pre-boarding, Offboarding, Surveys, Asset Management, Loan Management,
Shift Management, Overtime, Recognition (Kudos), Helpdesk, Travel, Wellness, Webhooks, Notifications.

### Project Management Module
| Feature | Status |
|---------|--------|
| Projects & Phases | ✅ 85% |
| Task Management (Kanban) | ✅ 85% |
| Gantt Chart | ✅ 85% |
| Time Tracking / Timesheets | ✅ 85% |
| Resource Allocation | 🔄 In Progress (latest commit) |
| Project Analytics | ✅ 80% |

---

## 4. What's Currently Being Built

### Active Work (as of March 2026)
**Project Resource Allocation** — The last commit (`4965c26`) was "changes for project allocation start". This is a P2 item being actively developed.

Scope:
- Allocate employees to projects (full-time, part-time %, temporary)
- Capacity planning: resource availability calendar, over-allocation alerts
- Utilization forecasting and skill-based assignment
- Integration with timesheet and project analytics

---

## 5. Prioritized Backlog

### P0 — Critical (Block on Release)

| Item | Description |
|------|-------------|
| **Recruitment ATS Entity** | Add `Applicant` entity, full application pipeline/status, end-to-end API + UI |
| **Implicit Role Automation** | Auto-assign reporting-manager/manager scopes based on org hierarchy (currently manual) |
| **Offer Management + E-Signature** | Offer letter templates, e-signing flow, status tracking, candidate acceptance |

### P1 — High Priority

| Item | Description |
|------|-------------|
| Reporting UI Parity | Wire all existing HRMS report APIs into complete frontend views |
| Manager/HR Dashboards | Bring to full parity — actions + insights, not just basic cards |
| Attendance + Leave Integration | Reconcile workflows: auto-updates, conflict rules, carry-over visibility |
| Expense Approval Workflow | Complete approver chain and decision tracking |
| Google Drive Integration | Org-wide backend integration + policy controls (frontend is client-only today) |
| OWASP Security Hardening | Sweep for OWASP top-10 vulnerabilities |
| Fix Backend Test Errors | RoleScope/RolePermission test utilities no longer match domain — fix compilation errors |

### P2 — Medium Priority

| Item | Description |
|------|-------------|
| **Project Resource Allocation** | (IN PROGRESS — see §4) |
| Mobile PWA (GPS Geofencing) | GPS-validated attendance check-in for mobile |
| Social Engagement | Social wall, pulse survey UI, kudos refinements |
| Onboarding + Document UI Polish | Complete remaining UI flows |
| Project Templates + Import/Export | Template management for project setup |
| Timesheet Locking Enhancements | Beyond basic locking: lock periods, manager unlock |
| Performance Optimization | Large dataset handling, Redis caching strategy |
| Mobile Responsiveness | UI improvements across modules |
| E2E Test Coverage | Edge cases, auth setup performance improvements |

### P3 — Low Priority

| Item | Description |
|------|-------------|
| Helpdesk SLA Automation | Auto-escalation, SLA breach alerts |
| 9-Box Grid | Succession planning visualization in Performance module |
| ATS Job Board Integrations | LinkedIn / Naukri integration |
| Operational Playbooks | Incident runbooks for ops team |

---

## 6. Key Functional Requirements (by Domain)

### 6.1 Authentication & Multi-Tenancy
- JWT access tokens (1-hour TTL) + refresh tokens (24-hour TTL) via HTTP-only cookies
- Google OAuth 2.0 / OIDC with optional domain restriction (Google Workspace)
- Tenant identification via UUID in request context (`X-Tenant-ID`)
- Row-level isolation: every table has `tenant_id` FK; queries auto-filtered at service layer
- 9 roles: SUPER_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE, FINANCE_MANAGER, DEPT_MANAGER, PROJECT_MANAGER, REPORTING_MANAGER, + guest-level scoped access
- Scope levels: GLOBAL → LOCATION → DEPARTMENT → TEAM → OWN

### 6.2 Employee Management
- Employee profile: personal info, employment details, bank/statutory details
- Lifecycle: Onboarding → Probation → Confirmed → Exit
- Directory with global search + filters + org chart (hierarchy tree)
- Bulk import via CSV/Excel; bulk export
- Self-service profile editing (P2 — missing)

### 6.3 Attendance
- Web check-in/out, mobile PWA (GPS), IP-based auto (office network whitelist)
- Shift types: Fixed, Rotational, Flexible, Night shift
- Regularization workflow (employee request → manager approval)
- Bulk import via Excel
- Reports: daily summary, monthly, dept-wise, trend analysis, export

### 6.4 Leave
- Configurable leave types with accrual/carry-over/lapse rules
- Multi-level approval chain (L1: Reporting Mgr → L2: Dept Head → HR Override)
- Leave calendar view (team visibility)
- Real-time balance with projected balance after pending requests

### 6.5 Payroll (India-specific)
- Salary structure: Basic, HRA, Special Allowance, Conveyance, Medical, Bonus, OT
- Deductions: PF (12% of Basic), ESI, Professional Tax (state slabs), TDS
- Payroll run lifecycle: Draft → Processed → Approved → Locked → Payslip generated
- PDF payslip with company branding + YTD summaries
- Statutory compliance: PF returns, Form 16 (TDS)

### 6.6 Performance Management
- OKR cascade: Company → Department → Team → Individual
- Review cycles: Annual, Mid-year, Quarterly, Probation
- 360° feedback: Self, Manager, Peers, Direct Reports, Cross-functional
- 9-box grid for talent matrix (P3 — succession planning)
- Appraisals: rating finalization, increment/promotion recommendations, letter generation

### 6.7 Recruitment / ATS
- Job requisition → posting (internal board + external career page)
- Pipeline: Applied → Screened → Phone Screen → Technical → HR → Final → Offered → Hired/Rejected
- Interview scheduling + panel assignment + feedback collection
- Offer letter generation + e-signature (P0)
- Employee referral program
- AI-assisted candidate screening (planned)

### 6.8 Project Management
- Project types: Client (billable), Internal, Support, R&D
- Task hierarchy: Project → Phase/Milestone → Task → Subtask
- Kanban board (drag-and-drop status), Gantt chart (timeline + dependencies + critical path)
- Timesheets: daily entry, project/task selection, billable flag, weekly submission + approval
- Resource allocation: full-time/part-time/temporary, capacity calendar, over-allocation alerts (in progress)
- Project analytics: budget vs actual, utilization, burndown charts

### 6.9 Notifications
- In-app (real-time via WebSocket/STOMP), Email (Spring Mail), SMS (Twilio)
- Event types: leave approvals, attendance anomalies, payslip availability, task assignments, deadlines
- User-configurable channel preferences per notification type

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | OWASP top-10 compliance, rate limiting (Bucket4j), HTTPS/TLS, audit trail on all changes |
| **Multi-tenancy** | Strict row-level isolation — no cross-tenant data leakage |
| **Performance** | Redis caching, DB indexing, lazy loading, pagination on all lists |
| **Scalability** | Kubernetes HPA, stateless backend, cloud-native (GCP) |
| **Observability** | Prometheus metrics, Grafana dashboards, Spring Actuator health endpoints, structured JSON logs |
| **Accessibility** | WCAG 2.1 compliance targets, semantic HTML, keyboard navigation |
| **Testing** | Unit (80%+ service coverage), Integration (MockMvc), E2E (Playwright, 140+ specs) |
| **API** | REST, versioned (`/api/v1/`), Swagger/OpenAPI documented, 500+ endpoints |
| **Availability** | Health checks via Spring Actuator; K8s liveness/readiness probes |

---

## 8. UX & Design Principles

- **Theme:** Light mode, Keka-inspired compact design system
- **Framework:** Mantine 8.3 + Tailwind CSS 3.4
- **Responsive:** Desktop first, then tablet (iPad Pro), then mobile (Pixel 5, iPhone 13)
- **Icons:** Tabler Icons + Lucide Icons
- **Charts:** Recharts for all data visualizations
- **Forms:** React Hook Form + Zod validation (client-side) + server-side validation
- **State:** Zustand (client state) + TanStack React Query (server state)
- **Real-time:** STOMP WebSocket for live notifications and updates

---

## 9. Constraints & Known Technical Debt

| Constraint | Detail |
|------------|--------|
| Backend test compilation | RoleScope/RolePermission test utilities don't match current domain — P1 fix needed |
| Google Drive integration | Currently client-side only — needs backend org-wide integration (P1) |
| MFA | Not yet implemented (post-launch roadmap) |
| GPS geofencing | Mobile only, PWA feature — not in web (P2) |
| Training/LMS | Video streaming, assessments, certifications — not built (P2) |
| Custom report builder | Ad-hoc reporting — not built (P3 roadmap) |
| Mockito inline mock-maker | Dynamic agent warnings during test runs — tech debt item |

---

## 10. Immediate Development Focus (Next Sprint)

Based on the current commit history and backlog priorities:

1. **Complete Project Resource Allocation** (P2, actively in progress)
   - Finish allocation backend APIs
   - Build allocation UI (assignment modal, capacity calendar, utilization view)
   - Connect to project analytics

2. **Fix Recruitment ATS Entity** (P0)
   - Add `Applicant` domain entity + repository
   - Complete candidate pipeline API
   - Wire up ATS UI

3. **Implicit Role Automation** (P0)
   - Auto-assign reporting-manager/manager scopes on org hierarchy changes
   - Trigger on: employee creation, manager change, department change

---

## 11. Test Credentials (Local Dev)

```
Email:    admin@demo.com
Password: password
Tenant:   550e8400-e29b-41d4-a716-446655440000
API:      http://localhost:8080
Frontend: http://localhost:3000
Swagger:  http://localhost:8080/swagger-ui.html
```

---

*For detailed API specs see [API_SPECIFICATIONS.md](./API_SPECIFICATIONS.md)*
*For DB schema see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)*
*For pending work see [BACKLOG.md](./BACKLOG.md)*
*For implementation status see [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)*
