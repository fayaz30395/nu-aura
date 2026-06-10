# NU-AURA Architecture Audit — Findings

**Date:** 2026-06-09 | **Role:** Auditor-Architecture (read-only) | **Scope:** backend/src/main/java (1,840 java), frontend/app (264 pages)
**Method:** static metrics (wc -l, import-grep), cross-checked vs `docs/adr/` and `docs/architecture/architecture-scorecard.md`.

---

## Summary counts

- **Java files > 800 LOC:** 10
- **Frontend files > 800 LOC:** 147 (of which 50 are `page.tsx` route components, plus `menuSections.tsx`)
- Backend service layer: 216 `*Service.java` files. No controller→repository direct calls. No `application → api.*controller` imports.

---

## God classes (file | LOC)

### Backend (top 15 by LOC; bold = >800 maintainability risk)

| File | LOC |
|------|-----|
| **application/auth/service/AuthService.java** | **1287** |
| **application/workflow/service/WorkflowService.java** | **1217** |
| **application/exit/service/ExitManagementService.java** | **961** |
| **application/expense/service/ExpenseClaimService.java** | **949** |
| **application/survey/service/SurveyAnalyticsService.java** | **923** |
| **application/letter/service/LetterService.java** | **915** |
| **application/recruitment/service/RecruitmentManagementService.java** | **914** |
| **application/user/service/RoleManagementService.java** | **856** |
| **application/report/service/ReportGenerationService.java** | **854** |
| **common/security/RoleHierarchy.java** | **824** |
| common/exception/GlobalExceptionHandler.java | 782 |
| application/employee/service/EmployeeService.java | 775 |
| application/benefits/service/BenefitEnhancedService.java | 768 |
| application/esignature/service/ESignatureService.java | 755 |
| application/analytics/service/PredictiveAnalyticsService.java | 750 |

10 files exceed the 800-LOC guideline (CLAUDE.md: keep files <500; common rules: 800 max).

### Frontend (top 15 by LOC — all > 800, all flagged)

| File | LOC |
|------|-----|
| app/one-on-one/page.tsx | 1766 |
| app/dashboard/page.tsx | 1491 |
| app/expenses/page.tsx | 1449 |
| app/employees/page.tsx | 1444 |
| app/recruitment/interviews/page.tsx | 1404 |
| app/letters/page.tsx | 1394 |
| app/fluence/wiki/[slug]/page.tsx | 1306 |
| components/layout/menuSections.tsx | 1299 |
| app/assets/page.tsx | 1284 |
| app/import-export/page.tsx | 1274 |
| app/projects/page.tsx | 1256 |
| app/employees/[id]/edit/page.tsx | 1252 |
| app/performance/360-feedback/page.tsx | 1236 |
| app/recruitment/pipeline/page.tsx | 1202 |
| app/employees/[id]/page.tsx | 1160 |

The frontend is the dominant maintainability risk: 147 files >800 LOC vs 10 on the backend. These route components mix data fetching, form state, table rendering, modals, and business logic in a single file — the project's own web coding-style rule (organize by feature, extract components) is systematically violated here.

---

## Coupling risks (sampled top 5 services)

| Service | final deps | public methods | Risk |
|---------|-----------|----------------|------|
| AuthService (1287 LOC) | 15 | 12 | High fan-in: auth + lockout + password-history + captcha + RLS-sync + tenant-time + metrics in one class. Single change-magnet for the most security-sensitive path. |
| WorkflowService (1217 LOC) | 13 | 24 | 24 public methods spanning definition CRUD, execution engine, approval actions, delegation, dashboard, escalation. `processApprovalAction` spans lines 638–884 (~246 LOC single method). Multiple responsibilities → low cohesion. |
| ExitManagementService (961 LOC) | 8 | **39** | 39 public methods — clearest god service by surface area. Exit workflow, clearance, FnF, interviews likely all collapsed into one class. |
| ExpenseClaimService (949 LOC) | 12 | 27 | Claim lifecycle + policy + RLS GUC management interleaved. |
| RecruitmentManagementService (914 LOC) | 12 | 26 | Broad recruitment surface in a single aggregate service. |

Notes:
- All use constructor injection (`private final`, 0 `@Autowired` field injection) — that part is healthy.
- The risk is **method-count / responsibility breadth**, not DI style. ExitManagementService (39 methods) and WorkflowService (24 methods, 246-LOC method) are the strongest split candidates.

---

## Layering violations

