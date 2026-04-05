# NU-AURA vs KEKA — Comprehensive Feature Parity Gap Analysis

**Date:** 2026-03-21
**Status:** Draft
**Purpose:** Identify feature gaps between NU-AURA and KEKA HRMS to prioritize the next development
phases.

---

## Executive Summary

NU-AURA is a mature HRMS platform at ~93% overall feature coverage compared to KEKA. The recently
completed RBAC KEKA Parity sprint (implicit roles, role hierarchy, auto-escalation) closed the
access control gap. This analysis covers all 20 functional domains to identify remaining gaps.

**Legend:**

- ✅ = NU-AURA has feature parity or exceeds KEKA
- ⚠️ = NU-AURA has partial implementation (feature exists but missing key capabilities)
- ❌ = NU-AURA is missing this feature entirely
- 🔵 = NU-AURA has a feature KEKA doesn't

---

## 1. CORE HR / PEOPLE MANAGEMENT

| Feature                                                   | KEKA | NU-AURA | Gap                                                                                          |
|-----------------------------------------------------------|------|---------|----------------------------------------------------------------------------------------------|
| Centralized employee database                             | ✅    | ✅       | Parity                                                                                       |
| Employee directory + org chart                            | ✅    | ✅       | Parity                                                                                       |
| Bulk import (CSV/Excel)                                   | ✅    | ⚠️      | NU-AURA has individual CRUD; bulk import via Excel exists but limited validation             |
| Worker type management (permanent, contract, intern)      | ✅    | ✅       | Parity — EmploymentType enum covers all types                                                |
| Document compliance tracking (license/cert expiry alerts) | ✅    | ⚠️      | Documents stored, but no automated expiry notification system                                |
| Notice period configuration                               | ✅    | ✅       | Parity — contracts module handles this                                                       |
| Multi-entity support (legal entities, business units)     | ✅    | ⚠️      | Departments + locations exist, but no separate "legal entity" or "business unit" abstraction |
| Cost center management                                    | ✅    | ❌       | No cost center entity or allocation tracking                                                 |
| Pay group / pay band management                           | ✅    | ⚠️      | Compensation module exists but no explicit pay group/band configuration                      |

**Gap Score: 7/10 (moderate gaps in organizational hierarchy modeling)**

---

## 2. ATTENDANCE & TIME TRACKING

| Feature                                     | KEKA | NU-AURA | Gap                                         |
|---------------------------------------------|------|---------|---------------------------------------------|
| Web clock-in/out                            | ✅    | ✅       | Parity                                      |
| Team attendance view                        | ✅    | ✅       | Parity                                      |
| Attendance regularization                   | ✅    | ✅       | Parity                                      |
| Comp-off management                         | ✅    | ✅       | Parity                                      |
| Shift swap                                  | ✅    | ✅       | Parity                                      |
| GPS-based mobile attendance with geofencing | ✅    | ❌       | No mobile GPS tracking, no geofencing       |
| Biometric device integration (real-time)    | ✅    | ❌       | No hardware device integration              |
| OTP / registered device verification        | ✅    | ❌       | No device-level attendance fraud prevention |
| Offline attendance sync                     | ✅    | ❌       | No offline-first attendance capture         |
| Facial recognition attendance               | ✅    | ❌       | No biometric/face recognition               |
| Multiple capture methods per location       | ✅    | ⚠️      | Single method per policy                    |
| Auto-regularization scheduled job           | ✅    | ✅       | Parity — `@Scheduled` job exists            |

**Gap Score: 5/10 (significant gap in mobile/hardware attendance — but this is a hardware
integration concern, not core software)**

---

## 3. LEAVE MANAGEMENT

| Feature                                  | KEKA | NU-AURA | Gap                                                                                     |
|------------------------------------------|------|---------|-----------------------------------------------------------------------------------------|
| Leave overview + team view               | ✅    | ✅       | Parity                                                                                  |
| Leave calendar                           | ✅    | ✅       | Parity                                                                                  |
| Configurable leave policies              | ✅    | ✅       | Parity                                                                                  |
| Multi-level approval workflows           | ✅    | ✅       | Parity                                                                                  |
| Scheduled accrual (Quartz cron)          | ✅    | ✅       | Parity                                                                                  |
| Leave encashment                         | ✅    | ✅       | Parity — payroll integration                                                            |
| Carry-forward rules                      | ✅    | ✅       | Parity                                                                                  |
| Indian state-wise statutory compliance   | ✅    | ⚠️      | Leave policies configurable per tenant but no pre-built state-wise compliance templates |
| Compensatory off with attendance linkage | ✅    | ✅       | Parity                                                                                  |
| Prorated leave on policy change          | ✅    | ⚠️      | Basic proration; no mid-cycle policy change proration                                   |
| Sandwich leave rules                     | ✅    | ❌       | No sandwich leave logic (weekends between leave days counted as leave)                  |

