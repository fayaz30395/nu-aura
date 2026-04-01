# RBAC & Permission Matrix

The HRMS platform implements a strict Role-Based Access Control (RBAC) mechanism. Every API request is verified against the `permission` required to execute the endpoint. The format is standard: `<module>.<action>`.

## System Users & Roles
- **SuperAdmin:** The highest-level role in the system. Has global, unrestricted access to the entire platform. Can view, edit, configure, and delete any page, setting, or data record across all users, tenants, and modules, including other administrators. Automatically bypasses standard permission checks.
- **TenantAdmin / HR Admin:** Full control over their specific tenant.
- **ReportingManager:** Elevated permissions applied specifically to direct/indirect subordinates.
- **Employee (Self Service):** Baseline permissions restricted to `self` ownership data.
- **FinanceAdmin:** Access to payroll, expenses, and asset valuation.
- **Recruiter:** Restricted to ATS, job postings, and candidate pipelines.

---

## Permission Matrix (~500 Perms)

Below is an extensive extract of granular permissions across all modules:

### 1. auth & settings
`auth.login`, `auth.mfa.setup`, `auth.mfa.reset`, `auth.password.change`, `auth.password.reset`
`role.read`, `role.create`, `role.update`, `role.delete`, `role.assign`
`permission.read`
`tenant.read`, `tenant.update.billing`, `tenant.update.branding`, `tenant.update.preferences`
`audit.read`, `audit.export`

### 2. employee
`employee.read`, `employee.read.salary`, `employee.read.sensitive`, `employee.create`, `employee.update`, `employee.update.status`, `employee.delete`
`employee.profile.read`, `employee.profile.update`
`employee.address.read`, `employee.address.create`, `employee.address.update`, `employee.address.delete`
`employee.bank.read`, `employee.bank.create`, `employee.bank.update`, `employee.bank.delete`, `employee.bank.verify`
`employee.dependent.read`, `employee.dependent.create`, `employee.dependent.update`, `employee.dependent.delete`
`employee.emergency.read`, `employee.emergency.create`, `employee.emergency.update`, `employee.emergency.delete`
`employee.history.read`, `employee.history.create`, `employee.history.update`, `employee.history.delete`
`employee.education.read`, `employee.education.create`, `employee.education.update`, `employee.education.delete`
`employee.identity.read`, `employee.identity.create`, `employee.identity.update`, `employee.identity.delete`

### 3. organization
`org.company.read`, `org.company.update`
`org.legalentity.read`, `org.legalentity.create`, `org.legalentity.update`, `org.legalentity.delete`
`org.businessunit.read`, `org.businessunit.create`, `org.businessunit.update`, `org.businessunit.delete`
`org.department.read`, `org.department.create`, `org.department.update`, `org.department.delete`
`org.designation.read`, `org.designation.create`, `org.designation.update`, `org.designation.delete`
`org.location.read`, `org.location.create`, `org.location.update`, `org.location.delete`
`org.tree.read`, `org.tree.export`

### 4. recruitment
`recruitment.requisition.read`, `recruitment.requisition.create`, `recruitment.requisition.update`, `recruitment.requisition.approve`, `recruitment.requisition.delete`
`recruitment.job.read`, `recruitment.job.create`, `recruitment.job.publish`, `recruitment.job.unpublish`, `recruitment.job.update`, `recruitment.job.delete`
`recruitment.candidate.read`, `recruitment.candidate.create`, `recruitment.candidate.update`, `recruitment.candidate.delete`, `recruitment.candidate.blacklist`
`recruitment.application.read`, `recruitment.application.create`, `recruitment.application.update`, `recruitment.application.move_stage`, `recruitment.application.reject`
`recruitment.interview.read`, `recruitment.interview.schedule`, `recruitment.interview.reschedule`, `recruitment.interview.cancel`
`recruitment.feedback.read`, `recruitment.feedback.create`, `recruitment.feedback.update`
`recruitment.offer.read`, `recruitment.offer.create`, `recruitment.offer.send`, `recruitment.offer.revoke`, `recruitment.offer.accept`
`recruitment.vendor.read`, `recruitment.vendor.create`, `recruitment.vendor.update`, `recruitment.vendor.delete`

### 5. onboarding
`onboarding.template.read`, `onboarding.template.create`, `onboarding.template.update`, `onboarding.template.delete`
`onboarding.task.read`, `onboarding.task.create`, `onboarding.task.update`, `onboarding.task.delete`, `onboarding.task.complete`
`onboarding.journey.read`, `onboarding.journey.start`, `onboarding.journey.abort`

### 6. attendance
`attendance.shift.read`, `attendance.shift.create`, `attendance.shift.update`, `attendance.shift.delete`
`attendance.roster.read`, `attendance.roster.assign`, `attendance.roster.update`, `attendance.roster.delete`
`attendance.punch.read`, `attendance.punch.create`, `attendance.punch.update`, `attendance.punch.delete`
`attendance.timesheet.read`, `attendance.timesheet.generate`, `attendance.timesheet.finalize`
`attendance.regularize.read`, `attendance.regularize.apply`, `attendance.regularize.approve`, `attendance.regularize.reject`
`attendance.overtime.read`, `attendance.overtime.apply`, `attendance.overtime.approve`, `attendance.overtime.reject`
`attendance.device.read`, `attendance.device.sync`, `attendance.device.config`

