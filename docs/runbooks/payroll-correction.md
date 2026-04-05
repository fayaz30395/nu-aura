# Payroll Correction Runbook

## Purpose

Steps to investigate, correct, revert, and re-run payroll when errors are detected. Payroll is a
critical pipeline -- all corrections must be audited and reviewed before execution.

---

## Prerequisites

- SUPER_ADMIN or SYSTEM_ADMIN role
- Direct database access (read replica preferred for investigation; primary for corrections)
- Application access for re-running payroll via API

---

## 1. Investigate the Issue

### Check payroll run status

```sql
-- Find recent payroll runs for a tenant
SELECT id, tenant_id, pay_period_start, pay_period_end, status,
       total_gross, total_net, total_deductions,
       employee_count, created_at, completed_at,
       error_message
FROM payroll_runs
WHERE tenant_id = '<tenant_id>'
ORDER BY created_at DESC
LIMIT 10;
```

### Check individual payslip errors

```sql
-- Find payslips with anomalies in a specific run
SELECT ps.id, ps.employee_id, e.employee_code, e.first_name, e.last_name,
       ps.gross_salary, ps.net_salary, ps.total_deductions,
       ps.status, ps.error_message
FROM payslips ps
JOIN employees e ON ps.employee_id = e.id
WHERE ps.payroll_run_id = '<payroll_run_id>'
AND (ps.status = 'ERROR'
     OR ps.net_salary <= 0
     OR ps.net_salary > ps.gross_salary * 2)
ORDER BY ps.employee_id;
```

### Check payroll component calculations

```sql
-- Inspect component breakdown for a specific payslip
SELECT pc.component_name, pc.component_type, pc.formula,
       pc.calculated_amount, pc.is_taxable
FROM payslip_components pc
WHERE pc.payslip_id = '<payslip_id>'
ORDER BY pc.component_type, pc.component_name;
```

### Check if leave deductions are correct

```sql
-- Compare leave balance changes during the pay period
SELECT lb.employee_id, lt.name as leave_type,
       lb.allocated, lb.used, lb.balance,
       lb.carried_forward
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.employee_id = '<employee_id>'
AND lb.tenant_id = '<tenant_id>';

-- Check leave requests that should have been deducted
SELECT lr.employee_id, lt.name, lr.start_date, lr.end_date,
       lr.number_of_days, lr.status
FROM leave_requests lr
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.employee_id = '<employee_id>'
AND lr.status = 'APPROVED'
AND lr.start_date >= '<pay_period_start>'
AND lr.start_date <= '<pay_period_end>';
```

### Check attendance impact

```sql
-- Verify attendance data for the pay period
SELECT employee_id, attendance_date, status,
       check_in_time, check_out_time, total_hours
FROM attendance_records
WHERE employee_id = '<employee_id>'
AND tenant_id = '<tenant_id>'
AND attendance_date BETWEEN '<pay_period_start>' AND '<pay_period_end>'
ORDER BY attendance_date;
```

---

## 2. Common Root Causes

| Symptom                    | Likely Cause                                    | Fix                                       |
|----------------------------|-------------------------------------------------|-------------------------------------------|
| Net salary = 0             | Missing salary structure assignment             | Assign salary structure, re-run           |
| Negative net salary        | Deductions exceed gross                         | Review deduction formulas, cap deductions |
| Missing employees          | Employee joined mid-period or status not ACTIVE | Update employee status, re-run            |
| Wrong tax calculation      | Incorrect tax slab or declaration data          | Fix tax configuration, recalculate        |
| Payroll run status = ERROR | Exception during processing                     | Check error_message column and app logs   |
| Duplicate payslips         | Re-run without reverting previous run           | Revert first run, then re-run             |

---

## 3. Correction Procedures

### Option A: Correct and Re-run (Preferred)

Use this when the payroll run has not been finalized/paid.

**Step 1: Mark the payroll run as DRAFT/REVERTED**

