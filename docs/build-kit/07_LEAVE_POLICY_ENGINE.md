# Leave Policy Engine Architecture

The Leave Module is fundamentally an accrual and consumption engine. It manages "Leave Types" (pots of time) governed by "Leave Policies" (the rules for earning, keeping, and spending that time).

## 1. Core Elements

### A. Leave Types
- Define the fundamental buckets. 
- **Examples:** Earned Leave (EL), Sick Leave (SL), Casual Leave (CL), Maternity Leave (ML), Bereavement Leave, Comp-Off (Compensatory Off), Loss of Pay (Unpaid LOP).
- **Attributes:** 
  - `Is_Paid` (Boolean): Determines impact on Payroll.
  - `Is_Statutory` (Boolean): Mandated by regional law.
  - `Unit`: Days vs. Hours.

### B. Leave Policies
A Leave Policy dictates the mathematical and behavioral rules for a specific Leave Type for a specific group of employees (e.g., "Full-Time Exempt Employees in NY").

- **Key Rules Defined in a Policy:**
  - **Accrual Rate:** How many days are earned per period (e.g., 1.5 days/month).
  - **Carry Forward:** Rules on year-end balances. "Max 10 days can be carried forward; the rest lapse."
  - **Encashment:** "Unused EL up to 5 days can be cashed out at the end of the year."
  - **Negative Balance Limit:** "Employees can go into -3 days of SL if urgent."
  - **Proration:** "New hires joining mid-month receive prorated accrual."
  - **Minimum Advance Notice:** "Casual leaves must be requested 3 days in advance."
  - **Maximum Consecutive Days:** "Sick leave > 3 consecutive days requires a doctor's certificate upload."

## 2. Policy Evaluation & Accrual Matrix

### The Accrual Cron Job
- Runs via a distributed scheduler task (e.g., Quartz or Kubernetes CronJob) either on the 1st of every month or daily at midnight, depending on the `Accrual_Frequency`.
- **Logic Matrix:**
  1. Identifies all Active employees.
  2. Resolves their applicable Leave Policy via Department/Location mapping.
  3. Evaluates their current `Leave_Balance` vs. `Maximum_Balance_Cap`.
  4. Commits `+Accrual_Rate` to the balance if under the cap.
  5. Records a transaction in `leave_balance_history` (like a bank ledger: `Credit +1.5, Balance 7.5, Type: Accrual`).

### Half-Day / Hourly Leaves
- **Half-Day Config:** When applying for a leave, an employee can select "First Half" or "Second Half". The `LeaveRequest` entity records `duration = 0.5`. The engine deducts `0.5` from the `Leave_Balance`.
- **Hourly Leaves:** For gig workers or specific shift definitions. Requires precise integration with the `Shift_Config` table to determine scheduled working hours vs. requested off-hours. 

## 3. Leave Encashment Workflow
1. At the end of the fiscal year, an automated calculation identifies 'Encashable Days' per the Policy (e.g., Balances over 20 days EL).
2. The user initiates an Encashment Request via Self Service.
3. Upon HR Approval, an event `leave.encashment.approved` is emitted to Kafka.
4. The Payroll Service consumes the event and creates an Earning component on the upcoming payslip using the formula `(Basic_Salary / 30) * Encashable_Days`.

## 4. Concurrency & Overlap Prevention
- Database-level constraint constraints prevent multiple `LeaveRequest` rows spanning overlapping dates for the same `employee_id` with Status = Pending/Approved.
- The Engine validates requested dates against the `Holiday_Calendar` and `Shift_Roster` to exclude weekends and public holidays from the `Deductible_Days` count.
  - *Example:* Applying from Friday to Monday. If Sat/Sun are week-offs, the engine deducts `2` days from the balance, not `4`.