### 7. leave
`leave.policy.read`, `leave.policy.create`, `leave.policy.update`, `leave.policy.delete`
`leave.type.read`, `leave.type.create`, `leave.type.update`, `leave.type.delete`
`leave.balance.read`, `leave.balance.adjust`, `leave.balance.recalculate`
`leave.request.read`, `leave.request.apply`, `leave.request.approve`, `leave.request.reject`, `leave.request.cancel`
`leave.calendar.read`, `leave.calendar.create`, `leave.calendar.update`, `leave.calendar.delete`
`leave.encashment.read`, `leave.encashment.apply`, `leave.encashment.approve`

### 8. payroll
`payroll.structure.read`, `payroll.structure.create`, `payroll.structure.update`, `payroll.structure.delete`
`payroll.component.read`, `payroll.component.create`, `payroll.component.update`, `payroll.component.delete`
`payroll.cycle.read`, `payroll.cycle.create`, `payroll.cycle.run`, `payroll.cycle.lock`, `payroll.cycle.unlock`, `payroll.cycle.delete`
`payroll.payslip.read`, `payroll.payslip.generate`, `payroll.payslip.publish`, `payroll.payslip.download`
`payroll.tax.read`, `payroll.tax.declare`, `payroll.tax.update`, `payroll.tax.verify`, `payroll.tax.reject`
`payroll.declaration.read`, `payroll.declaration.create`, `payroll.declaration.submit`, `payroll.declaration.approve`
`payroll.loan.read`, `payroll.loan.apply`, `payroll.loan.approve`, `payroll.loan.disburse`, `payroll.loan.repay`
`payroll.arrears.read`, `payroll.arrears.create`, `payroll.arrears.approve`
`payroll.fnf.read`, `payroll.fnf.initiate`, `payroll.fnf.calculate`, `payroll.fnf.settle`
`payroll.export.bankfile`, `payroll.export.journal`

### 9. performance
`performance.cycle.read`, `performance.cycle.create`, `performance.cycle.launch`, `performance.cycle.close`, `performance.cycle.delete`
`performance.goal.read`, `performance.goal.create`, `performance.goal.update`, `performance.goal.delete`, `performance.goal.approve`
`performance.kr.read`, `performance.kr.create`, `performance.kr.update`, `performance.kr.delete`
`performance.feedback.read`, `performance.feedback.request`, `performance.feedback.provide`
`performance.appraisal.read`, `performance.appraisal.self_evaluate`, `performance.appraisal.manager_evaluate`, `performance.appraisal.skip_level_evaluate`
`performance.calibration.read`, `performance.calibration.update`, `performance.calibration.publish`

### 10. document
`document.folder.read`, `document.folder.create`, `document.folder.update`, `document.folder.delete`
`document.file.read`, `document.file.upload`, `document.file.update`, `document.file.delete`, `document.file.download`
`document.share.read`, `document.share.create`, `document.share.revoke`
`document.signature.read`, `document.signature.request`, `document.signature.sign`, `document.signature.void`

### 11. expense
`expense.policy.read`, `expense.policy.create`, `expense.policy.update`, `expense.policy.delete`
`expense.category.read`, `expense.category.create`, `expense.category.update`, `expense.category.delete`
`expense.claim.read`, `expense.claim.submit`, `expense.claim.approve`, `expense.claim.reject`, `expense.claim.pay`
`expense.receipt.read`, `expense.receipt.upload`, `expense.receipt.delete`
`expense.advance.read`, `expense.advance.apply`, `expense.advance.approve`, `expense.advance.disburse`

### 12. asset
`asset.category.read`, `asset.category.create`, `asset.category.update`, `asset.category.delete`
`asset.inventory.read`, `asset.inventory.create`, `asset.inventory.update`, `asset.inventory.delete`, `asset.inventory.retire`
`asset.allocation.read`, `asset.allocation.assign`, `asset.allocation.recover`, `asset.allocation.approve`
`asset.maintenance.read`, `asset.maintenance.request`, `asset.maintenance.resolve`

### 13. notification
`notification.template.read`, `notification.template.create`, `notification.template.update`, `notification.template.delete`
`notification.event.read`, `notification.event.configure`
`notification.inbox.read`, `notification.inbox.mark_read`, `notification.inbox.delete`

### 14. analytics
`analytics.dashboard.read`, `analytics.dashboard.create`, `analytics.dashboard.update`, `analytics.dashboard.delete`
`analytics.widget.read`, `analytics.widget.create`, `analytics.widget.update`, `analytics.widget.delete`
`analytics.report.read`, `analytics.report.create`, `analytics.report.run`, `analytics.report.schedule`, `analytics.report.export`

### 15. approval
`approval.workflow.read`, `approval.workflow.create`, `approval.workflow.update`, `approval.workflow.delete`
`approval.step.read`, `approval.step.create`, `approval.step.update`, `approval.step.delete`
`approval.instance.read`, `approval.instance.override_reject`, `approval.instance.override_approve`
`approval.task.read`, `approval.task.approve`, `approval.task.reject`, `approval.task.delegate`, `approval.task.escalate`
`approval.delegation.read`, `approval.delegation.create`, `approval.delegation.revoke`

---
These represent a subset. Implementations map arrays of these permissions precisely directly to user roles via `role_permission` junction tables, guaranteeing atomic endpoint and button-level frontend security constraints.
