# Payroll Rule Engine Architecture

The Payroll Engine is the most critical and complex mathematical component of the HRMS. It executes
a directed acyclic graph (DAG) of calculations to transform Gross Salary definitions and monthly
attendance datasets into accurate Net Pay disbursements, strictly adhering to regional tax codes.

## 1. Core Architecture

- **Stateless Calculator:** The engine itself applies pure functions formulaically. It takes a
  context (Employee Salary Structure, Attendance Data, Leaves, Tax Rules) and returns a computed
  Payslip object.
- **Formula Evaluator:** Uses a sandboxed scripting environment (e.g., Spring Expression Language (
  SpEL) or Nashorn/GraalVM JS) to safely evaluate dynamic strings created by HR Admins.
  - *Example Formula:* `(BASIC + HRA) * 0.12` for Provident Fund deduction.

## 2. Salary Structures & Components

A Salary Structure is defined by a collection of `PayComponents`. Components are resolved in
topological order based on their formula dependencies.

- **Component Types:**
  - **Fixed Earning:** Basic, HRA (House Rent Allowance), Special Allowance.
  - **Variable Earning:** Performance Bonus, Shift Allowance.
  - **Pre-Tax Deduction:** Provident Fund (PF), 401(k), Professional Tax.
  - **Post-Tax Deduction:** Advance recovery, Loan EMI.
- **Formulas & Conditions:**
  - `Condition:` `if (BASIC > 15000) return 1800 else return BASIC * 0.12`
  - `Proration:` Components can be flagged as `Is_Prorated`. If an employee works 15 out of 30 days,
    prorated components are multiplied by `0.5`.

## 3. Payroll Pipeline Execution

Running payroll for a company (tenant) involves tens of thousands of calculations. The pipeline uses
a Batch Processing framework (like Spring Batch + Kafka) for resilience.

### Pipeline Stages:

1. **Freeze & Snapshot:**

- Locks the `payroll_run` month.
- Snapshots the employee's current `salary_structure` and `bank_details`.

2. **Inputs Aggregation:**

- **Attendance Fetch:** Retrieves `Net Payable Days` (Total Days in Month - Loss of Pay Days).
- **Expense Fetch:** Pulls approved `reimbursement` claims.
- **Overtime Fetch:** Pulls approved overtime hours mapped to hourly rates.
- **Loans Fetch:** Retrieves active loans to extract standard EMI deductions.

3. **Pre-Tax Gross Calculation:**

- Execute mathematical graph for Earnings.
- Apply Proration factor: `(Component_Value / Month_Days) * Payable_Days`.
- Result: Gross Earning.

4. **Tax Calculation (Rule Engine):**

- Applies country/state-specific tax brackets.
- Calculates Annualized Income projection.
- Deducts eligible `investment_proofs` (e.g., Section 80C in India).
- Results in monthly Withholding Tax / TDS.

5. **Net Pay Calculation:**

- `Net Pay = Gross Earning - Tax Deductions - Non-Tax Deductions (Loans) + Reimbursements`.

6. **Verification & Audit:**

- Generates Variance Reports (comparing current month run to previous month run). Flags
  anomalies > 10%.

7. **Commit & Publish:**

- Marks run as `Finalized`.
- Generates immutable PDF Payslips.
- Triggers `payroll.generated` Kafka event.

## 4. Edge Cases Handled

- **Arrears Processing:** If a salary hike is applied retroactively in March but effective from
  January, the engine calculates the diff for Jan/Feb and adds it as an 'Arrears' component in
  March.
- **Full & Final (F&F):** Applies specific rules for exiting employees—encashing unutilized leaves,
  deducting notice period shortfalls, and recovering outstanding loan principals instantly.
- **Mid-Month Structure Changes:** If an employee is promoted on the 15th, the system generates a
  Split-Payslip, evaluating the first 14 days on Structure A, and the next 16 days on Structure B.
