---
title: Shared-Platform Endpoint Catalog — Per-Method
tags: [backend, api, endpoints, rest, catalog, shared-platform]
---

# Shared-Platform Endpoint Catalog — Per-Method

> The **per-method companion** to [[Controller-Index]] and [[APIs]] for the
> [[Shared-Platform]] surface — auth, admin, platform/tenancy, analytics, comms,
> integrations, webhooks, mobile, and cross-cutting infra. Where [[Controller-Index]]
> stops at the controller/base-path level and [[APIs]] gives curated module depth, this
> note enumerates **every handler** of all 56 Shared-Platform controllers: HTTP verb, the
> full path (class base + method path), the `@RequiresPermission` it carries (or
> `@PreAuthorize` / public allow-list), and a short purpose. Evidence-based, read from
> source on 2026-06-17.

## Counts

| Metric | Count |
|--------|-------|
| Controllers covered | **56** (54 under `api/*` + `common/security/ApiKeyController` + `domain/notification/WebSocketNotificationController`) |
| Total endpoints (handler methods) | **429** |

> Permission column reflects the source verbatim: most controllers use the typed
> `@RequiresPermission(Permission.XXX)` enum; a few (`PlatformController`,
> `KekaImportController`, `WorkflowController`) use **string-literal** permissions
> (`"ROLE:MANAGE"`, `"SYSTEM:ADMIN"`, `"WORKFLOW:VIEW"`) — preserved as written.
> `revalidate=true` re-checks the role against the DB instead of trusting cached JWT
> claims. `{A, B}` denotes a multi-value (any-of) annotation. `—` = no method-level
> RBAC annotation; **public** flags an unauthenticated allow-list path.

## Auth

### AuthController
Base path: `/api/v1/auth` — class header marks all handlers **public (no RBAC)**; "secured" ones resolve the user from the JWT-populated `SecurityContext`.

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/auth/me | — (authenticated; 401 if no session) | Get current authenticated user |
| POST | /api/v1/auth/login | — **public** | Login with email/password |
| POST | /api/v1/auth/google | — **public** | Login with Google OAuth |
| POST | /api/v1/auth/mfa-login | — **public** (pre-auth token) | Complete MFA second factor |
| POST | /api/v1/auth/refresh | — **public** (refresh token) | Refresh access token |
| POST | /api/v1/auth/logout | — **public** (revokes tokens) | Logout user |
| POST | /api/v1/auth/change-password | — (authenticated) | Change own password |
| POST | /api/v1/auth/forgot-password | — **public** | Request password reset |
| POST | /api/v1/auth/reset-password | — **public** (email token) | Reset password via token |

### MfaController
Base path: `/api/v1/auth/mfa` — every handler uses Spring `@PreAuthorize("isAuthenticated()")`.

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/auth/mfa/setup | `@PreAuthorize` isAuthenticated | Initiate MFA setup |
| POST | /api/v1/auth/mfa/verify | `@PreAuthorize` isAuthenticated | Verify and enable MFA |
| DELETE | /api/v1/auth/mfa/disable | `@PreAuthorize` isAuthenticated | Disable MFA |
| GET | /api/v1/auth/mfa/status | `@PreAuthorize` isAuthenticated | Get MFA status |

### SamlConfigController
Base path: `/api/v1/auth/saml`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/auth/saml/config | SYSTEM_ADMIN | Get SAML configuration |
| POST | /api/v1/auth/saml/config | SYSTEM_ADMIN | Create SAML configuration |
| PUT | /api/v1/auth/saml/config | SYSTEM_ADMIN | Update SAML configuration |
| DELETE | /api/v1/auth/saml/config | SYSTEM_ADMIN | Delete SAML configuration |
| GET | /api/v1/auth/saml/metadata | SYSTEM_ADMIN | Download SP metadata |
| POST | /api/v1/auth/saml/test | SYSTEM_ADMIN | Test IdP connection |
| GET | /api/v1/auth/saml/providers | SYSTEM_ADMIN | List all SAML providers |

## Admin

### AdminController
Base path: `/api/v1/admin`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/admin/health | SYSTEM_ADMIN | Get system health |
| GET | /api/v1/admin/settings | SYSTEM_ADMIN | Get platform settings |
| GET | /api/v1/admin/stats | SYSTEM_ADMIN | Get platform statistics |
| GET | /api/v1/admin/users | SYSTEM_ADMIN | List all users paginated |
| PATCH | /api/v1/admin/users/{userId}/role | SYSTEM_ADMIN | Update user roles |
| POST | /api/v1/admin/users/{userId}/link-employee | SYSTEM_ADMIN | Link or create employee |

### EncryptionBackfillController
Base path: `/api/v1/admin/encryption-backfill`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/admin/encryption-backfill/users/mfa-secrets | SYSTEM_ADMIN (revalidate=true) | Re-encrypt user MFA secrets |
| POST | /api/v1/admin/encryption-backfill/benefit-dependents | SYSTEM_ADMIN (revalidate=true) | Re-encrypt benefit dependents PII |
| POST | /api/v1/admin/encryption-backfill/benefit-dependents/dob | SYSTEM_ADMIN (revalidate=true) | Backfill dependent DOB encryption |
| POST | /api/v1/admin/encryption-backfill/tax-declarations | SYSTEM_ADMIN (revalidate=true) | Re-encrypt tax declaration PAN |

### KafkaAdminController
Base path: `/api/v1/admin/kafka`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/admin/kafka/failed-events | SYSTEM_ADMIN | List failed Kafka events |
| GET | /api/v1/admin/kafka/failed-events/{id} | SYSTEM_ADMIN | Get failed event detail |
| POST | /api/v1/admin/kafka/replay/{id} | SYSTEM_ADMIN | Replay dead-lettered event |
| GET | /api/v1/admin/kafka/poison-pills | SYSTEM_ADMIN | List suspected poison pills |
| POST | /api/v1/admin/kafka/ignore-topic | SYSTEM_ADMIN | Bulk-ignore topic events |
| POST | /api/v1/admin/kafka/ignore/{id} | SYSTEM_ADMIN | Ignore dead-lettered event |

### SystemAdminController
Base path: `/api/v1/admin/system`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/admin/system/overview | SYSTEM_ADMIN | Get system overview |
| GET | /api/v1/admin/system/tenants | SYSTEM_ADMIN | List tenants paginated |
| GET | /api/v1/admin/system/tenants/{tenantId}/metrics | SYSTEM_ADMIN | Get tenant metrics |
| GET | /api/v1/admin/system/growth-metrics | SYSTEM_ADMIN | Get platform growth metrics |
| POST | /api/v1/admin/system/tenants/{tenantId}/suspend | SYSTEM_ADMIN (revalidate=true) | Suspend tenant |
| POST | /api/v1/admin/system/tenants/{tenantId}/activate | SYSTEM_ADMIN (revalidate=true) | Activate tenant |
| PATCH | /api/v1/admin/system/tenants/{tenantId}/timezone | SYSTEM_ADMIN (revalidate=true) | Update tenant timezone |
| POST | /api/v1/admin/system/tenants/{tenantId}/impersonate | SYSTEM_ADMIN (revalidate=true) | Generate impersonation token |
| POST | /api/v1/admin/system/impersonate/consume | SYSTEM_ADMIN (revalidate=true) | Consume impersonation token |
| POST | /api/v1/admin/system/impersonate/revoke | SYSTEM_ADMIN (revalidate=true) | Revoke impersonation token |
| POST | /api/v1/admin/system/users/reset-password | SYSTEM_ADMIN (revalidate=true) | Admin-initiated password reset |

