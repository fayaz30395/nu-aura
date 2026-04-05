# NU-AURA Baseline Analysis

> Analyzer Agent | Generated 2026-03-31
> Total page.tsx files: 213 | Unique route patterns: 240 | Already validated: 28

---

## 1. Route Inventory (213 page.tsx files)

### 1.1 Public / Marketing Routes (NOT in AUTHENTICATED_ROUTES -- by design)

| Route                         | Sub-App       | Notes                           |
|-------------------------------|---------------|---------------------------------|
| `/`                           | Landing       | Root landing page               |
| `/about`                      | Marketing     | About page                      |
| `/contact`                    | Marketing     | Contact page                    |
| `/features`                   | Marketing     | Feature showcase                |
| `/pricing`                    | Marketing     | Pricing page                    |
| `/auth/login`                 | Auth          | Login page                      |
| `/auth/signup`                | Auth          | Signup/registration             |
| `/auth/forgot-password`       | Auth          | Password reset request          |
| `/exit-interview/[token]`     | Public portal | Token-based, no session needed  |
| `/sign/[token]`               | Public portal | E-signature portal, token-based |
| `/careers`                    | Public portal | Career page for candidates      |
| `/offer-portal`               | Public portal | Offer sign page for candidates  |
| `/preboarding/portal/[token]` | Public portal | Candidate preboarding           |

**Total: 13 routes** -- These are intentionally public.

---

### 1.2 NU-HRMS Routes (Core HR)