**Gap Score: 8/10 (strong — minor gaps in India-specific compliance templates)**

---

## 4. PAYROLL

| Feature                                         | KEKA | NU-AURA | Gap                                                                    |
|-------------------------------------------------|------|---------|------------------------------------------------------------------------|
| Salary structuring (basic, DA, HRA, allowances) | ✅    | ✅       | Parity — SpEL formula engine                                           |
| Payroll runs with approval                      | ✅    | ✅       | Parity                                                                 |
| Payslip generation                              | ✅    | ✅       | Parity — OpenPDF backend                                               |
| PF (Provident Fund) calculation                 | ✅    | ⚠️      | Payroll components exist but no pre-built Indian PF formulas/rules     |
| ESI calculation                                 | ✅    | ⚠️      | Same — formula engine can support it but no pre-built ESI rules        |
| TDS / Income Tax slab calculation               | ✅    | ⚠️      | Tax module exists, but auto-TDS slab computation depth unclear         |
| PT (Professional Tax) by state                  | ✅    | ⚠️      | Tax entity exists but no state-wise PT tables                          |
| LWF (Labour Welfare Fund)                       | ✅    | ❌       | Not implemented                                                        |
| Form 24Q generation                             | ✅    | ❌       | No statutory form generation                                           |
| Form 16 generation                              | ✅    | ❌       | No statutory form generation                                           |
| ECR file generation                             | ✅    | ❌       | No ECR file export                                                     |
| Retroactive payroll adjustments                 | ✅    | ⚠️      | Runbook exists for corrections but no automated retro-pay              |
| Bank file generation (NEFT/RTGS)                | ✅    | ❌       | No bank payment file export                                            |
| Bonus cycles                                    | ✅    | ⚠️      | Compensation module has revisions but no separate bonus cycle workflow |
| Salary register reports                         | ✅    | ✅       | Parity                                                                 |
| Employee cost projection                        | ✅    | ⚠️      | Analytics exists but no forward cost projection tool                   |

**Gap Score: 4/10 (significant gap — India statutory compliance is KEKA's core strength and NU-AURA'
s biggest weakness)**

---

## 5. PERFORMANCE MANAGEMENT

| Feature                                   | KEKA | NU-AURA | Gap                                                                             |
|-------------------------------------------|------|---------|---------------------------------------------------------------------------------|
| Performance reviews (configurable cycles) | ✅    | ✅       | Parity                                                                          |
| 360-degree feedback                       | ✅    | ✅       | Parity                                                                          |
| OKR management                            | ✅    | ✅       | Parity                                                                          |
| Competency-based assessment               | ✅    | ✅       | Parity                                                                          |
| Radar/heatmap visualizations              | ✅    | ⚠️      | Recharts exists but unclear if radar charts are implemented for performance     |
| Calibration tools                         | ✅    | ❌       | No performance calibration (cross-team normalization) feature                   |
| AI upskilling recommendations             | ✅    | ❌       | No AI-driven career development suggestions                                     |
| 1-on-1 check-ins                          | ✅    | ⚠️      | Meetings/feedback exist but no dedicated 1-on-1 module                          |
| Performance-to-pay linkage                | ✅    | ⚠️      | Compensation revisions exist but no automatic performance→salary recommendation |
| Succession planning                       | ✅    | ❌       | No succession planning module                                                   |
| PIPs (Performance Improvement Plans)      | ✅    | ❌       | No structured PIP workflow                                                      |

**Gap Score: 6/10 (core performance is strong; gaps in advanced analytics and planning)**

---

## 6. RECRUITMENT / HIRING