### SystemAuditLogController
Base path: `/api/v1/admin/system/audit-logs`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/admin/system/audit-logs | SYSTEM_ADMIN (revalidate=true) | Get cross-tenant audit logs |
| GET | /api/v1/admin/system/audit-logs/search | SYSTEM_ADMIN (revalidate=true) | Search cross-tenant audit logs |

## Platform & Tenancy

### PlatformController
Base path: `/api/v1/platform` (permissions are string literals as written)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/platform/applications | PLATFORM_VIEW | Get all applications |
| GET | /api/v1/platform/applications/tenant | PLATFORM_VIEW | Get tenant applications |
| GET | /api/v1/platform/applications/{code} | PLATFORM_VIEW | Get application by code |
| GET | /api/v1/platform/my-applications | PLATFORM_VIEW | Get my accessible apps |
| GET | /api/v1/platform/applications/{appCode}/permissions | PLATFORM_VIEW | Get application permissions |
| GET | /api/v1/platform/applications/{appCode}/permissions/by-module | PLATFORM_VIEW | Get permissions by module |
| GET | /api/v1/platform/applications/{appCode}/permissions/by-category | PLATFORM_VIEW | Get permissions by category |
| GET | /api/v1/platform/applications/{appCode}/roles | PLATFORM_VIEW | Get application roles |
| GET | /api/v1/platform/roles/{roleId} | PLATFORM_VIEW | Get role by id |
| POST | /api/v1/platform/roles | "ROLE:MANAGE" | Create new role |
| PUT | /api/v1/platform/roles/{roleId}/permissions | "ROLE:MANAGE" | Update role permissions |
| GET | /api/v1/platform/applications/{appCode}/users | "USER:READ" | Get application users |
| GET | /api/v1/platform/users/{userId}/access/{appCode} | "USER:READ" | Get user app access |
| GET | /api/v1/platform/users/{userId}/applications | "USER:READ" | Get user applications |
| POST | /api/v1/platform/access/grant | "USER:MANAGE" | Grant user app access |
| POST | /api/v1/platform/access/revoke | "USER:MANAGE" | Revoke user app access |
| PUT | /api/v1/platform/users/{userId}/access/{appCode}/roles | "USER:MANAGE" | Update user roles |
| GET | /api/v1/platform/check-permission | PLATFORM_VIEW | Check single permission |
| POST | /api/v1/platform/check-permissions | PLATFORM_VIEW | Check multiple permissions |
| GET | /api/v1/platform/my-permissions/{appCode} | PLATFORM_VIEW | Get my permissions |
| GET | /api/v1/platform/my-context | PLATFORM_VIEW | Get my context info |
| POST | /api/v1/platform/migrate | "SYSTEM:ADMIN" | Run permission migration |
| POST | /api/v1/platform/migrate/{tenantId} | "SYSTEM:ADMIN" | Migrate specific tenant |

### RootProbeController
Base path: method-level (no class `@RequestMapping`)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET, HEAD | / | — **public** (liveness) | Root liveness probe |

### TenantController
Base path: `/api/v1/tenants`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/tenants/register | — **public** (permitAll self-serve signup) | Register new tenant |

### FeatureFlagController
Base path: `/api/v1/admin/feature-flags`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/admin/feature-flags | SYSTEM_ADMIN | Get all flags |
| GET | /api/v1/admin/feature-flags/map | SYSTEM_ADMIN | Get flags as map |
| GET | /api/v1/admin/feature-flags/enabled | SYSTEM_ADMIN | Get enabled feature keys |
| GET | /api/v1/admin/feature-flags/check/{featureKey} | — (no annotation; effectively **public** despite admin prefix — flagged) | Check feature enabled |
| GET | /api/v1/admin/feature-flags/category/{category} | SYSTEM_ADMIN | Get flags by category |
| POST | /api/v1/admin/feature-flags | SYSTEM_ADMIN | Create or update flag |
| POST | /api/v1/admin/feature-flags/{featureKey}/toggle | SYSTEM_ADMIN | Toggle feature flag |

### MonitoringController
Base path: `/api/monitoring`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/monitoring/health | SYSTEM_ADMIN | Get system health |
| GET | /api/monitoring/metrics | SYSTEM_ADMIN | Get application metrics |
| GET | /api/monitoring/ping | — **public** (uptime ping) | Ping/pong uptime check |

## Migration & Data Import

### DataMigrationController
Base path: `/api/v1/migration`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/migration/employees | MIGRATION_IMPORT | Import employees file |
| POST | /api/v1/migration/attendance | MIGRATION_IMPORT | Import attendance file |
| POST | /api/v1/migration/leave-balances | MIGRATION_IMPORT | Import leave balances |
| POST | /api/v1/migration/salary-structures | MIGRATION_IMPORT | Import salary structures |
| POST | /api/v1/migration/departments | MIGRATION_IMPORT | Import departments file |
| GET | /api/v1/migration/templates | MIGRATION_IMPORT | Get import templates |
| POST | /api/v1/migration/validate | MIGRATION_IMPORT | Validate file format |

### KekaImportController
Base path: `/api/v1/keka-import` (string-literal permissions)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/keka-import/upload | "SYSTEM:ADMIN" | Upload KEKA CSV |
| POST | /api/v1/keka-import/preview | "SYSTEM:ADMIN" | Preview KEKA import |
| POST | /api/v1/keka-import/execute | "SYSTEM:ADMIN" | Execute KEKA import |
| GET | /api/v1/keka-import/history | "SYSTEM:ADMIN" | Get import history |
| GET | /api/v1/keka-import/{importId} | "SYSTEM:ADMIN" | Get import details |
| GET | /api/v1/keka-import/{importId}/errors/csv | "SYSTEM:ADMIN" | Download error CSV |
| POST | /api/v1/keka-import/{importId}/cancel | "SYSTEM:ADMIN" | Cancel in-progress import |

## Compliance & Audit

