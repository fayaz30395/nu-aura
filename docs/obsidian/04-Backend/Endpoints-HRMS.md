---
title: NU-HRMS Endpoint Catalog — Per-Method
tags: [backend, api, endpoints, rest, catalog, nu-hrms]
---

# NU-HRMS Endpoint Catalog — Per-Method

> The per-method companion to [[Controller-Index]] and [[APIs]]. Where [[Controller-Index]]
> guarantees every controller class appears once with its base path, and [[APIs]] gives a
> curated module map, this note enumerates **every handler method of every [[Nu-HRMS]]
> controller** — HTTP verb, full path (class base + method path), `@RequiresPermission`
> value, and a short purpose. Evidence is the controller source under
> `backend/src/main/java/com/nulogic/api/...`. `SUPER_ADMIN` bypasses the permission aspect;
> a blank/`—` permission cell means the handler carries no `@RequiresPermission` (it is
> still behind the authenticated JWT chain unless explicitly marked **public**).

## Counts

| Metric | Count |
|--------|-------|
| Controllers covered | **71** (all NU-HRMS controllers from [[Controller-Index]]) |
| Total endpoints enumerated | **712** |

> Verified from source 2026-06-17. Public (unauthenticated, token/HMAC/API-key gated)
> endpoints: biometric `POST /punch` + `/punch/batch` (device API-key), and the
> `PaymentWebhookController` provider webhooks (signature-verified, `permitAll`).

---

## Core HR — Employee, Org, Custom Fields, Self-Service

### DepartmentController
Base path: `/api/v1/departments`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/departments` | DEPARTMENT_MANAGE | Create department |
| PUT | `/api/v1/departments/{id}` | DEPARTMENT_MANAGE | Update department |
| GET | `/api/v1/departments/{id}` | — | Get department by id |
| GET | `/api/v1/departments` | — | List all departments |
| GET | `/api/v1/departments/active` | — | List active departments |
| GET | `/api/v1/departments/hierarchy` | — | Get department hierarchy |
| GET | `/api/v1/departments/search` | — | Search departments |
| PATCH | `/api/v1/departments/{id}/activate` | DEPARTMENT_MANAGE | Activate department |
| PATCH | `/api/v1/departments/{id}/deactivate` | DEPARTMENT_MANAGE | Deactivate department |
| DELETE | `/api/v1/departments/{id}` | DEPARTMENT_MANAGE | Delete department |

### EmployeeController
Base path: `/api/v1/employees`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/employees` | EMPLOYEE_CREATE | Create employee |
| GET | `/api/v1/employees` | — | List all employees |
| GET | `/api/v1/employees/search` | — | Search employees |
| GET | `/api/v1/employees/me` | — | Get my employee record |
| PUT | `/api/v1/employees/me` | EMPLOYEE_UPDATE | Update my record |
| GET | `/api/v1/employees/{id}` | — | Get employee by id |
| GET | `/api/v1/employees/{id}/hierarchy` | — | Get employee hierarchy |
| GET | `/api/v1/employees/{id}/subordinates` | — | List subordinates |
| GET | `/api/v1/employees/managers` | — | List managers |
| GET | `/api/v1/employees/{id}/dotted-reports` | — | Get dotted-line reports |
| PUT | `/api/v1/employees/{id}` | EMPLOYEE_UPDATE | Update employee |
| PUT | `/api/v1/employees/{id}/admin` | — | Admin update employee |
| DELETE | `/api/v1/employees/{id}` | EMPLOYEE_DELETE | Delete employee |
| PUT | `/api/v1/employees/{id}/deactivate` | — | Deactivate employee |

### EmployeeDirectoryController
Base path: `/api/v1/employees/directory`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/employees/directory/search` | — | Search directory (filtered) |
| GET | `/api/v1/employees/directory/search` | — | Search directory (query) |

### EmployeeDocumentController
Base path: `/api/v1/employees`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/employees/{id}/documents` | DOCUMENT_UPLOAD | Upload employee document |

### EmployeeImportController
Base path: `/api/v1/employees/import`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/employees/import/template/csv` | EMPLOYEE_CREATE | Download CSV template |
| GET | `/api/v1/employees/import/template/xlsx` | EMPLOYEE_CREATE | Download Excel template |
| POST | `/api/v1/employees/import/preview` | EMPLOYEE_CREATE | Preview import |
| POST | `/api/v1/employees/import/execute` | EMPLOYEE_CREATE | Execute import |

### EmployeeSkillController
Base path: `/api/v1/employees`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/employees/{employeeId}/skills` | EMPLOYEE_VIEW_SELF | List employee skills |
| POST | `/api/v1/employees/{employeeId}/skills` | EMPLOYEE_UPDATE | Add/update skill |
| PUT | `/api/v1/employees/skills/{skillId}/verify` | EMPLOYEE_UPDATE | Verify skill |
| DELETE | `/api/v1/employees/skills/{skillId}` | EMPLOYEE_UPDATE | Remove skill |

### EmploymentChangeRequestController
Base path: `/api/v1/employment-change-requests`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/employment-change-requests` | EMPLOYMENT_CHANGE_CREATE | Create change request |
| GET | `/api/v1/employment-change-requests` | EMPLOYMENT_CHANGE_VIEW_ALL | List all change requests |
| GET | `/api/v1/employment-change-requests/pending` | EMPLOYMENT_CHANGE_APPROVE | List pending requests |
| GET | `/api/v1/employment-change-requests/pending/count` | EMPLOYMENT_CHANGE_APPROVE | Pending requests count |
| GET | `/api/v1/employment-change-requests/employee/{employeeId}` | — | Requests by employee |
| GET | `/api/v1/employment-change-requests/{id}` | EMPLOYMENT_CHANGE_APPROVE | Get change request |
| POST | `/api/v1/employment-change-requests/{id}/approve` | EMPLOYMENT_CHANGE_APPROVE | Approve change request |
| POST | `/api/v1/employment-change-requests/{id}/reject` | EMPLOYMENT_CHANGE_APPROVE | Reject change request |
| POST | `/api/v1/employment-change-requests/{id}/cancel` | EMPLOYMENT_CHANGE_CANCEL | Cancel change request |

### TalentProfileController
Base path: `/api/v1/employees/{id}/talent-profile`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/employees/{id}/talent-profile` | EMPLOYEE_READ | Get talent profile |

### OrganizationController
Base path: `/api/v1/organization`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/organization/units` | SYSTEM_ADMIN | Create org unit |
| GET | `/api/v1/organization/units/{id}` | ORG_STRUCTURE_VIEW | Get org unit |
| GET | `/api/v1/organization/chart` | ORG_STRUCTURE_VIEW | Get org chart |
| GET | `/api/v1/organization/units/{id}/children` | ORG_STRUCTURE_VIEW | Get child units |
| GET | `/api/v1/organization/units` | ORG_STRUCTURE_VIEW | List active units |
| POST | `/api/v1/organization/positions` | SYSTEM_ADMIN | Create position |
| GET | `/api/v1/organization/positions/{id}` | POSITION_VIEW | Get position |
| GET | `/api/v1/organization/positions` | POSITION_VIEW | List all positions |
| GET | `/api/v1/organization/positions/critical` | POSITION_VIEW | List critical positions |
| GET | `/api/v1/organization/positions/vacancies` | POSITION_VIEW | Positions with vacancies |
| POST | `/api/v1/organization/succession-plans` | SYSTEM_ADMIN | Create succession plan |
| GET | `/api/v1/organization/succession-plans/{id}` | SUCCESSION_VIEW | Get succession plan |
| GET | `/api/v1/organization/succession-plans` | SUCCESSION_VIEW | List succession plans |
| GET | `/api/v1/organization/succession-plans/active` | SUCCESSION_VIEW | List active plans |
| GET | `/api/v1/organization/succession-plans/high-risk` | SUCCESSION_VIEW | List high-risk plans |
| POST | `/api/v1/organization/succession-plans/{planId}/candidates` | SYSTEM_ADMIN | Add candidate |
| GET | `/api/v1/organization/succession-plans/{planId}/candidates` | SUCCESSION_VIEW | List candidates |
| GET | `/api/v1/organization/succession-plans/{planId}/candidates/ready-now` | SUCCESSION_VIEW | Ready-now candidates |
| DELETE | `/api/v1/organization/succession-plans/{planId}/candidates/{candidateId}` | SYSTEM_ADMIN | Remove candidate |
| POST | `/api/v1/organization/talent-pools` | SYSTEM_ADMIN | Create talent pool |
| GET | `/api/v1/organization/talent-pools/{id}` | TALENT_POOL_VIEW | Get talent pool |
| GET | `/api/v1/organization/talent-pools` | TALENT_POOL_VIEW | List active talent pools |
| POST | `/api/v1/organization/talent-pools/{poolId}/members/{employeeId}` | SYSTEM_ADMIN | Add member to pool |
| DELETE | `/api/v1/organization/talent-pools/{poolId}/members/{employeeId}` | SYSTEM_ADMIN | Remove member from pool |
| GET | `/api/v1/organization/talent-pools/{poolId}/members` | TALENT_POOL_VIEW | List pool members |
| GET | `/api/v1/organization/analytics` | ANALYTICS_VIEW | Succession analytics |
| GET | `/api/v1/organization/analytics/nine-box` | ANALYTICS_VIEW | Nine-box grid data |

### CustomFieldController
Base path: `/api/v1/custom-fields`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/custom-fields/definitions` | CUSTOM_FIELD_CREATE | Create field definition |
| PUT | `/api/v1/custom-fields/definitions/{id}` | CUSTOM_FIELD_UPDATE | Update field definition |
| GET | `/api/v1/custom-fields/definitions/{id}` | CUSTOM_FIELD_VIEW | Get field definition |
| GET | `/api/v1/custom-fields/definitions/code/{fieldCode}` | CUSTOM_FIELD_VIEW | Get definition by code |
| GET | `/api/v1/custom-fields/definitions` | CUSTOM_FIELD_VIEW | List field definitions |
| GET | `/api/v1/custom-fields/definitions/entity-type/{entityType}` | CUSTOM_FIELD_VIEW | Definitions by entity type |
| GET | `/api/v1/custom-fields/definitions/entity-type/{entityType}/grouped` | CUSTOM_FIELD_VIEW | Grouped definitions |
| GET | `/api/v1/custom-fields/definitions/entity-type/{entityType}/list-view` | CUSTOM_FIELD_VIEW | List-view definitions |
| GET | `/api/v1/custom-fields/definitions/search` | CUSTOM_FIELD_VIEW | Search definitions |
| GET | `/api/v1/custom-fields/definitions/entity-type/{entityType}/groups` | CUSTOM_FIELD_VIEW | Get field groups |
| POST | `/api/v1/custom-fields/definitions/{id}/deactivate` | CUSTOM_FIELD_UPDATE | Deactivate definition |
| POST | `/api/v1/custom-fields/definitions/{id}/activate` | CUSTOM_FIELD_UPDATE | Activate definition |
| DELETE | `/api/v1/custom-fields/definitions/{id}` | CUSTOM_FIELD_DELETE | Delete definition |
| POST | `/api/v1/custom-fields/values/{entityType}/{entityId}` | CUSTOM_FIELD_UPDATE | Set field value |
| POST | `/api/v1/custom-fields/values/bulk` | CUSTOM_FIELD_UPDATE | Bulk set field values |
| GET | `/api/v1/custom-fields/values/{entityType}/{entityId}` | CUSTOM_FIELD_VIEW | Get field values |
| GET | `/api/v1/custom-fields/values/{entityType}/{entityId}/grouped` | CUSTOM_FIELD_VIEW | Grouped field values |
| GET | `/api/v1/custom-fields/values/{entityType}/{entityId}/field/{fieldCode}` | CUSTOM_FIELD_VIEW | Get value by code |
| DELETE | `/api/v1/custom-fields/values/{entityType}/{entityId}/field/{fieldDefinitionId}` | CUSTOM_FIELD_DELETE | Delete field value |
| DELETE | `/api/v1/custom-fields/values/{entityType}/{entityId}` | CUSTOM_FIELD_DELETE | Delete all field values |
| GET | `/api/v1/custom-fields/entity-types` | CUSTOM_FIELD_VIEW | List entity types |
| GET | `/api/v1/custom-fields/definitions/check-code` | CUSTOM_FIELD_VIEW | Check code availability |