| #   | Route                               | Module        | Risk | RBAC (page-level)                         | Validated | Notes                      |
|-----|-------------------------------------|---------------|------|-------------------------------------------|-----------|----------------------------|
| 1   | `/me/dashboard`                     | Self-Service  | P3   | None (self-service, no gate)              | YES       | Clock In/Out, feed         |
| 2   | `/me/profile`                       | Self-Service  | P3   | None (self-service)                       | YES       | Personal profile           |
| 3   | `/me/attendance`                    | Self-Service  | P3   | None (self-service)                       | YES       | Personal attendance        |
| 4   | `/me/leaves`                        | Self-Service  | P3   | None (self-service)                       | No        | My leave history           |
| 5   | `/me/payslips`                      | Self-Service  | P2   | None (self-service)                       | YES       | Payslip view               |
| 6   | `/me/documents`                     | Self-Service  | P2   | None (self-service)                       | No        | My documents               |
| 7   | `/home`                             | Legacy        | P3   | None                                      | No        | Redirects to /me/dashboard |
| 8   | `/dashboard`                        | Dashboard     | P2   | None                                      | No        | HR ops dashboard           |
| 9   | `/dashboards/executive`             | Dashboard     | P0   | NO PermissionGate (relies on backend 403) | YES       | Exec metrics, financials   |
| 10  | `/dashboards/manager`               | Dashboard     | P1   | NO PermissionGate                         | No        | Manager dashboard          |
| 11  | `/dashboards/employee`              | Dashboard     | P3   | NO PermissionGate                         | No        | Employee dashboard         |
| 12  | `/employees`                        | People        | P1   | YES (PermissionGate + usePermissions)     | YES       | Employee list, CRUD        |
| 13  | `/employees/[id]`                   | People        | P1   | YES (PermissionGate)                      | No        | Employee detail            |
| 14  | `/employees/[id]/edit`              | People        | P1   | NO PermissionGate                         | No        | Edit employee              |
| 15  | `/employees/directory`              | People        | P2   | NO PermissionGate                         | YES       | Card grid                  |
| 16  | `/employees/import`                 | People        | P1   | YES (PermissionGate)                      | No        | Bulk import                |
| 17  | `/employees/change-requests`        | People        | P1   | Unknown                                   | No        | Employment changes         |
| 18  | `/departments`                      | Organization  | P2   | Unknown                                   | YES       | Department list            |
| 19  | `/org-chart`                        | Organization  | P3   | Unknown                                   | YES       | Org tree                   |
| 20  | `/organization-chart`               | Organization  | P3   | NO PermissionGate                         | No        | Duplicate?                 |
| 21  | `/team-directory`                   | Organization  | P3   | NO PermissionGate                         | No        | Team directory             |
| 22  | `/attendance`                       | Attendance    | P2   | Unknown                                   | YES       | All attendance             |
| 23  | `/attendance/my-attendance`         | Attendance    | P3   | NO PermissionGate (self-service)          | No        | Personal attendance        |
| 24  | `/attendance/team`                  | Attendance    | P2   | NO PermissionGate                         | No        | Team attendance            |
| 25  | `/attendance/regularization`        | Attendance    | P2   | Unknown                                   | No        | Regularization requests    |
| 26  | `/attendance/comp-off`              | Attendance    | P2   | NO PermissionGate                         | No        | Comp-off requests          |
| 27  | `/attendance/shift-swap`            | Attendance    | P2   | NO PermissionGate                         | No        | Shift swap requests        |
| 28  | `/leave`                            | Leave         | P2   | Unknown                                   | YES       | Leave overview             |
| 29  | `/leave/apply`                      | Leave         | P2   | Unknown                                   | YES       | Apply leave                |
| 30  | `/leave/approvals`                  | Leave         | P1   | Unknown                                   | No        | Approve/reject             |
| 31  | `/leave/calendar`                   | Leave         | P3   | NO PermissionGate                         | No        | Team calendar              |
| 32  | `/leave/my-leaves`                  | Leave         | P3   | NO PermissionGate                         | No        | My leave history           |
| 33  | `/payroll`                          | Payroll       | P0   | Unknown                                   | No        | Payroll dashboard          |
| 34  | `/payroll/runs`                     | Payroll       | P0   | YES (usePermissions redirect)             | YES       | Process payroll            |
| 35  | `/payroll/salary-structures`        | Payroll       | P0   | YES (PermissionGate PAYROLL_VIEW)         | No        | Salary structures          |
| 36  | `/payroll/salary-structures/create` | Payroll       | P0   | Unknown                                   | No        | Create structure           |
| 37  | `/payroll/structures`               | Payroll       | P0   | Unknown                                   | No        | Possibly duplicate         |
| 38  | `/payroll/components`               | Payroll       | P0   | Unknown                                   | No        | Pay components             |
| 39  | `/payroll/payslips`                 | Payroll       | P0   | Unknown                                   | No        | Admin payslip view         |
| 40  | `/payroll/bulk-processing`          | Payroll       | P0   | Unknown                                   | No        | Bulk payroll               |
| 41  | `/payroll/statutory`                | Payroll       | P0   | Unknown                                   | No        | Statutory deductions       |
| 42  | `/compensation`                     | Compensation  | P0   | Unknown (no PermissionGate found)         | No        | Comp revisions             |
| 43  | `/expenses`                         | Expenses      | P1   | YES (PermissionGate)                      | YES       | Expense claims             |
| 44  | `/expenses/[id]`                    | Expenses      | P1   | NO PermissionGate                         | No        | Expense detail             |
| 45  | `/expenses/approvals`               | Expenses      | P1   | Unknown                                   | No        | Approve expenses           |
| 46  | `/expenses/reports`                 | Expenses      | P2   | Unknown                                   | No        | Expense reports            |
| 47  | `/expenses/settings`                | Expenses      | P1   | Unknown                                   | No        | Expense settings           |
| 48  | `/loans`                            | Loans         | P0   | YES (PermissionGate)                      | No        | Employee loans             |
| 49  | `/loans/[id]`                       | Loans         | P0   | NO PermissionGate                         | No        | Loan detail                |
| 50  | `/loans/new`                        | Loans         | P0   | Unknown                                   | No        | Apply for loan             |
| 51  | `/benefits`                         | Benefits      | P1   | Unknown                                   | No        | Benefits enrollment        |
| 52  | `/contracts`                        | Contracts     | P0   | YES (PermissionGate)                      | YES       | Contract list              |
| 53  | `/contracts/[id]`                   | Contracts     | P0   | NO PermissionGate                         | No        | Contract detail            |
| 54  | `/contracts/new`                    | Contracts     | P0   | NO PermissionGate                         | No        | Create contract            |
| 55  | `/contracts/templates`              | Contracts     | P0   | NO PermissionGate                         | No        | Contract templates         |
| 56  | `/letters`                          | Letters       | P2   | Unknown                                   | No        | HR letters                 |
| 57  | `/letter-templates`                 | Letters       | P1   | Unknown                                   | No        | Letter templates           |
| 58  | `/travel`                           | Travel        | P1   | Unknown                                   | No        | Travel requests            |
| 59  | `/travel/[id]`                      | Travel        | P1   | NO PermissionGate                         | No        | Travel detail              |
| 60  | `/travel/new`                       | Travel        | P1   | NO PermissionGate                         | No        | New travel req             |
| 61  | `/assets`                           | Assets        | P2   | Unknown                                   | YES       | Asset inventory            |
| 62  | `/announcements`                    | Announcements | P3   | Unknown                                   | YES       | Company announcements      |
| 63  | `/approvals`                        | Approvals     | P2   | NO PermissionGate (all employees)         | YES       | Approval inbox             |
| 64  | `/approvals/inbox`                  | Approvals     | P2   | Unknown                                   | No        | Dedicated inbox            |
| 65  | `/holidays`                         | Calendar      | P3   | Unknown                                   | No        | Holiday list               |
| 66  | `/restricted-holidays`              | Calendar      | P3   | Unknown                                   | No        | Restricted holidays        |
| 67  | `/calendar`                         | Calendar      | P3   | Unknown                                   | No        | Calendar                   |
| 68  | `/calendar/[id]`                    | Calendar      | P3   | Unknown                                   | No        | Event detail               |
| 69  | `/calendar/new`                     | Calendar      | P3   | Unknown                                   | No        | Create event               |
| 70  | `/nu-calendar`                      | Calendar      | P3   | NO PermissionGate                         | No        | NU Calendar                |
| 71  | `/nu-drive`                         | Drive         | P3   | NO PermissionGate                         | No        | File storage               |
| 72  | `/nu-mail`                          | Mail          | P3   | NO PermissionGate                         | No        | Internal mail              |
| 73  | `/statutory`                        | Statutory     | P0   | YES (PermissionGate)                      | No        | Statutory compliance       |
| 74  | `/statutory-filings`                | Statutory     | P0   | NO PermissionGate                         | No        | Filing runs                |
| 75  | `/lwf`                              | Statutory     | P0   | Unknown                                   | No        | Labour Welfare Fund        |
| 76  | `/tax`                              | Tax           | P0   | YES (PermissionGate TAX_VIEW)             | No        | Tax management             |
| 77  | `/tax/declarations`                 | Tax           | P1   | NO PermissionGate                         | No        | Tax declarations           |
| 78  | `/compliance`                       | Compliance    | P1   | NO PermissionGate                         | No        | Compliance dashboard       |
| 79  | `/helpdesk`                         | Helpdesk      | P3   | NO PermissionGate                         | No        | Helpdesk dashboard         |
| 80  | `/helpdesk/tickets`                 | Helpdesk      | P3   | Unknown                                   | No        | Ticket list                |
| 81  | `/helpdesk/tickets/[id]`            | Helpdesk      | P3   | Unknown                                   | No        | Ticket detail              |
| 82  | `/helpdesk/knowledge-base`          | Helpdesk      | P3   | Unknown                                   | No        | KB articles                |
| 83  | `/helpdesk/sla`                     | Helpdesk      | P2   | Unknown                                   | No        | SLA management             |
| 84  | `/payments`                         | Payments      | P0   | NO PermissionGate (feature-flagged)       | No        | Payment gateway            |
| 85  | `/payments/config`                  | Payments      | P0   | NO PermissionGate                         | No        | Payment config             |
| 86  | `/import-export`                    | Admin         | P1   | Unknown                                   | No        | Data import/export         |
| 87  | `/integrations`                     | Admin         | P1   | NO PermissionGate                         | No        | Integration settings       |
| 88  | `/biometric-devices`                | Admin         | P2   | YES (PermissionGate ATTENDANCE_MANAGE)    | No        | Biometric devices          |
| 89  | `/security`                         | Admin         | P1   | NO PermissionGate                         | No        | Security settings          |
| 90  | `/company-spotlight`                | Info          | P3   | NO PermissionGate                         | No        | Company spotlight          |
| 91  | `/linkedin-posts`                   | Info          | P3   | NO PermissionGate                         | No        | LinkedIn posts             |
| 92  | `/overtime`                         | Attendance    | P1   | Unknown                                   | No        | Overtime requests          |
| 93  | `/probation`                        | People        | P1   | Unknown                                   | No        | Probation tracking         |
| 94  | `/shifts`                           | Shifts        | P2   | Unknown                                   | No        | Shift management           |
| 95  | `/shifts/definitions`               | Shifts        | P2   | Unknown                                   | No        | Shift definitions          |
| 96  | `/shifts/patterns`                  | Shifts        | P2   | Unknown                                   | No        | Shift patterns             |
| 97  | `/shifts/swaps`                     | Shifts        | P2   | Unknown                                   | No        | Shift swaps                |
| 98  | `/shifts/my-schedule`               | Shifts        | P3   | NO PermissionGate (self-service)          | No        | My schedule                |
| 99  | `/workflows`                        | Workflows     | P1   | YES (usePermissions)                      | YES       | Workflow builder           |
| 100 | `/workflows/[id]`                   | Workflows     | P1   | YES (usePermissions)                      | No        | Workflow detail            |
| 101 | `/settings`                         | Settings      | P3   | NO PermissionGate (self-service)          | YES       | User settings              |
| 102 | `/settings/profile`                 | Settings      | P3   | NO PermissionGate                         | No        | Profile settings           |
| 103 | `/settings/security`                | Settings      | P2   | NO PermissionGate                         | No        | MFA, password              |
| 104 | `/settings/notifications`           | Settings      | P3   | NO PermissionGate                         | No        | Notification prefs         |
| 105 | `/settings/sso`                     | Settings      | P2   | NO PermissionGate                         | No        | SSO config                 |

