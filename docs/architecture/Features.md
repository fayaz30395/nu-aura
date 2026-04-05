# NU-AURA Platform — Feature Inventory & Completion Status

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Overall Completion: ~90%

| Sub-App        | Completion | Backend | Frontend |
|----------------|------------|---------|----------|
| **NU-HRMS**    | 93%        | ~95%    | ~91%     |
| **NU-Hire**    | 92%        | ~94%    | ~90%     |
| **NU-Grow**    | 91%        | ~93%    | ~89%     |
| **NU-Fluence** | 85%        | ~88%    | ~82%     |
| **Platform**   | 95%        | ~96%    | ~94%     |

---

## Module-Level Completion

| Module                  | Backend | Frontend | Overall | Notes                                      |
|-------------------------|---------|----------|---------|--------------------------------------------|
| **Auth & RBAC**         | 97%     | 93%      | 95%     | MFA, Google SSO, data scoping all working  |
| **Employee Mgmt**       | 97%     | 93%      | 95%     | 40+ fields, hierarchy, custom fields       |
| **Performance + PIP**   | 96%     | 94%      | 95%     | Reviews, 360, OKRs, 9-box, calibration     |
| **Dashboard**           | 95%     | 95%      | 95%     | Employee, manager, executive views         |
| **Admin Panel**         | 96%     | 94%      | 95%     | Roles, holidays, shifts, custom fields     |
| **Leave**               | 95%     | 91%      | 93%     | Accrual, encashment, policies              |
| **Payroll**             | 95%     | 91%      | 93%     | SpEL engine, statutory, bulk processing    |
| **Attendance**          | 94%     | 90%      | 92%     | Mobile, shift swap, comp-off, auto-reg     |
| **Analytics/Reports**   | 94%     | 90%      | 92%     | Scheduled reports, org health              |
| **Recruitment ATS**     | 94%     | 90%      | 92%     | Kanban, AI parsing, job boards             |
| **Resource Allocation** | 93%     | 91%      | 92%     | Workload, capacity, conflicts              |
| **FnF/Offboarding**     | 93%     | 91%      | 92%     | Exit interview, clearance, settlement      |
| **Projects**            | 93%     | 91%      | 92%     | Tasks, Gantt, calendar, resource conflicts |
| **Expenses**            | 92%     | 88%      | 90%     | Claims, approval workflow                  |
| **Loans**               | 92%     | 88%      | 90%     | Application, repayment tracking            |
| **Travel**              | 92%     | 88%      | 90%     | Requests, approval                         |
| **Assets**              | 92%     | 88%      | 90%     | Assignment, transfer tracking              |
| **Settings**            | 92%     | 88%      | 90%     | System config, security settings           |
| **Onboarding**          | 91%     | 89%      | 90%     | Templates, tasks, preboarding portal       |
| **Training/LMS**        | 90%     | 86%      | 88%     | Courses, quizzes, certificates, paths      |
| **Fluence/Knowledge**   | 88%     | 82%      | 85%     | Wiki, blogs, templates, AI chat            |
| **Documents**           | 88%     | 82%      | 85%     | Upload, workflow, e-signature              |
| **Benefits**            | 85%     | 75%      | 80%     | Plans, enrollment, claims, flex allocation |
| **NU-Fluence (full)**   | -       | -        | Phase 2 | Drive integration pending                  |

---

## Feature Detail by Sub-App

### NU-HRMS Features

#### Employee Management

- [x] Employee CRUD (40+ profile fields)
- [x] Employee directory with search/filter/sort
- [x] Organizational hierarchy view
- [x] Dotted-line manager relationships
- [x] Employee skills tracking
- [x] Talent profiles + journey tracking
- [x] Custom fields (admin-defined)
- [x] Bulk data import (Keka format)
- [x] Employee lifecycle events (Kafka)
- [ ] Employee self-service portal (partial)

#### Attendance

- [x] Clock-in/clock-out (web + mobile)
- [x] Attendance regularization
- [x] Shift management + swap requests
- [x] Compensatory off (comp-off)
- [x] Team attendance view
- [x] Mobile attendance with geolocation
- [x] Holiday calendar
- [x] Auto-regularization scheduler
- [ ] Biometric integration (not planned)

#### Leave