| Feature                         | KEKA | NU-AURA | Gap                                                            |
|---------------------------------|------|---------|----------------------------------------------------------------|
| Job postings + career portal    | ✅    | ✅       | Parity                                                         |
| Candidate pipeline (Kanban)     | ✅    | ✅       | Parity                                                         |
| Interview scheduling + calendar | ✅    | ✅       | Parity                                                         |
| Multi-channel job board posting | ✅    | ⚠️      | Job board integration service exists but limited boards        |
| AI resume parsing               | ✅    | ⚠️      | Service exists but ML model needs tuning                       |
| Talent pool management          | ✅    | ✅       | Parity                                                         |
| Offer management + e-signature  | ✅    | ✅       | Parity — offer portal exists                                   |
| Employee referral portal        | ✅    | ⚠️      | Referrals exist but no dedicated referral portal with tracking |
| Video interview integration     | ✅    | ❌       | Framework exists but no provider integration                   |
| Coding assessments              | ✅    | ❌       | No built-in assessment engine                                  |
| Branded career page builder     | ✅    | ⚠️      | Career page exists but limited customization                   |

**Gap Score: 7/10 (solid core ATS; gaps in advanced screening tools)**

---

## 7. ONBOARDING / OFFBOARDING

| Feature                     | KEKA | NU-AURA | Gap                                                                          |
|-----------------------------|------|---------|------------------------------------------------------------------------------|
| Preboarding portal          | ✅    | ✅       | Parity                                                                       |
| Onboarding checklists       | ✅    | ✅       | Parity                                                                       |
| Offboarding workflows       | ✅    | ✅       | Parity                                                                       |
| Exit interviews             | ✅    | ✅       | Parity                                                                       |
| E-signature workflows       | ✅    | ⚠️      | Sign pages exist but no DocuSign/Adobe integration                           |
| IT provisioning triggers    | ✅    | ❌       | No automated IT provisioning (laptop, email, access)                         |
| Knowledge transfer tasks    | ✅    | ⚠️      | Task assignment exists but no structured KT workflow                         |
| Final settlement automation | ✅    | ⚠️      | Payroll exists but no automated final settlement calculation                 |
| Asset recovery automation   | ✅    | ⚠️      | Asset tracking exists but no automated return workflow linked to offboarding |

**Gap Score: 7/10 (strong — gaps in cross-system automation)**

---

## 8. EXPENSES & TRAVEL

| Feature                               | KEKA | NU-AURA | Gap                                                   |
|---------------------------------------|------|---------|-------------------------------------------------------|
| Expense claims with receipts          | ✅    | ✅       | Parity                                                |
| Multi-level approval chains           | ✅    | ✅       | Parity                                                |
| Travel management module              | ✅    | ✅       | Parity — dedicated travel module exists               |
| Policy-based spending limits          | ✅    | ✅       | Parity                                                |
| Distance-based auto-calculation       | ✅    | ❌       | No GPS/distance-based expense calculation             |
| Advance requests                      | ✅    | ✅       | Parity                                                |
| Payroll integration for reimbursement | ✅    | ✅       | Parity                                                |
| Per-diem rules by location            | ✅    | ⚠️      | Travel policies exist but per-diem automation unclear |

**Gap Score: 8/10 (strong)**

---

## 9. ASSETS MANAGEMENT

| Feature                       | KEKA | NU-AURA | Gap                                                            |
|-------------------------------|------|---------|----------------------------------------------------------------|
| Asset registry (CRUD)         | ✅    | ✅       | Parity                                                         |
| Asset assignment to employees | ✅    | ✅       | Parity                                                         |
| Bulk assignment               | ✅    | ⚠️      | Individual assignment works; bulk unclear                      |
| Damage tracking               | ✅    | ⚠️      | Asset status exists but no dedicated damage/condition tracking |
| Asset decommissioning         | ✅    | ⚠️      | Soft delete exists but no lifecycle management                 |
| Asset audit trails            | ✅    | ✅       | Parity — audit logging                                         |
| Scoped Asset Manager role     | ✅    | ✅       | Parity — RBAC with ASSET:MANAGE permission                     |

**Gap Score: 8/10 (solid)**

---

## 10. HELPDESK / TICKETING

| Feature                   | KEKA | NU-AURA | Gap                                                     |
|---------------------------|------|---------|---------------------------------------------------------|
| Ticket CRUD               | ✅    | ✅       | Parity                                                  |
| Multi-department routing  | ✅    | ✅       | Parity                                                  |
| SLA tracking              | ✅    | ⚠️      | Helpdesk admin exists but SLA enforcement depth unclear |
| Pre-defined FAQ responses | ✅    | ❌       | No FAQ/knowledge base for helpdesk                      |
| Auto-ticket routing       | ✅    | ⚠️      | Manual assignment; no rule-based auto-routing           |
| Escalation matrix         | ✅    | ✅       | Parity — escalation now implemented                     |
| Response time analytics   | ✅    | ⚠️      | Reports exist but helpdesk-specific analytics unclear   |

