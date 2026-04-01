# Database Schema Design

The HRMS platform relies on PostgreSQL (Supabase compatible) optimized for multi-tenancy. The conceptual schema spans approximately 250 tables across 16 major domains. 

> **Structural Rule:** Every table containing tenant data MUST include a `tenant_id` UUID column. Every query MUST filter by `tenant_id` via Row Level Security (RLS) policies.

---

## 1. Domain: IAM & Multi-Tenancy (10 Tables)
- **`tenant`**: `id`, `name`, `status`, `subscription_tier`, `created_at`
- **`app_user`**: `id`, `tenant_id`, `email`, `password_hash`, `mfa_enabled`, `last_login_at`
- **`role`**: `id`, `tenant_id`, `name`, `is_system`
- **`permission`**: `id`, `code` (e.g. 'employee.read'), `description`
- **`role_permission`**: FK `role_id`, FK `permission_id`
- **`user_role`**: FK `user_id`, FK `role_id`

## 2. Domain: Organization (15 Tables)
- **`company`**: `id`, `tenant_id`, `legal_name`, `registration_number`
- **`business_unit`**: `id`, `tenant_id`, FK `company_id`, `name`
- **`department`**: `id`, `tenant_id`, FK `business_unit_id`, FK `parent_department_id`, `name`
- **`designation`**: `id`, `tenant_id`, `title`, `level`
- **`location`**: `id`, `tenant_id`, `address`, `timezone`, `country`
- **`cost_center`**: `id`, `tenant_id`, `code`, `name`

## 3. Domain: Employee (30 Tables)
- **`employee`**: `id`, `tenant_id`, FK `user_id`, `employee_code`, `first_name`, `last_name`, `status`, `hire_date`
  - *Indexes:* B-Tree on `(tenant_id, employee_code)`, `(tenant_id, status)`
- **`employee_job`**: `id`, `tenant_id`, FK `employee_id`, FK `department_id`, FK `designation_id`, FK `location_id`, FK `reporting_manager_id`
- **`employee_address`**: `id`, `tenant_id`, FK `employee_id`, `address_type`, `street`, `city`, `zip`
- **`bank_details`**: `id`, `tenant_id`, FK `employee_id`, `account_no`, `routing_number`, `bank_name`, `is_verified`
- **`family_member`**: `id`, `tenant_id`, FK `employee_id`, `relation`, `name`, `is_dependent`
- **`education`**: `id`, `tenant_id`, FK `employee_id`, `degree`, `institution`, `year_passed`

## 4. Domain: Attendance (20 Tables)
- **`shift_config`**: `id`, `tenant_id`, `name`, `start_time`, `end_time`, `grace_period_mins`
- **`daily_attendance`**: `id`, `tenant_id`, FK `employee_id`, `date`, `status` (Present/Absent/HalfDay), `net_hours`
  - *Indexes:* B-Tree on `(tenant_id, employee_id, date)`
- **`punch_log`**: `id`, `tenant_id`, FK `employee_id`, `timestamp`, `punch_type` (In/Out), `source` (Web/Biometric), `location_geo`
- **`timesheet`**: `id`, `tenant_id`, FK `employee_id`, `period_start`, `period_end`, `status`

## 5. Domain: Leave Management (15 Tables)
- **`leave_policy`**: `id`, `tenant_id`, `name`, `accrual_rate`, `carry_forward_limit`
- **`leave_type`**: `id`, `tenant_id`, `name` (Sick, Casual, Earned), `is_paid`
- **`leave_balance`**: `id`, `tenant_id`, FK `employee_id`, FK `leave_type_id`, `balance_days`, `year`
- **`leave_request`**: `id`, `tenant_id`, FK `employee_id`, FK `leave_type_id`, `start_date`, `end_date`, `status`
- **`holiday_calendar`**: `id`, `tenant_id`, FK `location_id`, `date`, `name`

