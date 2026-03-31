# NU-AURA Class-Level Architecture Analysis

Deep analysis of five core service classes that form the backbone of the platform's security, data access, workflow, and payroll subsystems.

---

## 1. SecurityConfig

**File:** `backend/src/main/java/com/hrms/common/config/SecurityConfig.java`
**Role:** Central Spring Security configuration. Defines the filter chain order, CORS policy, CSRF strategy, and public/protected route mapping.

### Filter Chain Order

Filters execute in this order on every HTTP request:

```
Request
  -> RateLimitingFilter          (1st - rate limit by IP/tenant before auth)
  -> TenantFilter                (2nd - extract X-Tenant-ID header, set TenantContext)
  -> JwtAuthenticationFilter     (3rd - validate JWT, populate SecurityContext)
  -> Spring Security filters     (authorization checks)
  -> Controller
```

Configured via:
```java
addFilterBefore(rateLimitingFilter, TenantFilter.class)     // rate limit runs first
addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter.class)
addFilterAfter(jwtAuthenticationFilter, TenantFilter.class) // JWT runs after tenant
```

### Public (Unauthenticated) Routes

| Pattern | Purpose |
|---------|---------|
| `/error` | Spring error handler |
| `/api/v1/auth/**` | All authentication endpoints |
| `/api/v1/auth/mfa-login` | MFA step (explicitly listed) |
| `/api/v1/tenants/register` | Tenant self-registration |
| `/actuator/health`, `/actuator/health/**` | Health checks |
| `/api/v1/esignature/external/**` | Token-based e-signature |
| `/api/v1/public/offers/**` | Candidate offer portal |
| `/api/v1/exit/interview/public/**` | Exit interview (token-based) |
| `/api/public/careers/**` | Public career page |
| `/ws/**` | WebSocket/SockJS (auth at STOMP level) |

### Protected Routes

- `/actuator/**` (non-health) -- requires `ROLE_SUPER_ADMIN`
- `/swagger-ui/**`, `/api-docs/**` -- requires `ROLE_SUPER_ADMIN`
- Everything else -- `.authenticated()`

### Security Headers

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `default-src 'self'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()` |

### CSRF Configuration

Controlled by `app.security.csrf.enabled` (default `true`).

- Uses **cookie-based double-submit pattern** via `CookieCsrfTokenRepository`
- Token stored in a non-httpOnly cookie (so JavaScript can read it)
- Cookie path: `/`
- CSRF exemptions: auth endpoints, external token-based endpoints, actuator health, WebSocket, fluence chat SSE

### CORS Configuration

- Origins: Configured via `app.cors.allowed-origins` (default: `http://localhost:3000,3001,8080`)
- No wildcard port patterns (security fix P1.2)
- Allowed methods: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- Allowed headers: explicitly enumerated (`Authorization, Content-Type, Accept, X-Tenant-ID, X-Requested-With, X-XSRF-TOKEN, Cache-Control, Origin`)
- Credentials: `true`

### Authentication Provider

- `DaoAuthenticationProvider` with `BCryptPasswordEncoder`
- Stateless sessions (`SessionCreationPolicy.STATELESS`)
- Method security enabled (`@EnableMethodSecurity`)

---

## 2. JwtTokenProvider

**File:** `backend/src/main/java/com/hrms/common/security/JwtTokenProvider.java`
**Role:** JWT token generation, validation, parsing, and revocation. Central to all authentication flows.

### Startup Validation

On `@PostConstruct`, the provider validates the JWT secret:
1. **Not null or blank** -- fails startup with guidance
2. **Minimum 32 bytes** (256 bits for HMAC-SHA256) -- fails startup with `openssl` command suggestion
3. **Not a known weak secret** -- rejects values like `secret`, `changeme`, `password`, etc.

This prevents deployment with insecure secrets (SEC-001).

### Token Types

The provider generates three types of tokens, all using HMAC-SHA256:

**1. Access Token** (via `generateToken` or `generateTokenWithAppPermissions`):
- TTL: Configured via `app.jwt.expiration`
- Claims:
  - `sub` (subject): user email
  - `userId`: UUID string
  - `tenantId`: UUID string
  - `roles`: list of role codes
  - `permissions`: list of permission strings (e.g., `employee.view_all`)
  - `permissionScopes`: map of permission -> scope name (e.g., `{"leave.view_all": "DEPARTMENT"}`)
  - `appCode`: current NU-AURA sub-app code
  - `accessibleApps`: list of app codes user can access
  - `employeeId`, `locationId`, `departmentId`, `teamId`: context UUIDs
  - `type`: `"access"`
  - `jti`: UUID for revocation

**2. Refresh Token** (via `generateRefreshToken`):
- TTL: Configured via `app.jwt.refresh-expiration`
- Claims: `sub`, `tenantId`, `type: "refresh"`, `jti`
- Minimal claims -- only used to issue new access tokens

**3. Impersonation Token** (via `generateImpersonationToken`):
- Used by SuperAdmin for cross-tenant access
- Additional claim: `isImpersonation: true`
- Same TTL as access tokens

### Token Validation (`validateToken`)

Multi-layer validation:
1. **Signature verification** -- HMAC-SHA256 with signing key
2. **Expiration check** -- automatic via JJWT library
3. **Blacklist check** -- JTI checked against `TokenBlacklistService`
4. **Type check** -- rejects refresh tokens used as access tokens (BUG-010 fix)
5. **Timestamp revocation** -- checks if all tokens before a certain time were revoked (password change scenario)

### Token Revocation

Two revocation strategies:
- **Single token revocation** (`revokeToken`): Extracts JTI and expiration, adds to blacklist
- **All user tokens** (`revokeAllUserTokens`): Sets a revocation timestamp; all tokens issued before this time are invalid

### Key Extraction Methods

| Method | Returns |
|--------|---------|
| `getUsernameFromToken` | Email (subject) |
| `getTenantIdFromToken` | UUID |
| `getUserIdFromToken` | UUID |
| `getEmployeeIdFromToken` | UUID |
| `getLocationIdFromToken` | UUID |
| `getDepartmentIdFromToken` | UUID |
| `getTeamIdFromToken` | UUID |
| `getAppCodeFromToken` | String |
| `getPermissionsFromToken` | Set&lt;String&gt; |
| `getPermissionScopesFromToken` | Map&lt;String, RoleScope&gt; |
| `getRolesFromToken` | Set&lt;String&gt; |
| `getAccessibleAppsFromToken` | Set&lt;String&gt; |
| `isImpersonationToken` | boolean |

---

## 3. DataScopeService

**File:** `backend/src/main/java/com/hrms/common/security/DataScopeService.java`
**Role:** Generates JPA `Specification<T>` predicates that enforce row-level data access based on the user's permission scope. Implements Keka-style application-layer RLS.

### Scope Hierarchy

From most to least permissive:

```
ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM
```

### Core Method: `getScopeSpecification(String permission)`

Given a permission string (e.g., `"ATTENDANCE:VIEW_ALL"`), returns a JPA `Specification<T>` that filters query results:

1. **SuperAdmin bypass:** Returns `cb.conjunction()` (no filter) if `SecurityContext.isSuperAdmin()` is true
2. **Scope lookup:** Gets the user's `RoleScope` for the permission via `SecurityContext.getPermissionScope(permission)`
3. **No scope found:** Returns `cb.disjunction()` (match nothing)
4. **System admin or ALL scope:** Returns `cb.conjunction()` (no filter)
5. **Scoped filtering:** Delegates to scope-specific predicate builders

### Scope Predicate Builders

**LOCATION scope (`getLocationPredicate`):**
- Filters by `officeLocationId` or `locationId` field
- Supports multiple locations via `SecurityContext.getCurrentLocationIds()`
- Falls back to single location via `SecurityContext.getCurrentLocationId()`

**DEPARTMENT scope (`getDepartmentPredicate`):**
- Filters by `departmentId` or `department.id` field
- Uses `SecurityContext.getCurrentDepartmentId()`

**TEAM scope (`getTeamPredicate`):**
- Includes the user's own data AND all direct/indirect reportees
- Gets reportee IDs from `SecurityContext.getAllReporteeIds()`
- Checks multiple ownership fields: `employeeId`, `employee.id`, `managerId`, `hiringManagerId`, `assignedRecruiterId`, `interviewerId`, `createdBy`
- Falls back to department scope if no team fields found on the entity

