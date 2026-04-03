-- V9: Composite performance indexes for high-traffic query patterns.
-- These cover the most common WHERE clauses in analytics and list endpoints.

-- ─── Employees ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_tenant_status
  ON employees(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept
  ON employees(tenant_id, department_id);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_joining_date
  ON employees(tenant_id, joining_date);

-- ─── Attendance records ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date
  ON attendance_records(tenant_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_emp_date
  ON attendance_records(tenant_id, employee_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date_late
  ON attendance_records(tenant_id, attendance_date, is_late);

-- ─── Leave requests ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_status
  ON leave_requests(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_emp_status
  ON leave_requests(tenant_id, employee_id, status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_dates
  ON leave_requests(tenant_id, start_date, end_date);

-- ─── Payslips ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payslips_tenant_period
  ON payslips(tenant_id, pay_period_year, pay_period_month);

CREATE INDEX IF NOT EXISTS idx_payslips_tenant_emp_period
  ON payslips(tenant_id, employee_id, pay_period_year, pay_period_month);

-- ─── Performance reviews ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_perf_reviews_tenant_cycle
  ON performance_reviews(tenant_id, review_cycle_id);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_tenant_emp
  ON performance_reviews(tenant_id, employee_id);

-- ─── PIP ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pip_tenant_emp
  ON performance_improvement_plans(tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_pip_tenant_status
  ON performance_improvement_plans(tenant_id, status);

-- ─── LMS enrollments ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_tenant_emp
  ON lms_course_enrollments(tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_tenant_course
  ON lms_course_enrollments(tenant_id, course_id);

-- ─── Project employees ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_emp_tenant_active
  ON project_employees(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_project_emp_tenant_emp
  ON project_employees(tenant_id, employee_id, is_active);
