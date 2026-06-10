# NU-AURA — Product Requirements Document

| | |
|---|---|
| **Status** | Current (supersedes `docs/prd/nu-aura-prd.md`, 2026-05-13) |
| **Owner** | NULogic Platform Team |
| **Scope** | NU-AURA platform: NU-HRMS, NU-Hire, NU-Grow, NU-Fluence |

## 1. Vision

NU-AURA is the internal operating system for NULogic. It replaces KEKA (the incumbent HR
vendor) and consolidates four previously siloed tools — HR operations, recruitment,
performance/learning, and knowledge — into one platform with **one login, one design
language, and one backend**. It is built for NULogic as the first tenant and architected as
a multi-tenant SaaS so external tenants can be onboarded without re-architecture.

Brand voice: *calm, capable, quietly confident* — Linear-like density, explicitly not
Salesforce clutter, not Workday gray, not generic purple-gradient SaaS.

## 2. Goals and success metrics

| ID | Goal | Measure |
|----|------|---------|
| G1 | Replace KEKA entirely for NULogic | All HR workflows executed in NU-AURA; KEKA contract terminated |
| G2 | Onboard the first external tenant | Tenant live with isolated data, billing-ready |
| G3 | Zero P0 security findings | SOC 2 Type I ready; quarterly scans clean at Critical level |
| G4 | GDPR DSR production-ready | Art. 15/17/20 fulfilled within 30-day SLA |
| G5 | Payroll accuracy | < 2% payroll error rate per cycle |
| G6 | Employee satisfaction | NPS ≥ 40 from employee users |

## 3. Users and personas

**Primary**

1. **Employees** — check attendance, request leave, view payslips, complete reviews, read
   the wiki. Mobile-first usage with fragmented attention; the platform must surface the
   current task and hide everything else one click away.
2. **HR & People Ops** — run payroll, manage lifecycle (onboarding → exit), configure
   policies, process approvals. Desk-bound, long sessions; density and keyboard efficiency
   matter.
3. **Hiring managers & recruiters** — manage requisitions, pipelines, interviews,
   scorecards, offers. High context-switching; need fast pipeline views.

**Secondary**

4. **Department leads** — NU-Grow reviews, OKRs, 1:1s for their teams.
5. **Knowledge contributors** — author and curate NU-Fluence wiki/blog content.
6. **Finance** — payroll execution, expense approval, statutory filings.
7. **Candidates** (external, unauthenticated) — career page, offer portal, e-signature.

## 4. Product scope — the four sub-apps

### 4.1 NU-HRMS (core HR)

Employee master data and lifecycle; attendance (multi check-in/out, biometric ingest,
geo-fence-ready, auto-regularization); shifts and rosters (patterns, swaps); leave
(policies, accrual, carry-forward, comp-off, restricted holidays); payroll (India-first
statutory engine); expenses and travel (OCR-assisted claims, mileage); compensation and
salary revisions; loans and benefits; contracts and letters; assets; documents
(Google Drive-backed); helpdesk; announcements; org management (entities, departments,
designations, locations, org tree).

### 4.2 NU-Hire (recruitment)

Requisitions and job postings (with job-board sync: Naukri, Indeed, LinkedIn); candidate
and applicant tracking; interview scheduling and scorecards; recruitment agencies; offers
and the public offer portal; e-signature; background verification (BGV); referral program;
preboarding and onboarding journeys (role-based task templates); public career page.

### 4.3 NU-Grow (performance & learning)

Review cycles (360-degree, bell-curve calibration); goals and OKRs with check-ins;
continuous feedback; performance improvement plans; probation evaluations; LMS (courses,
enrollments, quizzes); training; engagement surveys; recognition; wellness challenges;
1:1 meetings.

### 4.4 NU-Fluence (knowledge)

Wiki (spaces, pages, versions, comments, likes, edit locks); blogs; templates;
Elasticsearch-backed full-text search; AI chat over content; company wall (social feed,
trending).

### 4.5 Platform (cross-cutting)

Authentication (password, Google OAuth 2.0, SAML2 SSO, TOTP MFA); RBAC and data scoping;
approval workflow engine (definitions → steps → instances → escalation → delegation);
notifications (in-app, email, SMS, webhooks, WebSocket real-time); analytics and report
builder with scheduled exports; bulk data import; feature flags; public/external API with
API-key auth; admin and tenant self-service configuration; GDPR DSR tooling.

## 5. Functional requirements (selected, by module)

Requirement IDs follow the module conventions used in sprint planning.

### Payroll (PAY)

- **PAY-01** Monthly INR payroll with statutory deductions: PF (12%, capped at ₹15k wage
  base), ESI (Reg. 40), PT (state-specific), TDS (incl. §87A rebate), LWF.
- **PAY-02** Gratuity per Payment of Gratuity Act §4(2) including the 240-day rule.
- **PAY-03** Bonus per Payment of Bonus Act 1965 (§1(3)(ii), §10–§13).
- **PAY-04** Mid-month joiner proration; full-and-final settlement with leave encashment,
  gratuity, and notice recovery.
- **PAY-05** Component formulas via SpEL with DAG-ordered evaluation; runs are
  transactional and processed asynchronously on a serialized Kafka topic.
- **PAY-06** Year-end tax declarations with encrypted proof upload (PII columns AES-GCM).
- **PAY-07** Statutory strategy seam: India active; UK/US calculators are explicit
  skeletons that fail fast (`UnsupportedOperationException`) until implemented.

### Attendance (ATT)