### SelfServiceController
Base path: `/api/v1/self-service`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/self-service/profile-updates` | EMPLOYEE_VIEW_SELF | Create profile-update request |
| GET | `/api/v1/self-service/profile-updates/{requestId}` | EMPLOYEE_VIEW_SELF | Get profile-update request |
| GET | `/api/v1/self-service/profile-updates/my-requests` | EMPLOYEE_VIEW_SELF | My profile-update requests |
| GET | `/api/v1/self-service/profile-updates/pending` | EMPLOYEE_UPDATE | Pending profile updates |
| GET | `/api/v1/self-service/profile-updates` | EMPLOYEE_VIEW_ALL | All profile updates |
| POST | `/api/v1/self-service/profile-updates/{requestId}/approve` | EMPLOYEE_UPDATE | Approve profile update |
| POST | `/api/v1/self-service/profile-updates/{requestId}/reject` | EMPLOYEE_UPDATE | Reject profile update |
| POST | `/api/v1/self-service/profile-updates/{requestId}/cancel` | EMPLOYEE_VIEW_SELF | Cancel profile update |
| POST | `/api/v1/self-service/document-requests` | EMPLOYEE_VIEW_SELF | Create document request |
| GET | `/api/v1/self-service/document-requests/{requestId}` | EMPLOYEE_VIEW_SELF | Get document request |
| GET | `/api/v1/self-service/document-requests/my-requests` | EMPLOYEE_VIEW_SELF | My document requests |
| GET | `/api/v1/self-service/document-requests/pending` | DOCUMENT_APPROVE | Pending document requests |
| GET | `/api/v1/self-service/document-requests/urgent` | DOCUMENT_APPROVE | Urgent document requests |
| POST | `/api/v1/self-service/document-requests/{requestId}/start-processing` | DOCUMENT_APPROVE | Start processing document |
| POST | `/api/v1/self-service/document-requests/{requestId}/complete` | DOCUMENT_APPROVE | Complete document request |
| POST | `/api/v1/self-service/document-requests/{requestId}/deliver` | DOCUMENT_APPROVE | Mark document delivered |
| POST | `/api/v1/self-service/document-requests/{requestId}/reject` | DOCUMENT_APPROVE | Reject document request |
| GET | `/api/v1/self-service/dashboard` | EMPLOYEE_VIEW_SELF | Self-service dashboard |
| GET | `/api/v1/self-service/update-categories` | EMPLOYEE_VIEW_SELF | List update categories |
| GET | `/api/v1/self-service/document-types` | EMPLOYEE_VIEW_SELF | List document types |

## Users, Roles & Permissions

### ImplicitRoleRuleController
Base path: `/api/v1/implicit-role-rules`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/implicit-role-rules` | ROLE_MANAGE | List rules |
| GET | `/api/v1/implicit-role-rules/{id}` | ROLE_MANAGE | Get rule by id |
| GET | `/api/v1/implicit-role-rules/{id}/affected-users` | ROLE_MANAGE | Affected users for rule |
| GET | `/api/v1/implicit-role-rules/user/{userId}/implicit-roles` | ROLE_MANAGE | User implicit roles |
| POST | `/api/v1/implicit-role-rules` | ROLE_MANAGE | Create rule |
| PUT | `/api/v1/implicit-role-rules/{id}` | ROLE_MANAGE | Update rule |
| DELETE | `/api/v1/implicit-role-rules/{id}` | ROLE_MANAGE | Delete rule |
| POST | `/api/v1/implicit-role-rules/recompute-all` | ROLE_MANAGE | Recompute all rules |
| POST | `/api/v1/implicit-role-rules/bulk-activate` | ROLE_MANAGE | Bulk activate rules |
| POST | `/api/v1/implicit-role-rules/bulk-deactivate` | ROLE_MANAGE | Bulk deactivate rules |

### RoleController
Base path: `/api/v1/roles`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/roles` | ROLE_MANAGE | List all roles |
| GET | `/api/v1/roles/{id}` | ROLE_MANAGE | Get role by id |
| POST | `/api/v1/roles` | ROLE_MANAGE | Create role |
| PUT | `/api/v1/roles/{id}` | — | Update role |
| DELETE | `/api/v1/roles/{id}` | — | Delete role |
| PUT | `/api/v1/roles/{id}/permissions` | — | Assign permissions |
| POST | `/api/v1/roles/{id}/permissions` | — | Add permissions |
| DELETE | `/api/v1/roles/{id}/permissions` | — | Remove permissions |
| PUT | `/api/v1/roles/{id}/permissions-with-scope` | — | Assign permissions with scope |
| PATCH | `/api/v1/roles/{roleId}/permissions/{permissionCode}/scope` | ROLE_READ | Update permission scope |
| GET | `/api/v1/roles/{id}/effective-permissions` | ROLE_READ | Get effective permissions |

### NotificationPreferencesController
Base path: `/api/v1/notification-preferences`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/notification-preferences` | SETTINGS_VIEW | Get preferences |
| PUT | `/api/v1/notification-preferences` | SETTINGS_UPDATE | Update preferences |

### UserController
Base path: `/api/v1/users`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/users/me` | USER_VIEW | Get current user |
| GET | `/api/v1/users` | USER_VIEW | List all users |
| PUT | `/api/v1/users/{id}/roles` | USER_MANAGE | Assign user roles |

### PermissionController
Base path: `/api/v1/permissions`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/permissions` | PERMISSION_MANAGE | List all permissions |
| GET | `/api/v1/permissions/resource/{resource}` | PERMISSION_MANAGE | Permissions by resource |

## Attendance & Time

### AttendanceController
Base path: `/api/v1/attendance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/attendance/check-in` | ATTENDANCE_MARK | Check in |
| POST | `/api/v1/attendance/check-out` | ATTENDANCE_MARK | Check out |
| GET | `/api/v1/attendance/today` | ATTENDANCE_VIEW_SELF | Today's attendance |
| GET | `/api/v1/attendance/my-attendance` | ATTENDANCE_VIEW_SELF | My attendance |
| GET | `/api/v1/attendance/my-time-entries` | ATTENDANCE_VIEW_SELF | My time entries |
| POST | `/api/v1/attendance/multi-check-in` | ATTENDANCE_MARK | Multi check-in |
| POST | `/api/v1/attendance/multi-check-out` | ATTENDANCE_MARK | Multi check-out |
| GET | `/api/v1/attendance/time-entries/{attendanceRecordId}` | — | Get time entries |
| GET | `/api/v1/attendance/employee/{employeeId}/time-entries` | — | Time entries for date |
| POST | `/api/v1/attendance/bulk-check-in` | ATTENDANCE_VIEW_ALL | Bulk check-in |
| POST | `/api/v1/attendance/bulk-check-out` | ATTENDANCE_VIEW_ALL | Bulk check-out |
| GET | `/api/v1/attendance/employee/{employeeId}` | — | Employee attendance |
| GET | `/api/v1/attendance/employee/{employeeId}/range` | — | Employee attendance range |
| GET | `/api/v1/attendance/pending-regularizations` | ATTENDANCE_APPROVE | Pending regularizations |
| GET | `/api/v1/attendance/all` | ATTENDANCE_MANAGE | All attendance |
| GET | `/api/v1/attendance/date/{date}` | — | Attendance by date |
| POST | `/api/v1/attendance/regularization` | ATTENDANCE_REGULARIZE | Submit regularization |
| POST | `/api/v1/attendance/{id}/request-regularization` | ATTENDANCE_REGULARIZE | Request regularization |
| POST | `/api/v1/attendance/{id}/approve-regularization` | ATTENDANCE_APPROVE | Approve regularization |
| POST | `/api/v1/attendance/{id}/reject-regularization` | ATTENDANCE_APPROVE | Reject regularization |
| GET | `/api/v1/attendance/import/template` | ATTENDANCE_VIEW_ALL | Download import template |
| POST | `/api/v1/attendance/import` | ATTENDANCE_APPROVE | Import attendance |

### MobileAttendanceController
Base path: `/api/v1/mobile/attendance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/mobile/attendance/check-in` | ATTENDANCE_MARK | Mobile check-in |
| POST | `/api/v1/mobile/attendance/check-out` | ATTENDANCE_MARK | Mobile check-out |
| GET | `/api/v1/mobile/attendance/dashboard` | ATTENDANCE_VIEW_ALL | Mobile attendance dashboard |
| GET | `/api/v1/mobile/attendance/nearby-offices` | OFFICE_LOCATION_VIEW | Nearby offices |