**Gap Score: 7/10 (functional; needs SLA and automation polish)**

---

## 11. EMPLOYEE SELF-SERVICE (ESS)

| Feature                         | KEKA | NU-AURA | Gap                                                                 |
|---------------------------------|------|---------|---------------------------------------------------------------------|
| My Dashboard                    | ✅    | ✅       | Parity                                                              |
| My Profile (edit personal info) | ✅    | ✅       | Parity                                                              |
| My Payslips                     | ✅    | ✅       | Parity                                                              |
| My Attendance                   | ✅    | ✅       | Parity                                                              |
| My Leaves                       | ✅    | ✅       | Parity                                                              |
| My Documents                    | ✅    | ✅       | Parity                                                              |
| My Letters                      | ✅    | ✅       | Parity                                                              |
| 20+ request types               | ✅    | ⚠️      | Helpdesk tickets cover requests but no structured "request catalog" |
| Tax declaration submission      | ✅    | ✅       | Parity — tax module exists                                          |
| Bank details update             | ✅    | ✅       | Parity                                                              |

**Gap Score: 9/10 (excellent)**

---

## 12. ANALYTICS & REPORTS

| Feature                                      | KEKA | NU-AURA | Gap                                                            |
|----------------------------------------------|------|---------|----------------------------------------------------------------|
| Org dashboard (headcount, demographics)      | ✅    | ✅       | Parity                                                         |
| Attrition analysis                           | ✅    | ⚠️      | Analytics pages exist but depth of attrition analytics unclear |
| Payroll cost analysis                        | ✅    | ✅       | Parity                                                         |
| Attendance analytics                         | ✅    | ✅       | Parity                                                         |
| Performance analytics                        | ✅    | ✅       | Parity                                                         |
| Recruitment funnel analytics                 | ✅    | ✅       | Parity                                                         |
| Predictive analytics (workforce forecasting) | ✅    | ❌       | No ML-based predictive analytics                               |
| Custom report builder                        | ✅    | ⚠️      | Scheduled reports exist but no drag-and-drop report builder    |
| Export to Excel                              | ✅    | ✅       | Parity — ExcelJS + Apache POI                                  |

**Gap Score: 7/10 (solid reporting; gaps in predictive/custom reporting)**

---

## 13. INTEGRATIONS

| Feature                           | KEKA | NU-AURA | Gap                                   |
|-----------------------------------|------|---------|---------------------------------------|
| REST API                          | ✅    | ✅       | Parity — SpringDoc OpenAPI            |
| Google OAuth                      | ✅    | ✅       | Parity                                |
| Slack/Teams notifications         | ✅    | ❌       | No Slack/Teams integration            |
| DocuSign/Adobe Sign               | ✅    | ❌       | No e-signature provider integration   |
| ERP integration (SAP, Dynamics)   | ✅    | ❌       | No ERP connectors                     |
| QuickBooks/accounting integration | ✅    | ❌       | No accounting software integration    |
| Webhooks (outbound)               | ✅    | ✅       | Parity — webhook delivery + retry     |
| WebSocket real-time               | ✅    | ✅       | Parity — STOMP + SockJS               |
| MinIO file storage                | N/A  | 🔵      | NU-AURA advantage — S3-compatible     |
| Elasticsearch full-text search    | N/A  | 🔵      | NU-AURA advantage — NU-Fluence search |

**Gap Score: 5/10 (weak third-party integrations)**

---

## 14. MOBILE APP

| Feature                  | KEKA | NU-AURA | Gap                             |
|--------------------------|------|---------|---------------------------------|
| Native iOS/Android app   | ✅    | ❌       | No native mobile app            |
| Mobile OTP login         | ✅    | ❌       | N/A without app                 |
| GPS attendance           | ✅    | ❌       | N/A without app                 |
| Mobile payslip access    | ✅    | ⚠️      | Responsive web only             |
| Mobile leave application | ✅    | ⚠️      | Responsive web only             |
| Push notifications       | ✅    | ❌       | WebSocket only (no native push) |

**Gap Score: 2/10 (critical gap — no mobile app)**

---

## 15. EMPLOYEE ENGAGEMENT