### NU-HRMS: Projects & Resources Sub-module

| #   | Route                          | Module     | Risk | RBAC (page-level) | Validated | Notes              |
|-----|--------------------------------|------------|------|-------------------|-----------|--------------------|
| 106 | `/projects`                    | Projects   | P2   | NO PermissionGate | No        | Project list       |
| 107 | `/projects/[id]`               | Projects   | P2   | NO PermissionGate | No        | Project detail     |
| 108 | `/projects/calendar`           | Projects   | P3   | NO PermissionGate | No        | Project calendar   |
| 109 | `/projects/gantt`              | Projects   | P3   | NO PermissionGate | No        | Gantt chart        |
| 110 | `/projects/resource-conflicts` | Projects   | P2   | NO PermissionGate | No        | Conflicts view     |
| 111 | `/time-tracking`               | Timesheets | P2   | Unknown           | No        | Time entries       |
| 112 | `/time-tracking/[id]`          | Timesheets | P2   | NO PermissionGate | No        | Entry detail       |
| 113 | `/time-tracking/new`           | Timesheets | P2   | NO PermissionGate | No        | New entry          |
| 114 | `/timesheets`                  | Timesheets | P2   | Unknown           | No        | Timesheet overview |
| 115 | `/resources`                   | Resources  | P2   | NO PermissionGate | No        | Resource pool      |
| 116 | `/resources/pool`              | Resources  | P2   | NO PermissionGate | No        | Pool management    |
| 117 | `/resources/availability`      | Resources  | P2   | NO PermissionGate | No        | Availability       |
| 118 | `/resources/capacity`          | Resources  | P2   | NO PermissionGate | No        | Capacity planning  |
| 119 | `/resources/workload`          | Resources  | P2   | NO PermissionGate | No        | Workload view      |
| 120 | `/resources/approvals`         | Resources  | P2   | NO PermissionGate | No        | Resource approvals |
| 121 | `/allocations`                 | Resources  | P2   | NO PermissionGate | No        | Allocations        |
| 122 | `/allocations/summary`         | Resources  | P2   | NO PermissionGate | No        | Summary            |

### NU-HRMS: Reports & Analytics

| #   | Route                   | Module    | Risk | RBAC (page-level) | Validated | Notes                                |
|-----|-------------------------|-----------|------|-------------------|-----------|--------------------------------------|
| 123 | `/reports`              | Reports   | P2   | NO PermissionGate | No        | Reports hub                          |
| 124 | `/reports/headcount`    | Reports   | P2   | Unknown           | No        | Headcount report                     |
| 125 | `/reports/attrition`    | Reports   | P2   | Unknown           | No        | Attrition report                     |
| 126 | `/reports/leave`        | Reports   | P2   | Unknown           | No        | Leave report                         |
| 127 | `/reports/payroll`      | Reports   | P0   | Unknown           | No        | Payroll report                       |
| 128 | `/reports/performance`  | Reports   | P2   | Unknown           | No        | Performance report                   |
| 129 | `/reports/utilization`  | Reports   | P2   | Unknown           | No        | Utilization                          |
| 130 | `/reports/builder`      | Reports   | P2   | Unknown           | No        | Custom report builder                |
| 131 | `/reports/scheduled`    | Reports   | P2   | NO PermissionGate | No        | Scheduled reports                    |
| 132 | `/analytics`            | Analytics | P2   | NO PermissionGate | No        | Analytics hub                        |
| 133 | `/analytics/org-health` | Analytics | P2   | NO PermissionGate | No        | Org health                           |
| 134 | `/predictive-analytics` | Analytics | P2   | NO PermissionGate | No        | ML predictions                       |
| 135 | `/executive`            | Analytics | P0   | NO PermissionGate | No        | Possibly duplicate of exec dashboard |

### NU-HRMS: Admin Routes