### BiometricDeviceController
Base path: `/api/v1/biometric`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/biometric/devices` | ATTENDANCE_MANAGE | Register device |
| GET | `/api/v1/biometric/devices` | ATTENDANCE_MANAGE | List devices |
| GET | `/api/v1/biometric/devices/{id}` | ATTENDANCE_MANAGE | Get device |
| PUT | `/api/v1/biometric/devices/{id}` | ATTENDANCE_MANAGE | Update device |
| DELETE | `/api/v1/biometric/devices/{id}` | ATTENDANCE_MANAGE | Deactivate device |
| POST | `/api/v1/biometric/devices/{id}/sync` | ATTENDANCE_MANAGE | Sync device |
| GET | `/api/v1/biometric/devices/{id}/logs` | ATTENDANCE_MANAGE | Get device logs |
| GET | `/api/v1/biometric/punch/pending` | ATTENDANCE_MANAGE | Pending punches |
| POST | `/api/v1/biometric/punch/reprocess` | ATTENDANCE_MANAGE | Reprocess failed punches |
| POST | `/api/v1/biometric/punch` | **public** (device API-key) | Receive punch |
| POST | `/api/v1/biometric/punch/batch` | **public** (device API-key) | Receive batch punches |
| POST | `/api/v1/biometric/api-keys` | ATTENDANCE_MANAGE | Generate API key |
| GET | `/api/v1/biometric/api-keys` | ATTENDANCE_MANAGE | List API keys |
| DELETE | `/api/v1/biometric/api-keys/{id}` | ATTENDANCE_MANAGE | Revoke API key |

### CompOffController
Base path: `/api/v1/comp-off`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/comp-off/request` | ATTENDANCE_REGULARIZE | Request comp-off |
| GET | `/api/v1/comp-off/employee/{employeeId}` | — | Employee comp-off history |
| GET | `/api/v1/comp-off/my-pending/{employeeId}` | ATTENDANCE_REGULARIZE | My pending comp-off |
| GET | `/api/v1/comp-off/pending` | ATTENDANCE_APPROVE | Pending comp-off requests |
| POST | `/api/v1/comp-off/{requestId}/approve` | ATTENDANCE_APPROVE | Approve comp-off |
| POST | `/api/v1/comp-off/{requestId}/reject` | ATTENDANCE_APPROVE | Reject comp-off |

### HolidayController
Base path: `/api/v1/holidays`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/holidays` | ATTENDANCE_VIEW_SELF | List holidays |
| GET | `/api/v1/holidays/year/{year}` | ATTENDANCE_VIEW_SELF | Holidays by year |
| GET | `/api/v1/holidays/{id}` | ATTENDANCE_VIEW_SELF | Get holiday by id |
| POST | `/api/v1/holidays` | LEAVE_MANAGE | Create holiday |
| PUT | `/api/v1/holidays/{id}` | LEAVE_MANAGE | Update holiday |
| DELETE | `/api/v1/holidays/{id}` | LEAVE_MANAGE | Delete holiday |

### RestrictedHolidayController
Base path: `/api/v1/restricted-holidays`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/restricted-holidays` | LEAVE_VIEW_SELF | List restricted holidays |
| GET | `/api/v1/restricted-holidays/available` | LEAVE_VIEW_SELF | Available holidays |
| GET | `/api/v1/restricted-holidays/{id}` | LEAVE_VIEW_SELF | Get holiday |
| POST | `/api/v1/restricted-holidays` | LEAVE_MANAGE | Create holiday |
| PUT | `/api/v1/restricted-holidays/{id}` | LEAVE_MANAGE | Update holiday |
| DELETE | `/api/v1/restricted-holidays/{id}` | LEAVE_MANAGE | Delete holiday |
| POST | `/api/v1/restricted-holidays/{holidayId}/select` | LEAVE_REQUEST | Select holiday |
| GET | `/api/v1/restricted-holidays/selections/me` | LEAVE_VIEW_SELF | My selections |
| GET | `/api/v1/restricted-holidays/summary/me` | LEAVE_VIEW_SELF | My summary |
| POST | `/api/v1/restricted-holidays/selections/{selectionId}/cancel` | LEAVE_REQUEST | Cancel selection |
| GET | `/api/v1/restricted-holidays/selections` | LEAVE_APPROVE | Selections by status |
| GET | `/api/v1/restricted-holidays/{holidayId}/selections` | LEAVE_APPROVE | Selections by holiday |
| POST | `/api/v1/restricted-holidays/selections/{selectionId}/approve` | LEAVE_APPROVE | Approve selection |
| POST | `/api/v1/restricted-holidays/selections/{selectionId}/reject` | LEAVE_APPROVE | Reject selection |
| GET | `/api/v1/restricted-holidays/policy` | LEAVE_VIEW_SELF | Get policy |
| PUT | `/api/v1/restricted-holidays/policy` | LEAVE_MANAGE | Save policy |

### OfficeLocationController
Base path: `/api/v1/office-locations`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/office-locations` | OFFICE_LOCATION_CREATE | Create location |
| PUT | `/api/v1/office-locations/{id}` | OFFICE_LOCATION_UPDATE | Update location |
| GET | `/api/v1/office-locations` | OFFICE_LOCATION_VIEW | List all locations |
| GET | `/api/v1/office-locations/active` | OFFICE_LOCATION_VIEW | List active locations |
| GET | `/api/v1/office-locations/{id}` | OFFICE_LOCATION_VIEW | Get location by id |
| DELETE | `/api/v1/office-locations/{id}` | OFFICE_LOCATION_DELETE | Delete location |
| POST | `/api/v1/office-locations/validate-geofence` | ATTENDANCE_MARK | Validate geofence |

### TimeTrackingController
Base path: `/api/v1/time-tracking`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/time-tracking/entries` | TIME_TRACKING_CREATE | Create entry |
| PUT | `/api/v1/time-tracking/entries/{id}` | TIME_TRACKING_UPDATE | Update entry |
| GET | `/api/v1/time-tracking/entries/{id}` | TIME_TRACKING_VIEW | Get entry |
| DELETE | `/api/v1/time-tracking/entries/{id}` | TIME_TRACKING_UPDATE | Delete entry |
| POST | `/api/v1/time-tracking/entries/{id}/submit` | TIME_TRACKING_CREATE | Submit entry |
| POST | `/api/v1/time-tracking/entries/submit-bulk` | TIME_TRACKING_CREATE | Submit multiple entries |
| POST | `/api/v1/time-tracking/entries/{id}/approve` | TIME_TRACKING_APPROVE | Approve entry |
| POST | `/api/v1/time-tracking/entries/approve-bulk` | TIME_TRACKING_APPROVE | Approve multiple entries |
| POST | `/api/v1/time-tracking/entries/{id}/reject` | TIME_TRACKING_APPROVE | Reject entry |
| GET | `/api/v1/time-tracking/entries/my` | TIME_TRACKING_VIEW | My entries |
| GET | `/api/v1/time-tracking/entries/my/range` | TIME_TRACKING_VIEW | My entries for range |
| GET | `/api/v1/time-tracking/entries/pending` | TIME_TRACKING_APPROVE | Pending approvals |
| GET | `/api/v1/time-tracking/entries` | TIME_TRACKING_VIEW_ALL | All entries |
| GET | `/api/v1/time-tracking/entries/project/{projectId}` | TIME_TRACKING_VIEW_ALL | Entries by project |
| GET | `/api/v1/time-tracking/summary` | TIME_TRACKING_VIEW | Time summary |
| GET | `/api/v1/time-tracking/summary/project/{projectId}` | TIME_TRACKING_VIEW_ALL | Project time summary |

### ShiftManagementController
Base path: `/api/v1/shifts`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/shifts` | ATTENDANCE_APPROVE | Create shift |
| PUT | `/api/v1/shifts/{shiftId}` | ATTENDANCE_APPROVE | Update shift |
| GET | `/api/v1/shifts/{shiftId}` | — | Get shift by id |
| GET | `/api/v1/shifts` | — | List all shifts |
| GET | `/api/v1/shifts/active` | ATTENDANCE_APPROVE | List active shifts |
| DELETE | `/api/v1/shifts/{shiftId}` | ATTENDANCE_APPROVE | Delete shift |
| PATCH | `/api/v1/shifts/{shiftId}/activate` | ATTENDANCE_APPROVE | Activate shift |
| PATCH | `/api/v1/shifts/{shiftId}/deactivate` | ATTENDANCE_APPROVE | Deactivate shift |
| POST | `/api/v1/shifts/assignments` | ATTENDANCE_APPROVE | Assign shift |
| GET | `/api/v1/shifts/assignments/employee/{employeeId}` | — | Employee assignments |
| GET | `/api/v1/shifts/assignments/date/{date}` | ATTENDANCE_APPROVE | Assignments for date |
| DELETE | `/api/v1/shifts/assignments/{assignmentId}` | ATTENDANCE_APPROVE | Cancel assignment |
| POST | `/api/v1/shifts/patterns` | SHIFT_MANAGE | Create pattern |
| PUT | `/api/v1/shifts/patterns/{patternId}` | SHIFT_MANAGE | Update pattern |
| GET | `/api/v1/shifts/patterns/{patternId}` | SHIFT_VIEW | Get pattern by id |
| GET | `/api/v1/shifts/patterns` | SHIFT_VIEW | List all patterns |
| GET | `/api/v1/shifts/patterns/active` | SHIFT_VIEW | List active patterns |
| DELETE | `/api/v1/shifts/patterns/{patternId}` | SHIFT_MANAGE | Delete pattern |
| POST | `/api/v1/shifts/generate-schedule` | SHIFT_MANAGE | Generate schedule |
| GET | `/api/v1/shifts/schedule` | — | Employee schedule |
| GET | `/api/v1/shifts/team-schedule` | — | Team schedule |
| GET | `/api/v1/shifts/validate-rules` | SHIFT_ASSIGN | Validate shift rules |

### ShiftSwapController
Base path: `/api/v1/shift-swaps`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/shift-swaps` | ATTENDANCE_REGULARIZE | Submit swap request |
| POST | `/api/v1/shift-swaps/{requestId}/accept` | ATTENDANCE_REGULARIZE | Accept request |
| POST | `/api/v1/shift-swaps/{requestId}/decline` | ATTENDANCE_REGULARIZE | Decline request |
| POST | `/api/v1/shift-swaps/{requestId}/cancel` | ATTENDANCE_REGULARIZE | Cancel request |
| GET | `/api/v1/shift-swaps/my-requests/{employeeId}` | ATTENDANCE_REGULARIZE | My swap requests |
| GET | `/api/v1/shift-swaps/incoming/{employeeId}` | ATTENDANCE_REGULARIZE | Incoming requests |
| GET | `/api/v1/shift-swaps/pending-approval` | ATTENDANCE_APPROVE | Pending approvals |
| GET | `/api/v1/shift-swaps` | ATTENDANCE_VIEW_ALL | All swap requests |
| POST | `/api/v1/shift-swaps/{requestId}/approve` | ATTENDANCE_APPROVE | Approve request |
| POST | `/api/v1/shift-swaps/{requestId}/reject` | ATTENDANCE_APPROVE | Reject request |