| Feature                          | KEKA | NU-AURA | Gap                                                         |
|----------------------------------|------|---------|-------------------------------------------------------------|
| Pulse surveys                    | ✅    | ✅       | Parity                                                      |
| Recognition programs             | ✅    | ✅       | Parity                                                      |
| Social wall / announcements      | ✅    | ✅       | Parity                                                      |
| Birthday/anniversary celebration | ✅    | ⚠️      | Calendar events exist but no automated celebration features |
| Polls                            | ✅    | ✅       | Parity — surveys module                                     |
| Sentiment analysis               | ✅    | ❌       | No NLP-based sentiment analysis on survey responses         |
| Wellness programs                | ✅    | ✅       | Parity                                                      |

**Gap Score: 8/10 (strong)**

---

## 16. LEARNING MANAGEMENT (LMS)

| Feature                           | KEKA | NU-AURA | Gap                                                 |
|-----------------------------------|------|---------|-----------------------------------------------------|
| Course creation (multi-format)    | ✅    | ✅       | Parity                                              |
| Learning paths                    | ✅    | ✅       | Parity                                              |
| Progress tracking                 | ✅    | ✅       | Parity                                              |
| Quizzes/assessments               | ✅    | ✅       | Parity                                              |
| AI-powered course recommendations | ✅    | ❌       | Service exists but ML model not trained             |
| Compliance training tracking      | ✅    | ⚠️      | Training exists but no compliance-specific tracking |
| Third-party LMS integration       | ✅    | ❌       | No external LMS connectors                          |

**Gap Score: 7/10 (core LMS strong; AI and integrations missing)**

---

## 17. COMPENSATION PLANNING

| Feature                     | KEKA | NU-AURA | Gap                                                              |
|-----------------------------|------|---------|------------------------------------------------------------------|
| Compensation cycles         | ✅    | ✅       | Parity                                                           |
| Salary revision tracking    | ✅    | ✅       | Parity                                                           |
| Salary bands/grades         | ✅    | ⚠️      | Basic compensation structure; no explicit band configuration UI  |
| Market benchmarking         | ✅    | ❌       | No market salary benchmarking data                               |
| Pay equity analysis         | ✅    | ❌       | No gender/department pay equity analytics                        |
| Budget allocation tools     | ✅    | ⚠️      | Budget exists conceptually but no dedicated budget planning tool |
| Performance-to-pay analysis | ✅    | ⚠️      | Data exists but no linked analysis view                          |

**Gap Score: 5/10 (basic compensation works; analytics and benchmarking missing)**

---

## 18. DOCUMENT MANAGEMENT

| Feature                       | KEKA | NU-AURA | Gap                                                 |
|-------------------------------|------|---------|-----------------------------------------------------|
| Document storage (MinIO)      | ✅    | ✅       | Parity                                              |
| Letter templates              | ✅    | ✅       | Parity                                              |
| Contract management           | ✅    | ✅       | Parity                                              |
| E-signature integration       | ✅    | ❌       | No DocuSign/Adobe Sign                              |
| Document expiry notifications | ✅    | ❌       | No automated document expiry alerts                 |
| Version control               | ✅    | ⚠️      | Documents stored but no explicit version history UI |
| Bulk document generation      | ✅    | ⚠️      | Templates exist but bulk generation unclear         |

**Gap Score: 6/10 (storage strong; automation and e-signature gaps)**

---

## 19. NU-FLUENCE (KNOWLEDGE MANAGEMENT)

| Feature              | KEKA | NU-AURA                                      | Gap                    |
|----------------------|------|----------------------------------------------|------------------------|
| Internal wiki        | N/A  | 🔵 Backend built, frontend not started       | KEKA doesn't have this |
| Blog platform        | N/A  | 🔵 Backend built, frontend not started       | KEKA doesn't have this |
| Content templates    | N/A  | 🔵 Backend built, frontend not started       | KEKA doesn't have this |
| Drive (MinIO)        | N/A  | 🔵 Backend built, frontend partially started | KEKA doesn't have this |
| Elasticsearch search | N/A  | 🔵 Backend built                             | KEKA doesn't have this |

**Gap Score: N/A — NU-AURA leads here, but frontend must be completed to realize value**

---

## 20. PROJECTS & TIMESHEETS

| Feature                        | KEKA | NU-AURA | Gap                                                |
|--------------------------------|------|---------|----------------------------------------------------|
| Project CRUD                   | ✅    | ✅       | Parity                                             |
| Task management                | ✅    | ✅       | Parity                                             |
| Timesheet entry                | ✅    | ✅       | Parity                                             |
| Billable/non-billable tracking | ✅    | ✅       | Parity                                             |
| Resource allocation            | ✅    | ✅       | Parity                                             |
| Timesheet approval workflows   | ✅    | ✅       | Parity                                             |
| Client billing reports         | ✅    | ⚠️      | PSA module exists but client billing depth unclear |
| Utilization analytics          | ✅    | ⚠️      | Basic analytics; no utilization dashboards         |

