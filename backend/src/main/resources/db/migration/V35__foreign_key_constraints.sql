-- =============================================================================
-- V35: Foreign Key Constraints for Core Tables
-- =============================================================================
-- Addresses DB-003: Zero FK constraints across 250+ tables.
-- This migration adds FKs to the highest-impact tables first (Phase 1).
-- All FKs use ON DELETE SET NULL or ON DELETE CASCADE as appropriate.
-- NOT VALID + VALIDATE CONSTRAINT pattern minimizes lock time on production.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- employees → departments (SET NULL: if department is deleted, employee stays)
-- ---------------------------------------------------------------------------
ALTER TABLE employees
    ADD CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL
    NOT VALID;
ALTER TABLE employees VALIDATE CONSTRAINT fk_employees_department;

-- ---------------------------------------------------------------------------
-- employees → employees (manager, SET NULL: if manager leaves, reports stay)
-- ---------------------------------------------------------------------------
ALTER TABLE employees
    ADD CONSTRAINT fk_employees_manager
    FOREIGN KEY (manager_id) REFERENCES employees(id)
    ON DELETE SET NULL
    NOT VALID;
ALTER TABLE employees VALIDATE CONSTRAINT fk_employees_manager;

-- ---------------------------------------------------------------------------
-- employees → users (RESTRICT: cannot delete user while employee record exists)
-- ---------------------------------------------------------------------------
ALTER TABLE employees
    ADD CONSTRAINT fk_employees_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    NOT VALID;
ALTER TABLE employees VALIDATE CONSTRAINT fk_employees_user;

-- ---------------------------------------------------------------------------
-- departments → departments (parent, SET NULL: if parent deleted, becomes root)
-- ---------------------------------------------------------------------------
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_parent
    FOREIGN KEY (parent_department_id) REFERENCES departments(id)
    ON DELETE SET NULL
    NOT VALID;
ALTER TABLE departments VALIDATE CONSTRAINT fk_departments_parent;

-- ---------------------------------------------------------------------------
-- departments → employees (manager, SET NULL)
-- ---------------------------------------------------------------------------
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager
    FOREIGN KEY (manager_id) REFERENCES employees(id)
    ON DELETE SET NULL
    NOT VALID;
ALTER TABLE departments VALIDATE CONSTRAINT fk_departments_manager;

-- ---------------------------------------------------------------------------
-- leave_requests → employees (CASCADE: if employee deleted, so are their leaves)
-- ---------------------------------------------------------------------------
ALTER TABLE leave_requests
    ADD CONSTRAINT fk_leave_requests_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE leave_requests VALIDATE CONSTRAINT fk_leave_requests_employee;

-- ---------------------------------------------------------------------------
-- leave_requests → leave_types (RESTRICT: can't delete type with existing requests)
-- ---------------------------------------------------------------------------
ALTER TABLE leave_requests
    ADD CONSTRAINT fk_leave_requests_leave_type
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
    ON DELETE RESTRICT
    NOT VALID;
ALTER TABLE leave_requests VALIDATE CONSTRAINT fk_leave_requests_leave_type;

-- ---------------------------------------------------------------------------
-- leave_balances → employees (CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE leave_balances
    ADD CONSTRAINT fk_leave_balances_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE leave_balances VALIDATE CONSTRAINT fk_leave_balances_employee;

-- ---------------------------------------------------------------------------
-- leave_balances → leave_types (RESTRICT)
-- ---------------------------------------------------------------------------
ALTER TABLE leave_balances
    ADD CONSTRAINT fk_leave_balances_leave_type
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
    ON DELETE RESTRICT
    NOT VALID;
ALTER TABLE leave_balances VALIDATE CONSTRAINT fk_leave_balances_leave_type;

-- ---------------------------------------------------------------------------
-- attendance_records → employees (CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE attendance_records
    ADD CONSTRAINT fk_attendance_records_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE attendance_records VALIDATE CONSTRAINT fk_attendance_records_employee;

-- ---------------------------------------------------------------------------
-- payslips → employees (CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE payslips
    ADD CONSTRAINT fk_payslips_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE payslips VALIDATE CONSTRAINT fk_payslips_employee;

-- ---------------------------------------------------------------------------
-- payslips → payroll_runs (RESTRICT: can't delete run with existing payslips)
-- ---------------------------------------------------------------------------
ALTER TABLE payslips
    ADD CONSTRAINT fk_payslips_payroll_run
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id)
    ON DELETE RESTRICT
    NOT VALID;
ALTER TABLE payslips VALIDATE CONSTRAINT fk_payslips_payroll_run;

-- ---------------------------------------------------------------------------
-- performance_reviews → employees (CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE performance_reviews
    ADD CONSTRAINT fk_performance_reviews_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE performance_reviews VALIDATE CONSTRAINT fk_performance_reviews_employee;

-- ---------------------------------------------------------------------------
-- performance_reviews → review_cycles (RESTRICT)
-- ---------------------------------------------------------------------------
ALTER TABLE performance_reviews
    ADD CONSTRAINT fk_performance_reviews_cycle
    FOREIGN KEY (review_cycle_id) REFERENCES review_cycles(id)
    ON DELETE RESTRICT
    NOT VALID;
ALTER TABLE performance_reviews VALIDATE CONSTRAINT fk_performance_reviews_cycle;

-- ---------------------------------------------------------------------------
-- user_roles → users (CASCADE: if user deleted, remove their role assignments)
-- ---------------------------------------------------------------------------
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE user_roles VALIDATE CONSTRAINT fk_user_roles_user;

-- ---------------------------------------------------------------------------
-- user_roles → roles (CASCADE: if role deleted, remove assignments)
-- ---------------------------------------------------------------------------
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE user_roles VALIDATE CONSTRAINT fk_user_roles_role;

-- ---------------------------------------------------------------------------
-- app_role_permissions → roles (CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE app_role_permissions
    ADD CONSTRAINT fk_app_role_perms_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE app_role_permissions VALIDATE CONSTRAINT fk_app_role_perms_role;

-- ---------------------------------------------------------------------------
-- workflow_step_executions → workflow_executions (CASCADE)
-- ---------------------------------------------------------------------------
ALTER TABLE workflow_step_executions
    ADD CONSTRAINT fk_step_executions_workflow
    FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(id)
    ON DELETE CASCADE
    NOT VALID;
ALTER TABLE workflow_step_executions VALIDATE CONSTRAINT fk_step_executions_workflow;