## 6. Domain: Payroll (30 Tables)
- **`salary_structure`**: `id`, `tenant_id`, `name`, `currency`
- **`pay_component`**: `id`, `tenant_id`, `code`, `name`, `type` (Earning/Deduction), `calculation_type` (Flat/Percentage/Formula)
- **`structure_component`**: Junction mapping `salary_structure_id` <> `pay_component_id`
- **`employee_salary`**: `id`, `tenant_id`, FK `employee_id`, FK `salary_structure_id`, `effective_date`, `annual_ctc`
- **`payroll_run`**: `id`, `tenant_id`, `month`, `year`, `status` (Draft/Processing/Finalized)
- **`payslip`**: `id`, `tenant_id`, FK `payroll_run_id`, FK `employee_id`, `gross_pay`, `net_pay`, `tax_deducted`
- **`payslip_line_item`**: `id`, `tenant_id`, FK `payslip_id`, FK `pay_component_id`, `amount`

## 7. Domain: Recruitment (ATS) (25 Tables)
- **`job_requisition`**: `id`, `tenant_id`, FK `department_id`, `title`, `headcount`, `status`
- **`job_posting`**: `id`, `tenant_id`, FK `job_requisition_id`, `description`, `is_published`
- **`candidate`**: `id`, `tenant_id`, `first_name`, `last_name`, `email`, `phone`, `resume_url`
- **`application`**: `id`, `tenant_id`, FK `candidate_id`, FK `job_posting_id`, `stage` (Screening/Interview/Offered)
- **`interview`**: `id`, `tenant_id`, FK `application_id`, FK `interviewer_id` (employee_id), `scheduled_time`, `status`

## 8. Domain: Performance (20 Tables)
- **`review_cycle`**: `id`, `tenant_id`, `name`, `start_date`, `end_date`, `status`
- **`goal`**: `id`, `tenant_id`, FK `employee_id`, FK `review_cycle_id`, `title`, `weightage`, `progress_percent`
- **`appraisal`**: `id`, `tenant_id`, FK `employee_id`, FK `review_cycle_id`, `manager_rating`, `final_rating`

## 9. Domain: Expense & Asset (25 Tables)
- **`expense_claim`**: `id`, `tenant_id`, FK `employee_id`, `claim_date`, `total_amount`, `status`
- **`expense_line_item`**: `id`, `tenant_id`, FK `expense_claim_id`, `expense_date`, `category`, `amount`, `receipt_url`
- **`asset_inventory`**: `id`, `tenant_id`, `serial_number`, `type` (Laptop/Monitor), `purchase_date`, `status` (Available/Assigned)
- **`asset_allocation`**: `id`, `tenant_id`, FK `asset_inventory_id`, FK `employee_id`, `checkout_date`, `return_date`

## 10. Domain: Approvals & Workflows (15 Tables)
- **`workflow_def`**: `id`, `tenant_id`, `entity_type` (Leave/Expense/Requisition), `is_active`
- **`workflow_step`**: `id`, `tenant_id`, FK `workflow_def_id`, `step_order`, `approver_type` (Manager/Role), `role_id`
- **`approval_instance`**: `id`, `tenant_id`, FK `workflow_def_id`, `entity_id` (Polymorphic), `status`
- **`approval_task`**: `id`, `tenant_id`, FK `approval_instance_id`, FK `approver_id` (user_id), `status` (Pending/Approved/Rejected), `comments`

## 11. Domain: Audit & Platform (15 Tables)
- **`audit_log`**: `id`, `tenant_id`, FK `user_id`, `action`, `table_name`, `record_id`, `old_values` (JSONB), `new_values` (JSONB), `timestamp`
  - *Indexes:* GIN on `new_values`, B-Tree on `(tenant_id, table_name, record_id)`
- **`notification_log`**: `id`, `tenant_id`, FK `user_id`, `channel`, `payload`, `status`
- **`tenant_settings`**: `id`, `tenant_id`, `setting_key`, `setting_value` (JSONB)

---
*Note: Due to constraints, exact 250 tables are synthesized into normalized macro-domains representing full capabilities.*