- **ATT-01** Multiple check-in/out per day, evaluated in the tenant's IANA timezone.
- **ATT-02** Biometric device ingest via Kafka every 2 minutes, scheduler-locked.
- **ATT-03** Auto-regularization of missing punches (scheduled, ShedLock-guarded).
- **ATT-04** Comp-off accrual with auto-approval rules.
- **ATT-05** Shift swap workflow; restricted-holiday booking with minimum-notice rules.
- **ATT-06** Sanitized bulk import (formula-injection-safe Excel/CSV handling).

### Leave (LEA)

- **LEA-01** Tenant-defined accrual rules; monthly accrual scheduler is distributed-lock
  guarded so multi-pod deployments cannot double-credit.
- **LEA-02** Encashment caps, including max-encashable-at-exit.
- **LEA-03** Half-day validation; mid-month joiner proration.

### GDPR Data Subject Rights (DSR)

- **DSR-01** Art. 15 access: JSON export of all PII for a subject.
- **DSR-02** Art. 17 erasure: anonymize PII while preserving payroll records under the
  Indian 7-year legal hold (§139A); anonymized accounts are rejected at login and SSO.
- **DSR-03** Art. 20 portability: structured JSON export with schema.
- **DSR-04** 30-day SLA tracked on the DSR request record; SHA-256 integrity stamp on all
  exports.

### Multi-tenancy (TEN)

- **TEN-01** Shared database, shared schema; `tenant_id UUID NOT NULL` on every table.
- **TEN-02** PostgreSQL Row-Level Security as the database-enforced isolation layer, in
  addition to application-layer filtering (defense in depth).
- **TEN-03** Tenant context propagates through async jobs, Kafka consumers, and scheduled
  tasks — never inferred from request state alone.
- **TEN-04** Per-tenant country (ISO 3166-1) and timezone (IANA) drive all date logic via
  `TenantTimeService`.

### RBAC (SEC)

- **SEC-01** 9 canonical roles (SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE,
  RECRUITER, FINANCE, plus legacy SYSTEM_ADMIN and HR sub-roles) + custom roles per tenant.
- **SEC-02** 500+ `MODULE:ACTION` permission strings checked at the controller layer.
- **SEC-03** Data scoping: ALL / LOCATION / DEPARTMENT / TEAM / SELF / CUSTOM. An empty
  scope yields zero rows — it never silently falls back to SELF.

## 6. Non-functional requirements

### Performance (targets; not yet validated at scale)

| Metric | Target |
|--------|--------|
| API p95 (list endpoints, 50 RPS, 500-employee tenant) | < 300 ms |
| API p99 (read endpoints) | < 800 ms |
| Payroll run end-to-end (500 employees) | < 2 h |
| Wiki search p95 (Elasticsearch + pg_trgm fallback) | < 400 ms |
| First-load JS | < 300 KB gzipped |
| Cold JVM startup | < 90 s |
| Graceful shutdown | < 60 s |

### Scalability & reliability

- Horizontal scaling: backend HPA 2–10 replicas (70% CPU / 80% memory), frontend 2–5.
- Optional read-replica routing for read-only transactions.
- Availability target 99.9%; RTO 4 h; RPO 1 h (hourly WAL shipping, Redis snapshots every
  30 min); quarterly DR drills.
- All 25 scheduled jobs guarded by ShedLock against multi-pod duplicate execution.
- Scale ceiling: row-level multi-tenancy is sized for ~100–500 tenants before sharding
  would be considered.

### Security & compliance

- OWASP-aligned controls at every layer (see [architecture/security.md](architecture/security.md)).
- GDPR (EU) and Indian DPDP Act: compliant. SOC 2 Type II: audit in progress.
  ISO 27001: roadmap.
- India statutory payroll compliance as in §5 PAY requirements.

### Accessibility & design

- WCAG 2.1 AA on all interactive surfaces; visible focus rings; `prefers-reduced-motion`
  collapses all animation to 0 ms; status is always color + label + icon.
- Desktop-first compact sizing (36 px controls); 44×44 px tap targets on touch.
- Design system "Studio Slate v2": tinted neutrals, single blue accent `#2563EB`, flat
  3-tier shadows, Montserrat/Open Sans/Roboto Mono. Authoritative spec: `DESIGN.md` and
  `frontend/AURA_CONTRACT.md`.

## 7. Out of scope (non-goals)

- Multi-currency payroll UI (schema exists; UI intentionally not wired).
- UK/US statutory payroll calculation (skeletons fail fast by design).
- Database sharding (single shared PG instance until tenant count demands otherwise).
- Native mobile apps (responsive web with dedicated mobile API endpoints instead).
- Form 16 / Form 24Q statutory exports (planned next; not in current release).

## 8. Current maturity and release criteria

| Sub-app | Maturity | Gate to "done" |
|---------|----------|----------------|
| NU-HRMS | ~98% | Form 16/24Q exports; payroll error rate < 2% over two live cycles |
| NU-Hire | ~97% | Agency billing reconciliation polish |
| NU-Grow | ~92% | Calibration UX hardening; LMS reporting |
| NU-Fluence | ~90% | AI chat quality pass; search relevance tuning |

**Release gating (platform-wide):** backend test suite green (4,000+ tests via
Testcontainers), Flyway V0→latest clean-apply, frontend lint/typecheck/build green,
Trivy CRITICAL gate clean, gitleaks clean, RLS regression guard
(`RlsTenantGucScopeTest`) green. Deployment gates and environments are detailed in
[operations.md](operations.md).