**No hard inversions found** (good news):
- `api/` controllers importing `*.repository.*`: **0**
- `application/` importing `com.nulogic.api.*controller`: **0**

**Soft smell (MEDIUM):** 129 `application/*` files import from `com.nulogic.api.*` — but breakdown shows these are **DTO-only** imports (`api.employee.dto` ×26, `api.recruitment.dto` ×22, `api.analytics.dto` ×19, etc.). The service layer depends on request/response DTOs that physically live under the `api/` package tree. This is a package-organization inversion, not a runtime layering violation: domain logic is coupled to the web/transport package namespace. Tactically harmless today; it blocks any future extraction of `application` into a transport-agnostic module and muddies the stated `api/ application/ domain/ infrastructure/` layering. Recommendation: relocate request/response records to a neutral `*.dto`/`*.contract` package, or accept and document the convention in an ADR.

---

## ADR conformance

| ADR | Conformance | Evidence |
|-----|-------------|----------|
| ADR-010 Row-Level Security | **CONFORMS** | `MileageService:52`, `ExpenseClaimService:70`, `EmployeeService:69` all use `set_config('app.current_tenant_id', ?, true)` — `true` = transaction-local scope, the correct fix for the pooled-connection cross-tenant leak. No `,false)` session-scoped sites found in service layer. |
| ADR-012 Timezone Handling (Proposed) | **PARTIAL** | 12 `application/*` files still call unzoned `LocalDateTime.now()/LocalDate.now()` instead of `TenantTimeService`. ADR is still "Proposed", so these are tracked gaps, not violations. |
| Scorecard "API Gateway 0/10" | **CONFIRMED GAP** | No gateway; auth/rate-limit/headers handled per-app at edge + Spring Security. Self-stated in scorecard. |
| Scorecard "Domain Separation 9/10" | **OVERSTATED** vs file evidence | Domain packages are clean, but the 9/10 cohesion claim is undercut by the DTO-namespace coupling (129 files) and 39-method god services. |

---

## Architecture Risk Register (ranked)

| RiskID | Severity | Area | Evidence (file:line / LOC) | Recommendation |
|--------|----------|------|----------------------------|----------------|
| ARCH-1 | HIGH | Frontend maintainability | 147 `.tsx` files >800 LOC; one-on-one/page.tsx:1766, dashboard/page.tsx:1491, expenses/page.tsx:1449 | Decompose route pages into feature components/hooks (data layer, table, modals, forms). Set a CI LOC gate (e.g. warn >500, block >900) to stop regression. |
| ARCH-2 | HIGH | Backend god service | ExitManagementService.java (961 LOC, **39 public methods**) | Split by responsibility (exit-process, clearance, FnF, interview) into cohesive services behind a thin facade. |
| ARCH-3 | HIGH | Security change-magnet | AuthService.java:1–1287 (15 deps, 12 methods) | Extract password-policy/history, lockout, captcha, RLS-sync concerns into collaborators; keep AuthService as orchestrator only. Highest-blast-radius file. |
| ARCH-4 | MEDIUM | God service / long method | WorkflowService.java (1217 LOC, 24 methods); processApprovalAction spans 638–884 (~246 LOC) | Separate workflow-definition CRUD from execution engine; extract approval-action state machine into its own component. |
| ARCH-5 | MEDIUM | Package layering inversion | 129 `application/*` files import `com.nulogic.api.*.dto` (employee×26, recruitment×22, analytics×19) | Move shared request/response records out of `api/` into a transport-neutral package; document in an ADR. |
| ARCH-6 | MEDIUM | ADR-012 drift | 12 `application/*` files use unzoned `LocalDateTime.now()/LocalDate.now()` | Route remaining sites through TenantTimeService; promote ADR-012 from Proposed to Accepted once closed. |
| ARCH-7 | MEDIUM | Scalability ceiling | Scorecard "API Gateway 0/10"; monolith, no circuit breakers/gateway | Acceptable at current scale; add Spring Cloud Gateway + resilience patterns before the 500+ tenant threshold the scorecard itself names. |
| ARCH-8 | LOW | Doc/code drift | Scorecard says V0–V119 / 360 entities / 1,622 java; actual V0–V270 / 342 tables / 1,840 java | Refresh architecture-scorecard.md baseline numbers (stale by ~150 migrations). |

---
*Read-only audit. No files modified outside this report. RLS finding cross-verified against MEMORY.md note (commit 0ea63f6e fix confirmed present in source).*