### ComplianceController
Base path: `/api/v1/compliance`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/compliance/policies | COMPLIANCE_MANAGE | Create compliance policy |
| PUT | /api/v1/compliance/policies/{id} | COMPLIANCE_MANAGE | Update existing policy |
| POST | /api/v1/compliance/policies/{id}/publish | COMPLIANCE_MANAGE | Publish draft policy |
| POST | /api/v1/compliance/policies/{id}/archive | COMPLIANCE_MANAGE | Archive a policy |
| POST | /api/v1/compliance/policies/{id}/new-version | COMPLIANCE_MANAGE | Create new policy version |
| GET | /api/v1/compliance/policies | COMPLIANCE_VIEW | Get all policies |
| GET | /api/v1/compliance/policies/{id} | COMPLIANCE_VIEW | Get specific policy |
| GET | /api/v1/compliance/policies/active | COMPLIANCE_VIEW | Get active policies |
| GET | /api/v1/compliance/policies/category/{category} | COMPLIANCE_VIEW | Get policies by category |
| POST | /api/v1/compliance/policies/{policyId}/acknowledge | COMPLIANCE_VIEW | Acknowledge a policy |
| GET | /api/v1/compliance/acknowledgments/employee/{employeeId} | COMPLIANCE_VIEW | Get employee acknowledgments |
| GET | /api/v1/compliance/policies/{policyId}/acknowledgments | COMPLIANCE_VIEW | Get policy acknowledgments |
| GET | /api/v1/compliance/acknowledgments/pending/{employeeId} | COMPLIANCE_VIEW | Get pending acknowledgments |
| POST | /api/v1/compliance/checklists | COMPLIANCE_MANAGE | Create compliance checklist |
| PUT | /api/v1/compliance/checklists/{id} | COMPLIANCE_MANAGE | Update a checklist |
| POST | /api/v1/compliance/checklists/{id}/complete | COMPLIANCE_MANAGE | Complete a checklist |
| GET | /api/v1/compliance/checklists | COMPLIANCE_VIEW | Get all checklists |
| GET | /api/v1/compliance/checklists/active | COMPLIANCE_VIEW | Get active checklists |
| GET | /api/v1/compliance/checklists/my | COMPLIANCE_VIEW | Get my assigned checklists |
| GET | /api/v1/compliance/checklists/overdue | COMPLIANCE_VIEW | Get overdue checklists |
| GET | /api/v1/compliance/audit-logs | AUDIT_VIEW | Get all audit logs |
| GET | /api/v1/compliance/audit-logs/entity/{entityType}/{entityId} | AUDIT_VIEW | Get entity audit history |
| GET | /api/v1/compliance/audit-logs/user/{userId} | AUDIT_VIEW | Get user audit history |
| GET | /api/v1/compliance/audit-logs/date-range | AUDIT_VIEW | Get audit logs by date |
| POST | /api/v1/compliance/alerts | COMPLIANCE_MANAGE | Create compliance alert |
| PUT | /api/v1/compliance/alerts/{id}/status | COMPLIANCE_MANAGE | Update alert status |
| PUT | /api/v1/compliance/alerts/{id}/assign | COMPLIANCE_MANAGE | Assign alert to user |
| POST | /api/v1/compliance/alerts/{id}/escalate | COMPLIANCE_MANAGE | Escalate an alert |
| GET | /api/v1/compliance/alerts | COMPLIANCE_VIEW | Get all alerts |
| GET | /api/v1/compliance/alerts/active | COMPLIANCE_VIEW | Get active alerts |
| GET | /api/v1/compliance/alerts/my | COMPLIANCE_VIEW | Get my assigned alerts |
| GET | /api/v1/compliance/alerts/critical | COMPLIANCE_VIEW | Get critical alerts |
| GET | /api/v1/compliance/dashboard | COMPLIANCE_VIEW | Get compliance dashboard |

### DsrAdminFulfillmentController
Base path: `/api/v1/admin/dsr`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/admin/dsr/{id}/fulfill | SYSTEM_ADMIN (revalidate=true) | Fulfil GDPR access/portability |

### DsrController
Base path: `/api/v1/me/dsr` — self-service routes are authenticated-only (no permission annotation; rely on the auth filter).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/me/dsr/access | — (authenticated) | File Article 15 access request |
| POST | /api/v1/me/dsr/erasure | — (authenticated) | File Article 17 erasure request |
| POST | /api/v1/me/dsr/portability | — (authenticated) | File Article 20 portability request |
| GET | /api/v1/me/dsr/status | — (authenticated) | List my DSR requests |
| GET | /api/v1/me/dsr/{requestId} | — (authenticated) | Get my DSR request by id |
| PUT | /api/v1/me/dsr/admin/{requestId}/status | SYSTEM_ADMIN (revalidate=true) | Update DSR status (admin) |
| GET | /api/v1/me/dsr/admin | SYSTEM_ADMIN | List tenant DSR requests (admin) |

### AuditLogController
Base path: **dual** — `/api/v1/audit` and `/api/v1/audit-logs` (method-level; every route resolves under both prefixes)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/audit(-logs) | AUDIT_VIEW | Get all audit logs |
| GET | /api/v1/audit(-logs)/search | AUDIT_VIEW | Search audit logs |
| GET | /api/v1/audit(-logs)/entity-type/{entityType} | AUDIT_VIEW | Get logs by entity type |
| GET | /api/v1/audit(-logs)/entity/{entityType}/{entityId} | AUDIT_VIEW | Get logs by entity |
| GET | /api/v1/audit(-logs)/entity/{entityType}/{entityId}/recent | AUDIT_VIEW | Get recent entity logs |
| GET | /api/v1/audit(-logs)/actor/{actorId} | AUDIT_VIEW | Get logs by actor |
| GET | /api/v1/audit(-logs)/action/{action} | AUDIT_VIEW | Get logs by action |
| GET | /api/v1/audit(-logs)/date-range | AUDIT_VIEW | Get logs by date range |
| GET | /api/v1/audit(-logs)/security-events | AUDIT_VIEW (revalidate=true) | Get security events |
| GET | /api/v1/audit(-logs)/statistics | AUDIT_VIEW | Get audit statistics |
| GET | /api/v1/audit(-logs)/summary | AUDIT_VIEW | Get audit summary |
| GET | /api/v1/audit(-logs)/entity-types | AUDIT_VIEW | Get distinct entity types |
| GET | /api/v1/audit(-logs)/actions | AUDIT_VIEW | Get audit action enum values |

## Workflow & Approvals

### ApprovalEscalationController
Base path: `/api/v1/escalation`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/escalation/workflows/{workflowId}/config | WORKFLOW_MANAGE | Get workflow escalation config |
| PUT | /api/v1/escalation/workflows/{workflowId}/config | WORKFLOW_MANAGE | Create/update escalation config |
| DELETE | /api/v1/escalation/workflows/{workflowId}/config | WORKFLOW_MANAGE | Delete escalation config |

### ApprovalsController
Base path: `/api/v1/approvals`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/approvals/tasks | WORKFLOW_VIEW | Get my approval tasks |
| GET | /api/v1/approvals/inbox | WORKFLOW_VIEW | Paginated approval inbox |

