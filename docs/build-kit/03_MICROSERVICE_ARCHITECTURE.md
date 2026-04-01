# Microservice Architecture

The HRMS backend is implemented as a suite of loosely coupled, domain-driven microservices running on Kubernetes. Communication is primarily synchronous via REST/gRPC for queries, and asynchronous via Kafka for state changes (event-driven).

---

## 1. auth-service
**Responsibilities:** Identity management, JWT generation, Single Sign-On (SSO) integration (SAML/OAuth2), MFA verification, and RBAC policy enforcement.
**Database Tables:** `tenant`, `app_user`, `role`, `permission`, `user_role`, `role_permission`, `api_key`, `audit_log`
**Public APIs:**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/mfa/verify`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/roles`
- `POST /api/v1/tenants`
**Kafka Events:**
- *Produces:* `auth.user.created`, `auth.user.login.failed`, `tenant.provisioned`
- *Consumes:* `employee.created` (To auto-provision app user), `employee.terminated` (To revoke access)

---

## 2. employee-service
**Responsibilities:** Core system of record for employee demographics, employment history, bank details, and dependent information.
**Database Tables:** `employee`, `employee_profile`, `employee_address`, `bank_details`, `emergency_contact`, `family_member`, `job_history`, `education`
**Public APIs:**
- `GET /api/v1/employees`
- `POST /api/v1/employees`
- `GET /api/v1/employees/{id}/profile`
- `PUT /api/v1/employees/{id}/bank-details`
**Kafka Events:**
- *Produces:* `employee.created`, `employee.updated`, `employee.terminated`
- *Consumes:* `recruitment.candidate.hired`, `org.department.updated`

---

## 3. recruitment-service
**Responsibilities:** Manages job requisitions, candidate pipelines, interview scorecards, and offer generation.
**Database Tables:** `job_requisition`, `job_posting`, `candidate`, `job_application`, `interview_schedule`, `interview_feedback`, `offer_letter`
**Public APIs:**
- `POST /api/v1/recruitment/jobs`
- `GET /api/v1/recruitment/jobs/{id}/candidates`
- `POST /api/v1/recruitment/applications/{id}/status`
- `POST /api/v1/recruitment/offers`
**Kafka Events:**
- *Produces:* `recruitment.job.published`, `recruitment.candidate.applied`, `recruitment.candidate.hired`
- *Consumes:* `approval.decision.approved` (For requisition approval)

---

## 4. attendance-service
**Responsibilities:** Processes raw punches, generates timesheets, manages shifts/rosters, and computes net working hours and overtime.
**Database Tables:** `shift_configuration`, `roster`, `daily_attendance`, `punch_log`, `timesheet`, `overtime_record`, `attendance_regularization`
**Public APIs:**
- `POST /api/v1/attendance/punch`
- `GET /api/v1/attendance/daily/{date}`
- `POST /api/v1/attendance/regularize`
- `GET /api/v1/attendance/timesheets`
**Kafka Events:**
- *Produces:* `attendance.device.sync`, `attendance.timesheet.finalized`, `attendance.anomaly.detected`
- *Consumes:* `leave.approved` (To map absent days accurately), `employee.created`

---

## 5. leave-service
**Responsibilities:** Administers holiday calendars, dynamic leave policy evaluations, accrual scheduled jobs, and balance processing.
**Database Tables:** `holiday_calendar`, `leave_type`, `leave_policy`, `leave_entitlement`, `leave_request`, `leave_balance_history`
**Public APIs:**
- `GET /api/v1/leaves/balances`
- `POST /api/v1/leaves/request`
- `GET /api/v1/leaves/calendar`
- `POST /api/v1/leaves/policies`
**Kafka Events:**
- *Produces:* `leave.requested`, `leave.approved`, `leave.rejected`, `leave.cancelled`
- *Consumes:* `approval.decision.approved`, `employee.created` (To initialize balances)

---

## 6. payroll-service
**Responsibilities:** Full life-cycle payroll runs. Evaluates gross formulas, computes tax, generates payslips, handles arrears and F&F calculations.
**Database Tables:** `salary_structure`, `pay_component`, `employee_salary`, `payroll_cycle`, `payslip`, `tax_declaration`, `loan`, `reimbursement`
**Public APIs:**
- `POST /api/v1/payroll/cycles/{id}/run`
- `GET /api/v1/payroll/payslips/{id}`
- `POST /api/v1/payroll/salary-structures`
- `GET /api/v1/payroll/tax-declarations`
**Kafka Events:**
- *Produces:* `payroll.generated`, `payroll.payment.initiated`
- *Consumes:* `attendance.timesheet.finalized`, `expense.approved`, `leave.approved` (For LOP extraction)

---

