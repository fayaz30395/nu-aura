-- =============================================================================
-- V35: Foreign Key Constraints for Core Tables
-- =============================================================================
-- Addresses DB-003: Zero FK constraints across 250+ tables.
-- This migration adds FKs to the highest-impact tables first (Phase 1).
-- All FKs use ON DELETE SET NULL or ON DELETE CASCADE as appropriate.
-- NOT VALID + VALIDATE CONSTRAINT pattern minimizes lock time on production.
-- Every ADD CONSTRAINT is wrapped in a DO block that checks pg_constraint
-- first, making this migration fully idempotent.
-- Orphan rows are cleaned before each FK to prevent validation failures.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- employees → departments (SET NULL: if department is deleted, employee stays)
-- ---------------------------------------------------------------------------
UPDATE employees SET department_id = NULL WHERE department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM departments);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_department') THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_department
      FOREIGN KEY (department_id) REFERENCES departments(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE employees VALIDATE CONSTRAINT fk_employees_department;

-- ---------------------------------------------------------------------------
-- employees → employees (manager, SET NULL: if manager leaves, reports stay)
-- ---------------------------------------------------------------------------
UPDATE employees SET manager_id = NULL WHERE manager_id IS NOT NULL AND manager_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_manager') THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_manager
      FOREIGN KEY (manager_id) REFERENCES employees(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE employees VALIDATE CONSTRAINT fk_employees_manager;

-- ---------------------------------------------------------------------------
-- employees → users (RESTRICT: cannot delete user while employee record exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_user') THEN
    -- Delete employees whose user_id no longer exists (orphaned)
    DELETE FROM employees WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
ALTER TABLE employees VALIDATE CONSTRAINT fk_employees_user;

-- ---------------------------------------------------------------------------
-- departments → departments (parent, SET NULL: if parent deleted, becomes root)
-- ---------------------------------------------------------------------------
UPDATE departments SET parent_department_id = NULL WHERE parent_department_id IS NOT NULL AND parent_department_id NOT IN (SELECT id FROM departments);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_parent') THEN
    ALTER TABLE departments
      ADD CONSTRAINT fk_departments_parent
      FOREIGN KEY (parent_department_id) REFERENCES departments(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE departments VALIDATE CONSTRAINT fk_departments_parent;

-- ---------------------------------------------------------------------------
-- departments → employees (manager, SET NULL)
-- ---------------------------------------------------------------------------
UPDATE departments SET manager_id = NULL WHERE manager_id IS NOT NULL AND manager_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_manager') THEN
    ALTER TABLE departments
      ADD CONSTRAINT fk_departments_manager
      FOREIGN KEY (manager_id) REFERENCES employees(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE departments VALIDATE CONSTRAINT fk_departments_manager;

-- ---------------------------------------------------------------------------
-- leave_requests → employees (CASCADE: if employee deleted, so are their leaves)
-- ---------------------------------------------------------------------------
DELETE FROM leave_requests WHERE employee_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_requests_employee') THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT fk_leave_requests_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE leave_requests VALIDATE CONSTRAINT fk_leave_requests_employee;

-- ---------------------------------------------------------------------------
-- leave_requests → leave_types (RESTRICT: can't delete type with existing requests)
-- ---------------------------------------------------------------------------
DELETE FROM leave_requests WHERE leave_type_id NOT IN (SELECT id FROM leave_types);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_requests_leave_type') THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT fk_leave_requests_leave_type
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
ALTER TABLE leave_requests VALIDATE CONSTRAINT fk_leave_requests_leave_type;

-- ---------------------------------------------------------------------------
-- leave_balances → employees (CASCADE)
-- ---------------------------------------------------------------------------
DELETE FROM leave_balances WHERE employee_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_balances_employee') THEN
    ALTER TABLE leave_balances
      ADD CONSTRAINT fk_leave_balances_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE leave_balances VALIDATE CONSTRAINT fk_leave_balances_employee;

-- ---------------------------------------------------------------------------
-- leave_balances → leave_types (RESTRICT)
-- ---------------------------------------------------------------------------
DELETE FROM leave_balances WHERE leave_type_id NOT IN (SELECT id FROM leave_types);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_balances_leave_type') THEN
    ALTER TABLE leave_balances
      ADD CONSTRAINT fk_leave_balances_leave_type
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
ALTER TABLE leave_balances VALIDATE CONSTRAINT fk_leave_balances_leave_type;

-- ---------------------------------------------------------------------------
-- attendance_records → employees (CASCADE)
-- ---------------------------------------------------------------------------
DELETE FROM attendance_records WHERE employee_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_employee') THEN
    ALTER TABLE attendance_records
      ADD CONSTRAINT fk_attendance_records_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE attendance_records VALIDATE CONSTRAINT fk_attendance_records_employee;

-- ---------------------------------------------------------------------------
-- payslips → employees (CASCADE)
-- ---------------------------------------------------------------------------
DELETE FROM payslips WHERE employee_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payslips_employee') THEN
    ALTER TABLE payslips
      ADD CONSTRAINT fk_payslips_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE payslips VALIDATE CONSTRAINT fk_payslips_employee;

-- ---------------------------------------------------------------------------
-- payslips → payroll_runs (RESTRICT: can't delete run with existing payslips)
-- ---------------------------------------------------------------------------
DELETE FROM payslips WHERE payroll_run_id NOT IN (SELECT id FROM payroll_runs);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payslips_payroll_run') THEN
    ALTER TABLE payslips
      ADD CONSTRAINT fk_payslips_payroll_run
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
ALTER TABLE payslips VALIDATE CONSTRAINT fk_payslips_payroll_run;

-- ---------------------------------------------------------------------------
-- performance_reviews → employees (CASCADE)
-- ---------------------------------------------------------------------------
DELETE FROM performance_reviews WHERE employee_id NOT IN (SELECT id FROM employees);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_performance_reviews_employee') THEN
    ALTER TABLE performance_reviews
      ADD CONSTRAINT fk_performance_reviews_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE performance_reviews VALIDATE CONSTRAINT fk_performance_reviews_employee;

-- ---------------------------------------------------------------------------
-- performance_reviews → review_cycles (RESTRICT)
-- ---------------------------------------------------------------------------
DELETE FROM performance_reviews WHERE review_cycle_id NOT IN (SELECT id FROM review_cycles);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_performance_reviews_cycle') THEN
    ALTER TABLE performance_reviews
      ADD CONSTRAINT fk_performance_reviews_cycle
      FOREIGN KEY (review_cycle_id) REFERENCES review_cycles(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
ALTER TABLE performance_reviews VALIDATE CONSTRAINT fk_performance_reviews_cycle;

-- ---------------------------------------------------------------------------
-- user_roles → users (CASCADE: if user deleted, remove their role assignments)
-- ---------------------------------------------------------------------------
DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM users);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user') THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE user_roles VALIDATE CONSTRAINT fk_user_roles_user;

-- ---------------------------------------------------------------------------
-- user_roles → roles (CASCADE: if role deleted, remove assignments)
-- ---------------------------------------------------------------------------
DELETE FROM user_roles WHERE role_id NOT IN (SELECT id FROM roles);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_role') THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT fk_user_roles_role
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE user_roles VALIDATE CONSTRAINT fk_user_roles_role;

-- ---------------------------------------------------------------------------
-- app_role_permissions → roles (CASCADE)
-- ---------------------------------------------------------------------------
DELETE FROM app_role_permissions WHERE role_id NOT IN (SELECT id FROM roles);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_role_perms_role') THEN
    ALTER TABLE app_role_permissions
      ADD CONSTRAINT fk_app_role_perms_role
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE app_role_permissions VALIDATE CONSTRAINT fk_app_role_perms_role;

-- ---------------------------------------------------------------------------
-- workflow_step_executions → workflow_executions (CASCADE)
-- ---------------------------------------------------------------------------
DELETE FROM workflow_step_executions WHERE workflow_execution_id NOT IN (SELECT id FROM workflow_executions);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_step_executions_workflow') THEN
    ALTER TABLE workflow_step_executions
      ADD CONSTRAINT fk_step_executions_workflow
      FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE workflow_step_executions VALIDATE CONSTRAINT fk_step_executions_workflow;