| #   | Route                     | Module | Risk | RBAC (page-level)                | Validated | Notes               |
|-----|---------------------------|--------|------|----------------------------------|-----------|---------------------|
| 136 | `/admin`                  | Admin  | P1   | Unknown                          | No        | Admin hub           |
| 137 | `/admin/roles`            | Admin  | P0   | YES (usePermissions, role-gated) | No        | Role management     |
| 138 | `/admin/permissions`      | Admin  | P0   | YES (usePermissions, role-gated) | No        | Permission matrix   |
| 139 | `/admin/employees`        | Admin  | P1   | YES (usePermissions)             | No        | Admin employee view |
| 140 | `/admin/leave-types`      | Admin  | P1   | Unknown                          | No        | Leave type config   |
| 141 | `/admin/leave-requests`   | Admin  | P1   | Unknown                          | No        | Leave request mgmt  |
| 142 | `/admin/holidays`         | Admin  | P2   | Unknown                          | No        | Holiday config      |
| 143 | `/admin/shifts`           | Admin  | P2   | Unknown                          | No        | Shift config        |
| 144 | `/admin/payroll`          | Admin  | P0   | NO PermissionGate                | No        | Payroll admin       |
| 145 | `/admin/custom-fields`    | Admin  | P2   | Unknown                          | No        | Custom fields       |
| 146 | `/admin/feature-flags`    | Admin  | P1   | Unknown                          | No        | Feature toggles     |
| 147 | `/admin/implicit-roles`   | Admin  | P1   | Unknown                          | No        | Implicit roles      |
| 148 | `/admin/integrations`     | Admin  | P1   | Unknown                          | No        | Integration mgmt    |
| 149 | `/admin/import-keka`      | Admin  | P1   | NO PermissionGate                | No        | Keka data import    |
| 150 | `/admin/mobile-api`       | Admin  | P1   | NO PermissionGate                | No        | Mobile API config   |
| 151 | `/admin/office-locations` | Admin  | P2   | Unknown                          | No        | Office locations    |
| 152 | `/admin/org-hierarchy`    | Admin  | P1   | Unknown                          | No        | Org hierarchy       |
| 153 | `/admin/profile`          | Admin  | P2   | NO PermissionGate                | No        | Admin profile       |
| 154 | `/admin/reports`          | Admin  | P2   | NO PermissionGate                | No        | Admin reports       |
| 155 | `/admin/settings`         | Admin  | P1   | Unknown                          | No        | System settings     |
| 156 | `/admin/system`           | Admin  | P0   | Unknown                          | No        | System admin        |

---

### 1.3 NU-Hire Routes (Recruitment & Onboarding)

| #   | Route                              | Module      | Risk | RBAC (page-level)    | Validated | Notes                   |
|-----|------------------------------------|-------------|------|----------------------|-----------|-------------------------|
| 157 | `/recruitment`                     | Recruitment | P2   | Unknown              | YES       | NU-Hire dashboard       |
| 158 | `/recruitment/jobs`                | Recruitment | P2   | Unknown              | No        | Job postings            |
| 159 | `/recruitment/candidates`          | Recruitment | P2   | Unknown              | No        | Candidate list          |
| 160 | `/recruitment/candidates/[id]`     | Recruitment | P2   | Unknown              | No        | Candidate detail        |
| 161 | `/recruitment/[jobId]/kanban`      | Recruitment | P2   | NO PermissionGate    | No        | Pipeline kanban         |
| 162 | `/recruitment/interviews`          | Recruitment | P2   | NO PermissionGate    | No        | Interviews              |
| 163 | `/recruitment/pipeline`            | Recruitment | P2   | NO PermissionGate    | No        | Pipeline view           |
| 164 | `/recruitment/job-boards`          | Recruitment | P2   | Unknown              | No        | Job board integrations  |
| 165 | `/referrals`                       | Recruitment | P3   | Unknown              | No        | Employee referrals      |
| 166 | `/onboarding`                      | Onboarding  | P1   | Unknown              | YES       | Onboarding hub          |
| 167 | `/onboarding/[id]`                 | Onboarding  | P1   | NO PermissionGate    | No        | Onboarding detail       |
| 168 | `/onboarding/new`                  | Onboarding  | P1   | Unknown              | No        | New hire onboarding     |
| 169 | `/onboarding/templates`            | Onboarding  | P2   | Unknown              | No        | Onboarding templates    |
| 170 | `/onboarding/templates/[id]`       | Onboarding  | P2   | Unknown              | No        | Template detail         |
| 171 | `/onboarding/templates/new`        | Onboarding  | P2   | Unknown              | No        | New template            |
| 172 | `/preboarding`                     | Preboarding | P1   | YES (PermissionGate) | No        | Preboarding admin       |
| 173 | `/offboarding`                     | Offboarding | P1   | YES (PermissionGate) | No        | Exit processes          |
| 174 | `/offboarding/[id]`                | Offboarding | P1   | Unknown              | No        | Exit detail             |
| 175 | `/offboarding/[id]/exit-interview` | Offboarding | P1   | Unknown              | No        | Exit interview          |
| 176 | `/offboarding/[id]/fnf`            | Offboarding | P0   | YES (PermissionGate) | No        | Full & Final settlement |
| 177 | `/offboarding/exit/fnf`            | Offboarding | P0   | NO PermissionGate    | No        | FnF processing          |

---

### 1.4 NU-Grow Routes (Performance, Learning, Engagement)