### WorkflowController
Base path: `/api/v1/workflow` (mixes `Permission.WORKFLOW_*` enums and `"WORKFLOW:..."` string literals)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/workflow/definitions | "WORKFLOW:MANAGE" | Create workflow definition |
| GET | /api/v1/workflow/definitions/{id} | "WORKFLOW:VIEW" | Get workflow definition |
| GET | /api/v1/workflow/definitions | "WORKFLOW:VIEW" | List all workflow definitions |
| GET | /api/v1/workflow/definitions/entity-type/{entityType} | "WORKFLOW:VIEW" | Get workflows by entity type |
| PUT | /api/v1/workflow/definitions/{id} | "WORKFLOW:MANAGE" | Update workflow definition |
| DELETE | /api/v1/workflow/definitions/{id} | "WORKFLOW:MANAGE" | Deactivate workflow definition |
| POST | /api/v1/workflow/executions | WORKFLOW_EXECUTE | Start workflow |
| GET | /api/v1/workflow/executions/{id} | WORKFLOW_VIEW | Get workflow execution |
| GET | /api/v1/workflow/executions/reference/{referenceNumber} | WORKFLOW_VIEW | Get workflow by reference number |
| POST | /api/v1/workflow/executions/{id}/action | WORKFLOW_EXECUTE | Process approval action |
| POST | /api/v1/workflow/executions/{id}/approve | WORKFLOW_EXECUTE | Approve execution |
| POST | /api/v1/workflow/executions/{id}/reject | WORKFLOW_EXECUTE | Reject execution |
| POST | /api/v1/workflow/executions/{id}/return | WORKFLOW_EXECUTE | Return for modification |
| POST | /api/v1/workflow/executions/{id}/cancel | WORKFLOW_EXECUTE | Cancel workflow |
| GET | /api/v1/workflow/my-pending-approvals | WORKFLOW_VIEW | Get my pending approvals |
| GET | /api/v1/workflow/my-requests | WORKFLOW_VIEW | Get my requests |
| GET | /api/v1/workflow/pending-approvals/user/{userId} | "WORKFLOW:VIEW" | Get pending approvals for user |
| GET | /api/v1/workflow/inbox | WORKFLOW_VIEW | Get approval inbox |
| GET | /api/v1/workflow/inbox/count | WORKFLOW_VIEW | Get inbox counts |
| POST | /api/v1/workflow/delegations | WORKFLOW_EXECUTE | Create delegation |
| GET | /api/v1/workflow/delegations/my | WORKFLOW_VIEW | Get my delegations |
| GET | /api/v1/workflow/delegations/to-me | WORKFLOW_VIEW | Get delegations to me |
| POST | /api/v1/workflow/delegations/{id}/revoke | WORKFLOW_EXECUTE | Revoke delegation |
| GET | /api/v1/workflow/dashboard | WORKFLOW_VIEW | Get workflow dashboard |
| GET | /api/v1/workflow/executions/overdue | "WORKFLOW:VIEW" | Get overdue executions |
| GET | /api/v1/workflow/executions/escalation-due | "WORKFLOW:VIEW" | Get executions due for escalation |

## Analytics

### AdvancedAnalyticsController
Base path: `/api/v1/analytics/advanced`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/analytics/advanced/dashboard | ANALYTICS_VIEW | Get analytics dashboard |
| GET | /api/v1/analytics/advanced/workforce | ANALYTICS_VIEW | Get workforce analytics |
| GET | /api/v1/analytics/advanced/hiring | ANALYTICS_VIEW | Get hiring analytics |
| GET | /api/v1/analytics/advanced/performance | ANALYTICS_VIEW | Get performance analytics |
| GET | /api/v1/analytics/advanced/compensation | ANALYTICS_VIEW | Get compensation analytics |
| GET | /api/v1/analytics/advanced/attendance | ANALYTICS_VIEW | Get attendance analytics |

### AnalyticsController
Base path: `/api/v1/analytics`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/analytics/summary | ANALYTICS_VIEW | Get analytics KPI summary |
| GET | /api/v1/analytics/dashboard | ANALYTICS_VIEW | Get role-based dashboard analytics |
| GET | /api/v1/analytics/metrics | ANALYTICS_VIEW | Get dashboard metrics |
| GET | /api/v1/analytics/employees | ANALYTICS_VIEW | Get employee metrics |
| GET | /api/v1/analytics/headcount-trend | ANALYTICS_VIEW | Get headcount trend |
| GET | /api/v1/analytics/leave | ANALYTICS_VIEW | Get leave metrics |
| GET | /api/v1/analytics/payroll | ANALYTICS_VIEW | Get payroll metrics |

### DashboardsController
Base path: `/api/v1/dashboards`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/dashboards/executive | DASHBOARD_EXECUTIVE | Get executive dashboard |
| GET | /api/v1/dashboards/hr-operations | DASHBOARD_VIEW | Get HR operations dashboard |
| GET | /api/v1/dashboards/manager | EMPLOYEE_VIEW_TEAM | Get manager dashboard |
| GET | /api/v1/dashboards/manager/{managerId} | EMPLOYEE_VIEW_ALL | Get manager dashboard by id |
| GET | /api/v1/dashboards/manager/team-projects | EMPLOYEE_VIEW_TEAM | Get team project allocations |
| GET | /api/v1/dashboards/employee | {EMPLOYEE_VIEW_SELF, SYSTEM_ADMIN} | Get employee dashboard |
| GET | /api/v1/dashboards/employee/{employeeId} | {EMPLOYEE_VIEW_ALL, EMPLOYEE_VIEW_TEAM, EMPLOYEE_VIEW_SELF} | Get employee dashboard by id |
| GET | /api/v1/dashboards/my | DASHBOARD_VIEW | Get my dashboard (smart routing) |
| GET | /api/v1/dashboards/widgets/attendance | ATTENDANCE_VIEW_ALL | Get attendance widget data |
| GET | /api/v1/dashboards/widgets/leave | LEAVE_VIEW_ALL | Get leave widget data |
| GET | /api/v1/dashboards/widgets/headcount | EMPLOYEE_VIEW_ALL | Get headcount widget data |
| GET | /api/v1/dashboards/widgets/payroll | PAYROLL_VIEW_ALL | Get payroll widget data |
| GET | /api/v1/dashboards/widgets/events | DASHBOARD_VIEW | Get upcoming events widget data |

### OrganizationHealthController
Base path: `/api/v1/analytics/org-health`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/analytics/org-health | ANALYTICS_VIEW | Get organization health |

### PredictiveAnalyticsController
Base path: `/api/v1/predictive-analytics`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/predictive-analytics/dashboard | PREDICTIVE_ANALYTICS_VIEW | Get predictive analytics dashboard |
| GET | /api/v1/predictive-analytics/attrition/high-risk | PREDICTIVE_ANALYTICS_VIEW | Get high-risk employees |
| GET | /api/v1/predictive-analytics/attrition/risk-level/{riskLevel} | PREDICTIVE_ANALYTICS_VIEW | Get employees by risk level |
| GET | /api/v1/predictive-analytics/attrition/employee/{employeeId} | PREDICTIVE_ANALYTICS_VIEW | Get employee prediction history |
| POST | /api/v1/predictive-analytics/attrition/predict/{employeeId} | PREDICTIVE_ANALYTICS_MANAGE | Run prediction for employee |
| POST | /api/v1/predictive-analytics/attrition/{predictionId}/action-taken | PREDICTIVE_ANALYTICS_MANAGE | Mark action taken |
| POST | /api/v1/predictive-analytics/attrition/{predictionId}/outcome | PREDICTIVE_ANALYTICS_MANAGE | Record actual outcome |
| GET | /api/v1/predictive-analytics/trends/organization | PREDICTIVE_ANALYTICS_VIEW | Get organization trends |
| GET | /api/v1/predictive-analytics/trends/department/{departmentId} | PREDICTIVE_ANALYTICS_VIEW | Get department trends |
| GET | /api/v1/predictive-analytics/trends/compare-departments | PREDICTIVE_ANALYTICS_VIEW | Compare departments |
| POST | /api/v1/predictive-analytics/trends/generate | PREDICTIVE_ANALYTICS_MANAGE | Generate trend data |
| GET | /api/v1/predictive-analytics/insights | PREDICTIVE_ANALYTICS_VIEW | Get all insights |
| GET | /api/v1/predictive-analytics/insights/category/{category} | PREDICTIVE_ANALYTICS_VIEW | Get insights by category |
| GET | /api/v1/predictive-analytics/insights/severity/{severity} | PREDICTIVE_ANALYTICS_VIEW | Get insights by severity |
| PATCH | /api/v1/predictive-analytics/insights/{insightId}/status | PREDICTIVE_ANALYTICS_MANAGE | Update insight status |
| POST | /api/v1/predictive-analytics/insights/{insightId}/assign | PREDICTIVE_ANALYTICS_MANAGE | Assign insight to user |
| POST | /api/v1/predictive-analytics/insights | PREDICTIVE_ANALYTICS_MANAGE | Create manual insight |
| GET | /api/v1/predictive-analytics/skill-gaps | PREDICTIVE_ANALYTICS_VIEW | Get latest skill gaps |
| GET | /api/v1/predictive-analytics/skill-gaps/priority/{priority} | PREDICTIVE_ANALYTICS_VIEW | Get skill gaps by priority |
| GET | /api/v1/predictive-analytics/skill-gaps/department/{departmentId} | PREDICTIVE_ANALYTICS_VIEW | Get skill gaps by department |
| GET | /api/v1/predictive-analytics/skill-gaps/trainable | PREDICTIVE_ANALYTICS_VIEW | Get trainable high-priority gaps |