### OvertimeManagementController
Base path: `/api/v1/overtime`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/overtime` | ATTENDANCE_MARK | Create overtime record |
| POST | `/api/v1/overtime/{recordId}/approve` | ATTENDANCE_APPROVE | Approve/reject overtime |
| GET | `/api/v1/overtime/{recordId}` | — | Get overtime record |
| GET | `/api/v1/overtime/employee/{employeeId}` | — | Employee overtime records |
| GET | `/api/v1/overtime/pending` | — | Pending overtime records |
| GET | `/api/v1/overtime` | — | All overtime records |
| DELETE | `/api/v1/overtime/{recordId}` | ATTENDANCE_APPROVE | Delete overtime record |
| GET | `/api/v1/overtime/comp-time/balance/{employeeId}` | — | Comp-time balance |
| POST | `/api/v1/overtime/comp-time/accrue` | ATTENDANCE_APPROVE | Accrue comp-time |
| POST | `/api/v1/overtime/comp-time/use` | ATTENDANCE_APPROVE | Use comp-time |
| GET | `/api/v1/overtime/comp-time/history/{employeeId}` | — | Comp-time history |

## Leave

### LeaveBalanceController
Base path: `/api/v1/leave-balances`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/leave-balances/employee/{employeeId}` | — | Employee leave balances |
| GET | `/api/v1/leave-balances/employee/{employeeId}/year/{year}` | — | Balances by year |
| POST | `/api/v1/leave-balances/encash` | — | Encash leave balance |
| POST | `/api/v1/leave-balances/admin/carry-forward` | LEAVE_BALANCE_MANAGE | Carry-forward balances |

### LeaveRequestController
Base path: `/api/v1/leave-requests`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/leave-requests` | LEAVE_REQUEST | Create leave request |
| GET | `/api/v1/leave-requests/{id}` | — | Get leave request |
| GET | `/api/v1/leave-requests/employee/{employeeId}` | — | Requests by employee |
| GET | `/api/v1/leave-requests/status/{status}` | — | Requests by status |
| GET | `/api/v1/leave-requests` | — | List leave requests |
| POST | `/api/v1/leave-requests/{id}/approve` | LEAVE_APPROVE | Approve request |
| POST | `/api/v1/leave-requests/{id}/reject` | LEAVE_REJECT | Reject request |
| POST | `/api/v1/leave-requests/{id}/cancel` | LEAVE_CANCEL | Cancel request |
| PUT | `/api/v1/leave-requests/{id}` | LEAVE_REQUEST | Update request |

### LeaveTypeController
Base path: `/api/v1/leave-types`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/leave-types` | LEAVE_APPROVE | Create leave type |
| PUT | `/api/v1/leave-types/{id}` | LEAVE_APPROVE | Update leave type |
| GET | `/api/v1/leave-types/{id}` | — | Get leave type |
| GET | `/api/v1/leave-types` | — | List all leave types |
| GET | `/api/v1/leave-types/active` | — | List active leave types |
| PATCH | `/api/v1/leave-types/{id}/activate` | LEAVE_APPROVE | Activate leave type |
| PATCH | `/api/v1/leave-types/{id}/deactivate` | LEAVE_APPROVE | Deactivate leave type |
| DELETE | `/api/v1/leave-types/{id}` | LEAVE_APPROVE | Delete leave type |

## Payroll, Compensation & Statutory

### PayrollController
Base path: `/api/v1/payroll`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/payroll/runs` | PAYROLL_PROCESS | Create payroll run |
| PUT | `/api/v1/payroll/runs/{id}` | PAYROLL_PROCESS | Update payroll run |
| GET | `/api/v1/payroll/runs/{id}` | PAYROLL_VIEW_ALL | Get payroll run |
| GET | `/api/v1/payroll/runs` | PAYROLL_VIEW_ALL | List payroll runs |
| GET | `/api/v1/payroll/runs/period` | PAYROLL_VIEW_ALL | Run by period |
| GET | `/api/v1/payroll/runs/year/{year}` | PAYROLL_VIEW_ALL | Runs by year |
| GET | `/api/v1/payroll/runs/status/{status}` | PAYROLL_VIEW_ALL | Runs by status |
| POST | `/api/v1/payroll/runs/{id}/process` | — | Process payroll run |
| GET | `/api/v1/payroll/runs/{id}/status` | PAYROLL_VIEW_ALL | Run status |
| POST | `/api/v1/payroll/runs/{id}/approve` | PAYROLL_VIEW_ALL | Approve payroll run |
| POST | `/api/v1/payroll/runs/{id}/lock` | PAYROLL_PROCESS | Lock payroll run |
| DELETE | `/api/v1/payroll/runs/{id}` | PAYROLL_PROCESS | Delete payroll run |
| POST | `/api/v1/payroll/payslips` | PAYROLL_PROCESS | Create payslip |
| PUT | `/api/v1/payroll/payslips/{id}` | PAYROLL_PROCESS | Update payslip |
| GET | `/api/v1/payroll/payslips/{id}` | PAYROLL_VIEW_ALL | Get payslip |
| GET | `/api/v1/payroll/payslips` | PAYROLL_VIEW_ALL | List payslips |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}` | PAYROLL_VIEW_ALL | Payslips by employee |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}/period` | — | Payslip by period |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}/year/{year}` | PAYROLL_VIEW_ALL | Payslips by year |
| GET | `/api/v1/payroll/payslips/run/{payrollRunId}` | PAYROLL_VIEW_ALL | Payslips by run |
| GET | `/api/v1/payroll/payslips/run/{payrollRunId}/paged` | PAYROLL_VIEW_ALL | Payslips by run (paged) |
| DELETE | `/api/v1/payroll/payslips/{id}` | PAYROLL_PROCESS | Delete payslip |
| GET | `/api/v1/payroll/payslips/{id}/pdf` | PAYROLL_PROCESS | Download payslip PDF |
| GET | `/api/v1/payroll/payslips/employee/{employeeId}/period/pdf` | — | Payslip PDF by period |
| POST | `/api/v1/payroll/salary-structures` | PAYROLL_PROCESS | Create salary structure |
| PUT | `/api/v1/payroll/salary-structures/{id}` | PAYROLL_PROCESS | Update salary structure |
| GET | `/api/v1/payroll/salary-structures/{id}` | PAYROLL_VIEW_ALL | Get salary structure |
| GET | `/api/v1/payroll/salary-structures` | PAYROLL_VIEW_ALL | List salary structures |
| GET | `/api/v1/payroll/salary-structures/employee/{employeeId}` | — | Structures by employee |
| GET | `/api/v1/payroll/salary-structures/employee/{employeeId}/active` | — | Active structure for employee |
| GET | `/api/v1/payroll/salary-structures/active` | PAYROLL_VIEW_ALL | Active salary structures |
| POST | `/api/v1/payroll/salary-structures/{id}/deactivate` | PAYROLL_PROCESS | Deactivate structure |
| DELETE | `/api/v1/payroll/salary-structures/{id}` | PAYROLL_PROCESS | Delete structure |
| POST | `/api/v1/payroll/components` | PAYROLL_PROCESS | Create component |
| PUT | `/api/v1/payroll/components/{id}` | PAYROLL_PROCESS | Update component |
| GET | `/api/v1/payroll/components/{id}` | PAYROLL_VIEW_ALL | Get component |
| GET | `/api/v1/payroll/components` | PAYROLL_VIEW_ALL | List components |
| GET | `/api/v1/payroll/components/active` | PAYROLL_VIEW_ALL | Active components |
| GET | `/api/v1/payroll/components/active/type/{type}` | PAYROLL_VIEW_ALL | Active components by type |
| GET | `/api/v1/payroll/components/code/{code}` | PAYROLL_VIEW_ALL | Component by code |
| DELETE | `/api/v1/payroll/components/{id}` | PAYROLL_PROCESS | Delete component |
| POST | `/api/v1/payroll/components/evaluate` | PAYROLL_PROCESS | Evaluate components |
| POST | `/api/v1/payroll/components/recompute-order` | PAYROLL_PROCESS | Recompute evaluation order |

### GlobalPayrollController
Base path: `/api/v1/global-payroll`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/global-payroll/dashboard` | GLOBAL_PAYROLL_VIEW | Global payroll dashboard |
| POST | `/api/v1/global-payroll/currencies` | CURRENCY_MANAGE | Create currency |
| GET | `/api/v1/global-payroll/currencies` | GLOBAL_PAYROLL_VIEW | Active currencies |
| GET | `/api/v1/global-payroll/currencies/base` | GLOBAL_PAYROLL_VIEW | Base currency |
| POST | `/api/v1/global-payroll/exchange-rates` | EXCHANGE_RATE_MANAGE | Create exchange rate |
| GET | `/api/v1/global-payroll/exchange-rates/convert` | GLOBAL_PAYROLL_VIEW | Convert amount |
| GET | `/api/v1/global-payroll/exchange-rates/rate` | GLOBAL_PAYROLL_VIEW | Get exchange rate |
| POST | `/api/v1/global-payroll/locations` | GLOBAL_PAYROLL_MANAGE | Create location |
| GET | `/api/v1/global-payroll/locations` | GLOBAL_PAYROLL_VIEW | List locations |
| GET | `/api/v1/global-payroll/locations/active` | GLOBAL_PAYROLL_VIEW | Active locations |
| POST | `/api/v1/global-payroll/runs` | GLOBAL_PAYROLL_MANAGE | Create payroll run |
| POST | `/api/v1/global-payroll/runs/{runId}/process` | GLOBAL_PAYROLL_MANAGE | Process payroll run |
| POST | `/api/v1/global-payroll/runs/{runId}/approve` | GLOBAL_PAYROLL_MANAGE | Approve payroll run |
| GET | `/api/v1/global-payroll/runs/{runId}` | GLOBAL_PAYROLL_VIEW | Get payroll run |
| GET | `/api/v1/global-payroll/runs` | GLOBAL_PAYROLL_VIEW | List payroll runs |
| POST | `/api/v1/global-payroll/runs/{runId}/employees` | GLOBAL_PAYROLL_MANAGE | Add employee to payroll |
| GET | `/api/v1/global-payroll/runs/{runId}/employees` | GLOBAL_PAYROLL_VIEW | Employee records |

### PayrollStatutoryController
Base path: `/api/v1/payroll/statutory`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/payroll/statutory/preview` | PAYROLL_VIEW | Preview statutory deductions |
| POST | `/api/v1/payroll/statutory/{payslipId}/apply` | PAYROLL_PROCESS | Apply statutory deductions |