| #   | Route                                  | Module      | Risk | RBAC (page-level)                   | Validated | Notes               |
|-----|----------------------------------------|-------------|------|-------------------------------------|-----------|---------------------|
| 178 | `/performance`                         | Performance | P1   | YES (PermissionGate REVIEW_VIEW)    | YES       | NU-Grow hub         |
| 179 | `/performance/reviews`                 | Performance | P1   | YES (PermissionGate)                | YES       | Review cycles       |
| 180 | `/performance/cycles`                  | Performance | P1   | Unknown                             | No        | Performance cycles  |
| 181 | `/performance/cycles/[id]/calibration` | Performance | P1   | Unknown                             | No        | Calibration         |
| 182 | `/performance/cycles/[id]/nine-box`    | Performance | P1   | Unknown                             | No        | 9-box grid          |
| 183 | `/performance/goals`                   | Performance | P2   | Unknown                             | No        | Goal management     |
| 184 | `/performance/okr`                     | Performance | P2   | Unknown                             | No        | OKR tracking        |
| 185 | `/performance/feedback`                | Performance | P2   | Unknown                             | No        | Continuous feedback |
| 186 | `/performance/360-feedback`            | Performance | P2   | YES (PermissionGate FEEDBACK_360_*) | No        | 360 feedback        |
| 187 | `/performance/competency-matrix`       | Performance | P2   | Unknown                             | No        | Competency matrix   |
| 188 | `/performance/calibration`             | Performance | P1   | Unknown                             | No        | Bell curve          |
| 189 | `/performance/9box`                    | Performance | P2   | NO PermissionGate                   | No        | 9-box               |
| 190 | `/performance/pip`                     | Performance | P1   | Unknown                             | No        | PIPs                |
| 191 | `/performance/revolution`              | Performance | P3   | NO PermissionGate                   | No        | Unknown             |
| 192 | `/okr`                                 | OKR         | P2   | NO PermissionGate                   | No        | OKR dashboard       |
| 193 | `/feedback360`                         | Feedback    | P2   | NO PermissionGate                   | No        | 360 dashboard       |
| 194 | `/goals`                               | Goals       | P2   | NO PermissionGate                   | No        | Goal dashboard      |
| 195 | `/one-on-one`                          | Meetings    | P3   | Unknown                             | No        | 1:1 meetings        |
| 196 | `/training`                            | Training    | P2   | Unknown                             | No        | Training hub        |
| 197 | `/training/catalog`                    | Training    | P3   | Unknown                             | No        | Training catalog    |
| 198 | `/training/my-learning`                | Training    | P3   | NO PermissionGate (self-service)    | No        | My courses          |
| 199 | `/learning`                            | LMS         | P3   | Unknown                             | No        | LMS dashboard       |
| 200 | `/learning/courses/[id]`               | LMS         | P3   | Unknown                             | No        | Course detail       |
| 201 | `/learning/courses/[id]/play`          | LMS         | P3   | NO PermissionGate                   | No        | Course player       |
| 202 | `/learning/courses/[id]/quiz/[quizId]` | LMS         | P2   | Unknown                             | No        | Quiz                |
| 203 | `/learning/paths`                      | LMS         | P3   | NO PermissionGate                   | No        | Learning paths      |
| 204 | `/learning/certificates`               | LMS         | P3   | NO PermissionGate                   | No        | Certificates        |
| 205 | `/recognition`                         | Engagement  | P3   | Unknown                             | No        | Recognition hub     |
| 206 | `/surveys`                             | Engagement  | P2   | YES (PermissionGate SURVEY_MANAGE)  | No        | Surveys             |
| 207 | `/wellness`                            | Engagement  | P3   | Unknown                             | No        | Wellness            |

---

### 1.5 NU-Fluence Routes (Knowledge Management)

| #   | Route                        | Module    | Risk | RBAC (page-level) | Validated | Notes             |
|-----|------------------------------|-----------|------|-------------------|-----------|-------------------|
| 208 | `/fluence`                   | Fluence   | P3   | NO PermissionGate | No        | Fluence hub       |
| 209 | `/fluence/dashboard`         | Fluence   | P3   | NO PermissionGate | No        | Fluence dashboard |
| 210 | `/fluence/wiki`              | Wiki      | P3   | Unknown           | No        | Wiki index        |
| 211 | `/fluence/wiki/[slug]`       | Wiki      | P3   | Unknown           | No        | Wiki article      |
| 212 | `/fluence/wiki/[slug]/edit`  | Wiki      | P2   | NO PermissionGate | No        | Edit wiki         |
| 213 | `/fluence/wiki/new`          | Wiki      | P2   | Unknown           | No        | New wiki          |
| 214 | `/fluence/blogs`             | Blog      | P3   | Unknown           | No        | Blog list         |
| 215 | `/fluence/blogs/[slug]`      | Blog      | P3   | Unknown           | No        | Blog article      |
| 216 | `/fluence/blogs/[slug]/edit` | Blog      | P2   | Unknown           | No        | Edit blog         |
| 217 | `/fluence/blogs/new`         | Blog      | P2   | Unknown           | No        | New blog          |
| 218 | `/fluence/templates`         | Templates | P3   | Unknown           | No        | Template library  |
| 219 | `/fluence/templates/[id]`    | Templates | P3   | NO PermissionGate | No        | Template detail   |
| 220 | `/fluence/templates/new`     | Templates | P2   | Unknown           | No        | New template      |
| 221 | `/fluence/drive`             | Drive     | P3   | NO PermissionGate | No        | File drive        |
| 222 | `/fluence/search`            | Search    | P3   | NO PermissionGate | No        | Full-text search  |
| 223 | `/fluence/my-content`        | Content   | P3   | NO PermissionGate | No        | My content        |
| 224 | `/fluence/wall`              | Wall      | P3   | NO PermissionGate | No        | Social wall       |

---

### 1.6 Platform / App Switcher Entry Points

| #   | Route          | Notes                      |
|-----|----------------|----------------------------|
| 225 | `/app/hrms`    | Redirects to /me/dashboard |
| 226 | `/app/hire`    | Redirects to /recruitment  |
| 227 | `/app/grow`    | Redirects to /performance  |
| 228 | `/app/fluence` | Redirects to /fluence/wiki |

---

## 2. Role Inventory

### 2.1 Explicit Roles (18 total, from RoleHierarchy.java)

