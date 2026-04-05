# Data Correction Runbook

## Purpose

Procedures for correcting data issues in the NU-AURA platform, including soft-delete recovery,
tenant data fixes, and entity relationship repairs. All corrections must maintain referential
integrity, respect tenant isolation, and be auditable.

---

## Prerequisites

- SUPER_ADMIN or SYSTEM_ADMIN role
- Direct database access (use read replica for investigation, primary for writes)
- Understanding of the shared-schema multi-tenant model (`tenant_id` on every table)
- Understanding of soft-delete pattern (`is_deleted` / `deleted_at` columns)

---

## 1. Soft-Delete Recovery

All entities in NU-AURA use soft deletes. Recovering a soft-deleted record requires resetting the
delete markers.

### Recover a single employee

```sql
-- Step 1: Find the soft-deleted employee
SELECT id, employee_code, first_name, last_name, email,
       is_deleted, deleted_at, tenant_id
FROM employees
WHERE employee_code = '<code>'
AND tenant_id = '<tenant_id>'
AND is_deleted = true;

-- Step 2: Restore the employee
UPDATE employees
SET is_deleted = false,
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = '<employee_id>'
AND tenant_id = '<tenant_id>'
AND is_deleted = true;

-- Step 3: Restore the associated user account
UPDATE users
SET is_active = true,
    is_deleted = false,
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = (
    SELECT user_id FROM employees
    WHERE id = '<employee_id>'
    AND tenant_id = '<tenant_id>'
);

-- Step 4: Verify
SELECT e.id, e.employee_code, e.first_name, e.is_deleted,
       u.email, u.is_active
FROM employees e
JOIN users u ON e.user_id = u.id
WHERE e.id = '<employee_id>';
```

### Recover a deleted department

```sql
-- Step 1: Find and restore the department
UPDATE departments
SET is_deleted = false,
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = '<department_id>'
AND tenant_id = '<tenant_id>'
AND is_deleted = true;

-- Step 2: Check if employees were orphaned
SELECT id, employee_code, first_name, department_id
FROM employees
WHERE department_id = '<department_id>'
AND tenant_id = '<tenant_id>';
```

### Recover a deleted leave request

```sql
-- Step 1: Find the deleted leave request
SELECT id, employee_id, leave_type_id, start_date, end_date,
       number_of_days, status, is_deleted
FROM leave_requests
WHERE id = '<leave_request_id>'
AND tenant_id = '<tenant_id>';

-- Step 2: Restore it
UPDATE leave_requests
SET is_deleted = false,
    deleted_at = NULL,
    updated_at = NOW()
WHERE id = '<leave_request_id>'
AND tenant_id = '<tenant_id>';

-- Step 3: If the leave was approved, verify leave balance consistency
SELECT lb.employee_id, lt.name, lb.allocated, lb.used, lb.balance
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.employee_id = '<employee_id>'
AND lb.leave_type_id = '<leave_type_id>'
AND lb.tenant_id = '<tenant_id>';
```

---

## 2. Tenant Data Fixes

### Fix an employee assigned to the wrong department

```sql
-- Step 1: Verify current assignment
SELECT id, employee_code, first_name, last_name,
       department_id, designation, tenant_id
FROM employees
WHERE id = '<employee_id>'
AND tenant_id = '<tenant_id>';

-- Step 2: Verify target department exists in the same tenant
SELECT id, name FROM departments
WHERE id = '<correct_department_id>'
AND tenant_id = '<tenant_id>'
AND is_deleted = false;

-- Step 3: Update assignment
UPDATE employees
SET department_id = '<correct_department_id>',
    updated_at = NOW()
WHERE id = '<employee_id>'
AND tenant_id = '<tenant_id>';

-- Step 4: Audit
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), '<tenant_id>', '<admin_user_id>',
        'DATA_CORRECTION', 'Employee', '<employee_id>',
        'Department corrected from <old_dept_id> to <new_dept_id>. Reason: <reason>',
        NOW());
```

### Fix incorrect reporting manager

```sql
-- Step 1: Verify the chain won't create a cycle
WITH RECURSIVE manager_chain AS (
    SELECT id, reporting_manager_id, 1 as depth
    FROM employees
    WHERE id = '<new_manager_employee_id>'
    AND tenant_id = '<tenant_id>'
    UNION ALL
    SELECT e.id, e.reporting_manager_id, mc.depth + 1
    FROM employees e
    JOIN manager_chain mc ON e.id = mc.reporting_manager_id
    WHERE mc.depth < 20
)
SELECT * FROM manager_chain
WHERE id = '<employee_id>';
-- If the above returns rows, the assignment would create a cycle -- DO NOT proceed.

-- Step 2: Update reporting manager
UPDATE employees
SET reporting_manager_id = '<new_manager_employee_id>',
    updated_at = NOW()
WHERE id = '<employee_id>'
AND tenant_id = '<tenant_id>';
```

