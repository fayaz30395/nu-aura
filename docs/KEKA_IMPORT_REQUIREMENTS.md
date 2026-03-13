# KEKA → NU-AURA Employee Data Migration Plan

## 1. Executive Summary

Manual import of all employee data from KEKA HRMS into NU-AURA using CSV/Excel exports.
The backend already has migration infrastructure at `/api/v1/migration/` endpoints with
`KekaMigrationService`, `EmployeeImportService`, and `DataMigrationController`.

**Approach:** Export from KEKA as Excel/CSV → Upload to NU-AURA import module → Validate → Import

---

## 2. Import Phases (Ordered by Dependency)

### Phase 1: Foundation Data (Import First)
These must exist before employees can be imported.

| Data | Source in KEKA | Target in NU-AURA | Priority |
|------|----------------|-------------------|----------|
| Departments | Organization > Departments | `departments` table | P0 |
| Designations | Organization > Designations | `designations` table | P0 |
| Office Locations | Organization > Locations | `office_locations` table | P0 |
| Shifts | Attendance > Shift Config | `shifts` table | P0 |
| Leave Types | Leave > Leave Types | `leave_types` table | P0 |
| Holidays | Organization > Holidays | `holidays` table | P0 |

### Phase 2: Employee Master Data
Core employee records — everything depends on this.

| Data | KEKA Export Fields | NU-AURA Target Fields | Notes |
|------|-------------------|----------------------|-------|
| Employee Code | `EmployeeNumber` | `employee_code` | **Required**, unique per tenant |
| First Name | `FirstName` | `first_name` | **Required** |
| Last Name | `LastName` | `last_name` | |
| Middle Name | `MiddleName` | `middle_name` | |
| Email (Work) | `Email` | `email` | **Required**, creates user account |
| Personal Email | `PersonalEmail` | `personal_email` | |
| Phone | `Phone` | `phone` | |
| Date of Birth | `DateOfBirth` | `date_of_birth` | Format: dd/MM/yyyy or yyyy-MM-dd |
| Gender | `Gender` | `gender` | Map: Male/Female/Other |
| Marital Status | `MaritalStatus` | `marital_status` | |
| Blood Group | `BloodGroup` | `blood_group` | |
| Department | `Department` | `department_id` (FK) | Auto-creates if missing |
| Designation | `Designation` | `designation_id` (FK) | |
| Location | `Location` | `office_location_id` (FK) | |
| Date of Joining | `JoiningDate` | `date_of_joining` | |
| Employment Type | `EmploymentType` | `employment_type` | Map: Full-time/Part-time/Contract/Intern |
| Employment Status | `Status` | `status` | Map: Active/Inactive/OnNotice/Terminated |
| Reporting Manager | `ReportingManager` | `reporting_manager_id` (FK) | Match by employee_code or email |
| PAN | `PAN` | `pan_number` | Indian tax ID |
| Aadhar | `AadharNumber` | `aadhar_number` | |
| UAN | `UAN` | `uan_number` | PF account |
| Nationality | `Nationality` | `nationality` | |
| Profile Photo | Manual download | `profile_picture_url` | Export separately from KEKA |

### Phase 3: Financial Data

| Data | KEKA Export Fields | NU-AURA Target Fields | Notes |
|------|-------------------|----------------------|-------|
| Basic Salary | `BasicSalary` | `basic_salary` | |
| HRA | `HRA` | `hra` | |
| Conveyance | `ConveyanceAllowance` | `conveyance_allowance` | |
| Medical | `MedicalAllowance` | `medical_allowance` | |
| Special Allowance | `SpecialAllowance` | `special_allowance` | |
| Other Allowances | `OtherAllowances` | `other_allowances` | |
| PF (Employee) | `PF_Employee` | `pf_employee` | |
| PF (Employer) | `PF_Employer` | `pf_employer` | |
| Professional Tax | `ProfessionalTax` | `professional_tax` | |
| Income Tax | `IncomeTax` | `income_tax` | |
| Bank Name | `BankName` | `bank_name` | |
| Bank Account No. | `BankAccountNumber` | `bank_account_number` | |
| IFSC Code | `IFSCCode` | `bank_ifsc_code` | |
| CTC | `CTC` | `ctc` | Calculated field |
| Effective Date | `SalaryEffectiveDate` | `effective_date` | |