| Rank | Role                 | Description                                    | Scope                                           |
|------|----------------------|------------------------------------------------|-------------------------------------------------|
| 100  | `SUPER_ADMIN`        | Complete system control across all tenants     | GLOBAL (bypasses ALL checks)                    |
| 90   | `TENANT_ADMIN`       | Full organization administration               | GLOBAL (bypasses permission checks in frontend) |
| 80   | `HR_MANAGER`         | Complete HR operations including salary access | GLOBAL                                          |
| 75   | `PAYROLL_ADMIN`      | Payroll and compensation management only       | GLOBAL (payroll scope)                          |
| 70   | `HR_EXECUTIVE`       | HR operations WITHOUT salary access            | GLOBAL                                          |
| 65   | `RECRUITMENT_ADMIN`  | Talent acquisition and onboarding              | GLOBAL (recruitment scope)                      |
| 60   | `DEPARTMENT_MANAGER` | Department-level employee management           | DEPARTMENT                                      |
| 58   | `PROJECT_ADMIN`      | Project and timesheet management               | PROJECT scope                                   |
| 56   | `ASSET_MANAGER`      | IT asset tracking and allocation               | GLOBAL (asset scope)                            |
| 55   | `EXPENSE_MANAGER`    | Expense approval and management                | GLOBAL (expense scope)                          |
| 54   | `HELPDESK_ADMIN`     | Support ticket management                      | GLOBAL (helpdesk scope)                         |
| 53   | `TRAVEL_ADMIN`       | Travel request management                      | GLOBAL (travel scope)                           |
| 52   | `COMPLIANCE_OFFICER` | Compliance and policy management               | GLOBAL (compliance scope)                       |
| 51   | `LMS_ADMIN`          | Learning management system administration      | GLOBAL (LMS scope)                              |
| 50   | `TEAM_LEAD`          | Team-level management                          | TEAM                                            |
| 40   | `EMPLOYEE`           | Regular employee self-service                  | OWN/SELF                                        |
| 30   | `CONTRACTOR`         | Limited contractor access                      | OWN/SELF (minimal)                              |
| 20   | `INTERN`             | Trainee with minimal access                    | OWN/SELF (minimal)                              |

### 2.2 Implicit Roles (7 total, auto-assigned)

| Role                   | Trigger              | Key Permissions                             |
|------------------------|----------------------|---------------------------------------------|
| `REPORTING_MANAGER`    | Has direct reports   | TEAM view, leave/attendance/expense approve |
| `SKIP_LEVEL_MANAGER`   | Has indirect reports | TEAM view (read-only)                       |
| `DEPARTMENT_HEAD`      | Heads a department   | DEPARTMENT view, budget/headcount view      |
| `MENTOR`               | Assigned as mentor   | TEAM view, review/goal view                 |
| `INTERVIEWER`          | On interview panel   | Candidate view/evaluate                     |
| `PERFORMANCE_REVIEWER` | Assigned as reviewer | Review create/submit, 360 feedback          |
| `ONBOARDING_BUDDY`     | Assigned as buddy    | Onboarding view                             |

### 2.3 SuperAdmin Bypass Behavior

- **Backend:** `JwtAuthenticationFilter` + `PermissionAspect` + `FeatureFlagAspect` all skip checks
  for SUPER_ADMIN
- **Frontend middleware:** Decoded JWT with SUPER_ADMIN role bypasses all route checks (line 322 of
  middleware.ts)
- **Frontend hook:** `usePermissions()` returns `true` for ALL `hasPermission()` calls when
  `isAdmin` (SUPER_ADMIN or TENANT_ADMIN)

### 2.4 Permission Format

- Backend Java: `MODULE:ACTION` (e.g., `EMPLOYEE:READ`, `PAYROLL:PROCESS`)
- Database seeds: `module.action` lowercase (e.g., `employee.read`) -- normalized at load time
- Frontend: `Permissions.EMPLOYEE_READ` maps to `'EMPLOYEE:READ'`
- Total defined permissions: ~230+ in `Permission.java`, ~260+ in `usePermissions.ts` (frontend has
  extras like `EMPLOYEE_MANAGE`, PSA, RESOURCE)

---

## 3. Critical Flow List (Top 20 Highest-Risk Flows)

### P0 -- Money & Security Flows

| #  | Flow                             | Routes                                                            | Cross-Module                                     | Why Critical                  |
|----|----------------------------------|-------------------------------------------------------------------|--------------------------------------------------|-------------------------------|
| 1  | **Payroll Run Processing**       | `/payroll/runs`, `/payroll/bulk-processing`                       | attendance -> payroll, leave -> payroll          | Direct salary disbursement    |
| 2  | **Salary Structure CRUD**        | `/payroll/salary-structures`, `/payroll/salary-structures/create` | compensation -> payroll                          | Defines all pay components    |
| 3  | **Full & Final Settlement**      | `/offboarding/[id]/fnf`, `/offboarding/exit/fnf`                  | leave balance, loan outstanding, assets, payroll | Money settlement on exit      |
| 4  | **Loan Disbursement**            | `/loans`, `/loans/new`, `/loans/[id]`                             | payroll (EMI deduction)                          | Employee loan money           |
| 5  | **Contract Signing**             | `/contracts`, `/contracts/new`, `/sign/[token]`                   | Legal commitment                                 | Legally binding               |
| 6  | **Role & Permission Management** | `/admin/roles`, `/admin/permissions`                              | ALL modules                                      | Privilege escalation vector   |
| 7  | **Executive Dashboard**          | `/dashboards/executive`                                           | payroll, headcount, attrition, financials        | Sensitive org-wide financials |
| 8  | **Payment Gateway**              | `/payments`, `/payments/config`                                   | payroll                                          | Real money movement           |
| 9  | **Statutory Filings**            | `/statutory`, `/statutory-filings`, `/lwf`                        | payroll, tax                                     | Government compliance         |
| 10 | **Tax Declarations & TDS**       | `/tax`, `/tax/declarations`                                       | payroll                                          | Tax compliance                |

### P1 -- Lifecycle & Compliance Flows

| #  | Flow                          | Routes                                                    | Cross-Module                               | Why Critical                               |
|----|-------------------------------|-----------------------------------------------------------|--------------------------------------------|--------------------------------------------|
| 11 | **Expense Approval Chain**    | `/expenses`, `/expenses/approvals`                        | approval workflow, payroll (reimbursement) | Money approval                             |
| 12 | **Leave Approval -> Payroll** | `/leave/apply`, `/leave/approvals`                        | attendance, payroll (LOP deduction)        | Compliance + pay impact                    |
| 13 | **Onboarding Workflow**       | `/onboarding`, `/onboarding/new`, `/preboarding`          | employee create, documents, assets         | Employee lifecycle start                   |
| 14 | **Offboarding Workflow**      | `/offboarding`, `/offboarding/[id]`                       | assets return, access revoke, FnF          | Employee lifecycle end                     |
| 15 | **Compensation Review Cycle** | `/compensation`, `/performance/calibration`               | performance -> payroll                     | Salary revision                            |
| 16 | **Workflow Engine CRUD**      | `/workflows`, `/workflows/[id]`                           | ALL approval flows                         | Misconfigured workflows = broken approvals |
| 17 | **Employee Create/Edit**      | `/employees`, `/employees/[id]/edit`, `/employees/import` | ALL downstream                             | Foundation entity                          |
| 18 | **Performance Review Cycle**  | `/performance/reviews`, `/performance/cycles`             | compensation, PIP                          | Career impact                              |

