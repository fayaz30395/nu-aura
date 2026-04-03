---
name: nu-keka-compare
description: Use when building any HRMS feature, when user says "parity check", "does KEKA have X", "build X for HRMS", or when starting work on any NU-HRMS module. Compares NU-HRMS feature coverage against KEKA to ensure migration readiness.
---

# KEKA Feature Parity Check

## When to Use

- Starting work on any NU-HRMS module (attendance, leave, payroll, etc.)
- When the user asks "does KEKA have X?", "parity check", "are we matching KEKA?"
- Before marking any HRMS module as "production-ready"
- When planning a sprint that touches employee-facing HRMS features
- When deciding whether a feature is MVP or nice-to-have for KEKA migration

## Input Required

- **Feature or module name**: what is being built or evaluated (e.g., "attendance regularization", "leave encashment", "payroll statutory")
- **Scope**: specific feature, full module, or cross-module comparison

## Context: Why This Matters

NULogic currently pays for KEKA as its HRMS platform. NU-AURA / NU-HRMS is the internal replacement. For migration to happen, NU-HRMS must match or exceed every KEKA feature that NULogic employees use daily. Features employees rely on in KEKA but that are missing in NU-HRMS are **migration blockers**.

NULogic workforce context: 250+ professionals across Fremont CA, Chennai, Mexico City, and Santiago. Multi-timezone, multi-currency (USD, INR, MXN, CLP), multi-statutory-regime (US federal/state, India PF/ESI/PT/TDS, Mexico IMSS, Chile AFP).

## Steps

### 1. Read the Gap Analysis

Always start by reading the current gap analysis document:

```
File: /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/GAP-ANALYSIS-2026-04-02.md
```

This contains the definitive module-by-module status as of the last audit. Cross-reference any claims about completion against this document.

### 2. KEKA Feature Matrix by Module

For the requested feature/module, compare against KEKA's known capabilities below.

#### Module: Employee Management

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Employee profiles (personal, work, bank, emergency contact) | BUILT - `frontend/app/employees/`, `EmployeeController.java` | At parity |
| Employee directory with search & filter | BUILT - `frontend/app/employees/page.tsx` | At parity |
| Org chart visualization | BUILT - `frontend/app/org-chart/` | At parity |
| Document management (offer letters, ID proofs, tax docs) | BUILT - `DocumentController.java`, `DocumentTemplateController.java` | At parity |
| Custom fields on employee profiles | BUILT - backend supports custom fields | At parity |
| Employee lifecycle (probation, confirmation, exit) | PARTIAL - probation UI is a stub (`frontend/app/probation/page.tsx`) | Needs 1-2 days |
| Employee self-service portal | BUILT - `/me/*` routes | At parity |
| Bulk employee import (CSV/Excel) | BUILT - Apache POI integration | At parity |
| Employee number auto-generation | BUILT | At parity |
| Employment history tracking | BUILT | At parity |

#### Module: Attendance

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Biometric device integration | BUILT - `BiometricDeviceController.java` | At parity |
| GPS/geo-fencing for mobile check-in | BUILT - `MobileAttendanceController.java` | At parity |
| Attendance regularization requests | BUILT - `frontend/app/attendance/` with approval workflow | At parity |
| Shift management & scheduling | BUILT - `frontend/app/shifts/`, shift swap workflow | At parity |
| Comp-off (compensatory off) requests | BUILT - `CompOffController.java` with approval | At parity |
| Holiday management (national + restricted) | BUILT - `HolidayController.java`, multi-location support | At parity |
| Overtime tracking | PARTIAL - `OvertimeController.java` built, frontend stub | Needs 1 day |
| Attendance reports (daily, monthly, summary) | BUILT - `AnalyticsController.java` | At parity |
| Late/early departure tracking | BUILT - attendance rules engine | At parity |
| Work-from-home tracking | BUILT | At parity |
| Multi-location attendance policies | BUILT - `OfficeLocation` entity with timezone | At parity |