### ScheduledReportController
Base path: `/api/v1/scheduled-reports`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/scheduled-reports | REPORT_CREATE | Create scheduled report |
| PUT | /api/v1/scheduled-reports/{id} | REPORT_CREATE | Update scheduled report |
| GET | /api/v1/scheduled-reports/{id} | REPORT_VIEW | Get scheduled report by id |
| GET | /api/v1/scheduled-reports | REPORT_VIEW | List all scheduled reports |
| GET | /api/v1/scheduled-reports/active | REPORT_VIEW | Get active scheduled reports |
| DELETE | /api/v1/scheduled-reports/{id} | REPORT_CREATE | Delete scheduled report |
| POST | /api/v1/scheduled-reports/{id}/toggle-status | REPORT_CREATE | Toggle report status |

## Dashboards & Reports

### DashboardController
Base path: `/api/v1/dashboard`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/dashboard/metrics | DASHBOARD_HR_OPS | Get dashboard metrics |

### CustomReportController
Base path: `/api/v1/reports/custom`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/reports/custom/templates | REPORT_VIEW | List report templates |
| POST | /api/v1/reports/custom/templates | REPORT_CREATE | Save report template |
| GET | /api/v1/reports/custom/templates/{id} | REPORT_VIEW | Get report template |
| DELETE | /api/v1/reports/custom/templates/{id} | REPORT_CREATE | Delete report template |
| POST | /api/v1/reports/custom/execute | REPORT_CREATE | Execute custom report |
| POST | /api/v1/reports/custom/export | REPORT_CREATE | Export report to CSV |

### ReportController
Base path: `/api/v1/reports`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/reports/employee-directory | REPORT_CREATE | Generate employee directory report |
| POST | /api/v1/reports/attendance | REPORT_CREATE | Generate attendance report |
| POST | /api/v1/reports/department-headcount | REPORT_CREATE | Generate department headcount report |
| POST | /api/v1/reports/leave | REPORT_CREATE | Generate leave report |
| POST | /api/v1/reports/payroll | REPORT_CREATE | Generate payroll report |
| POST | /api/v1/reports/performance | REPORT_CREATE | Generate performance report |

### HomeController
Base path: `/api/v1/home`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/home/birthdays | EMPLOYEE_VIEW_SELF | Get upcoming birthdays |
| GET | /api/v1/home/anniversaries | EMPLOYEE_VIEW_SELF | Get upcoming work anniversaries |
| GET | /api/v1/home/new-joinees | EMPLOYEE_VIEW_SELF | Get new joinees |
| GET | /api/v1/home/on-leave | EMPLOYEE_VIEW_SELF | Get employees on leave today |
| GET | /api/v1/home/attendance/me | ATTENDANCE_VIEW_SELF | Get today's attendance status |
| GET | /api/v1/home/remote-workers | EMPLOYEE_VIEW_SELF | Get remote workers today |
| GET | /api/v1/home/holidays | EMPLOYEE_VIEW_SELF | Get upcoming holidays |

## Notifications & Comms

### MultiChannelNotificationController
Base path: `/api/v1/notifications` (shares base with `NotificationController` — split by method paths; uses singular `NOTIFICATION_*` permissions)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/notifications/templates | NOTIFICATION_MANAGE | Create notification template |
| PUT | /api/v1/notifications/templates/{templateId} | NOTIFICATION_MANAGE | Update notification template |
| GET | /api/v1/notifications/templates | NOTIFICATION_VIEW | Search notification templates |
| GET | /api/v1/notifications/templates/code/{code} | NOTIFICATION_VIEW | Get template by code |
| GET | /api/v1/notifications/templates/category/{category} | NOTIFICATION_VIEW | Get templates by category |
| POST | /api/v1/notifications/send | NOTIFICATION_SEND | Send multi-channel notification |
| GET | /api/v1/notifications/my | NOTIFICATION_VIEW | Get my notifications |
| GET | /api/v1/notifications/my/unread-count | NOTIFICATION_VIEW | Get unread count |
| PUT | /api/v1/notifications/{notificationId}/read | NOTIFICATION_VIEW | Mark notification as read |
| PUT | /api/v1/notifications/my/read-all | NOTIFICATION_VIEW | Mark all as read |
| GET | /api/v1/notifications/preferences | NOTIFICATION_VIEW | Get my preferences |
| PUT | /api/v1/notifications/preferences | NOTIFICATION_VIEW | Update notification preference |
| POST | /api/v1/notifications/channels/config | NOTIFICATION_MANAGE | Configure notification channel |
| GET | /api/v1/notifications/channels/config | NOTIFICATION_VIEW | Get channel configurations |
| GET | /api/v1/notifications/dashboard | NOTIFICATION_VIEW | Get notification dashboard |

### NotificationController
Base path: `/api/v1/notifications` (uses plural `NOTIFICATIONS_*` permissions — flagged inconsistency vs the singular set above)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/notifications | NOTIFICATIONS_VIEW | Get my notifications |
| GET | /api/v1/notifications/unread | NOTIFICATIONS_VIEW | Get unread notifications |
| GET | /api/v1/notifications/unread/count | NOTIFICATIONS_VIEW | Get unread count |
| GET | /api/v1/notifications/recent | NOTIFICATIONS_VIEW | Get recent notifications |
| GET | /api/v1/notifications/{id} | NOTIFICATIONS_VIEW | Get notification by id |
| POST | /api/v1/notifications | NOTIFICATIONS_CREATE | Create notification |
| PUT | /api/v1/notifications/read-all | NOTIFICATIONS_VIEW | Mark all as read |
| DELETE | /api/v1/notifications/{id} | NOTIFICATIONS_VIEW | Delete notification |