### P1 -- Security Flows

| #  | Flow                           | Routes                                                     | Cross-Module | Why Critical              |
|----|--------------------------------|------------------------------------------------------------|--------------|---------------------------|
| 19 | **Auth: Login/Logout/Session** | `/auth/login`, middleware                                  | ALL          | Authentication foundation |
| 20 | **Admin System Settings**      | `/admin/system`, `/admin/settings`, `/admin/feature-flags` | ALL          | System configuration      |

---

## 4. Coverage Matrix (Routes x Validation Status)

### Summary by Risk Tier

| Risk      | Total Routes | Validated | Needs Testing | % Covered |
|-----------|--------------|-----------|---------------|-----------|
| P0        | 28           | 4         | 24            | 14%       |
| P1        | 42           | 4         | 38            | 10%       |
| P2        | 78           | 7         | 71            | 9%        |
| P3        | 65           | 13        | 52            | 20%       |
| Public    | 13           | 1         | 12            | 8%        |
| **Total** | **226**      | **28**    | **198**       | **12%**   |

Note: 226 = 213 page.tsx files + some counted twice for sub-routes. The prior sweep report claims
241 discovered routes; the difference accounts for dynamic route variants ([id] patterns expanding)
and a few routes that share a page.tsx.

### Routes with Frontend RBAC (PermissionGate or usePermissions)

Found in only **~25 pages** out of 213. The remaining **~188 pages have NO client-side permission
gating**. They rely entirely on:

1. Middleware cookie check (coarse: logged-in vs not)
2. Backend API 403 responses
3. Sidebar visibility (items hidden but routes still navigable via URL)

**This is a significant finding.** Any authenticated user can navigate directly to any URL and see
the page shell/UI. Data protection depends entirely on backend API authorization.

### Routes Missing Middleware Protection

All authenticated routes have their top-level prefix in the `AUTHENTICATED_ROUTES` list. No gaps
found -- the prior QA sweeps (QA3, QA5, QA6) already fixed these.

---

## 5. RBAC Risk Flags

### 5.1 Pages with NO frontend RBAC that SHOULD have it

These are high-risk pages (P0/P1) that any logged-in user can navigate to and see the UI shell:

| Route                   | Risk | Issue                                                                       |
|-------------------------|------|-----------------------------------------------------------------------------|
| `/dashboards/executive` | P0   | No PermissionGate -- relies on backend 403 for data, but page shell renders |
| `/dashboards/manager`   | P1   | No PermissionGate                                                           |
| `/compensation`         | P0   | No PermissionGate on compensation revision page                             |
| `/payments`             | P0   | Feature-flagged but no PermissionGate                                       |
| `/payments/config`      | P0   | No PermissionGate                                                           |
| `/admin/payroll`        | P0   | No PermissionGate on admin payroll settings                                 |
| `/admin/import-keka`    | P1   | No PermissionGate on data import                                            |
| `/admin/mobile-api`     | P1   | No PermissionGate                                                           |
| `/statutory-filings`    | P0   | No PermissionGate                                                           |
| `/offboarding/exit/fnf` | P0   | No PermissionGate on FnF processing                                         |
| `/contracts/new`        | P0   | No PermissionGate on contract creation                                      |
| `/contracts/[id]`       | P0   | No PermissionGate on contract detail                                        |
| `/contracts/templates`  | P0   | No PermissionGate                                                           |
| `/loans/[id]`           | P0   | No PermissionGate on loan detail                                            |
| `/tax/declarations`     | P1   | No PermissionGate                                                           |
| `/employees/[id]/edit`  | P1   | No PermissionGate on employee edit                                          |
| `/security`             | P1   | No PermissionGate on security settings                                      |
| `/compliance`           | P1   | No PermissionGate                                                           |
| `/travel/[id]`          | P1   | No PermissionGate                                                           |
| `/travel/new`           | P1   | No PermissionGate                                                           |
| `/expenses/[id]`        | P1   | No PermissionGate                                                           |

### 5.2 Potentially Orphaned Routes

These routes may have no sidebar link or clear navigation path:

| Route                     | Reason                                          |
|---------------------------|-------------------------------------------------|
| `/executive`              | Possibly a duplicate of `/dashboards/executive` |
| `/organization-chart`     | Possibly a duplicate of `/org-chart`            |
| `/performance/revolution` | Unknown purpose                                 |
| `/home`                   | Legacy redirect only                            |
| `/dashboard`              | Possibly legacy, overlaps with /me/dashboard    |

---

## 6. Loop Queue (Loops 1-10)

### Loop 1: Auth & Session (COMPLETED in prior sweep)

- Routes: `/auth/login`, middleware, session restore
- Roles: All 6
- Status: VALIDATED

### Loop 2: Dashboard & Navigation (COMPLETED in prior sweep)

- Routes: `/me/dashboard`, App Switcher, sidebar
- Roles: SA, HR, MGR, EMP
- Status: VALIDATED

### Loop 3: Payroll Processing (P0 -- NEXT)

- **Exact routes:** `/payroll`, `/payroll/runs`, `/payroll/salary-structures`,
  `/payroll/salary-structures/create`, `/payroll/components`, `/payroll/payslips`,
  `/payroll/bulk-processing`, `/payroll/statutory`, `/payroll/structures`
- **Roles to test:** SuperAdmin, PAYROLL_ADMIN, HR_MANAGER, EMPLOYEE (should be denied), TEAM_LEAD (
  should be denied)
- **Key assertions:**
  - EMPLOYEE cannot see payroll data
  - PAYROLL_ADMIN can process but not approve (if segregation exists)
  - Salary structures correctly link components
  - Payroll run creates payslips
- **Backend files likely needed:** `PayrollController.java`, `PayrollRunService.java`,
  `SalaryStructureService.java`