```sql
-- Mark the payroll run for re-processing
UPDATE payroll_runs
SET status = 'DRAFT',
    error_message = 'Reverted for correction by admin on ' || NOW()::text,
    updated_at = NOW()
WHERE id = '<payroll_run_id>'
AND tenant_id = '<tenant_id>'
AND status != 'PAID';

-- Verify
SELECT id, status, error_message FROM payroll_runs WHERE id = '<payroll_run_id>';
```

**Step 2: Delete payslips from the failed run**

```sql
-- Delete payslip components first (FK constraint)
DELETE FROM payslip_components
WHERE payslip_id IN (
    SELECT id FROM payslips WHERE payroll_run_id = '<payroll_run_id>'
);

-- Delete payslips
DELETE FROM payslips
WHERE payroll_run_id = '<payroll_run_id>';
```

**Step 3: Fix the underlying data** (salary structure, leave balances, attendance, etc.)

**Step 4: Re-run payroll via API**

```bash
curl -X POST "http://localhost:8080/api/v1/payroll/runs/<payroll_run_id>/process" \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -H "X-Tenant-ID: <tenant_id>" \
  -H "Content-Type: application/json"
```

### Option B: Individual Payslip Correction

Use this when only a few employees are affected and the run is otherwise correct.

```sql
-- Update a specific payslip (after recalculating manually)
UPDATE payslips
SET gross_salary = <corrected_gross>,
    net_salary = <corrected_net>,
    total_deductions = <corrected_deductions>,
    status = 'CORRECTED',
    updated_at = NOW()
WHERE id = '<payslip_id>'
AND tenant_id = '<tenant_id>';

-- Update the payroll run totals
UPDATE payroll_runs
SET total_gross = (SELECT SUM(gross_salary) FROM payslips WHERE payroll_run_id = '<payroll_run_id>'),
    total_net = (SELECT SUM(net_salary) FROM payslips WHERE payroll_run_id = '<payroll_run_id>'),
    total_deductions = (SELECT SUM(total_deductions) FROM payslips WHERE payroll_run_id = '<payroll_run_id>'),
    updated_at = NOW()
WHERE id = '<payroll_run_id>';
```

### Option C: Supplementary Payroll Run

Use this when the original run is already PAID and corrections need to be issued as adjustments.

1. Create a new payroll run with `run_type = 'SUPPLEMENTARY'`
2. Include only the affected employees
3. Process only the delta (adjustment amount)
4. Document the reason in the run notes

---

## 4. Post-Correction Verification

```sql
-- Verify corrected payroll run totals
SELECT id, status, employee_count, total_gross, total_net, total_deductions
FROM payroll_runs
WHERE id = '<payroll_run_id>';

-- Spot-check a few payslips
SELECT ps.employee_id, e.employee_code, ps.gross_salary, ps.net_salary, ps.status
FROM payslips ps
JOIN employees e ON ps.employee_id = e.id
WHERE ps.payroll_run_id = '<payroll_run_id>'
ORDER BY ps.net_salary DESC
LIMIT 20;

-- Verify no negative net salaries
SELECT COUNT(*)
FROM payslips
WHERE payroll_run_id = '<payroll_run_id>'
AND net_salary < 0;
```

---

## 5. Audit Trail

All payroll corrections must be recorded in the audit log. The application automatically logs
payroll actions, but manual DB corrections should be documented:

```sql
-- Insert manual audit entry for DB-level corrections
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), '<tenant_id>', '<admin_user_id>',
        'PAYROLL_CORRECTION', 'PayrollRun', '<payroll_run_id>',
        'Manual payroll correction: <description of what was changed and why>',
        NOW());
```

---

## Monitoring

After correction, monitor the following Grafana panels:

- **Business Metrics dashboard** > "Payroll Processed (24h)" -- should show the re-run
- **Business Metrics dashboard** > "Payroll Processing Duration" -- should be within SLO
- Check for any new alerts: PayrollRunFailed, PayrollRunDurationExceeded