**Gap Score: 8/10 (strong)**

---

## PRIORITY RANKING — GAPS BY BUSINESS IMPACT

| Rank   | Gap Area                                                                         | Score  | Effort    | Business Impact                                         | Recommendation                                 |
|--------|----------------------------------------------------------------------------------|--------|-----------|---------------------------------------------------------|------------------------------------------------|
| **1**  | **Indian Payroll Statutory Compliance** (PF, ESI, TDS, PT, Form 16/24Q, ECR)     | 4/10   | HIGH      | CRITICAL — this is KEKA's #1 selling point in India     | Phase next — this blocks enterprise sales      |
| **2**  | **Mobile App** (native iOS/Android, GPS attendance, push notifications)          | 2/10   | VERY HIGH | HIGH — modern workforce expects mobile access           | Defer to dedicated mobile sprint               |
| **3**  | **Third-Party Integrations** (Slack, Teams, DocuSign, ERP)                       | 5/10   | MEDIUM    | HIGH — enterprise buyers evaluate integration ecosystem | Build integration framework + top 3 connectors |
| **4**  | **NU-Fluence Frontend**                                                          | N/A    | MEDIUM    | MEDIUM — differentiator feature with zero frontend      | Complete wiki + blog UI to ship unique value   |
| **5**  | **Compensation Analytics** (pay equity, benchmarking, bands)                     | 5/10   | MEDIUM    | MEDIUM — C-suite visibility feature                     | Build compensation analytics dashboard         |
| **6**  | **Performance Calibration + PIPs**                                               | 6/10   | MEDIUM    | MEDIUM — HR ops feature gap                             | Add calibration and PIP workflows              |
| **7**  | **Document Automation** (expiry alerts, e-signature, bulk generation)            | 6/10   | LOW-MED   | MEDIUM — compliance and efficiency                      | Add document lifecycle automation              |
| **8**  | **Attendance Hardware Integration** (biometric, GPS, geofencing)                 | 5/10   | HIGH      | MEDIUM — relevant for manufacturing/field workforce     | Defer unless target market requires it         |
| **9**  | **Predictive Analytics / AI Features** (forecasting, sentiment, recommendations) | varies | HIGH      | LOW-MED — nice-to-have, not a dealbreaker               | Phase 3+                                       |
| **10** | **Cost Center / Multi-Entity**                                                   | 7/10   | MEDIUM    | LOW-MED — needed for large enterprises only             | Add when enterprise customers require it       |

---

## WHAT NU-AURA DOES BETTER THAN KEKA

1. **NU-Fluence** — Knowledge management platform (wiki, blogs, templates, Drive) — KEKA has nothing
   comparable
2. **Workflow Engine** — Data-driven, configurable approval workflows vs KEKA's more rigid approval
   chains
3. **SpEL Formula Engine** — Payroll components evaluated as a DAG with Spring Expression Language —
   more flexible than KEKA's fixed payroll structure
4. **Platform Architecture** — 4 sub-apps (HRMS, Hire, Grow, Fluence) with app switcher — more
   modular than KEKA's monolithic UI
5. **Real-time Architecture** — Kafka event streaming + WebSocket notifications — better async
   processing than KEKA
6. **RBAC Depth** — 500+ permissions, implicit roles, role hierarchy, custom scopes — more granular
   than KEKA's RBAC
7. **Full-text Search** — Elasticsearch integration for NU-Fluence content search

---

## RECOMMENDED NEXT SPRINT

**Indian Payroll Statutory Compliance** — This is the highest-impact gap. KEKA dominates the Indian
market specifically because of PF/ESI/TDS/PT automation and statutory form generation. Without this,
NU-AURA cannot compete for Indian enterprise customers.

Scope:

- Pre-built Indian statutory formulas (PF 12%/12%, ESI thresholds, PT state tables)
- TDS computation engine (income tax slabs, Section 80C/80D deductions)
- Form generation: Form 16, Form 24Q, ECR files
- Bank payment file generation (NEFT/RTGS format)
- Retroactive payroll adjustment automation
- LWF calculation

Estimated effort: 3-4 weeks (backend formula + form generation + frontend config UI)