**SELF scope (`getSelfPredicate`):**
- Restricts to the user's own data only
- Checks: `createdBy`, `userId`, `user.id`, `employeeId`, `employee.id`, `hiringManagerId`, `assignedRecruiterId`, `interviewerId`, `signerId`

**CUSTOM scope (`getCustomPredicate`):**
- Filters by explicitly configured targets from `SecurityContext`:
  - Custom employee IDs
  - Custom department IDs
  - Custom location IDs
- Always includes user's own data
- Falls back to SELF if no custom targets configured

### Error Handling

Uses `tryAddPredicate()` to safely attempt adding predicates. When a field does not exist on an entity (e.g., trying `locationId` on a table that does not have it), the `IllegalArgumentException` is caught and logged at DEBUG level. This allows the same generic scope logic to work across different entity types.

### Usage Pattern

Controllers use it like this:
```java
Specification<LeaveRequest> scopeSpec = dataScopeService.getScopeSpecification(Permission.LEAVE_VIEW_ALL);
Page<LeaveRequest> results = repository.findAll(scopeSpec, pageable);
```

Or combined with business filters:
```java
Specification<T> combined = dataScopeService.getScopeSpecificationWith(permission, additionalSpec);
```

---

## 4. WorkflowService (Approval Engine)

**File:** `backend/src/main/java/com/hrms/application/workflow/service/WorkflowService.java`
**Role:** Generic, data-driven approval workflow engine. Manages workflow definitions, executions, step progression, delegation, and approval inbox.

### Domain Model

```
WorkflowDefinition (tenant-scoped template)
  -> ApprovalStep[] (ordered steps within a workflow)

WorkflowExecution (runtime instance tied to an entity)
  -> StepExecution[] (runtime state of each approval step)

ApprovalDelegate (delegation rules)
WorkflowRule (conditional routing -- repository present but not heavily used yet)
```

### Workflow Definition Management

**Create (`createWorkflowDefinition`):**
- Validates name uniqueness within tenant
- Supports configurable properties:
  - `entityType` -- what this workflow applies to (LEAVE_REQUEST, EXPENSE_CLAIM, etc.)
  - `workflowType` -- classification
  - `departmentId`, `locationId` -- scoping to specific org units
  - `applicableGrades` -- employee level filter
  - `minAmount`, `maxAmount` -- amount-based routing
  - `defaultSlaHours`, `escalationEnabled`, `escalationAfterHours`
  - `notifyOnSubmission/Approval/Rejection/Escalation`
  - `allowParallelApproval`, `autoApproveEnabled`, `skipLevelAllowed`
- Handles default workflow: unsets existing default for the same entity type
- Each step supports: `approverType`, `specificUserId`, `roleId`, `hierarchyLevel`, `approverExpression`, SLA, escalation, delegation, comments/attachments requirements

**Update (`updateWorkflowDefinition`):**
- If active executions exist, creates a **new version** rather than modifying in-place (versioned workflow definitions)
- Deactivates the old version and creates a new one

### Workflow Execution

**Start (`startWorkflow`):**
1. Finds applicable workflow via priority: specific ID -> amount range -> department -> default
2. Checks for existing active execution for the same entity (prevents duplicates)
3. Creates `WorkflowExecution` with status `PENDING`
4. Calculates deadline from SLA hours
5. Creates first `StepExecution` and assigns an approver
6. Publishes `ApprovalTaskAssignedEvent` via Kafka

**Approver Determination (`determineApprover`):**

Resolves approver based on `ApproverType`:
| Type | Resolution |
|------|------------|
| `SPECIFIC_USER` | Direct UUID from step config |
| `REPORTING_MANAGER` | Employee's `managerId` |
| `DEPARTMENT_HEAD` | Department's `managerId` |
| `HR_MANAGER` | First user with `HR_MANAGER` role code |
| `FINANCE_MANAGER` | First user with `FINANCE_MANAGER` role code |
| `CEO` | First user with `CEO` role code |
| `ROLE` / `ANY_OF_ROLE` | First user with specified `roleId` |

After resolution, checks for active **delegation** (`checkDelegation`): if the resolved approver has an active delegation for today's date, the delegate becomes the actual assignee.

### Approval Actions (`processApprovalAction`)

Supports six actions:

| Action | Effect |
|--------|--------|
| `APPROVE` | Marks step as approved, advances to next step or completes workflow |
| `REJECT` | Marks step as rejected, sets workflow status to REJECTED |
| `RETURN_FOR_MODIFICATION` | Marks step as returned, sets workflow to RETURNED |
| `DELEGATE` | Re-assigns step to another user (if delegation allowed) |
| `HOLD` | Sets workflow status to ON_HOLD |

**Idempotency guards:**
- Rejects action if workflow is already in a terminal state
- Rejects action if the specific step is already acted upon
- Validates the current user is authorized to act on the step

**Step advancement (`advanceToNextStep`):**
- If last step: marks workflow as APPROVED
- Otherwise: creates next `StepExecution`, assigns approver, publishes `ApprovalTaskAssignedEvent`
- All actions are audit-logged via `AuditLogService`

### Approval Inbox

`getApprovalInbox()` provides paginated, server-side filtered inbox:
- Filters: status, module (entity type), date range, search term
- Returns `Page<WorkflowExecutionResponse>`

`getInboxCounts()` returns summary:
- `pending`: total pending approvals for current user
- `approvedToday`: actions taken today
- `rejectedToday`: rejections today

### Delegation System

- Create delegation with date range, entity type scope, department scope, max approval amount
- Active delegations are checked during approver resolution
- Delegator can revoke at any time
- Supports `canSubDelegate`, notification preferences, expiry warnings

### Domain Events Published

| Event | When |
|-------|------|
| `ApprovalTaskAssignedEvent` | New step created (first step or after advance) |
| `ApprovalDecisionEvent` | APPROVE or REJECT action processed |

---

## 5. PayrollRunService

**File:** `backend/src/main/java/com/hrms/application/payroll/service/PayrollRunService.java`
**Role:** Manages the payroll run lifecycle with strict state machine transitions and concurrency protection.

### Payroll State Machine

```
DRAFT -> PROCESSED -> APPROVED -> LOCKED
```

Each transition is enforced by domain methods on `PayrollRun` (e.g., `process()`, `approve()`, `lock()`) which throw `IllegalStateException` if the current state does not match the expected pre-condition.

### Concurrency Protection

All state-transition methods use **pessimistic locking** with `REPEATABLE_READ` isolation:

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public PayrollRun processPayrollRun(UUID id, UUID processedBy) {
    PayrollRun payrollRun = getPayrollRunForUpdate(id);  // SELECT ... FOR UPDATE
    payrollRun.process(processedBy);
    return payrollRunRepository.save(payrollRun);
}
```

`getPayrollRunForUpdate()` calls `findByIdAndTenantIdForUpdate()` which uses a `@Lock(LockModeType.PESSIMISTIC_WRITE)` JPA query. This prevents:
- Two concurrent requests both seeing the run in DRAFT and both trying to process it
- Race conditions during creation (duplicate period prevention)
- Concurrent approval/locking of the same run

### Key Operations

| Operation | Isolation | Lock | Guard |
|-----------|-----------|------|-------|
| Create payroll run | REPEATABLE_READ | `findByTenantIdAndPeriodForUpdate` | Rejects duplicate period |
| Update payroll run | REPEATABLE_READ | Standard find | Cannot update if LOCKED |
| Process (DRAFT -> PROCESSED) | REPEATABLE_READ | `FOR UPDATE` | Domain state check |
| Approve (PROCESSED -> APPROVED) | REPEATABLE_READ | `FOR UPDATE` | Domain state check |
| Lock (APPROVED -> LOCKED) | REPEATABLE_READ | `FOR UPDATE` | Domain state check |
| Delete | REPEATABLE_READ | Standard find | Cannot delete if LOCKED |

### Tenant Isolation

Every query is scoped by `TenantContext.getCurrentTenant()`. The `findById` calls include a tenant ID filter to prevent cross-tenant access even if a UUID is guessed.

### Note on SpEL Engine

The SpEL-based payroll computation engine (formula evaluation, DAG-ordered component calculation) is implemented in a separate service (`PayrollCalculationService` or similar). The `PayrollRunService` handles the lifecycle and state management, while the actual salary computation with Spring Expression Language runs during the `process()` transition. The DAG ensures components like HRA (which depends on Basic) are evaluated in the correct dependency order, all within a single database transaction.