**Note:** KEKA's public API does NOT expose salary data. Must use manual Excel export from KEKA Payroll module.

### Phase 4: Leave Data

| Data | KEKA Export Fields | NU-AURA Target Fields | Notes |
|------|-------------------|----------------------|-------|
| Leave Type | `LeaveType` | `leave_type_id` (FK) | Auto-creates if missing (12-day default) |
| Year | `Year` | `year` | |
| Opening Balance | `OpeningBalance` | `opening_balance` | |
| Accrued | `Accrued` | `accrued` | |
| Used/Availed | `Used` | `used` | |
| Available | `Available` | `available` | |
| Carried Forward | `CarriedForward` | `carried_forward` | |

### Phase 5: Attendance History

| Data | KEKA Export Fields | NU-AURA Target Fields | Notes |
|------|-------------------|----------------------|-------|
| Employee Code | `EmployeeNumber` | `employee_id` (FK) | |
| Date | `Date` | `date` | |
| Check-in | `FirstCheckIn` | `check_in_time` | HH:mm format |
| Check-out | `LastCheckOut` | `check_out_time` | HH:mm format |
| Status | `AttendanceStatus` | `status` | Map: Present/Absent/HalfDay/OnLeave/WeeklyOff/Holiday |
| Total Hours | `TotalHours` | `total_hours` | Calculated |
| Source | — | `source` | Set to "KEKA_IMPORT" |

### Phase 6: Additional Data (If Available)

| Data | KEKA Source | NU-AURA Target | Status |
|------|------------|----------------|--------|
| Performance Reviews | Performance module export | `performance_reviews` | Manual entry likely needed |
| Goals/KPIs | Goals module export | `goals` table | |
| Assets Assigned | Assets module export | `asset_assignments` | |
| Documents (Offer letter, etc.) | Document vault export | `employee_documents` | File upload needed |
| Emergency Contacts | Personal info export | `emergency_contacts` | |
| Address | Personal info export | `addresses` | Current + Permanent |
| Education | Personal info export | `education_history` | |
| Work Experience | Personal info export | `work_experience` | |
| Dependents/Family | Personal info export | `dependents` | For benefits/insurance |

---

## 3. KEKA Export Steps (Manual)

### Step 1: Export Departments
1. KEKA Admin → Organization → Departments
2. Export as Excel
3. Columns needed: Name, Code, Description, Location

### Step 2: Export Employee Master
1. KEKA Admin → Employee Directory → Export All
2. Select all fields
3. Export as Excel (.xlsx)
4. Clean up: remove header rows, ensure employee codes are consistent

### Step 3: Export Salary Structures
1. KEKA Payroll → Salary Structures → Export
2. Include all components
3. Export per pay period or current structure

### Step 4: Export Leave Balances
1. KEKA Leave → Leave Balances → Export
2. Select current year
3. Include all leave types

### Step 5: Export Attendance (Optional - Large Data)
1. KEKA Attendance → Reports → Attendance Log
2. Select date range
3. Export as CSV (Excel may hit row limits)

---

## 4. NU-AURA Import API Reference

### Existing Endpoints (Already Built)

```
POST /api/v1/migration/departments
  Body: multipart/form-data with Excel/CSV file
  Required columns: name
  Optional: code, description, location, cost_center

POST /api/v1/migration/employees
  Body: multipart/form-data with Excel/CSV file
  Required columns: employee_code, email, first_name
  Optional: (see Phase 2 table above)
  Auto-creates: user account (default password: Welcome@123)
  Auto-creates: department if not found

POST /api/v1/migration/salary-structures
  Body: multipart/form-data with Excel/CSV file
  Required columns: employee_code, basic_salary
  Optional: (see Phase 3 table above)

POST /api/v1/migration/leave-balances
  Body: multipart/form-data with Excel/CSV file
  Required columns: employee_code, leave_type
  Optional: year, opening_balance, accrued, used, available, carried_forward

POST /api/v1/migration/attendance
  Body: multipart/form-data with Excel/CSV file
  Required columns: employee_code, date
  Optional: check_in, check_out, status, source

GET  /api/v1/migration/templates
  Returns: Column schemas for all import types

POST /api/v1/migration/validate
  Body: multipart/form-data with file + import_type
  Returns: Validation results (errors, warnings, preview)
```

