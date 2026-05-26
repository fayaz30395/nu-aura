# Module Architecture

This document defines the core business modules that comprise the HRMS platform. Each module
encapsulates a specific domain of human capital management.

---

## 1. Employee Management

**Purpose:** Serves as the system of record for all personnel data. Manages the core employee
profile, historical career progression, and demographic information.
**Key Entities:** `Employee`, `EmployeeProfile`, `Address`, `BankDetails`, `EmergencyContact`,
`Dependent`, `JobHistory`.
**Major Workflows:**

- Profile creation and baseline data initialization.
- Employee self-service updates (e.g., address change, bank detail updates) requiring HR approval.
- Promotion, transfer, and designation change tracking.
- Status management (Active, Suspended, Notice Period, Terminated).

---

## 2. Recruitment ATS (Applicant Tracking System)

**Purpose:** Manages the talent acquisition lifecycle from manpower requisition to candidate hiring.
**Key Entities:** `Requisition`, `JobPosting`, `Candidate`, `Application`, `Interview`,
`Evaluation`, `OfferLetter`.
**Major Workflows:**

- Department head raises a manpower requisition for approval.
- HR publishes a job posting to public career pages and integrated job boards.
- Resume ingestion, automated parsing, and candidate screening.
- Scheduling multi-round interviews and collecting structured feedback scorecards.
- Offer generation, digital signature collection, and hiring conversion.

---

## 3. Onboarding

**Purpose:** Ensures a smooth, structured induction for new hires, minimizing time-to-productivity
and compliance risks.
**Key Entities:** `OnboardingTemplate`, `OnboardingTask`, `EmployeeOnboardingJourney`.
**Major Workflows:**

- Assignment of role-specific or department-specific task templates to incoming hires.
- Cross-departmental task orchestration (e.g., IT creates email, Admin assigns a desk).
- Pre-boarding document collection and verification.
- Gamified induction progress tracking for the new employee.

---

## 4. Attendance

**Purpose:** Accurately tracks employee working hours, shifts, overtimes, and workplace physical
presence.
**Key Entities:** `Shift`, `Roster`, `AttendanceLog`, `Timesheet`, `Break`, `OvertimeRequest`.
**Major Workflows:**

- Biometric device integration and web/mobile manual check-ins (with geo-fencing).
- Roster management for complex rotating shift schedules.
- Overtime calculation and approval workflows.
- Regularization workflows for missed punches or unscheduled absences.

---

## 5. Leave Management

**Purpose:** Handles time-off requests, statutory leave compliance, and accrual logic.
**Key Entities:** `LeavePolicy`, `LeaveType`, `LeaveBalance`, `LeaveRequest`, `HolidayCalendar`.
**Major Workflows:**

- Application for full-day, half-day, or hourly time off via self-service.
- Maker-checker approval chains involving Reporting Managers and HR.
- Automated monthly/yearly accrual and carry-forward calculation.
- Leave clash detection and team bandwidth forecasting.

---

## 6. Payroll

**Purpose:** The critical financial engine that calculates and disburses employee compensation based
on multiple dynamic inputs.
**Key Entities:** `SalaryStructure`, `PayComponent`, `PayrollCycle`, `Payslip`, `TaxDeclaration`,
`Loan`, `InvestmentProof`.
**Major Workflows:**

- Definition of complex formula-based gross-to-net salary structures.
- Import of LOP (Loss of Pay) data from the Attendance and Leave modules.
- Processing calculation runs (sandbox vs. finalized commits).
- Generation of compliant payslips, bank transfer files (e.g., NACHA/SEPA), and tax computation
  worksheets.
- Full and Final (F&F) settlement processing for off-boarded employees.

---

## 7. Performance Management

**Purpose:** Facilitates continuous goal tracking, employee evaluations, and career development.
**Key Entities:** `Goal` (OKR/KPI), `ReviewCycle`, `Feedback`, `AppraisalForm`, `RatingCard`.
**Major Workflows:**

- Goal setting at start of quarter/year and manager alignment.
- Continuous 360-degree feedback collection.
- Initiating and locking formal performance review cycles (Self → Manager → Skip-level).
- Normalization curves and bell-curve generation for compensation increment planning.

---

## 8. Document Management

**Purpose:** Provides a secure, centralized repository for all employee and company-related digital
assets.
**Key Entities:** `DocumentFolder`, `Document`, `DocumentShare`, `SignatureRequest`.
**Major Workflows:**

- Uploading and categorizing compliance documents (e.g., ID proofs, tax forms).
- Restricting visibility based on file classifications (Public, Internal, Highly Confidential).
- Version control for updated company policies.

---

## 9. Expense Management

**Purpose:** Streamlines corporate spending, reimbursement claims, and budget tracking.
**Key Entities:** `ExpenseCategory`, `ExpensePolicy`, `ExpenseClaim`, `Receipt`.
**Major Workflows:**

- OCR-assisted receipt scanning from mobile devices.
- Claim submission mapped against predefined spending limits and policies.
- Multi-step approval routing to Finance for verification and payout via Payroll.
- Spend analytics and budget vs. actual reporting.

---

## 10. Asset Management

**Purpose:** Tracks the lifecycle, assignment, and valuation of company-owned hardware and software.
**Key Entities:** `AssetCategory`, `Asset`, `AssetAssignment`, `MaintenanceLog`.
**Major Workflows:**

- Inventory registry creation and barcode/QR code generation.
- Asset allocation tracking (Checkout to an employee).
- Asset recovery during off-boarding or replacement requests.
- Depreciation calculation for Finance.

---

## 11. Organization Management

**Purpose:** Defines the structural framework, hierarchy, and legal entities of the tenant.
**Key Entities:** `Company`, `LegalEntity`, `BusinessUnit`, `Department`, `Designation`, `Location`.
**Major Workflows:**

- Setup of multi-country legal entities.
- Dynamic creation of the organizational tree chart.
- Mapping Reporting Managers, Matrix Managers, and Functional leads.

---

## 12. Notification System

**Purpose:** A centralized utility that guarantees delivery of alerts, reminders, and broadcast
messages.
**Key Entities:** `NotificationTemplate`, `NotificationEvent`, `DeliveryChannel`.
**Major Workflows:**

- Triggering context-aware alerts (e.g., "Leave request waiting for your approval").
- Batch delivery of scheduled reminders (e.g., "Timesheets due tomorrow").
- In-app notification center counter incrementing.

---

## 13. Analytics

**Purpose:** Extracts strategic insights from transactional HR data.
**Key Entities:** `Dashboard`, `Widget`, `ReportConfiguration`, `ExportJob`.
**Major Workflows:**

- Pre-aggregating data for fast dashboard rendering (Headcount, Attrition Rate, Gender Ratio).
- Drag-and-drop report builder for HR administrators.
- Scheduled email delivery of critical management reports at month-end.

---

## 14. Approval Workflow Engine

**Purpose:** The backbone automation capability that routes business objects to required
decision-makers.
**Key Entities:** `WorkflowDefinition`, `WorkflowStep`, `ApprovalInstance`, `ActionLog`.
**Major Workflows:**

- Visual definition of routing rules (e.g., If Expense > $500, Route to VP Finance).
- Handling parallel approvals, escalating overdue approvals, and delegation (Out of Office
  delegates).
- Providing an unified 'Inbox' for managers to approve/reject requests across all modules.
