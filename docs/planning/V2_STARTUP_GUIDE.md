# NU-AURA V2.0 — Startup & Execution Guide

**Date:** March 26, 2026
**Baseline:** Wave 11 (commit 2c91050d on main)
**Target:** V2.0 Core Gap Closure — Q2 2026
**Benchmark:** KEKA HRMS feature parity + NU-AURA differentiation

---

## 1. Pre-Flight Checklist

Before starting any V2 wave, verify the environment is healthy.

### 1.1 Infrastructure Startup

```bash
# 1. Start Docker services (Redis, Kafka, Zookeeper, Elasticsearch, MinIO, Prometheus)
docker-compose up -d

# 2. Verify all containers are running
docker-compose ps

# 3. Start backend (Spring Boot on port 8080)
cd backend && ./start-backend.sh

# 4. Start frontend (Next.js on port 3000)
cd frontend && npm run dev
```

### 1.2 Health Checks

| Service | URL / Command | Expected |
|---------|---------------|----------|
| Frontend | `http://localhost:3000` | Login page renders |
| Backend | `http://localhost:8080/actuator/health` | `{"status":"UP"}` |
| Redis | `redis-cli ping` | `PONG` |
| Kafka | `docker-compose logs kafka \| tail -5` | No errors |
| Elasticsearch | `curl http://localhost:9200/_cluster/health` | `"status":"green"` or `"yellow"` |
| MinIO | `http://localhost:9001` | MinIO console loads |

### 1.3 Database State

```bash
# Verify Flyway migrations are applied
cd backend && ./mvnw flyway:info -Dflyway.configFiles=src/main/resources/application.yml
```

**Expected:** V0–V79 applied. Next migration = **V80**.

### 1.4 Demo Login Credentials

| Role | Email | Notes |
|------|-------|-------|
| SUPER_ADMIN | admin@nulogic.com | Full access, bypasses all RBAC |
| HR_MANAGER | hr@nulogic.com | HR module admin |
| MANAGER | manager@nulogic.com | Team management |
| EMPLOYEE | employee@nulogic.com | Self-service only |

**Tenant:** NuLogic (`660e8400-e29b-41d4-a716-446655440001`)

---

## 2. V2.0 Wave Execution Plan

### Wave Overview

| Wave | Theme | Items | Est. Days | Dependencies |
|------|-------|-------|-----------|-------------|
| **12** | Backend-Without-Frontend Pages | 5 | 3–5 | None (all APIs exist) |
| **13** | Compliance & Statutory Depth | 7 | 8–10 | Payroll engine stable |
| **14** | LMS + NU-Fluence Completion | 6 | 8–10 | Elasticsearch running |
| **15** | Advanced Leave + Payroll | 8 | 8–10 | Wave 13 (statutory) |
| **16** | Security + Infra Hardening | 7 | 10–15 | All prior waves |

**Total: ~40–50 engineering days**

---

## 3. Wave 12 — Backend-Without-Frontend Pages

**Goal:** Wire 5 existing backend APIs to new frontend pages. Highest ROI — zero backend work needed.

**Parallel Strategy:** Each page is independent. Run up to 5 agents simultaneously.

### 12.1 Audit Trail UI

| Field | Value |
|-------|-------|
| Route | `/admin/audit-logs` |
| Backend | `AuditLogController` + Kafka `nu-aura.audit` topic |
| Effort | M (5–10 days) |
| Agent Directory | `frontend/app/admin/audit-logs/` |

**Requirements:**
- Searchable/filterable log viewer (who, what, when, entity, action)
- Date range picker, entity type filter, action type filter
- Pagination (server-side, 50 per page)
- Export to CSV/Excel (ExcelJS)
- Data retention controls (admin setting)

**API Endpoints to Consume:**
```
GET /api/v1/audit-logs?page=0&size=50&entity=EMPLOYEE&action=UPDATE&from=2026-01-01&to=2026-03-26
GET /api/v1/audit-logs/{id}
GET /api/v1/audit-logs/stats  (if available)
```

**UI Pattern:** Table with filters sidebar (similar to `/employees` page pattern).