### StatutoryFilingController
Base path: `/api/v1/payroll/statutory-filings`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/payroll/statutory-filings/types` | STATUTORY_VIEW | Filing types |
| POST | `/api/v1/payroll/statutory-filings/generate` | — | Generate filing |
| GET | `/api/v1/payroll/statutory-filings` | STATUTORY_VIEW | Filing history |
| GET | `/api/v1/payroll/statutory-filings/{id}` | STATUTORY_VIEW | Filing run detail |
| GET | `/api/v1/payroll/statutory-filings/{id}/download` | STATUTORY_VIEW | Download filing |
| POST | `/api/v1/payroll/statutory-filings/{id}/validate` | STATUTORY_MANAGE | Validate filing |
| PUT | `/api/v1/payroll/statutory-filings/{id}/submit` | — | Submit filing |

### BonusController
Base path: `/api/v1/payroll/bonus`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/payroll/bonus/calculate` | PAYROLL_VIEW | Calculate bonus |

### CompensationController
Base path: `/api/v1/compensation`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/compensation/cycles` | COMPENSATION_MANAGE | Create cycle |
| GET | `/api/v1/compensation/cycles/{cycleId}` | COMPENSATION_VIEW | Get cycle by id |
| GET | `/api/v1/compensation/cycles` | COMPENSATION_VIEW | List all cycles |
| GET | `/api/v1/compensation/cycles/active` | COMPENSATION_VIEW | Active cycles |
| POST | `/api/v1/compensation/cycles/{cycleId}/status` | COMPENSATION_MANAGE | Update cycle status |
| GET | `/api/v1/compensation/cycles/{cycleId}/statistics` | COMPENSATION_VIEW | Cycle statistics |
| POST | `/api/v1/compensation/revisions` | COMPENSATION_MANAGE | Create revision |
| GET | `/api/v1/compensation/revisions/{revisionId}` | COMPENSATION_VIEW | Get revision by id |
| GET | `/api/v1/compensation/revisions` | COMPENSATION_VIEW | List all revisions |
| GET | `/api/v1/compensation/cycles/{cycleId}/revisions` | COMPENSATION_VIEW | Revisions by cycle |
| GET | `/api/v1/compensation/employees/{employeeId}/revisions` | COMPENSATION_VIEW | Employee revision history |
| GET | `/api/v1/compensation/revisions/pending` | COMPENSATION_APPROVE | Pending approvals |
| POST | `/api/v1/compensation/revisions/{revisionId}/submit` | COMPENSATION_MANAGE | Submit revision |
| POST | `/api/v1/compensation/revisions/{revisionId}/review` | COMPENSATION_APPROVE | Review revision |
| POST | `/api/v1/compensation/revisions/{revisionId}/approve` | COMPENSATION_APPROVE | Approve revision |
| POST | `/api/v1/compensation/revisions/{revisionId}/reject` | COMPENSATION_APPROVE | Reject revision |
| POST | `/api/v1/compensation/revisions/{revisionId}/apply` | COMPENSATION_MANAGE | Apply revision |
| GET | `/api/v1/compensation/revision-types` | COMPENSATION_VIEW | List revision types |
| GET | `/api/v1/compensation/cycle-statuses` | COMPENSATION_VIEW | List cycle statuses |

### TaxDeclarationController
Base path: `/api/v1/tax-declarations`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/tax-declarations` | TDS_DECLARE | Create tax declaration |
| PUT | `/api/v1/tax-declarations/{id}` | TDS_DECLARE | Update tax declaration |
| PATCH | `/api/v1/tax-declarations/{id}/submit` | TDS_DECLARE | Submit declaration |
| PATCH | `/api/v1/tax-declarations/{id}/approve` | TDS_APPROVE | Approve declaration |
| PATCH | `/api/v1/tax-declarations/{id}/reject` | TDS_APPROVE | Reject declaration |
| GET | `/api/v1/tax-declarations/{id}` | STATUTORY_VIEW | Get declaration by id |
| GET | `/api/v1/tax-declarations` | STATUTORY_VIEW | List all declarations |
| GET | `/api/v1/tax-declarations/employee/{employeeId}` | TDS_DECLARE | Declarations by employee |
| DELETE | `/api/v1/tax-declarations/{id}` | TDS_DECLARE | Delete declaration |
| POST | `/api/v1/tax-declarations/proofs` | TDS_DECLARE | Add tax proof |
| PATCH | `/api/v1/tax-declarations/proofs/{proofId}/verify` | TDS_APPROVE | Verify tax proof |
| GET | `/api/v1/tax-declarations/{declarationId}/proofs` | — | Proofs by declaration |

### StatutoryContributionController
Base path: `/api/v1/statutory/contributions`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/statutory/contributions/employee/{employeeId}` | STATUTORY_VIEW | Employee contributions |
| GET | `/api/v1/statutory/contributions/month/{month}/year/{year}` | STATUTORY_VIEW | Monthly contributions |
| GET | `/api/v1/statutory/contributions/payslip/{payslipId}` | STATUTORY_VIEW | Contributions by payslip |

### TDSController
Base path: `/api/v1/statutory/tds`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/statutory/tds/slab` | STATUTORY_MANAGE | Create TDS slab |
| GET | `/api/v1/statutory/tds/slabs/{assessmentYear}/{regime}` | STATUTORY_VIEW | Get slabs |
| POST | `/api/v1/statutory/tds/declaration` | STATUTORY_MANAGE | Submit declaration |
| GET | `/api/v1/statutory/tds/declaration/{employeeId}/{financialYear}` | STATUTORY_VIEW | Get declaration |
| PUT | `/api/v1/statutory/tds/declaration/{id}/approve` | STATUTORY_MANAGE | Approve declaration |

### ProvidentFundController
Base path: `/api/v1/statutory/pf`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/statutory/pf/config` | STATUTORY_MANAGE | Create PF config |
| GET | `/api/v1/statutory/pf/config` | STATUTORY_VIEW | Active PF configs |
| POST | `/api/v1/statutory/pf/employee` | STATUTORY_MANAGE | Enroll employee |
| GET | `/api/v1/statutory/pf/employee/{employeeId}` | STATUTORY_VIEW | Employee PF record |

### ESIController
Base path: `/api/v1/statutory/esi`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/statutory/esi/config` | STATUTORY_MANAGE | Create ESI config |
| GET | `/api/v1/statutory/esi/config` | STATUTORY_VIEW | Active ESI configs |
| POST | `/api/v1/statutory/esi/employee` | STATUTORY_MANAGE | Enroll employee |
| GET | `/api/v1/statutory/esi/employee/{employeeId}` | STATUTORY_VIEW | Employee ESI record |

### LWFController
Base path: `/api/v1/payroll/lwf`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/payroll/lwf/configurations` | STATUTORY_VIEW | List configurations |
| POST | `/api/v1/payroll/lwf/configurations` | — | Create/update configuration |
| DELETE | `/api/v1/payroll/lwf/configurations/{stateCode}` | STATUTORY_VIEW | Deactivate configuration |
| GET | `/api/v1/payroll/lwf/deductions` | STATUTORY_VIEW | List deductions |
| GET | `/api/v1/payroll/lwf/deductions/employee/{employeeId}` | STATUTORY_VIEW | Employee deductions |
| GET | `/api/v1/payroll/lwf/report` | STATUTORY_VIEW | Remittance report |
| POST | `/api/v1/payroll/lwf/calculate` | — | Calculate LWF |

### ProfessionalTaxController
Base path: `/api/v1/statutory/pt`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/statutory/pt/slab` | STATUTORY_MANAGE | Create PT slab |
| GET | `/api/v1/statutory/pt/slabs/{stateCode}` | STATUTORY_VIEW | Slabs by state |

## Finance — Loans, Payments, Budget, Benefits, Assets

### LoanController
Base path: `/api/v1/loans`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/loans` | LOAN_CREATE | Apply for loan |
| GET | `/api/v1/loans/{id}` | LOAN_VIEW | Get loan |
| POST | `/api/v1/loans/{id}/approve` | LOAN_APPROVE | Approve loan |
| POST | `/api/v1/loans/{id}/reject` | LOAN_APPROVE | Reject loan |
| POST | `/api/v1/loans/{id}/disburse` | LOAN_MANAGE | Disburse loan |
| POST | `/api/v1/loans/{id}/activate` | LOAN_MANAGE | Activate loan |
| POST | `/api/v1/loans/{id}/repayment` | LOAN_MANAGE | Record repayment |
| POST | `/api/v1/loans/{id}/cancel` | LOAN_UPDATE | Cancel loan |
| GET | `/api/v1/loans/my` | LOAN_VIEW | My loans |
| GET | `/api/v1/loans/pending` | LOAN_APPROVE | Pending approvals |
| GET | `/api/v1/loans` | LOAN_VIEW_ALL | All loans |
| GET | `/api/v1/loans/active` | LOAN_VIEW_ALL | Active loans |

### PaymentController
Base path: `/api/v1/payments`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/payments` | PAYMENT_INITIATE | Initiate payment |
| GET | `/api/v1/payments/{paymentId}/status` | PAYMENT_VIEW | Check payment status |
| GET | `/api/v1/payments/{paymentId}` | PAYMENT_VIEW | Get payment details (UUID-matched) |
| GET | `/api/v1/payments` | PAYMENT_VIEW | List payments |
| POST | `/api/v1/payments/{paymentId}/refund` | PAYMENT_REFUND | Refund payment |