### SmsNotificationController
Base path: `/api/v1/notifications/sms`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/notifications/sms/send | NOTIFICATION_CREATE | Send single SMS |
| POST | /api/v1/notifications/sms/send-bulk | NOTIFICATION_CREATE | Send bulk SMS |
| GET | /api/v1/notifications/sms/status | NOTIFICATION_MANAGE | Get SMS service status |
| POST | /api/v1/notifications/sms/validate-number | NOTIFICATION_MANAGE | Validate phone number |

### WebSocketNotificationController
Base path: `/api/ws-notifications` (in `domain/notification`, outside `api/`)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/ws-notifications/broadcast | NOTIFICATION_MANAGE | Broadcast WebSocket notification |

### AnnouncementController
Base path: `/api/v1/announcements`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/announcements | SYSTEM_ADMIN | Create announcement |
| PUT | /api/v1/announcements/{announcementId} | SYSTEM_ADMIN | Update announcement |
| GET | /api/v1/announcements | EMPLOYEE_VIEW_SELF | List all announcements |
| GET | /api/v1/announcements/active | EMPLOYEE_VIEW_SELF | List active announcements |
| GET | /api/v1/announcements/pinned | EMPLOYEE_VIEW_SELF | List pinned announcements |
| GET | /api/v1/announcements/{announcementId} | EMPLOYEE_VIEW_SELF | Get announcement by id |
| POST | /api/v1/announcements/{announcementId}/read | EMPLOYEE_VIEW_SELF | Mark announcement as read |
| POST | /api/v1/announcements/{announcementId}/accept | EMPLOYEE_VIEW_SELF | Accept/acknowledge announcement |
| POST | /api/v1/announcements/{announcementId}/pin | SYSTEM_ADMIN | Pin announcement |
| POST | /api/v1/announcements/{announcementId}/unpin | SYSTEM_ADMIN | Unpin announcement |
| DELETE | /api/v1/announcements/{announcementId} | SYSTEM_ADMIN | Delete announcement |

### MeetingController
Base path: `/api/v1/one-on-one`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/one-on-one | EMPLOYEE_VIEW_SELF | Schedule one-on-one meeting |
| GET | /api/v1/one-on-one/employee/{employeeId} | EMPLOYEE_VIEW_SELF | Get meetings by employee |

### CalendarController
Base path: `/api/v1/calendar`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/calendar/events | CALENDAR_CREATE | Create calendar event |
| PUT | /api/v1/calendar/events/{id} | CALENDAR_UPDATE | Update calendar event |
| GET | /api/v1/calendar/events/{id} | CALENDAR_VIEW | Get event by id |
| DELETE | /api/v1/calendar/events/{id} | CALENDAR_DELETE | Delete/cancel event |
| PATCH | /api/v1/calendar/events/{id}/status | CALENDAR_UPDATE | Update event status |
| GET | /api/v1/calendar/events/my | CALENDAR_VIEW | Get my events |
| GET | /api/v1/calendar/events/my/range | CALENDAR_VIEW | Get my events for range |
| GET | /api/v1/calendar/events/range | CALENDAR_MANAGE | Get all events for range |
| GET | /api/v1/calendar/events | CALENDAR_MANAGE | Get all events |
| GET | /api/v1/calendar/events/type/{eventType} | CALENDAR_VIEW | Get events by type |
| GET | /api/v1/calendar/events/organized | CALENDAR_VIEW | Get events I organized |
| GET | /api/v1/calendar/events/attending | CALENDAR_VIEW | Get events I'm attending |
| POST | /api/v1/calendar/events/{id}/sync/google | CALENDAR_SYNC | Sync event to Google |
| POST | /api/v1/calendar/events/{id}/sync/outlook | CALENDAR_SYNC | Sync event to Outlook |
| POST | /api/v1/calendar/sync/pending | CALENDAR_SYNC | Sync all pending events |
| POST | /api/v1/calendar/import/google | CALENDAR_SYNC | Import event from Google |
| POST | /api/v1/calendar/import/outlook | CALENDAR_SYNC | Import event from Outlook |
| GET | /api/v1/calendar/summary | CALENDAR_VIEW | Get events summary |

## Helpdesk

### HelpdeskController
Base path: `/api/v1/helpdesk` (`{SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF}` = any-of)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/helpdesk/tickets | EMPLOYEE_VIEW_SELF | Create helpdesk ticket |
| PUT | /api/v1/helpdesk/tickets/{id} | HELPDESK_TICKET_RESOLVE | Update ticket |
| PATCH | /api/v1/helpdesk/tickets/{id}/status | HELPDESK_TICKET_RESOLVE | Update ticket status |
| PATCH | /api/v1/helpdesk/tickets/{id}/resolve | HELPDESK_TICKET_RESOLVE | Resolve ticket |
| PATCH | /api/v1/helpdesk/tickets/{id}/close | HELPDESK_TICKET_RESOLVE | Close ticket |
| PATCH | /api/v1/helpdesk/tickets/{id}/assign | HELPDESK_TICKET_ASSIGN | Assign ticket to employee |
| GET | /api/v1/helpdesk/tickets/{id} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | Get ticket by id |
| GET | /api/v1/helpdesk/tickets/number/{ticketNumber} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | Get ticket by number |
| GET | /api/v1/helpdesk/tickets | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | List all tickets |
| GET | /api/v1/helpdesk/tickets/employee/{employeeId} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | List tickets by reporter |
| GET | /api/v1/helpdesk/tickets/assignee/{assigneeId} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | List tickets by assignee |
| GET | /api/v1/helpdesk/tickets/status/{status} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | List tickets by status |
| GET | /api/v1/helpdesk/tickets/category/{categoryId} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | List tickets by category |
| DELETE | /api/v1/helpdesk/tickets/{id} | HELPDESK_TICKET_MANAGE | Delete ticket |
| POST | /api/v1/helpdesk/comments | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | Add ticket comment |
| PUT | /api/v1/helpdesk/comments/{id} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | Update ticket comment |
| GET | /api/v1/helpdesk/comments/ticket/{ticketId} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | List comments for ticket |
| DELETE | /api/v1/helpdesk/comments/{id} | {SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF} | Delete ticket comment |
| POST | /api/v1/helpdesk/categories | HELPDESK_CATEGORY_MANAGE | Create ticket category |
| PUT | /api/v1/helpdesk/categories/{id} | HELPDESK_CATEGORY_MANAGE | Update ticket category |
| GET | /api/v1/helpdesk/categories/{id} | HELPDESK_TICKET_VIEW | Get category by id |
| GET | /api/v1/helpdesk/categories | HELPDESK_TICKET_VIEW | List all categories |
| GET | /api/v1/helpdesk/categories/active | HELPDESK_TICKET_VIEW | List active categories |
| DELETE | /api/v1/helpdesk/categories/{id} | HELPDESK_CATEGORY_MANAGE | Delete ticket category |