### 12.2 1-on-1 Meetings

| Field | Value |
|-------|-------|
| Route | `/performance/1-on-1` |
| Backend | `OneOnOneMeetingController`, `MeetingController` |
| Types | `frontend/lib/types/meeting.ts` (exists) |
| Service | `frontend/lib/services/meeting.service.ts` (exists) |
| Effort | M |
| Agent Directory | `frontend/app/performance/1-on-1/` |

**Requirements:**
- Meeting list (upcoming, past, recurring)
- Create/schedule meeting modal (React Hook Form + Zod)
- Agenda builder (Tiptap rich text)
- Action item tracking with assignee + due date
- Recurring meeting configuration
- Link to performance review cycle

**UI Pattern:** List view with side panel detail (similar to `/approvals` pattern).

### 12.3 Probation Management

| Field | Value |
|-------|-------|
| Route | Embed in `/employees/[id]` as new tab |
| Backend | `ProbationController` (7 DTOs, `ProbationPeriod`, `ProbationEvaluation` entities) |
| Effort | M |
| Agent Directory | `frontend/app/employees/[id]/_tabs/ProbationTab.tsx` |

**Requirements:**
- Probation status timeline (start → evaluation → extension/confirmation/termination)
- Evaluation form (manager fills, HR approves)
- Extension flow with reason and new end date
- Confirmation letter generation trigger (OpenPDF backend)
- Dashboard widget showing probation expiring in 30/60/90 days

### 12.4 Budget Planning

| Field | Value |
|-------|-------|
| Route | `/finance/budget` |
| Backend | `BudgetPlanningController`, `BudgetScenario`, `HeadcountBudget`, `HeadcountPosition` entities |
| Effort | M |
| Agent Directory | `frontend/app/finance/budget/` |

**Requirements:**
- Budget dashboard with fiscal year selector
- Scenario modeling (best/base/worst case)
- Headcount planning grid (department × month)
- Variance analysis (budget vs actual)
- Charts: budget allocation by department (Recharts)
- Export to Excel (ExcelJS)

### 12.5 Overtime Management

| Field | Value |
|-------|-------|
| Route | Embed in `/attendance` as new tab or `/attendance/overtime` |
| Backend | `OvertimeManagementController` |
| Effort | S (3–5 days) |
| Agent Directory | `frontend/app/attendance/overtime/` |

**Requirements:**
- Overtime request form (date, hours, reason)
- Approval flow (uses generic approval engine)
- Overtime report by employee/department/month
- Policy configuration (max hours, multiplier rates)

---

## 4. Wave 13 — Compliance & Statutory Depth

**Goal:** Close the #1 gap vs KEKA for Indian market. This is the P0 critical path.

**Parallel Strategy:** 3 agents — compliance UI, statutory backend engines, statutory reports.

### 13.1 Compliance Dashboard

| Field | Value |
|-------|-------|
| Route | `/compliance` (replace 22-line placeholder) |
| Backend | `ComplianceController` (exists) |
| Effort | M |

**Requirements:**
- Statutory checklist (PF, ESI, PT, LWF, TDS — status per month)
- Labor law adherence tracker
- Regulatory filing calendar (month view with due dates)
- Audit readiness score (percentage gauge)
- Action items list with assignees

### 13.2 Statutory File Generation (Backend)

**New endpoints needed on existing controllers:**

| Feature | Controller | Endpoint | Output |
|---------|-----------|----------|--------|
| ECR file | `ProvidentFundController` | `POST /api/v1/pf/ecr-generate` | Text file (ECR format) |
| Form 16 | `TDSController` | `POST /api/v1/tds/form16/{employeeId}` | PDF (OpenPDF) |
| Form 16A | `TDSController` | `POST /api/v1/tds/form16a/{employeeId}` | PDF |
| Form 24Q | `TDSController` | `POST /api/v1/tds/form24q?quarter=Q4&fy=2025-26` | Text file |
| LWF calculation | New `LWFController` | `GET /api/v1/lwf/calculate?month=3&year=2026` | JSON |
| PT slab calc | `ProfessionalTaxController` | `GET /api/v1/pt/calculate?state=KA&gross=50000` | JSON |
| PF remittance | `ProvidentFundController` | `POST /api/v1/pf/remittance-file` | Text file |
| ESI remittance | `ESIController` | `POST /api/v1/esi/remittance-file` | Text file |