### PaymentConfigController
Base path: `/api/v1/payments/config`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/payments/config` | PAYMENT_CONFIG_MANAGE | List payment configs |
| GET | `/api/v1/payments/config/{provider}` | PAYMENT_CONFIG_MANAGE | Config by provider |
| POST | `/api/v1/payments/config` | PAYMENT_CONFIG_MANAGE | Save payment config |
| PATCH | `/api/v1/payments/config/{provider}/toggle` | PAYMENT_CONFIG_MANAGE | Toggle config active |
| POST | `/api/v1/payments/config/test-connection` | PAYMENT_CONFIG_MANAGE | Test connection |

### PaymentWebhookController
Base path: `/api/v1/payments/webhooks`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/payments/webhooks/{provider}` | **public** (signature) | Handle provider webhook |
| POST | `/api/v1/payments/webhooks/razorpay` | **public** (signature) | Handle Razorpay webhook |
| POST | `/api/v1/payments/webhooks/stripe` | **public** (signature) | Handle Stripe webhook |
| GET | `/api/v1/payments/webhooks/health` | **public** | Webhook health |

### BudgetPlanningController
Base path: `/api/v1/budget`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/budget/dashboard` | BUDGET_VIEW | Budget dashboard |
| POST | `/api/v1/budget/budgets` | BUDGET_CREATE | Create budget |
| PUT | `/api/v1/budget/budgets/{budgetId}` | BUDGET_MANAGE | Update budget |
| GET | `/api/v1/budget/budgets/{budgetId}` | BUDGET_VIEW | Get budget |
| GET | `/api/v1/budget/budgets` | BUDGET_VIEW | List all budgets |
| GET | `/api/v1/budget/budgets/fiscal-year/{year}` | BUDGET_VIEW | Budgets by fiscal year |
| GET | `/api/v1/budget/budgets/department/{departmentId}` | BUDGET_VIEW | Budgets by department |
| DELETE | `/api/v1/budget/budgets/{budgetId}` | BUDGET_MANAGE | Delete budget |
| POST | `/api/v1/budget/budgets/{budgetId}/submit` | BUDGET_MANAGE | Submit for approval |
| POST | `/api/v1/budget/budgets/{budgetId}/approve` | BUDGET_APPROVE | Approve budget |
| POST | `/api/v1/budget/budgets/{budgetId}/reject` | BUDGET_APPROVE | Reject budget |
| POST | `/api/v1/budget/positions` | HEADCOUNT_MANAGE | Create position |
| PUT | `/api/v1/budget/positions/{positionId}` | HEADCOUNT_MANAGE | Update position |
| PATCH | `/api/v1/budget/positions/{positionId}/status` | HEADCOUNT_MANAGE | Update position status |
| GET | `/api/v1/budget/budgets/{budgetId}/positions` | HEADCOUNT_VIEW | Positions by budget |
| GET | `/api/v1/budget/positions/status/{status}` | HEADCOUNT_VIEW | Positions by status |
| DELETE | `/api/v1/budget/positions/{positionId}` | HEADCOUNT_MANAGE | Delete position |
| POST | `/api/v1/budget/scenarios` | BUDGET_MANAGE | Create scenario |
| PUT | `/api/v1/budget/scenarios/{scenarioId}` | BUDGET_MANAGE | Update scenario |
| POST | `/api/v1/budget/scenarios/{scenarioId}/select` | BUDGET_MANAGE | Select scenario |
| GET | `/api/v1/budget/budgets/{budgetId}/scenarios` | BUDGET_VIEW | Scenarios by budget |
| POST | `/api/v1/budget/scenarios/compare` | BUDGET_VIEW | Compare scenarios |
| DELETE | `/api/v1/budget/scenarios/{scenarioId}` | BUDGET_MANAGE | Delete scenario |

### BenefitEnhancedController
Base path: `/api/v1/benefits-enhanced`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/benefits-enhanced/plans` | BENEFIT_MANAGE | Create plan |
| PUT | `/api/v1/benefits-enhanced/plans/{planId}` | BENEFIT_MANAGE | Update plan |
| GET | `/api/v1/benefits-enhanced/plans` | — | List all plans |
| GET | `/api/v1/benefits-enhanced/plans/{planId}` | — | Get plan |
| GET | `/api/v1/benefits-enhanced/plans/active` | — | Active plans |
| GET | `/api/v1/benefits-enhanced/plans/type/{planType}` | — | Plans by type |
| GET | `/api/v1/benefits-enhanced/plans/category/{category}` | — | Plans by category |
| GET | `/api/v1/benefits-enhanced/plans/eligible` | BENEFIT_ENROLL | Eligible plans |
| POST | `/api/v1/benefits-enhanced/enrollments` | BENEFIT_ENROLL | Enroll employee |
| POST | `/api/v1/benefits-enhanced/enrollments/{enrollmentId}/approve` | BENEFIT_MANAGE | Approve enrollment |
| POST | `/api/v1/benefits-enhanced/enrollments/{enrollmentId}/activate` | BENEFIT_MANAGE | Activate enrollment |
| POST | `/api/v1/benefits-enhanced/enrollments/{enrollmentId}/terminate` | BENEFIT_MANAGE | Terminate enrollment |
| POST | `/api/v1/benefits-enhanced/enrollments/{enrollmentId}/cobra` | BENEFIT_MANAGE | Start COBRA |
| GET | `/api/v1/benefits-enhanced/enrollments/employee/{employeeId}` | — | Employee enrollments |
| GET | `/api/v1/benefits-enhanced/enrollments/employee/{employeeId}/active` | BENEFIT_VIEW | Active enrollments |
| GET | `/api/v1/benefits-enhanced/enrollments/pending` | BENEFIT_VIEW | Pending enrollments |
| POST | `/api/v1/benefits-enhanced/claims` | BENEFIT_CLAIM_SUBMIT | Submit claim |
| GET | `/api/v1/benefits-enhanced/claims/{claimId}` | — | Get claim |
| POST | `/api/v1/benefits-enhanced/claims/{claimId}/process` | BENEFIT_MANAGE | Process claim |
| POST | `/api/v1/benefits-enhanced/claims/{claimId}/reject` | BENEFIT_MANAGE | Reject claim |
| POST | `/api/v1/benefits-enhanced/claims/{claimId}/initiate-payment` | BENEFIT_MANAGE | Initiate claim payment |
| POST | `/api/v1/benefits-enhanced/claims/{claimId}/complete-payment` | BENEFIT_MANAGE | Complete claim payment |
| POST | `/api/v1/benefits-enhanced/claims/{claimId}/appeal` | BENEFIT_CLAIM_SUBMIT | Appeal claim |
| GET | `/api/v1/benefits-enhanced/claims/employee/{employeeId}` | BENEFIT_VIEW | Employee claims |
| GET | `/api/v1/benefits-enhanced/claims/pending` | BENEFIT_VIEW | Pending claims |
| POST | `/api/v1/benefits-enhanced/flex/allocations` | BENEFIT_MANAGE | Create flex allocation |
| GET | `/api/v1/benefits-enhanced/flex/allocations/employee/{employeeId}/active` | — | Active flex allocation |
| GET | `/api/v1/benefits-enhanced/flex/allocations/employee/{employeeId}/history` | REPORT_VIEW | Flex allocation history |
| GET | `/api/v1/benefits-enhanced/dashboard` | REPORT_VIEW | Benefits dashboard |
| GET | `/api/v1/benefits-enhanced/summary/employee/{employeeId}` | REPORT_VIEW | Employee benefits summary |

### BenefitManagementController
Base path: `/api/v1/benefits`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/benefits/plans` | BENEFIT_MANAGE | Create plan |
| PUT | `/api/v1/benefits/plans/{planId}` | BENEFIT_MANAGE | Update plan |
| POST | `/api/v1/benefits/plans/{planId}/activate` | BENEFIT_MANAGE | Activate plan |
| POST | `/api/v1/benefits/plans/{planId}/deactivate` | BENEFIT_MANAGE | Deactivate plan |
| GET | `/api/v1/benefits/plans/{planId}` | BENEFIT_VIEW | Get plan by id |
| GET | `/api/v1/benefits/plans` | BENEFIT_VIEW | List all plans |
| GET | `/api/v1/benefits/plans/active` | BENEFIT_VIEW | Active plans |
| GET | `/api/v1/benefits/plans/type/{benefitType}` | BENEFIT_VIEW | Plans by type |
| DELETE | `/api/v1/benefits/plans/{planId}` | BENEFIT_MANAGE | Delete plan |

### AssetManagementController
Base path: `/api/v1/assets`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/assets` | ASSET_CREATE | Create asset |
| PUT | `/api/v1/assets/{assetId}` | ASSET_MANAGE | Update asset |
| POST | `/api/v1/assets/{assetId}/assign` | ASSET_ASSIGN | Assign asset |
| POST | `/api/v1/assets/{assetId}/return` | ASSET_MANAGE | Return asset |
| GET | `/api/v1/assets/{assetId}` | ASSET_VIEW | Get asset by id |
| GET | `/api/v1/assets` | ASSET_VIEW | List all assets |
| GET | `/api/v1/assets/employee/{employeeId}` | — | Assets by employee |
| GET | `/api/v1/assets/status/{status}` | EMPLOYEE_VIEW_SELF | Assets by status |
| DELETE | `/api/v1/assets/{assetId}` | SYSTEM_ADMIN | Delete asset |
| POST | `/api/v1/assets/request` | ASSET_VIEW | Request asset |
| POST | `/api/v1/assets/maintenance` | ASSET_VIEW | Create maintenance request |
| GET | `/api/v1/assets/{assetId}/maintenance` | ASSET_VIEW | Maintenance history |
| PATCH | `/api/v1/assets/maintenance/{requestId}/status` | ASSET_MANAGE | Update maintenance status |
| GET | `/api/v1/assets/{assetId}/audit` | ASSET_VIEW | Asset audit trail |

## Expense & Travel