- [x] Leave request + approval workflow
- [x] Leave balance tracking (per type)
- [x] Leave type configuration
- [x] Leave policy management
- [x] Monthly leave accrual (Cron)
- [x] Leave calendar view
- [x] Leave encashment
- [ ] Carry-forward rules (partial)

#### Payroll

- [x] Salary structure (SpEL formulas)
- [x] Monthly payroll run
- [x] Payslip generation + PDF export
- [x] Statutory components (PF, ESI, PT, TDS)
- [x] Leave deductions (LOP)
- [x] Salary revision management
- [x] Bulk payroll processing
- [x] Payroll approval workflow
- [x] Tax declarations
- [ ] Bank file generation (partial)

#### Finance

- [x] Expense claims with receipt upload
- [x] Expense approval workflow
- [x] Employee loans + repayment
- [x] Travel requests + approval
- [x] Asset assignment + transfer
- [x] Benefits enrollment
- [x] Flex benefit allocation
- [ ] Budget management (partial)

### NU-Hire Features

#### Recruitment

- [x] Job posting CRUD
- [x] Kanban pipeline (drag-and-drop)
- [x] Applicant tracking with stages
- [x] Interview scheduling
- [x] Offer letter generation
- [x] Job board integration (Naukri, LinkedIn, Indeed)
- [x] AI resume parsing (Groq LLM)
- [x] Employee referral program
- [x] Public careers page
- [ ] Video interview integration (not yet)

#### Onboarding

- [x] Onboarding process with task checklists
- [x] Configurable templates
- [x] Preboarding portal (public, token-based)
- [x] Document collection
- [ ] Automated welcome emails (partial)

#### Offboarding

- [x] Exit interview management
- [x] Full & final settlement (FnF)
- [x] Exit clearance workflow
- [x] Probation period tracking

### NU-Grow Features

#### Performance

- [x] Review cycles (configurable periods)
- [x] 360-degree feedback
- [x] OKR management
- [x] PIP (Performance Improvement Plans)
- [x] 9-box calibration matrix
- [x] Competency-based reviews
- [x] 1-on-1 meetings

#### Learning

- [x] Course management (LMS)
- [x] Course modules + content player
- [x] Quiz and assessment
- [x] Certificate generation
- [x] Learning paths
- [x] Training management
- [x] Skill gap analysis

#### Engagement

- [x] Employee recognition + rewards
- [x] Pulse surveys
- [x] Wellness programs + challenges
- [x] Social wall (posts, comments, reactions)
- [x] Announcements

### NU-Fluence Features

#### Knowledge Management

- [x] Wiki spaces with rich text pages (TipTap)
- [x] Blog posts with categories
- [x] Document templates
- [x] Full-text knowledge search
- [x] AI chat widget (Groq LLM)
- [x] Content access control
- [ ] Drive integration (Phase 2)
- [ ] Real-time collaborative editing (Phase 2)
- [ ] Version history (partial)

### Platform Features

- [x] 4-app waffle grid switcher
- [x] App-aware sidebar navigation
- [x] Multi-dashboard views (3 dashboards)
- [x] Approval inbox (cross-module)
- [x] Real-time notifications (WebSocket)
- [x] Multi-channel notifications (email, SMS, in-app)
- [x] Global search
- [x] Dark mode
- [x] Mobile responsive design
- [x] Contract management + e-signature
- [x] Letter generation (multiple types)
- [x] Help desk / support tickets
- [x] Calendar integration
- [x] Compliance checklists
- [x] Scheduled report generation
- [x] Data export (CSV, Excel, PDF)
- [x] Webhook delivery system

---

## Pending / Phase 2

| Feature                               | Priority | Sub-App  |
|---------------------------------------|----------|----------|
| NU-Fluence Drive integration          | High     | Fluence  |
| Real-time collaborative editing       | Medium   | Fluence  |
| Video interview integration           | Medium   | Hire     |
| Biometric attendance integration      | Low      | HRMS     |
| Bank file generation (payroll)        | Medium   | HRMS     |
| Advanced budget management            | Low      | HRMS     |
| Mobile app (React Native)             | Medium   | Platform |
| SSO SAML/OIDC support                 | High     | Platform |
| Multi-language (i18n)                 | Medium   | Platform |
| Custom report builder (drag-and-drop) | Medium   | HRMS     |