### HelpdeskSLAController
Base path: `/api/v1/helpdesk/sla`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/helpdesk/sla | HELPDESK_SLA_MANAGE | Create SLA policy |
| GET | /api/v1/helpdesk/sla | HELPDESK_TICKET_VIEW | List SLA policies |
| GET | /api/v1/helpdesk/sla/active | HELPDESK_TICKET_VIEW | List active SLAs |
| GET | /api/v1/helpdesk/sla/{id} | HELPDESK_TICKET_VIEW | Get SLA by id |
| PUT | /api/v1/helpdesk/sla/{id} | HELPDESK_SLA_MANAGE | Update SLA policy |
| DELETE | /api/v1/helpdesk/sla/{id} | HELPDESK_SLA_MANAGE | Delete SLA policy |
| POST | /api/v1/helpdesk/sla/escalate/{ticketId} | HELPDESK_TICKET_ASSIGN | Escalate ticket |
| GET | /api/v1/helpdesk/sla/escalations/ticket/{ticketId} | HELPDESK_TICKET_VIEW | Get ticket escalations |
| GET | /api/v1/helpdesk/sla/escalations/pending | HELPDESK_TICKET_VIEW | Get my pending escalations |
| POST | /api/v1/helpdesk/sla/escalations/{escalationId}/acknowledge | HELPDESK_TICKET_VIEW | Acknowledge escalation |
| GET | /api/v1/helpdesk/sla/metrics/{ticketId} | HELPDESK_TICKET_VIEW | Get ticket metrics |
| POST | /api/v1/helpdesk/sla/metrics/{ticketId}/csat | EMPLOYEE_VIEW_SELF | Submit CSAT rating |
| GET | /api/v1/helpdesk/sla/dashboard | HELPDESK_SLA_MANAGE | Get SLA dashboard |

## Integrations

### DocuSignController
Base path: `/api/v1/integrations/docusign`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/integrations/docusign/webhook | — **public** (HMAC-SHA256 verified) | Handle DocuSign webhook callback |
| GET | /api/v1/integrations/docusign/envelopes | INTEGRATION_READ | List DocuSign envelopes |
| GET | /api/v1/integrations/docusign/envelopes/{id} | INTEGRATION_READ | Get envelope details |
| POST | /api/v1/integrations/docusign/envelopes/{id}/void | INTEGRATION_MANAGE | Void an envelope |
| GET | /api/v1/integrations/docusign/templates | INTEGRATION_READ | List DocuSign templates |
| GET | /api/v1/integrations/docusign/template-mappings | INTEGRATION_READ | List template mappings |
| PUT | /api/v1/integrations/docusign/template-mappings | INTEGRATION_MANAGE | Save template mapping |

### IntegrationConnectorController
Base path: `/api/v1/integrations` (shares base with `IntegrationController`)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/integrations/connectors | INTEGRATION_READ | List all connectors |
| GET | /api/v1/integrations/connectors/{connectorId} | INTEGRATION_READ | Get connector details |
| PUT | /api/v1/integrations/connectors/{connectorId}/config | INTEGRATION_MANAGE | Save connector config |
| POST | /api/v1/integrations/connectors/{connectorId}/test | INTEGRATION_MANAGE | Test connector connection |
| POST | /api/v1/integrations/connectors/{connectorId}/activate | INTEGRATION_MANAGE | Activate connector |
| POST | /api/v1/integrations/connectors/{connectorId}/deactivate | INTEGRATION_MANAGE | Deactivate connector |
| GET | /api/v1/integrations/events | INTEGRATION_READ | Get integration event log |

### IntegrationController
Base path: `/api/v1/integrations`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/integrations/sms/status | SYSTEM_ADMIN | Get SMS integration status |
| POST | /api/v1/integrations/sms/test | SYSTEM_ADMIN | Test SMS connection |
| POST | /api/v1/integrations/sms/send | SYSTEM_ADMIN | Send SMS message |
| GET | /api/v1/integrations/sms/templates | SYSTEM_ADMIN | Get SMS templates |
| GET | /api/v1/integrations/payment/status | SYSTEM_ADMIN | Get payment gateway status |
| POST | /api/v1/integrations/payment/test | SYSTEM_ADMIN | Test payment gateway |
| POST | /api/v1/integrations/payment/create | SYSTEM_ADMIN | Create a payment |
| GET | /api/v1/integrations/payment/supported-methods | SYSTEM_ADMIN | Get supported payment methods |
| GET | /api/v1/integrations/status | SYSTEM_ADMIN | Get all integrations status |

### SlackCommandController
Base path: `/api/v1/integrations/slack` — all handlers are **public** Slack webhook receivers (Slack signing-secret verified).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/integrations/slack/commands | — **public** (signing secret) | Handle Slack slash command |
| POST | /api/v1/integrations/slack/interactions | — **public** (signing secret) | Handle Slack interaction |
| POST | /api/v1/integrations/slack/events | — **public** (signing secret + URL-verification) | Handle Slack event subscription |

## Webhooks

### WebhookController
Base path: `/api/webhooks` — dual auth: `@RequiresPermission(SYSTEM_ADMIN)` **and** `@RequiresWebhookScope(...)` (JWT or API-key path).

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/webhooks | SYSTEM_ADMIN + scope WEBHOOK_READ | List webhooks |
| GET | /api/webhooks/{id} | SYSTEM_ADMIN + scope WEBHOOK_READ | Get webhook by id |
| POST | /api/webhooks | SYSTEM_ADMIN + scope WEBHOOK_WRITE | Create webhook |
| PUT | /api/webhooks/{id} | SYSTEM_ADMIN + scope WEBHOOK_WRITE | Update webhook |
| DELETE | /api/webhooks/{id} | SYSTEM_ADMIN + scope WEBHOOK_DELETE | Delete webhook |
| POST | /api/webhooks/{id}/activate | SYSTEM_ADMIN + scope WEBHOOK_MANAGE | Activate webhook |
| POST | /api/webhooks/{id}/deactivate | SYSTEM_ADMIN + scope WEBHOOK_MANAGE | Deactivate webhook |
| GET | /api/webhooks/{id}/deliveries | SYSTEM_ADMIN + scope WEBHOOK_DELIVERIES_READ | Get delivery history |
| POST | /api/webhooks/deliveries/{deliveryId}/retry | SYSTEM_ADMIN + scope WEBHOOK_DELIVERIES_RETRY | Retry failed delivery |

### WebhookRotationController
Base path: `/api/v1/admin/webhooks`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/admin/webhooks/{id}/rotate-secret | SYSTEM_ADMIN (revalidate=true) | Rotate webhook HMAC secret |

## Mobile

### MobileApprovalController
Base path: `/api/v1/mobile/approvals` (multi-value any-of permissions)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/mobile/approvals/pending | {LEAVE_APPROVE, EXPENSE_APPROVE, EMPLOYMENT_CHANGE_APPROVE} | Get pending approvals |
| POST | /api/v1/mobile/approvals/{id}/approve | {LEAVE_APPROVE, EXPENSE_APPROVE, EMPLOYMENT_CHANGE_APPROVE} | Approve a request |
| POST | /api/v1/mobile/approvals/{id}/reject | {LEAVE_REJECT, EXPENSE_APPROVE, EMPLOYMENT_CHANGE_APPROVE} | Reject a request |
| POST | /api/v1/mobile/approvals/bulk-action | {LEAVE_APPROVE, EXPENSE_APPROVE, EMPLOYMENT_CHANGE_APPROVE} | Bulk approve or reject |