### 13.3 Statutory Reports

| Report | Route | Data Source |
|--------|-------|-------------|
| PF Register | `/reports/statutory/pf-register` | PF contributions table |
| ESI Register | `/reports/statutory/esi-register` | ESI contributions table |
| PT Register | `/reports/statutory/pt-register` | PT deductions table |
| TDS Summary | `/reports/statutory/tds-summary` | TDS calculations |

**UI Pattern:** Table with month/year filter + export to Excel/PDF.

---

## 5. Wave 14 — LMS + NU-Fluence Completion

**Goal:** Remove all "coming soon" placeholders and mock data fallbacks.

### 14.1 LMS Video Player

| Field | Value |
|-------|-------|
| Route | `/learning/courses/[id]/play` (exists, needs enrichment) |
| Backend | Course content served via MinIO |
| Library | HTML5 `<video>` + HLS.js (check `package.json` first) |
| Effort | M |

**Requirements:**
- Video player with progress tracking (save last position)
- Chapter/section navigation sidebar
- Playback speed control (0.5x–2x)
- Completion callback to backend on finish
- Replace "Video not available" placeholder

### 14.2 LMS Quiz Engine

| Field | Value |
|-------|-------|
| Route | Inline in course player (after video sections) |
| Backend | `QuizController` (exists) |
| Effort | M |

**Requirements:**
- Multiple choice, true/false, multiple select question types
- Timer per quiz (optional, configurable)
- Score calculation + pass/fail threshold
- Retry policy (configurable max attempts)
- Certificate generation on course completion
- Replace "Quiz engine coming soon" placeholder

### 14.3 NU-Fluence Mock Data Removal

| Field | Value |
|-------|-------|
| File | `frontend/lib/data/mock-fluence.ts` |
| Effort | S |

**Steps:**
1. Verify each Fluence API endpoint returns data (wiki, blogs, templates, drive, search)
2. Remove mock data imports from all Fluence pages
3. Delete `mock-fluence.ts`
4. Add proper empty states where no content exists yet

### 14.4 NU-Fluence Wall Enrichment

| Field | Value |
|-------|-------|
| Route | `/fluence/wall` (currently 87 lines) |
| Effort | S |

**Requirements:**
- Activity feed (recent wiki edits, blog posts, comments)
- Post composer (text + image upload via MinIO)
- Like/react to posts
- @mention support
- Infinite scroll pagination

### 14.5 NU-Fluence Drive Enhancement

| Field | Value |
|-------|-------|
| Route | `/fluence/drive` (currently 240 lines) |
| Effort | M |

**Requirements:**
- Folder create/rename/delete
- File upload with drag-and-drop (`@hello-pangea/dnd`)
- File preview (PDF, images, documents)
- Sharing permissions (view/edit per user or team)
- Storage usage indicator

### 14.6 Resource Management API Fix

| Field | Value |
|-------|-------|
| Routes | `/resources`, `/resources/capacity`, `/resources/availability`, `/resources/workload`, `/resources/pool` |
| Backend | `ResourceManagementController`, `ResourceController`, `ResourceConflictController` |
| Effort | S |

**Steps:**
1. Hit each resource API endpoint directly, identify the 500 error root cause
2. Check database schema — verify tables exist and have data
3. Fix service layer errors
4. Remove "API Not Available" error states from frontend
5. Verify all 5 pages render with real data

---

## 6. Wave 15 — Advanced Leave + Payroll Enrichment

**Goal:** Feature parity on leave/payroll — KEKA's core strength area.

### 15.1 Leave Engine Enhancements

| Feature | Description | Effort |
|---------|-------------|--------|
| Sandwich rule | Auto-deduct weekends/holidays between leave days. Config per leave type. | S |
| Restricted holidays | Optional holiday pool. Employee picks N from list. | S |
| Leave encashment | Calculate encashment amount based on basic salary. Trigger on separation or year-end. | M |
| Carry-forward rules | Max cap per leave type. Auto-lapse excess on April 1. | S |
| Negative balance policy | Allow/deny negative balance per leave type. Alert threshold. | S |