### ExpenseClaimController
Base path: `/api/v1/expenses`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/employees/{employeeId}` | EXPENSE_CREATE | Create claim for employee |
| POST | `/api/v1/expenses` | EXPENSE_CREATE | Create claim |
| PUT | `/api/v1/expenses/{claimId}` | EXPENSE_CREATE | Update claim |
| POST | `/api/v1/expenses/{claimId}/submit` | EXPENSE_CREATE | Submit claim |
| POST | `/api/v1/expenses/{claimId}/approve` | EXPENSE_APPROVE | Approve claim |
| POST | `/api/v1/expenses/{claimId}/reject` | EXPENSE_APPROVE | Reject claim |
| POST | `/api/v1/expenses/{claimId}/pay` | EXPENSE_MANAGE | Pay claim |
| POST | `/api/v1/expenses/{claimId}/cancel` | EXPENSE_CREATE | Cancel claim |
| DELETE | `/api/v1/expenses/{claimId}` | EXPENSE_CREATE | Delete claim |
| GET | `/api/v1/expenses/statistics/{employeeId}` | — | Employee claim statistics |
| GET | `/api/v1/expenses/{claimId}` | — | Get claim |
| GET | `/api/v1/expenses` | — | List claims |
| GET | `/api/v1/expenses/employees/{employeeId}` | — | Claims by employee |
| GET | `/api/v1/expenses/status/{status}` | — | Claims by status |
| GET | `/api/v1/expenses/pending-approvals` | EXPENSE_APPROVE | Pending approvals |
| GET | `/api/v1/expenses/date-range` | — | Claims by date range |
| GET | `/api/v1/expenses/summary` | — | Claim summary |
| GET | `/api/v1/expenses/statuses` | — | List claim statuses |
| POST | `/api/v1/expenses/{claimId}/reimburse` | EXPENSE_MANAGE | Reimburse claim |
| GET | `/api/v1/expenses/validate-policy` | EXPENSE_CREATE | Validate against policy |

### ExpenseItemController
Base path: `/api/v1/expenses/claims/{claimId}/items`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/claims/{claimId}/items` | EXPENSE_CREATE | Add item |
| PUT | `/api/v1/expenses/claims/{claimId}/items/{itemId}` | EXPENSE_CREATE | Update item |
| DELETE | `/api/v1/expenses/claims/{claimId}/items/{itemId}` | EXPENSE_CREATE | Delete item |
| GET | `/api/v1/expenses/claims/{claimId}/items` | — | List items |

### ExpenseCategoryController
Base path: `/api/v1/expenses/categories`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/categories` | EXPENSE_MANAGE | Create category |
| PUT | `/api/v1/expenses/categories/{categoryId}` | EXPENSE_MANAGE | Update category |
| GET | `/api/v1/expenses/categories/{categoryId}` | EXPENSE_VIEW | Get category |
| GET | `/api/v1/expenses/categories/active` | EXPENSE_VIEW | Active categories |
| GET | `/api/v1/expenses/categories` | EXPENSE_MANAGE | List all categories |
| PATCH | `/api/v1/expenses/categories/{categoryId}/toggle` | EXPENSE_MANAGE | Toggle category active |
| DELETE | `/api/v1/expenses/categories/{categoryId}` | EXPENSE_MANAGE | Delete category |

### ExpensePolicyController
Base path: `/api/v1/expenses/policies`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/policies` | EXPENSE_MANAGE | Create policy |
| PUT | `/api/v1/expenses/policies/{policyId}` | EXPENSE_MANAGE | Update policy |
| GET | `/api/v1/expenses/policies/{policyId}` | EXPENSE_VIEW | Get policy |
| GET | `/api/v1/expenses/policies/active` | EXPENSE_VIEW | Active policies |
| GET | `/api/v1/expenses/policies` | EXPENSE_MANAGE | List all policies |
| PATCH | `/api/v1/expenses/policies/{policyId}/toggle` | EXPENSE_MANAGE | Toggle policy active |
| DELETE | `/api/v1/expenses/policies/{policyId}` | EXPENSE_MANAGE | Delete policy |
| GET | `/api/v1/expenses/policies/validate` | EXPENSE_CREATE | Validate claim amount |

### ExpenseAdvanceController
Base path: `/api/v1/expenses/advances`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/advances/employees/{employeeId}` | EXPENSE_CREATE | Create advance |
| POST | `/api/v1/expenses/advances/{advanceId}/approve` | EXPENSE_APPROVE | Approve advance |
| POST | `/api/v1/expenses/advances/{advanceId}/disburse` | EXPENSE_MANAGE | Disburse advance |
| POST | `/api/v1/expenses/advances/{advanceId}/settle` | EXPENSE_CREATE | Settle advance |
| POST | `/api/v1/expenses/advances/{advanceId}/cancel` | EXPENSE_CREATE | Cancel advance |
| GET | `/api/v1/expenses/advances/{advanceId}` | EXPENSE_CREATE | Get advance |
| GET | `/api/v1/expenses/advances/employees/{employeeId}` | — | Advances by employee |
| GET | `/api/v1/expenses/advances` | — | List all advances |

### ExpenseReportController
Base path: `/api/v1/expenses/reports`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/expenses/reports` | — | Get expense report |

### MileageController
Base path: `/api/v1/expenses/mileage`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/mileage/employees/{employeeId}` | EXPENSE_CREATE | Create mileage log |
| PUT | `/api/v1/expenses/mileage/{logId}` | EXPENSE_CREATE | Update mileage log |
| POST | `/api/v1/expenses/mileage/{logId}/submit` | EXPENSE_CREATE | Submit mileage log |
| POST | `/api/v1/expenses/mileage/{logId}/approve` | EXPENSE_APPROVE | Approve mileage log |
| POST | `/api/v1/expenses/mileage/{logId}/reject` | EXPENSE_APPROVE | Reject mileage log |
| GET | `/api/v1/expenses/mileage/employee/{employeeId}` | — | Employee mileage logs |
| GET | `/api/v1/expenses/mileage/summary/{employeeId}` | EXPENSE_APPROVE | Monthly summary |
| GET | `/api/v1/expenses/mileage/pending-approvals` | EXPENSE_APPROVE | Pending approvals |

### MileagePolicyController
Base path: `/api/v1/expenses/mileage/policies`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/mileage/policies` | EXPENSE_SETTINGS | Create policy |
| PUT | `/api/v1/expenses/mileage/policies/{policyId}` | EXPENSE_SETTINGS | Update policy |
| PATCH | `/api/v1/expenses/mileage/policies/{policyId}/toggle` | EXPENSE_SETTINGS | Toggle policy |
| GET | `/api/v1/expenses/mileage/policies/active` | — | Active policies |
| GET | `/api/v1/expenses/mileage/policies/{policyId}` | EXPENSE_SETTINGS | Get policy |
| DELETE | `/api/v1/expenses/mileage/policies/{policyId}` | EXPENSE_SETTINGS | Delete policy |

### OcrReceiptController
Base path: `/api/v1/expenses/receipts`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/expenses/receipts/scan` | EXPENSE_CREATE | Scan receipt (OCR) |

### TravelController
Base path: `/api/v1/travel`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/travel` | TRAVEL_VIEW_ALL | List travel (all) |
| POST | `/api/v1/travel/requests` | TRAVEL_CREATE | Create travel request |
| PUT | `/api/v1/travel/requests/{id}` | TRAVEL_UPDATE | Update request |
| GET | `/api/v1/travel/requests/{id}` | TRAVEL_VIEW | Get request |
| POST | `/api/v1/travel/requests/{id}/submit` | TRAVEL_CREATE | Submit request |
| POST | `/api/v1/travel/requests/{id}/approve` | TRAVEL_APPROVE | Approve request |
| POST | `/api/v1/travel/requests/{id}/reject` | TRAVEL_APPROVE | Reject request |
| POST | `/api/v1/travel/requests/{id}/cancel` | TRAVEL_UPDATE | Cancel request |
| DELETE | `/api/v1/travel/requests/{id}` | TRAVEL_CREATE | Delete request |
| GET | `/api/v1/travel/requests/my` | TRAVEL_VIEW | My requests |
| GET | `/api/v1/travel/requests/pending` | TRAVEL_APPROVE | Pending approvals |
| GET | `/api/v1/travel/requests` | TRAVEL_VIEW_ALL | List all requests |
| GET | `/api/v1/travel/requests/upcoming` | TRAVEL_VIEW_ALL | Upcoming travel |

### TravelExpenseController
Base path: `/api/v1/travel/expenses`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/travel/expenses` | TRAVEL_CREATE | Create travel expense |
| PUT | `/api/v1/travel/expenses/{id}` | TRAVEL_UPDATE | Update expense |
| GET | `/api/v1/travel/expenses/{id}` | TRAVEL_VIEW | Get expense |
| GET | `/api/v1/travel/expenses/request/{travelRequestId}` | TRAVEL_VIEW | Expenses by request |
| GET | `/api/v1/travel/expenses/employee/{employeeId}` | TRAVEL_VIEW | Expenses by employee |
| POST | `/api/v1/travel/expenses/{id}/approve` | TRAVEL_APPROVE | Approve expense |
| POST | `/api/v1/travel/expenses/{id}/reject` | TRAVEL_APPROVE | Reject expense |
| DELETE | `/api/v1/travel/expenses/{id}` | TRAVEL_CREATE | Delete expense |
| GET | `/api/v1/travel/expenses/request/{travelRequestId}/summary` | TRAVEL_VIEW | Expense summary |

## Projects, PSA & Resource Management

### ProjectController
Base path: `/api/v1/projects`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/projects` | PROJECT_CREATE | Create project |
| GET | `/api/v1/projects` | PROJECT_VIEW | List all projects |
| GET | `/api/v1/projects/search` | PROJECT_VIEW | Search projects |
| GET | `/api/v1/projects/{id}` | PROJECT_VIEW | Get project |
| PUT | `/api/v1/projects/{id}` | PROJECT_UPDATE | Update project |
| DELETE | `/api/v1/projects/{id}` | PROJECT_DELETE | Delete project |
| POST | `/api/v1/projects/{id}/assign` | PROJECT_UPDATE | Assign to project |
| DELETE | `/api/v1/projects/{projectId}/employees/{employeeId}` | PROJECT_UPDATE | Remove project member |
| GET | `/api/v1/projects/{id}/team` | PROJECT_VIEW | Get project team |
| GET | `/api/v1/projects/{id}/allocations` | PROJECT_VIEW | Get project allocations |
| POST | `/api/v1/projects/{id}/allocations/{memberId}/end` | PROJECT_UPDATE | End member allocation |
| GET | `/api/v1/projects/employee/{employeeId}` | PROJECT_VIEW | Projects by employee |
| GET | `/api/v1/projects/employee/{employeeId}/allocations` | PROJECT_VIEW | Employee allocations |