### MobileDashboardController
Base path: `/api/v1/mobile/dashboard`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/mobile/dashboard | DASHBOARD_VIEW | Get mobile dashboard |

### MobileLeaveController
Base path: `/api/v1/mobile/leave`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/mobile/leave/quick-apply | LEAVE_REQUEST | Quick apply for leave |
| GET | /api/v1/mobile/leave/balance | LEAVE_BALANCE_VIEW | Get leave balance |
| GET | /api/v1/mobile/leave/recent | {LEAVE_VIEW_ALL, LEAVE_VIEW_TEAM, LEAVE_VIEW_SELF} | Get recent leave requests |
| DELETE | /api/v1/mobile/leave/{id}/cancel | LEAVE_CANCEL | Cancel leave request |

### MobileNotificationController
Base path: `/api/v1/mobile/notifications`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/mobile/notifications/register-device | NOTIFICATION_VIEW | Register device for push |
| GET | /api/v1/mobile/notifications/unread | NOTIFICATION_VIEW | Get unread notifications |
| POST | /api/v1/mobile/notifications/mark-read | NOTIFICATION_VIEW | Mark notifications as read |

### MobileSyncController
Base path: `/api/v1/mobile/sync`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| GET | /api/v1/mobile/sync | DASHBOARD_VIEW | Delta sync changes |

## Files, Export & Cross-Cutting

### FileUploadController
Base path: `/api/v1/files`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/files/upload | DOCUMENT_UPLOAD | Upload a file |
| POST | /api/v1/files/upload/profile-photo/{employeeId} | EMPLOYEE_UPDATE | Upload profile photo |
| POST | /api/v1/files/upload/document/{employeeId} | DOCUMENT_UPLOAD | Upload employee document |
| GET | /api/v1/files/download | DOCUMENT_VIEW | Get download URL |
| GET | /api/v1/files/download/direct | DOCUMENT_VIEW | Download file directly |
| DELETE | /api/v1/files | DOCUMENT_DELETE | Delete a file |
| GET | /api/v1/files/exists | DOCUMENT_VIEW | Check if file exists |

### ExportController
Base path: `/api/v1/export` (EXPORT rate-limit bucket: 5 / 5 min)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/export/employees | EMPLOYEE_READ | Export employee data |
| POST | /api/v1/export/attendance | ATTENDANCE_VIEW_ALL | Export attendance data |
| POST | /api/v1/export/leaves | LEAVE_VIEW_ALL | Export leave data |
| POST | /api/v1/export/payroll | PAYROLL_VIEW_ALL | Export payroll data |
| POST | /api/v1/export/timesheets | TIMESHEET_APPROVE | Export timesheet data |
| POST | /api/v1/export/projects | PROJECT_VIEW | Export project data |

### ContentViewController
Base path: `/api/v1/views`

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/views/{contentType}/{contentId} | EMPLOYEE_VIEW_SELF | Record content view |
| GET | /api/v1/views/{contentType}/{contentId}/has-viewed | EMPLOYEE_VIEW_SELF | Check if viewed |
| GET | /api/v1/views/{contentType}/{contentId}/count | EMPLOYEE_VIEW_SELF | Get view count |
| GET | /api/v1/views/{contentType}/{contentId}/stats | EMPLOYEE_VIEW_SELF | Get view statistics |
| GET | /api/v1/views/{contentType}/{contentId}/viewers | EMPLOYEE_VIEW_SELF | Get all viewers |
| GET | /api/v1/views/{contentType}/{contentId}/recent-viewers | EMPLOYEE_VIEW_SELF | Get recent viewers |
| POST | /api/v1/views/{contentType}/batch-counts | EMPLOYEE_VIEW_SELF | Batch get view counts |

### ApiKeyController
Base path: `/api/v1/admin/api-keys` (in `common/security`, outside `api/`)

| Verb | Path | Permission | Purpose |
|---|---|---|---|
| POST | /api/v1/admin/api-keys | SYSTEM_ADMIN (revalidate=true) | Create API key |
| GET | /api/v1/admin/api-keys | SYSTEM_ADMIN | List API keys |
| DELETE | /api/v1/admin/api-keys/{keyId} | SYSTEM_ADMIN (revalidate=true) | Revoke API key |
| POST | /api/v1/admin/api-keys/{keyId}/regenerate | SYSTEM_ADMIN (revalidate=true) | Regenerate API key |
| PUT | /api/v1/admin/api-keys/{keyId}/scopes | SYSTEM_ADMIN (revalidate=true) | Update API key scopes |
| DELETE | /api/v1/admin/api-keys/{keyId}/permanent | SYSTEM_ADMIN (revalidate=true) | Permanently delete API key |

## Notes

- **Public allow-list (unauthenticated)** — these bypass the JWT chain and rely on their own
  token/HMAC/signature: `POST /api/v1/auth/login|google|mfa-login|refresh|logout|forgot-password|reset-password`
  (AuthController); `POST /api/v1/tenants/register` (self-serve signup); `GET,HEAD /` and
  `GET /api/monitoring/ping` (liveness); `GET /api/v1/admin/feature-flags/check/{featureKey}`
  (no annotation — flagged); `POST /api/v1/integrations/docusign/webhook` (HMAC); the three
  `POST /api/v1/integrations/slack/*` receivers (signing secret). See [[Middleware]] /
  [[Security-Audit]].
- **Authenticated-but-unscoped** (no `@RequiresPermission`, auth filter only): `AuthController.me`
  + `change-password`, and the five DSR self-service routes (`/api/v1/me/dsr/access|erasure|portability|status|{requestId}`).
- **`revalidate=true`** (DB re-check, not cached JWT) guards the most sensitive ops: encryption
  backfill, tenant suspend/activate/timezone/impersonation, admin password reset, system + entity
  audit security-events, DSR fulfil/admin-status, webhook secret rotation, all mutating API-key ops.
- **Overlapping base paths** (split by method paths — preserved): `/api/v1/notifications`
  (`MultiChannelNotificationController` + `NotificationController`), `/api/v1/integrations`
  (`IntegrationController` + `IntegrationConnectorController`). `AuditLogController` registers a
  **dual** base (`/api/v1/audit` + `/api/v1/audit-logs`).
- **Permission-style mix flagged**: `PlatformController`, `KekaImportController`, and parts of
  `WorkflowController` use **string-literal** permissions (`"ROLE:MANAGE"`, `"SYSTEM:ADMIN"`,
  `"WORKFLOW:VIEW"`) where most controllers use typed `Permission.XXX` enums. Notification
  controllers split between singular `NOTIFICATION_*` and plural `NOTIFICATIONS_*` permission
  families — a likely naming inconsistency. See [[Permissions]].
- **`method-level` base paths**: `RootProbeController` (`/`), `AuditLogController` (per-method,
  dual prefix). Counted here, consistent with [[Controller-Index]].

## Related Links

- [[Controller-Index]] — breadth index (every controller, base path, sub-app)
- [[APIs]] — curated module-level endpoint reference
- [[Services]] — service layer behind these controllers · [[Middleware]] — filter chain, public
  allow-list, rate-limit buckets
- [[Feature-Traceability]] — end-to-end feature slices · [[Permissions]] — authorization model
- [[Shared-Platform]] · [[00-Home]]