- **Frontend files:** `frontend/app/payroll/` directory, `frontend/lib/hooks/queries/usePayroll.ts`

### Loop 4: Contracts & Legal (P0)

- **Exact routes:** `/contracts`, `/contracts/[id]`, `/contracts/new`, `/contracts/templates`,
  `/sign/[token]`
- **Roles to test:** SuperAdmin, HR_MANAGER, EMPLOYEE, CONTRACT signer
- **Key assertions:**
  - Contract creation requires CONTRACT_CREATE
  - Template management requires CONTRACT_TEMPLATE_MANAGE
  - E-signature portal works with token
  - Contract detail shows all sections
- **Backend files:** `ContractController.java`, `ContractService.java`
- **Frontend files:** `frontend/app/contracts/`

### Loop 5: Offboarding & FnF (P0)

- **Exact routes:** `/offboarding`, `/offboarding/[id]`, `/offboarding/[id]/exit-interview`,
  `/offboarding/[id]/fnf`, `/offboarding/exit/fnf`
- **Roles to test:** SuperAdmin, HR_MANAGER, DEPARTMENT_MANAGER, EMPLOYEE (exiting)
- **Key assertions:**
  - FnF calculation includes leave balance, loan deductions, gratuity
  - Only EXIT_MANAGE can initiate exit
  - OFFBOARDING_FNF_CALCULATE required for settlement
  - Exit interview captures responses
- **Backend files:** `ExitController.java`, `SettlementService.java`, `ExitProcessService.java`
- **Frontend files:** `frontend/app/offboarding/`, `frontend/lib/hooks/queries/useExit.ts`

### Loop 6: Expenses & Travel (P1)

- **Exact routes:** `/expenses`, `/expenses/[id]`, `/expenses/approvals`, `/expenses/reports`,
  `/expenses/settings`, `/travel`, `/travel/[id]`, `/travel/new`
- **Roles to test:** SuperAdmin, EXPENSE_MANAGER, TRAVEL_ADMIN, EMPLOYEE, REPORTING_MANAGER
- **Key assertions:**
  - Employee can create expense, manager approves
  - EXPENSE_SETTINGS restricted to managers
  - Travel approval flow works
- **Backend files:** `ExpenseController.java`, `TravelController.java`

### Loop 7: Leave Admin & Attendance (P1)

- **Exact routes:** `/leave/approvals`, `/leave/calendar`, `/leave/my-leaves`, `/attendance/team`,
  `/attendance/regularization`, `/attendance/comp-off`, `/attendance/shift-swap`, `/overtime`,
  `/shifts/*`
- **Roles to test:** HR_MANAGER, TEAM_LEAD, EMPLOYEE, REPORTING_MANAGER
- **Key assertions:**
  - Leave approval chain works
  - Regularization requires approval
  - Comp-off links to attendance
  - Shift management restricted to SHIFT_MANAGE

### Loop 8: Admin & Security (P0/P1)

- **Exact routes:** `/admin`, `/admin/roles`, `/admin/permissions`, `/admin/system`,
  `/admin/settings`, `/admin/feature-flags`, `/admin/payroll`, `/security`, `/workflows`,
  `/workflows/[id]`
- **Roles to test:** SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER, EMPLOYEE (should be denied)
- **Key assertions:**
  - Only SUPER_ADMIN/TENANT_ADMIN can manage roles
  - EMPLOYEE gets 403 on all admin endpoints
  - Feature flags work correctly
  - Workflow CRUD functions

### Loop 9: Recruitment & Onboarding (P1/P2)

- **Exact routes:** `/recruitment/*`, `/onboarding/*`, `/preboarding`, `/referrals`, `/careers`,
  `/offer-portal`
- **Roles to test:** RECRUITMENT_ADMIN, HR_MANAGER, EMPLOYEE (referral only), INTERVIEWER
- **Key assertions:**
  - Job creation requires RECRUITMENT_CREATE
  - Candidate pipeline drag-and-drop works
  - Onboarding template CRUD
  - Preboarding portal accessible by candidate

### Loop 10: Performance & Learning (P1/P2)

- **Exact routes:** `/performance/*`, `/okr`, `/feedback360`, `/goals`, `/one-on-one`,
  `/training/*`, `/learning/*`, `/recognition`, `/surveys`, `/wellness`
- **Roles to test:** HR_MANAGER, TEAM_LEAD, EMPLOYEE, LMS_ADMIN, PERFORMANCE_REVIEWER
- **Key assertions:**
  - Review cycle CRUD
  - 360 feedback collection
  - OKR alignment cascades
  - LMS enrollment and quiz completion
  - Recognition peer-to-peer

---

## 7. Key Findings Summary

### Critical Issues Found During Analysis

1. **~88% of pages lack frontend PermissionGate** -- Any authenticated user can navigate to any URL
   and see the UI shell. Protection relies entirely on backend 403 responses for data. This is a
   defense-in-depth gap.

2. **P0 pages without ANY client-side RBAC:** `/dashboards/executive`, `/compensation`, `/payments`,
   `/payments/config`, `/admin/payroll`, `/statutory-filings`, `/offboarding/exit/fnf`,
   `/contracts/new`, `/contracts/[id]`, `/contracts/templates`, `/loans/[id]`

3. **Duplicate/Orphaned routes identified:** `/executive` vs `/dashboards/executive`,
   `/organization-chart` vs `/org-chart`, `/performance/revolution` (unknown), `/dashboard` vs
   `/me/dashboard`

4. **Frontend Permissions constant drift:** `usePermissions.ts` has ~30 more permission constants
   than `Permission.java` (e.g., `EMPLOYEE_MANAGE`, `TAX_VIEW`, `TAX_CREATE`, `TAX_UPDATE`,
   `TAX_MANAGE`, `PSA_*`, `RESOURCE_*`). These may not be enforced on the backend.

5. **No middleware route for `/psa`:** The `/psa` prefix appears in AUTHENTICATED_ROUTES but no
   page.tsx exists for it (possibly a backend-only route or future page).

6. **Settings/SSO page has no RBAC:** `/settings/sso` is accessible to any logged-in user but SSO
   configuration should be admin-only.

---

*End of Baseline Analysis*