### ResourceController
Base path: `/api/v1/resources`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/resources/allocation-summary` | PROJECT_VIEW | Allocation summary |
| GET | `/api/v1/resources/employees/{employeeId}/timeline` | PROJECT_VIEW | Employee timeline |
| PUT | `/api/v1/resources/allocations/{allocationId}` | PROJECT_CREATE | Reallocate resource |
| GET | `/api/v1/resources/available` | PROJECT_VIEW | Available resources |

### ProjectTimesheetController
Base path: `/api/v1/project-timesheets`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/project-timesheets/entries` | TIMESHEET_SUBMIT | Create time entry |
| PUT | `/api/v1/project-timesheets/entries/{id}` | TIMESHEET_SUBMIT | Update time entry |
| PATCH | `/api/v1/project-timesheets/entries/{id}/submit` | TIMESHEET_SUBMIT | Submit time entry |
| PATCH | `/api/v1/project-timesheets/entries/{id}/approve` | TIMESHEET_APPROVE | Approve time entry |
| PATCH | `/api/v1/project-timesheets/entries/{id}/reject` | TIMESHEET_APPROVE | Reject time entry |
| GET | `/api/v1/project-timesheets/entries/{id}` | — | Get time entry |
| GET | `/api/v1/project-timesheets/entries` | — | List time entries |
| GET | `/api/v1/project-timesheets/entries/employee/{employeeId}` | — | Entries by employee |
| GET | `/api/v1/project-timesheets/entries/project/{projectId}` | — | Entries by project |
| GET | `/api/v1/project-timesheets/entries/employee/{employeeId}/date-range` | — | Entries by date range |
| GET | `/api/v1/project-timesheets/entries/status/{status}` | — | Entries by status |
| DELETE | `/api/v1/project-timesheets/entries/{id}` | TIMESHEET_SUBMIT | Delete time entry |
| POST | `/api/v1/project-timesheets/members` | PROJECT_CREATE | Add project member |
| PUT | `/api/v1/project-timesheets/members/{id}` | PROJECT_CREATE | Update project member |
| GET | `/api/v1/project-timesheets/members/{id}` | — | Get project member |
| GET | `/api/v1/project-timesheets/members/project/{projectId}` | — | Members by project |
| GET | `/api/v1/project-timesheets/members/employee/{employeeId}` | — | Projects by employee |
| GET | `/api/v1/project-timesheets/members/project/{projectId}/active` | — | Active members by project |
| DELETE | `/api/v1/project-timesheets/members/{id}` | PROJECT_CREATE | Remove project member |
| GET | `/api/v1/project-timesheets/reports/employee/{employeeId}/summary` | — | Employee time summary |
| GET | `/api/v1/project-timesheets/reports/employee/{employeeId}/weekly` | — | Weekly time report |
| GET | `/api/v1/project-timesheets/reports/employee/{employeeId}/monthly` | — | Monthly time report |
| GET | `/api/v1/project-timesheets/reports/project/{projectId}` | — | Project time report |
| GET | `/api/v1/project-timesheets/reports/employee/{employeeId}/utilization` | — | Utilization report |
| GET | `/api/v1/project-timesheets/reports/pending-approvals` | TIMESHEET_APPROVE | Pending approvals |
| GET | `/api/v1/project-timesheets/overtime/{employeeId}` | — | Calculate overtime for date |

### PSAProjectController
Base path: `/api/v1/psa/projects`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/psa/projects` | PROJECT_CREATE | Create PSA project |
| GET | `/api/v1/psa/projects` | PROJECT_VIEW | List all projects |
| GET | `/api/v1/psa/projects/{id}` | PROJECT_VIEW | Get project |
| GET | `/api/v1/psa/projects/status/{status}` | PROJECT_VIEW | Projects by status |
| PUT | `/api/v1/psa/projects/{id}` | PROJECT_CREATE | Update project |
| DELETE | `/api/v1/psa/projects/{id}` | PROJECT_CREATE | Delete project |
| POST | `/api/v1/psa/projects/{id}/allocate` | PROJECT_CREATE | Allocate resources |

### PSATimesheetController
Base path: `/api/v1/psa/timesheets`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/psa/timesheets` | TIMESHEET_SUBMIT | Create timesheet |
| GET | `/api/v1/psa/timesheets/employee/{employeeId}` | TIMESHEET_SUBMIT | Employee timesheets |
| GET | `/api/v1/psa/timesheets/{id}` | TIMESHEET_SUBMIT | Get timesheet |
| POST | `/api/v1/psa/timesheets/{id}/submit` | TIMESHEET_SUBMIT | Submit timesheet |
| POST | `/api/v1/psa/timesheets/{id}/approve` | TIMESHEET_APPROVE | Approve timesheet |
| POST | `/api/v1/psa/timesheets/{id}/reject` | TIMESHEET_APPROVE | Reject timesheet |
| POST | `/api/v1/psa/timesheets/{id}/entries` | TIMESHEET_SUBMIT | Add time entry |
| GET | `/api/v1/psa/timesheets/{id}/entries` | TIMESHEET_SUBMIT | Get timesheet entries |

### PSAInvoiceController
Base path: `/api/v1/psa/invoices`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/psa/invoices` | PAYROLL_PROCESS | Create invoice |
| GET | `/api/v1/psa/invoices/project/{projectId}` | PAYROLL_VIEW_ALL | Invoices by project |
| GET | `/api/v1/psa/invoices/client/{clientId}` | PAYROLL_VIEW_ALL | Invoices by client |
| GET | `/api/v1/psa/invoices/status/{status}` | PAYROLL_VIEW_ALL | Invoices by status |
| GET | `/api/v1/psa/invoices/{id}` | PAYROLL_VIEW_ALL | Get invoice |
| PUT | `/api/v1/psa/invoices/{id}` | PAYROLL_PROCESS | Update invoice |
| POST | `/api/v1/psa/invoices/{id}/approve` | PAYROLL_APPROVE | Approve invoice |

### ResourceConflictController
Base path: `/api/v1/resource-management/conflicts`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/resource-management/conflicts/check` | EMPLOYEE_VIEW_ALL | Check conflict |
| POST | `/api/v1/resource-management/conflicts/scan` | EMPLOYEE_VIEW_ALL | Scan conflicts |
| GET | `/api/v1/resource-management/conflicts/open` | EMPLOYEE_VIEW_ALL | Open conflicts |
| POST | `/api/v1/resource-management/conflicts/{conflictId}/resolve` | EMPLOYEE_VIEW_ALL | Resolve conflict |

### ResourceManagementController
Base path: `/api/v1/resource-management`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/resource-management/capacity/employee/{employeeId}` | EMPLOYEE_VIEW_ALL | Employee capacity |
| GET | `/api/v1/resource-management/capacity/employees` | EMPLOYEE_VIEW_ALL | Employees capacity |
| POST | `/api/v1/resource-management/capacity/employees` | EMPLOYEE_VIEW_ALL | Employees capacity (filtered) |
| GET | `/api/v1/resource-management/allocation/validate` | PROJECT_VIEW | Validate allocation |
| POST | `/api/v1/resource-management/allocation/validate` | PROJECT_VIEW | Validate allocation (body) |
| PUT | `/api/v1/resource-management/allocation` | PROJECT_CREATE | Update allocation |
| GET | `/api/v1/resource-management/capacity/over-allocated` | EMPLOYEE_VIEW_ALL | Over-allocated employees |
| GET | `/api/v1/resource-management/capacity/available` | EMPLOYEE_VIEW_ALL | Available employees |
| POST | `/api/v1/resource-management/allocation-requests` | PROJECT_CREATE | Create allocation request |
| GET | `/api/v1/resource-management/allocation-requests/my-pending` | PROJECT_VIEW | My pending approvals |
| GET | `/api/v1/resource-management/allocation-requests/pending` | PROJECT_VIEW | All pending requests |
| GET | `/api/v1/resource-management/allocation-requests/{requestId}` | PROJECT_VIEW | Get allocation request |
| GET | `/api/v1/resource-management/allocation-requests/employee/{employeeId}` | PROJECT_VIEW | Employee allocation history |
| GET | `/api/v1/resource-management/allocation-requests/pending/count` | PROJECT_VIEW | Pending requests count |
| POST | `/api/v1/resource-management/allocation-requests/{requestId}/approve` | PROJECT_CREATE | Approve allocation request |
| POST | `/api/v1/resource-management/allocation-requests/{requestId}/reject` | PROJECT_CREATE | Reject allocation request |
| POST | `/api/v1/resource-management/workload/dashboard` | ANALYTICS_VIEW | Workload dashboard |
| GET | `/api/v1/resource-management/availability/employee/{employeeId}` | EMPLOYEE_VIEW_ALL | Employee availability |
| GET | `/api/v1/resource-management/availability/team` | EMPLOYEE_VIEW_ALL | Team availability |
| POST | `/api/v1/resource-management/availability/team` | EMPLOYEE_VIEW_ALL | Team availability (filtered) |
| GET | `/api/v1/resource-management/availability/aggregated` | EMPLOYEE_VIEW_ALL | Aggregated availability |
| GET | `/api/v1/resource-management/holidays` | EMPLOYEE_VIEW_ALL | Resource holidays |
| POST | `/api/v1/resource-management/workload/employees` | ANALYTICS_VIEW | Employee workloads |
| GET | `/api/v1/resource-management/workload/employee/{employeeId}` | ANALYTICS_VIEW | Employee workload |
| GET | `/api/v1/resource-management/workload/departments` | ANALYTICS_VIEW | Department workloads |
| GET | `/api/v1/resource-management/workload/heatmap` | ANALYTICS_VIEW | Workload heatmap |
| POST | `/api/v1/resource-management/workload/export` | ANALYTICS_VIEW | Export workload report |

### ResourcePoolController
Base path: `/api/v1/resource-pools`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/v1/resource-pools` | PROJECT_VIEW | List pools |
| POST | `/api/v1/resource-pools` | PROJECT_CREATE | Create pool |
| GET | `/api/v1/resource-pools/{id}` | PROJECT_VIEW | Get pool |
| GET | `/api/v1/resource-pools/{id}/members` | PROJECT_VIEW | Get pool members |
| POST | `/api/v1/resource-pools/{id}/members` | PROJECT_CREATE | Add members |
| DELETE | `/api/v1/resource-pools/{id}/members/{employeeId}` | PROJECT_CREATE | Remove member |

## Related Links

- [[Controller-Index]] — exhaustive 1:1 list of all 180 controllers
- [[APIs]] — curated module-level endpoint catalog · [[Services]] — service layer behind these controllers
- [[Feature-Traceability]] — end-to-end feature slices · [[Permissions]] — authorization catalog
- [[Nu-HRMS]] — sub-app deep dive · [[00-Home]]