### Import Safeguards
- All imports are transactional (rollback on failure)
- Duplicate employees skipped (by employee_code)
- Row-level error reporting
- Multi-format date parsing
- Permission required: `MIGRATION_IMPORT`

---

## 5. Field Mapping: KEKA Column → NU-AURA Column

| # | KEKA Column Name | NU-AURA Column Name | Type | Required | Transform |
|---|-----------------|---------------------|------|----------|-----------|
| 1 | EmployeeNumber | employee_code | String | Yes | Direct |
| 2 | FirstName | first_name | String | Yes | Direct |
| 3 | LastName | last_name | String | No | Direct |
| 4 | MiddleName | middle_name | String | No | Direct |
| 5 | Email | email | String | Yes | Lowercase |
| 6 | PersonalEmail | personal_email | String | No | Lowercase |
| 7 | Phone | phone | String | No | Strip spaces |
| 8 | DateOfBirth | date_of_birth | Date | No | Parse multi-format |
| 9 | Gender | gender | Enum | No | Map: Male→MALE, Female→FEMALE |
| 10 | MaritalStatus | marital_status | Enum | No | Map to enum |
| 11 | BloodGroup | blood_group | String | No | Direct |
| 12 | Department | department_id | FK | No | Lookup or auto-create |
| 13 | Designation | designation_id | FK | No | Lookup or auto-create |
| 14 | Location | office_location_id | FK | No | Lookup by name |
| 15 | JoiningDate | date_of_joining | Date | No | Parse multi-format |
| 16 | EmploymentType | employment_type | Enum | No | Map: Fulltime→FULL_TIME |
| 17 | Status | status | Enum | No | Map: Active→ACTIVE |
| 18 | ReportingManager | reporting_manager_id | FK | No | Match by email/code |
| 19 | PAN | pan_number | String | No | Direct |
| 20 | AadharNumber | aadhar_number | String | No | Direct |
| 21 | UAN | uan_number | String | No | Direct |
| 22 | BankName | bank_name | String | No | Direct |
| 23 | BankAccountNumber | bank_account_number | String | No | Direct |
| 24 | IFSCCode | bank_ifsc_code | String | No | Direct |
| 25 | BasicSalary | basic_salary | Decimal | No | Parse number |
| 26 | HRA | hra | Decimal | No | Parse number |
| 27 | SpecialAllowance | special_allowance | Decimal | No | Parse number |
| 28 | CTC | ctc | Decimal | No | Parse number |

---

## 6. Import Order (Critical)

```
1. Departments         → /api/v1/migration/departments
2. Designations        → Manual setup in Admin or auto-create
3. Office Locations    → Manual setup in Admin
4. Leave Types         → Manual setup in Admin or auto-create
5. Holidays            → Manual setup in Admin
6. Shifts              → Manual setup in Admin
7. Employees           → /api/v1/migration/employees (creates user accounts)
8. Salary Structures   → /api/v1/migration/salary-structures
9. Leave Balances      → /api/v1/migration/leave-balances
10. Attendance History → /api/v1/migration/attendance (optional, large dataset)
```

**Why this order?** Employees reference departments/designations/locations.
Salary and leave data reference employees. Attendance references employees.

---

## 7. User Onboarding Flow (New Employee Setup)

The flow for adding a new user to NU-AURA is structured in four sequential steps:

### Step 1: Google Workspace Setup (External)
- Admin creates an @nulogic.io email in Google Workspace admin console
- This is done **outside NU-AURA** before the employee is added to the system
- Email format: `firstname.lastname@nulogic.io` or `firstname@nulogic.io`

### Step 2: NU-AURA User Creation
- Admin logs into NU-AURA and adds the new employee
- Required inputs:
  - The newly created @nulogic.io email address
  - A temporary password (e.g., `Welcome@123`) — only needed if email/password login is used
  - Employee personal details: name, department, designation, location, date of joining, etc.
- The system auto-creates a **user account** linked to the employee record

### Step 3: Role & Access Assignment
Admin assigns the following from the NU-AURA Admin panel:
- **RBAC Role** (one or more of the 12 available):
  - `SUPER_ADMIN`, `TENANT_ADMIN`, `HR_ADMIN`, `HR_MANAGER`, `DEPARTMENT_HEAD`, `TEAM_LEAD`, `MANAGER`, `EMPLOYEE`, `FINANCE_ADMIN`, `PAYROLL_ADMIN`, `RECRUITER`, `TRAINER`