## 7. performance-service
**Responsibilities:** Goal tracking, ongoing feedback, multi-rater (360) reviews, and normalization for appraisal cycles.
**Database Tables:** `review_cycle`, `goal`, `key_result`, `feedback_request`, `appraisal_form`, `appraisal_rating`
**Public APIs:**
- `POST /api/v1/performance/goals`
- `PUT /api/v1/performance/goals/{id}/progress`
- `POST /api/v1/performance/cycles`
- `POST /api/v1/performance/feedbacks`
**Kafka Events:**
- *Produces:* `performance.goal.completed`, `performance.review.published`
- *Consumes:* `employee.manager.changed` (To reassign appraisal workflows)

---

## 8. document-service
**Responsibilities:** Metadata cataloging, access control, virus-scanning, and interacting with blob storage (S3) for physical files.
**Database Tables:** `document_folder`, `document_metadata`, `document_share`, `signature_request`, `e_signature_log`
**Public APIs:**
- `POST /api/v1/documents/upload-url`
- `GET /api/v1/documents/download-url/{id}`
- `POST /api/v1/documents/signatures/request`
- `GET /api/v1/documents/folders`
**Kafka Events:**
- *Produces:* `document.uploaded`, `document.signed`
- *Consumes:* `employee.created`, `recruitment.candidate.hired`

---

## 9. expense-service
**Responsibilities:** Receipt OCR integrations, travel pre-approvals, expense policy enforcement, and claim routing.
**Database Tables:** `expense_policy`, `expense_category`, `expense_report`, `expense_line_item`, `receipt_metadata`
**Public APIs:**
- `POST /api/v1/expenses/reports`
- `POST /api/v1/expenses/line-items`
- `GET /api/v1/expenses/policies/validate`
- `GET /api/v1/expenses/reports/{id}`
**Kafka Events:**
- *Produces:* `expense.submitted`, `expense.approved`, `expense.rejected`
- *Consumes:* `approval.decision.approved`

---

## 10. asset-service
**Responsibilities:** Catalog hardware/software inventory, workflow for assignments, returns, and maintenance.
**Database Tables:** `asset_category`, `asset_inventory`, `asset_allocation`, `maintenance_request`, `software_license`
**Public APIs:**
- `POST /api/v1/assets`
- `POST /api/v1/assets/allocate`
- `POST /api/v1/assets/recover`
- `GET /api/v1/assets/my-assets`
**Kafka Events:**
- *Produces:* `asset.allocated`, `asset.recovered`
- *Consumes:* `employee.terminated` (To auto-initiate recovery)

---

## 11. organization-service
**Responsibilities:** Stores the tree structure of the enterprise hierarchy. Locations, cost centers, departments.
**Database Tables:** `company_entity`, `business_unit`, `department`, `designation`, `location`, `cost_center`
**Public APIs:**
- `GET /api/v1/organization/tree`
- `POST /api/v1/organization/departments`
- `POST /api/v1/organization/locations`
- `GET /api/v1/organization/designations`
**Kafka Events:**
- *Produces:* `org.department.created`, `org.location.updated`
- *Consumes:* none

---

## 12. notification-service
**Responsibilities:** Orchestrating multi-channel delivery (Email, SMS, Push, Slack). Rate limiting and template rendering.
**Database Tables:** `notification_template`, `notification_event`, `delivery_log`, `user_preference`, `device_token`
**Public APIs:**
- `GET /api/v1/notifications/inbox`
- `PUT /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/preferences`
- `POST /api/v1/notifications/devices`
**Kafka Events:**
- *Produces:* `notification.delivered`, `notification.failed`
- *Consumes:* Consumes domain events across the platform (e.g. `leave.requested`, `expense.approved`) based on routing rules to generate notifications.

---

## 13. analytics-service
**Responsibilities:** Aggregating flattened data from Kafka topics into OLAP/Clickhouse datastores. Metric generation and export.
**Database Tables:** (Usually columnar DB like Clickhouse) `daily_metrics`, `headcount_snapshot`, `dashboard_config`, `scheduled_report`
**Public APIs:**
- `GET /api/v1/analytics/dashboards/{id}`
- `POST /api/v1/analytics/reports/export`
- `GET /api/v1/analytics/widgets/{id}/data`
**Kafka Events:**
- *Produces:* `analytics.report.generated`
- *Consumes:* All platform events (for CDC and telemetry aggregation).

---

## 14. approval-service
**Responsibilities:** Stateless execution engine for dynamic approval workflows. Keeps track of who needs to approve what.
**Database Tables:** `workflow_definition`, `workflow_step`, `workflow_rule`, `approval_instance`, `approval_task`, `delegation`
**Public APIs:**
- `POST /api/v1/approvals/definitions`
- `GET /api/v1/approvals/inbox`
- `POST /api/v1/approvals/tasks/{id}/decide`
- `GET /api/v1/approvals/instances/{id}/trajectory`
**Kafka Events:**
- *Produces:* `approval.task.assigned`, `approval.decision.approved`, `approval.decision.rejected`
- *Consumes:* Domain service events requesting approval (e.g., `expense.submitted` → initiates `expense_approval` workflow).