### Fix leave balance discrepancy

```sql
-- Step 1: Calculate expected balance from transactions
SELECT lb.employee_id,
       lt.name as leave_type,
       lb.allocated,
       lb.used,
       lb.balance as current_balance,
       lb.allocated - COALESCE(
           (SELECT SUM(lr.number_of_days)
            FROM leave_requests lr
            WHERE lr.employee_id = lb.employee_id
            AND lr.leave_type_id = lb.leave_type_id
            AND lr.status = 'APPROVED'
            AND lr.is_deleted = false
            AND lr.tenant_id = lb.tenant_id), 0
       ) as expected_balance
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.employee_id = '<employee_id>'
AND lb.tenant_id = '<tenant_id>';

-- Step 2: If discrepancy found, correct the balance
UPDATE leave_balances
SET used = (
        SELECT COALESCE(SUM(lr.number_of_days), 0)
        FROM leave_requests lr
        WHERE lr.employee_id = leave_balances.employee_id
        AND lr.leave_type_id = leave_balances.leave_type_id
        AND lr.status = 'APPROVED'
        AND lr.is_deleted = false
        AND lr.tenant_id = leave_balances.tenant_id
    ),
    balance = allocated - (
        SELECT COALESCE(SUM(lr.number_of_days), 0)
        FROM leave_requests lr
        WHERE lr.employee_id = leave_balances.employee_id
        AND lr.leave_type_id = leave_balances.leave_type_id
        AND lr.status = 'APPROVED'
        AND lr.is_deleted = false
        AND lr.tenant_id = leave_balances.tenant_id
    ),
    updated_at = NOW()
WHERE employee_id = '<employee_id>'
AND tenant_id = '<tenant_id>';
```

---

## 3. Bulk Data Corrections

### Reassign all employees from a deleted department

```sql
-- Step 1: Find affected employees
SELECT id, employee_code, first_name, last_name
FROM employees
WHERE department_id = '<deleted_department_id>'
AND tenant_id = '<tenant_id>'
AND is_deleted = false;

-- Step 2: Reassign to a new department
UPDATE employees
SET department_id = '<new_department_id>',
    updated_at = NOW()
WHERE department_id = '<deleted_department_id>'
AND tenant_id = '<tenant_id>'
AND is_deleted = false;
```

### Fix attendance records for a specific date (e.g., system marked everyone absent on a holiday)

```sql
-- Step 1: Identify affected records
SELECT id, employee_id, attendance_date, status
FROM attendance_records
WHERE attendance_date = '<date>'
AND tenant_id = '<tenant_id>'
AND status = 'ABSENT';

-- Step 2: Mark them as HOLIDAY or correct status
UPDATE attendance_records
SET status = 'HOLIDAY',
    updated_at = NOW()
WHERE attendance_date = '<date>'
AND tenant_id = '<tenant_id>'
AND status = 'ABSENT';
```

---

## 4. Cross-Tenant Data Leak Investigation

If a tenant isolation breach is suspected:

```sql
-- Step 1: Check if any entity references a different tenant's data
-- Example: Check if any employee in tenant A references a department in tenant B
SELECT e.id, e.tenant_id as emp_tenant, d.tenant_id as dept_tenant
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.tenant_id != d.tenant_id;

-- Step 2: Check RLS policies are active
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE tablename IN ('employees', 'departments', 'leave_requests', 'attendance_records')
ORDER BY tablename, policyname;

-- Step 3: Verify current_setting('app.current_tenant') in a session
SELECT current_setting('app.current_tenant', true);
```

---

## 5. Safety Checklist

Before executing any data correction:

- [ ] Taken a backup or snapshot of affected rows (SELECT INTO temp table or export)
- [ ] Verified the tenant_id is correct in all WHERE clauses
- [ ] Tested the query on a read replica or staging environment first
- [ ] Confirmed referential integrity won't be broken
- [ ] Documented the reason for the correction
- [ ] Planned the audit log entry
- [ ] For bulk operations: started a transaction and verified before committing

```sql
-- Always wrap corrections in a transaction
BEGIN;

-- Your correction SQL here...

-- Verify before committing
SELECT ... ; -- Check the affected rows look correct

-- COMMIT only after verification
COMMIT;
-- Or ROLLBACK if something looks wrong
-- ROLLBACK;
```

---

## 6. Emergency: Full Tenant Data Export

If a tenant requests full data export or is being offboarded:

```bash
# Export all data for a specific tenant (use pg_dump with --where or custom script)
# The application provides an admin API for data export:
curl -X POST "http://localhost:8080/api/v1/admin/export/tenant/<tenant_id>" \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -o "tenant_<tenant_id>_export.zip"
```