- **Permission Scope** (determines data visibility):
  - `ALL` — access to all organizational data
  - `LOCATION` — access to employees in their location
  - `DEPARTMENT` — access to employees in their department
  - `TEAM` — access to their direct report chain
  - `SELF` — access only to their own data
  - `CUSTOM` — hand-picked employees or custom filters
- **Module-specific Permissions** (if using `CUSTOM` scope):
  - Granular permissions as `module.action` strings (e.g., `employee.read`, `leave.approve`)

### Step 4: Employee First Login
- Employee uses their @nulogic.io email with **Google SSO** to sign in
- The system matches the Google email to the NU-AURA account
- Login grants access based on assigned roles and permissions
- Temp password is **bypassed** when using Google SSO

---

### KEKA Migration Notes

**Default Role Assignment During Bulk Import:**
- During KEKA migration, all imported employees are assigned the default `EMPLOYEE` role
- Post-migration, the admin must **individually review and update roles** for:
  - HR staff → `HR_ADMIN` or `HR_MANAGER`
  - Department heads → `DEPARTMENT_HEAD`
  - Managers/team leads → `MANAGER` or `TEAM_LEAD`
  - Finance staff → `FINANCE_ADMIN` or `PAYROLL_ADMIN`
  - Any user needing elevated access

**Temporary Password Usage:**
- Temp passwords (e.g., `Welcome@123`) are created during import but are **only used if the employee chooses email/password login**
- If the organization uses **Google SSO exclusively**, employees skip the password entirely and log in with their @nulogic.io account directly
- Admin should communicate to employees that they can sign in immediately via Google SSO without changing passwords

**Post-Migration Access Preparation:**
1. Export list of all imported employees with their IDs
2. Map roles to each employee based on current KEKA role assignments
3. Use NU-AURA bulk role assignment (if available) or update individually
4. Verify permission scopes are set correctly (most users: `SELF` or `TEAM`, admins: `ALL`)
5. Notify employees that they can sign in via Google SSO on [go-live date]

---

## 8. Post-Import Checklist

- [ ] Verify employee count matches KEKA count
- [ ] Spot-check 5-10 employee profiles for data accuracy
- [ ] Verify reporting manager chains are correct
- [ ] Check salary structures match KEKA payslips
- [ ] Verify leave balances match KEKA dashboard
- [ ] Test login for 2-3 imported users (default password: Welcome@123)
- [ ] Force password reset for all imported users
- [ ] Link SuperAdmin (Fayaz) to an employee record to resolve `employeeId: null`
- [ ] Run attendance reconciliation if history was imported
- [ ] Update MEMORY.md with migration status

---

## 9. What's NOT Available from KEKA Export

| Data Type | Reason | Workaround |
|-----------|--------|------------|
| Performance Reviews | KEKA API doesn't expose this | Manual entry in NU-AURA |
| Historical Payslips | PDF-only export | Upload as documents |
| Custom Fields | Must export separately per field | Map to NU-AURA custom fields |
| Approval History | Not exportable | Start fresh in NU-AURA |
| Training Records | Limited export | Manual entry |
| Asset Photos | Not in bulk export | Upload individually |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Duplicate employees | Migration service skips existing employee_code |
| Missing departments | Auto-created during employee import |
| Date format mismatch | Multi-format parser handles dd/MM/yyyy, yyyy-MM-dd, MM/dd/yyyy |
| Large attendance dataset | Import in monthly batches via CSV |
| Salary data sensitive | Import via admin-only endpoint, audit logged |
| Reporting manager circular refs | Import managers first, then update reporting chains |

---

## 11. Timeline Estimate

| Phase | Duration | Blocker |
|-------|----------|---------|
| KEKA Data Export | 1-2 hours | KEKA admin access |
| Data Cleanup & Formatting | 2-4 hours | Column mapping accuracy |
| Foundation Data Import | 30 min | None |
| Employee Import | 30 min | Depends on employee count |
| Salary Import | 30 min | KEKA payroll export access |
| Leave Balance Import | 15 min | None |
| Attendance Import | 1-2 hours | Large dataset, batch import |
| Verification & QA | 2-3 hours | Spot-checking accuracy |
| **Total** | **~1 day** | |