**Backend location:** Extend existing leave service classes in `backend/src/main/java/com/hrms/application/leave/`.

### 15.2 Payroll Enrichment

| Feature | Description | Effort |
|---------|-------------|--------|
| Salary structure builder | Visual component dependency editor. Currently 59 lines — needs full CRUD. | M |
| Bulk processing review | Complete the review step in `BulkProcessingWizard`. Currently shows "Coming Soon". | S |
| Bank file generation | Generate NEFT/RTGS files for SBI, HDFC, ICICI, Axis. Template-based. | M |

**Bank file format:**
```
SBI: Fixed-width text (Record Type + Account No + Amount + Name)
HDFC: CSV (Beneficiary Code, Account No, Amount, IFSC, Name)
ICICI: Pipe-delimited (similar to HDFC)
```

---

## 7. Wave 16 — Security + Infrastructure Hardening

**Goal:** Production-readiness for V2.0 launch.

### 16.1 Security Enhancements

| Feature | Location | Effort |
|---------|----------|--------|
| Account lockout (5 failed attempts → 30 min lock) | `JwtAuthenticationFilter` + `User` entity (add `locked_until` column) | S |
| MFA enforcement policy | Tenant settings → force MFA for all/admin/none | M |
| Session management UI | `/settings/security` → active sessions, revoke, sign out all | S |

**Migration needed:** V80 — add `locked_until TIMESTAMP`, `failed_login_count INT` to users table.

### 16.2 Manager Dashboard Completion

| Field | Value |
|-------|-------|
| Route | `/dashboards/manager` (860 lines, some widgets show "coming soon") |
| Effort | S |

**Steps:**
1. Identify which widgets still show error/placeholder states
2. Wire remaining widgets to API endpoints
3. Add team project allocation widget (uses new Wave 11 API)

### 16.3 Responsive Design Audit

| Field | Value |
|-------|-------|
| Scope | All 200 page routes |
| Effort | L |

**Approach:**
1. Define breakpoints: mobile (< 640px), tablet (640–1024px), desktop (> 1024px)
2. Audit critical paths first: login, dashboard, employee list, leave apply, attendance clock-in
3. Convert data tables to card view on mobile (`@media` queries or Tailwind responsive)
4. Touch targets: minimum 44px (already enforced in design system)
5. Sidebar: collapse to bottom nav on mobile

### 16.4 CI/CD Pipeline

| Stage | Tool | Action |
|-------|------|--------|
| Lint | GitHub Actions | `npm run lint` + `./mvnw checkstyle:check` |
| Test | GitHub Actions | `npm test` + `./mvnw test` (JaCoCo 80% gate) |
| Build | Google Cloud Build | `npm run build` + `./mvnw package -DskipTests` |
| Deploy Staging | GKE | Apply K8s manifests to staging namespace |
| E2E | Playwright | Run 52 E2E specs against staging |
| Deploy Prod | GKE | Promote staging image to prod namespace |
| Rollback | GKE | `kubectl rollout undo` on failure |

### 16.5 Kubernetes Hardening

| Config | Value |
|--------|-------|
| HPA | min 2, max 10 replicas, CPU target 70% |
| PDB | minAvailable: 1 (ensure zero-downtime deploys) |
| Resource limits | Backend: 512Mi–1Gi RAM, 500m–1000m CPU |
| Resource limits | Frontend: 256Mi–512Mi RAM, 250m–500m CPU |
| Secrets | GCP Secret Manager (replace K8s secrets) |
| Network policies | Deny all ingress except from ingress controller |

### 16.6 Monitoring Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Payroll Processing | Run duration, success/failure rate, avg employees/run |
| Approval Workflow SLA | Time-to-approve by type, escalation rate, bottleneck steps |
| Login Activity | Success/failure rate, MFA adoption, lockout events |
| API Latency | P50/P95/P99 by endpoint, error rate by module |

---