#### Module: Leave Management

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Leave types (earned, sick, casual, maternity, etc.) | BUILT - configurable leave types | At parity |
| Leave accrual rules (monthly, yearly, pro-rata) | BUILT - Quartz cron job, `LeaveAdjustmentController.java` | At parity |
| Leave balance tracking | BUILT - `BalanceCalculationController.java` | At parity |
| Leave encashment | BUILT - backend supports encashment policies | At parity |
| Sandwich leave rules (weekend/holiday between leaves) | BUILT - policy engine handles sandwich rules | At parity |
| Comp-off conversion (attendance comp-off to leave) | BUILT - `CompOffController.java` links to leave | At parity |
| Leave approval workflow (multi-level) | BUILT - generic approval engine | At parity |
| Team leave calendar view | BUILT - `frontend/app/leave/` team view | At parity |
| Leave policy by location/grade/department | BUILT - policy assignment rules | At parity |
| Negative leave balance (advance leave) | BUILT - configurable per policy | At parity |
| Holiday list by office location | BUILT - `HolidayController.java` multi-location | At parity |

#### Module: Payroll

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Salary components (basic, HRA, DA, allowances) | BUILT - `SalaryComponentController.java`, SpEL formula engine | At parity |
| Salary structure templates | BUILT - `frontend/app/payroll/` | At parity |
| Payroll processing (monthly run) | BUILT - `PayslipGenerationController.java` | At parity |
| Payslip generation & download (PDF) | BUILT - OpenPDF 2.0.3 backend generation | At parity |
| India statutory: PF, ESI, PT, TDS | PARTIAL - `StatutoryFilingController.java` built, frontend stub | Needs 2-3 days |
| India statutory: Form 16, Form 12BB | PARTIAL - backend supports, frontend needs filing UI | Needs 2-3 days |
| Salary revision & increment cycles | BUILT - `CompensationController.java` | At parity |
| Reimbursements (fuel, phone, food) | BUILT - expense module handles reimbursements | At parity |
| Loan deductions (EMI from salary) | BUILT - `LoanController.java`, `LoanAdjustmentController.java` | At parity |
| Investment declarations (tax saving) | PARTIAL - backend tables exist, frontend basic | Needs 1-2 days |
| Payroll reports (PF register, ESI register, PT register) | PARTIAL - `ReportController.java` supports, templates incomplete | Needs 1-2 days |
| Multi-country payroll (US, India, Mexico, Chile) | BUILT - `GlobalPayrollService.java`, `PayrollLocation` with timezone | At parity |
| Arrears calculation | BUILT - formula engine supports arrears | At parity |
| Full & Final settlement | PARTIAL - `FinalSettlementController.java` built, frontend partial, 10 E2E tests skipped | Needs 2-3 days |

#### Module: Expense Management

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Expense claim creation | BUILT - 9 controllers in expense module | At parity |
| Receipt OCR scanning | BUILT - `OcrReceiptController.java` | Exceeds KEKA |
| Expense policy limits & categories | BUILT - `frontend/app/expenses/` (policies, categories) | At parity |
| Mileage tracking | BUILT - mileage expense type | At parity |
| Advance requests | BUILT - advance approval workflow | At parity |
| Multi-level approval chains | BUILT - generic approval engine | At parity |
| Expense reports | BUILT - `frontend/app/expenses/` reports view | At parity |

#### Module: Asset Management

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Asset allocation & tracking | BUILT - `AssetController.java` | At parity |
| Asset return workflow | BUILT - linked to offboarding | At parity |
| Asset maintenance requests | BUILT - `AssetMaintenanceRequestController.java` | Exceeds KEKA |
| Asset depreciation tracking | BUILT | Exceeds KEKA |
| Asset categories & lifecycle | BUILT | At parity |

#### Module: Helpdesk

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Ticket creation & tracking | BUILT - `frontend/app/helpdesk/` | At parity |
| SLA management | BUILT - SLA rules engine | At parity |
| Category-based routing | BUILT | At parity |
| Knowledge base | BUILT via NU-Fluence wiki | Exceeds KEKA |

#### Module: Reports & Analytics

| KEKA Feature | NU-HRMS Status | Gap |
|---|---|---|
| Headcount analytics | BUILT - `frontend/app/analytics/` | At parity |
| Attendance reports | BUILT | At parity |
| Leave reports | BUILT | At parity |
| Payroll reports | PARTIAL - some templates missing | Needs 1-2 days |
| Custom report builder | BUILT - `ReportController.java` | Exceeds KEKA |
| Export to Excel | BUILT - ExcelJS frontend, Apache POI backend | At parity |

### 3. Assess the Requested Feature

For the specific feature the user is building, output this assessment:

```markdown
## KEKA Parity Assessment: [Feature Name]

### KEKA Capabilities
- [What KEKA offers for this feature — fields, flows, UI elements]
- [Any KEKA-specific behavior NULogic employees depend on]

### NU-HRMS Current State
- [What is already built — reference specific files]
- [Backend status: controller, service, entity, migration]
- [Frontend status: page, components, hooks, forms]
- [E2E test status: covered / partial / missing]

### Gap Assessment
- **Status**: AT PARITY / EXCEEDS / NEEDS WORK / MISSING
- **Migration risk**: LOW / MEDIUM / HIGH / BLOCKER
- **Effort to close gap**: X days

### Must-Have for Migration
- [ ] [Field or flow that NULogic employees use daily in KEKA]
- [ ] [Field or flow that NULogic employees use daily in KEKA]
- [ ] ...

### Nice-to-Have (Exceeds KEKA)
- [ ] [Feature that goes beyond what KEKA offers]
- [ ] ...

### Specific Gaps to Address
1. [Missing field/flow] — [effort] — [file to modify]
2. [Missing field/flow] — [effort] — [file to modify]
```

### 4. Cross-Reference with Codebase

Verify claims by checking actual files:

```bash
# Check if backend controller exists
ls backend/src/main/java/com/hrms/api/{module}/controller/

# Check if frontend page exists and is not a stub
wc -l frontend/app/{route}/page.tsx  # Stubs are typically < 50 lines

# Check if E2E tests exist and are not skipped
grep -r "test.skip\|\.skip(" frontend/e2e/{module}*.spec.ts

# Check if Flyway migrations exist for the module
grep -rl "{module}" backend/src/main/resources/db/migration/
```

### 5. Migration Blocker Assessment

After the feature comparison, classify the overall module:

| Classification | Meaning | Action |
|---|---|---|
| **READY** | At parity or exceeds KEKA on all daily-use features | Safe to migrate this module |
| **ALMOST** | Minor gaps (stubs, missing reports) — no daily-use features blocked | 1-3 days to close, then migrate |
| **BLOCKED** | Key daily-use feature is missing or broken | Must complete before migration |
| **NOT STARTED** | Module does not exist in NU-HRMS | Full build required |

### 6. India-Specific Statutory Compliance Check

Since NULogic has a large India workforce (Chennai office), always check these for payroll/compliance features:

- [ ] **PF (Provident Fund)**: employer/employee contribution calculation, PF register, monthly ECR filing
- [ ] **ESI (Employee State Insurance)**: eligibility check (salary threshold), contribution calculation, ESI return
- [ ] **PT (Professional Tax)**: state-wise slab rates (Tamil Nadu for Chennai), monthly deduction
- [ ] **TDS (Tax Deducted at Source)**: investment declaration, Form 16, Form 12BB, quarterly TDS return
- [ ] **Gratuity**: 5-year eligibility, calculation formula, provision tracking
- [ ] **LWF (Labour Welfare Fund)**: state-wise applicability
- [ ] **Bonus**: Payment of Bonus Act compliance, eligibility, calculation

Backend support: `StatutoryFilingController.java`, `TaxFilingController.java`, `ESOPController.java`
Frontend status: Route exists but pages are stubs (see gap analysis Priority 3)

## Output Checklist

- [ ] KEKA feature matrix checked for the requested module
- [ ] NU-HRMS code verified (not just claimed — actual files checked)
- [ ] Gap classification rendered (READY / ALMOST / BLOCKED / NOT STARTED)
- [ ] Migration risk assessed (LOW / MEDIUM / HIGH / BLOCKER)
- [ ] Must-have daily-use features identified
- [ ] Effort estimate provided for each gap
- [ ] India statutory compliance checked (if payroll/compliance related)
- [ ] Specific files and line counts referenced for any stubs

## Reference Files

- Gap analysis: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/GAP-ANALYSIS-2026-04-02.md`
- Executive summary: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/EXECUTIVE-SUMMARY.md`
- App route mapping: `frontend/lib/config/apps.ts`
- Backend controllers: `backend/src/main/java/com/hrms/api/`
- E2E tests: `frontend/e2e/`
- Flyway migrations: `backend/src/main/resources/db/migration/`
- Payroll engine docs: `docs/build-kit/06_PAYROLL_RULE_ENGINE.md`
- RBAC permission matrix: `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`