## 8. Flyway Migration Plan

| Wave | Migration | Description |
|------|-----------|-------------|
| 13 | V80 | LWF tables + PT state slab config |
| 13 | V81 | Statutory filing calendar + compliance checklist tables |
| 15 | V82 | Leave sandwich rule config, restricted holidays pool |
| 15 | V83 | Leave encashment policy + carry-forward config |
| 16 | V84 | Account lockout fields on users table |
| 16 | V85 | MFA enforcement policy on tenant_settings |

---

## 9. Testing Strategy Per Wave

| Wave | Backend Tests | Frontend Tests | E2E |
|------|--------------|----------------|-----|
| 12 | Unit tests for new service methods | Component tests for new pages | 5 new Playwright specs |
| 13 | Unit tests for all statutory calculations | — | 3 specs (ECR, Form 16, compliance) |
| 14 | Quiz engine tests, video progress API tests | Fluence page rendering tests | 4 specs (LMS flow, wiki CRUD) |
| 15 | Leave rule engine tests (sandwich, encashment) | — | 3 specs (leave apply with rules) |
| 16 | Auth lockout tests, MFA flow tests | Responsive snapshot tests | 2 specs (login lockout, MFA) |

**JaCoCo gate:** 80% minimum on all new code (excludes DTOs, entities, config).

---

## 10. Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Flyway migration conflicts (multiple waves in parallel) | High | Assign migration numbers upfront. Each wave gets a reserved range. |
| Resource management API root cause unknown | Medium | Investigate in Wave 14 first — may need schema changes. |
| Statutory calculations incorrect | Critical | Validate against KEKA/government published slabs. Add parameterized tests with real-world data. |
| LMS video serving latency from MinIO | Medium | Use CDN or pre-signed URLs with caching headers. |
| Responsive design breaks existing desktop layouts | Medium | Desktop-first approach. Use `min-width` breakpoints. Never remove desktop styles. |
| CI/CD pipeline blocks dev velocity | Medium | Pipeline runs on PR merge only, not on every push. Keep < 10 min. |

---

## 11. Definition of Done — V2.0

V2.0 is ready for launch when ALL of these are true:

- [ ] All "coming soon" placeholders removed from codebase
- [ ] All "API Not Available" error states resolved
- [ ] Mock data files deleted (`mock-fluence.ts`)
- [ ] 15 backend modules have frontend pages (currently 15 without)
- [ ] India statutory compliance: ECR, Form 16, Form 24Q generate correctly
- [ ] LMS video player and quiz engine functional
- [ ] NU-Fluence fully wired to live API (no mock fallback)
- [ ] Account lockout + MFA enforcement active
- [ ] CI/CD pipeline runs green end-to-end
- [ ] JaCoCo coverage >= 80% on all new code
- [ ] No P0/P1 bugs open in QA regression
- [ ] All 8 demo accounts can complete their primary workflow

---

## 12. Quick Reference — Key Files

| Purpose | Path |
|---------|------|
| Flyway migrations | `backend/src/main/resources/db/migration/V*.sql` |
| Backend controllers | `backend/src/main/java/com/hrms/api/*/controller/` |
| Backend services | `backend/src/main/java/com/hrms/application/*/service/` |
| Frontend pages | `frontend/app/*/page.tsx` |
| API hooks | `frontend/lib/hooks/queries/` |
| Service files | `frontend/lib/services/` |
| Type definitions | `frontend/lib/types/` |
| Sidebar config | `frontend/components/layout/menuSections.tsx` |
| Route config | `frontend/lib/config/routes.ts` |
| App mapping | `frontend/lib/config/apps.ts` |
| Security config | `backend/src/main/java/com/hrms/common/config/SecurityConfig.java` |
| Docker services | `docker-compose.yml` (root) |
| K8s manifests | `deployment/kubernetes/` |
| Monitoring | `monitoring/` (Prometheus, Grafana, AlertManager) |

---

*Document generated: March 26, 2026*
*Baseline: Wave 11 (2c91050d) — 200 pages, 143 controllers, 265 entities*
*Target: V2.0 Core Gap Closure — Q2 2026*
