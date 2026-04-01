# RBAC KEKA Parity — Design Specification

**Date:** 2026-03-21
**Status:** Approved (Rev 2 — post-review fixes)
**Author:** Architecture Team
**Scope:** Implicit Roles, Role Hierarchy Inheritance, Auto-Escalation
**Review:** Spec review completed; all CRITICAL and IMPORTANT issues addressed.

---

## 1. Problem Statement

The RBAC comparison between NU-AURA and KEKA HRMS identified three gaps where KEKA leads:

1. **Implicit Roles** — KEKA auto-assigns organizational roles (Reporting Manager, Department Head, L2 Manager) from the org chart. NU-AURA requires manual role assignment.
2. **Role Hierarchy Inheritance** — KEKA's Global Admin inherits all permissions implicitly. NU-AURA has no parent-child role inheritance; every role must have all permissions explicitly assigned.
3. **Auto-Escalation** — KEKA supports auto-approval timeouts when approvers don't act. NU-AURA approval tasks remain pending indefinitely.

### What Already Exists (95% Infrastructure)

- `RoleScope` enum: ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM (with `getRank()` ordering)
- `RolePermission` entity with scope + `CustomScopeTarget` for fine-grained scoping
- `SecurityContext` with scope-aware permission checks and `getAllReporteeIds()`
- Role management admin UI at `/admin/roles/` with scope selector
- `ApprovalStep` with approver types: `REPORTING_MANAGER`, `DEPARTMENT_HEAD`, `SKIP_LEVEL_MANAGER`, `ROLE`, `COMMITTEE`, `DYNAMIC`, etc.
- `StepExecution` entity already has `escalated` (boolean), `escalatedAt`, `escalatedToUserId`, status `ESCALATED`
- Employee entity with `managerId`, `dottedLineManager1Id`, `dottedLineManager2Id`, `departmentId`
- Department entity with `managerId` (department head) and `parentDepartmentId`
- `employee-lifecycle-events` Kafka topic with `EmployeeLifecycleEvent` — metadata for `TRANSFERRED` includes `oldReportingManager`, `oldDepartment`
- Redis-cached permission loading via `SecurityService.getCachedPermissions()`

### What's Missing

- `implicit_role_rules` and `implicit_user_roles` tables + engine
- `parent_role_id` on `roles` table for inheritance
- `approval_escalation_config` table + scheduled escalation job
- User-keyed permission cache (current cache is role-set-keyed)

---

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Role model | Hybrid: separate `implicit_user_roles` table, merged at permission-check time | Clean audit separation, unified enforcement |
| Event model | Kafka consumer on `nu-aura.employee-lifecycle` | Leverages existing topic (events already include `oldReportingManager` in metadata), sub-second propagation, decoupled from employee CRUD |
| Inheritance | `parent_role_id` on `roles` + Redis flattened cache | Runtime flexibility + zero-overhead permission checks |
| Escalation | `@Scheduled` job every 15 minutes | Simple, reliable; `StepExecution` already has escalation fields |
| Escalation action | Auto-escalate to skip-level manager | Safer than auto-approve; respects approval chain integrity |
| Cache key | User-keyed: `permissions:{tenantId}:{userId}` | Required because two users with same explicit roles can have different implicit roles |

---

## 3. Data Model

### 3.1 New Table: `implicit_role_rules`

```sql
CREATE TABLE implicit_role_rules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    rule_name         VARCHAR(255) NOT NULL,
    description       TEXT,
    condition_type    VARCHAR(50) NOT NULL,
    target_role_id    UUID NOT NULL,
    scope             VARCHAR(20) NOT NULL DEFAULT 'TEAM',
    priority          INT NOT NULL DEFAULT 0 CHECK (priority >= 0),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_irr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_irr_role FOREIGN KEY (target_role_id) REFERENCES roles(id),
    CONSTRAINT uk_implicit_rule UNIQUE (tenant_id, condition_type, target_role_id)
);

CREATE INDEX idx_irr_tenant_active ON implicit_role_rules(tenant_id, is_active);
CREATE INDEX idx_irr_target_role ON implicit_role_rules(target_role_id, is_active);

-- RLS policy
ALTER TABLE implicit_role_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_implicit_role_rules ON implicit_role_rules
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**Condition Types (enum `ImplicitRoleCondition`):**
- `IS_REPORTING_MANAGER` — `SELECT COUNT(*) FROM employees WHERE manager_id = :employeeId AND tenant_id = :tenantId AND is_deleted = false` > 0
- `IS_DEPARTMENT_HEAD` — `SELECT COUNT(*) FROM departments WHERE manager_id = :employeeId AND tenant_id = :tenantId AND is_deleted = false` > 0
- `IS_SKIP_LEVEL_MANAGER` — Has direct reports who themselves have direct reports (2-level query)
- `HAS_DIRECT_REPORTS` — Alias for `IS_REPORTING_MANAGER`
- `CUSTOM_EXPRESSION` — SpEL expression (future; not implemented in Phase 1)

### 3.2 New Table: `implicit_user_roles`

```sql
CREATE TABLE implicit_user_roles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    user_id                 UUID NOT NULL,
    role_id                 UUID NOT NULL,
    scope                   VARCHAR(20) NOT NULL,
    derived_from_rule_id    UUID NOT NULL,
    derived_from_context    VARCHAR(500),
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT fk_iur_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_iur_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_iur_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_iur_rule FOREIGN KEY (derived_from_rule_id) REFERENCES implicit_role_rules(id),
    CONSTRAINT uk_implicit_user_role UNIQUE (tenant_id, user_id, role_id, scope)
);

CREATE INDEX idx_iur_user_active ON implicit_user_roles(user_id, is_active);
CREATE INDEX idx_iur_tenant_active ON implicit_user_roles(tenant_id, is_active);

ALTER TABLE implicit_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_implicit_user_roles ON implicit_user_roles
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

### 3.3 New Table: `approval_escalation_config`

```sql
CREATE TABLE approval_escalation_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL,
    workflow_definition_id  UUID NOT NULL,
    timeout_hours           INT NOT NULL DEFAULT 48 CHECK (timeout_hours > 0),
    escalation_type         VARCHAR(30) NOT NULL DEFAULT 'SKIP_LEVEL_MANAGER',
    fallback_role_id        UUID,
    fallback_user_id        UUID,
    max_escalations         INT NOT NULL DEFAULT 2 CHECK (max_escalations >= 1 AND max_escalations <= 10),
    notify_on_escalation    BOOLEAN NOT NULL DEFAULT TRUE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_aec_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_aec_workflow FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id),
    CONSTRAINT fk_aec_fallback_role FOREIGN KEY (fallback_role_id) REFERENCES roles(id),
    CONSTRAINT fk_aec_fallback_user FOREIGN KEY (fallback_user_id) REFERENCES users(id),
    CONSTRAINT uk_escalation_workflow UNIQUE (tenant_id, workflow_definition_id)
);

ALTER TABLE approval_escalation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_approval_escalation_config ON approval_escalation_config
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**Escalation Types (enum `EscalationType`):**
- `SKIP_LEVEL_MANAGER` — Escalate to the original approver's manager
- `DEPARTMENT_HEAD` — Escalate to the requester's department head
- `SPECIFIC_ROLE` — Escalate to anyone with `fallback_role_id`
- `SPECIFIC_USER` — Escalate to `fallback_user_id`

### 3.4 Altered Table: `roles`

```sql
ALTER TABLE roles ADD COLUMN parent_role_id UUID;
ALTER TABLE roles ADD CONSTRAINT fk_roles_parent FOREIGN KEY (parent_role_id) REFERENCES roles(id);
CREATE INDEX idx_roles_parent ON roles(parent_role_id) WHERE parent_role_id IS NOT NULL;
```

### 3.5 No Changes to `step_executions`

The `step_executions` table **already has** escalation fields:
- `escalated` (boolean), `escalated_at` (timestamp), `escalated_to_user_id` (UUID)
- Status enum already includes `ESCALATED`
- `reminder_count` and `last_reminder_sent_at` for tracking

No schema changes needed. The escalation job will use the existing fields.

---

## 4. Implicit Role Engine

### 4.1 Kafka Consumer: `ImplicitRoleConsumer`

**Topic:** `employee-lifecycle-events`
**Consumer Group:** `nu-aura-implicit-roles-service`

**Events consumed and cascade logic:**

| Event | Recompute For |
|-------|---------------|
| `HIRED` | New employee only (unlikely to trigger rules initially) |
| `PROMOTED` | Employee (may gain/lose hierarchy position) |
| `TRANSFERRED` | Employee + old manager (via `metadata.oldReportingManager`) + new manager (via `managerId`) + old dept head (via `metadata.oldDepartment` → dept.managerId) + new dept head (via `departmentId` → dept.managerId) |
| `OFFBOARDED` | Former manager (may lose MANAGER role if no other reports) + former dept head (if was dept head) |

**Key:** The `TRANSFERRED` event's `metadata` map already includes `oldReportingManager` and `oldDepartment` — no Kafka payload changes needed.

### 4.2 Recomputation Service: `ImplicitRoleEngine`

```
recompute(userId: UUID, tenantId: UUID):
  1. Find employeeId for userId (users.employee_id FK)
  2. Load all active implicit_role_rules WHERE tenant_id = :tenantId AND is_active = true
  3. For each rule, evaluate condition:
     IS_REPORTING_MANAGER / HAS_DIRECT_REPORTS:
       SELECT COUNT(*) FROM employees
       WHERE manager_id = :employeeId AND tenant_id = :tenantId AND is_deleted = false
     IS_DEPARTMENT_HEAD:
       SELECT COUNT(*) FROM departments
       WHERE manager_id = :employeeId AND tenant_id = :tenantId AND is_deleted = false
     IS_SKIP_LEVEL_MANAGER:
       SELECT EXISTS(
         SELECT 1 FROM employees e1
         WHERE e1.manager_id = :employeeId AND e1.tenant_id = :tenantId AND e1.is_deleted = false
         AND EXISTS(
           SELECT 1 FROM employees e2
           WHERE e2.manager_id = e1.id AND e2.tenant_id = :tenantId AND e2.is_deleted = false
         )
       )
  4. Compute desired: Set<(roleId, scope, ruleId, contextDescription)>
  5. Load current: SELECT * FROM implicit_user_roles WHERE user_id = :userId AND tenant_id = :tenantId AND is_active = true
  6. Diff:
     - New: INSERT into implicit_user_roles (is_active = true, computed_at = NOW())
     - Removed: UPDATE SET is_active = false, computed_at = NOW()
     - Unchanged: no-op
  7. If any changes:
     - DEL Redis key: "permissions:{tenantId}:{userId}"
     - Publish audit event to audit-events with change details
  8. Return ImplicitRoleChangeResult (added, removed, unchanged counts)
```

**Recompute-all (admin action):**
```
recomputeAll(tenantId: UUID):
  allEmployeeUserIds = SELECT u.id FROM users u JOIN employees e ON u.employee_id = e.id WHERE u.tenant_id = :tenantId
  for each userId in allEmployeeUserIds:
    recompute(userId, tenantId)
  Return total change summary
```

### 4.3 Permission Merge in SecurityService

**Cache key change:** `permissions:{tenantId}:{userId}` (currently role-set-keyed, must become user-keyed).

**Modified `getCachedPermissions(userId, tenantId, roleCodes)`:**
1. Check Redis: `GET permissions:{tenantId}:{userId}`
2. If cache miss:
   a. Load explicit role permissions (existing logic via roleCodes)
   b. For each explicit role, walk `parent_role_id` chain and union inherited permissions (max scope wins)
   c. Load `implicit_user_roles` WHERE `user_id = :userId AND tenant_id = :tenantId AND is_active = true`
   d. For each implicit role, load its permissions (including inherited via parent_role_id)
   e. Merge all additively: for duplicate permission codes, take MAX scope via `RoleScope.getRank()`
   f. Cache in Redis with 1-hour TTL
3. Return merged permission map

**Cache invalidation triggers:**
- Implicit role recomputation (Step 4.2 #7)
- Explicit role assignment/removal (existing `@CacheEvict`)
- Role permission change → invalidate all users with that role (existing `allEntries=true` is safe; document that for 10K+ users this is O(1) Redis `FLUSHDB` not O(N))
- `parent_role_id` change → recursive CTE to find child roles + invalidate all users with affected roles

**Recursive CTE for child roles (tenant-scoped):**
```sql
WITH RECURSIVE children AS (
  SELECT id FROM roles WHERE parent_role_id = :roleId AND tenant_id = :tenantId
  UNION ALL
  SELECT r.id FROM roles r
  INNER JOIN children c ON r.parent_role_id = c.id
  WHERE r.tenant_id = :tenantId
)
SELECT id FROM children LIMIT 100;  -- depth safety limit
```

---

## 5. Role Hierarchy Inheritance

### 5.1 Flattened Permission Loading

```
getEffectivePermissions(role):
  permissions = role.permissions  // direct
  current = role
  visited = Set(role.id)  // cycle detection
  while current.parentRoleId != null:
    if visited.size() >= 10:
      log.warn("Role hierarchy depth exceeded 10 for role {}", role.code)
      break
    current = roleRepository.findById(current.parentRoleId)
    if current == null OR current.id in visited:
      log.warn("Circular reference or missing parent for role {}", role.code)
      break
    visited.add(current.id)
    permissions = merge(permissions, current.permissions)  // max scope wins
  return permissions
```

### 5.2 Cycle Detection on Save

```java
@Transactional
public void updateParentRole(UUID roleId, UUID newParentId, UUID tenantId) {
    if (newParentId == null) { /* clear parent, save */ return; }
    if (roleId.equals(newParentId)) throw new CircularReferenceException("Role cannot be its own parent");

    UUID current = newParentId;
    int depth = 0;
    while (current != null && depth < 10) {
        if (current.equals(roleId)) throw new CircularReferenceException("Circular role hierarchy detected");
        Role parent = roleRepository.findByIdAndTenantId(current, tenantId)
            .orElseThrow(() -> new EntityNotFoundException("Parent role not found"));
        current = parent.getParentRoleId();
        depth++;
    }
    // Safe to save
}
```

---

## 6. Auto-Escalation

### 6.1 Scheduled Job: `ApprovalEscalationJob`

**Schedule:** Every 15 minutes (`@Scheduled(fixedRate = 900000)`)
**Existing infrastructure:** `StepExecution.escalated`, `escalatedAt`, `escalatedToUserId`, status `ESCALATED`

```
@Scheduled(fixedRate = 900000)
run():
  tenants = tenantRepository.findAllActive()
  for each tenant:
    TenantContext.set(tenant.id)
    try:
      staleSteps = stepExecutionRepository.findStaleForEscalation(tenant.id)
      // Query: SELECT se.* FROM step_executions se
      //   JOIN workflow_executions we ON se.workflow_execution_id = we.id
      //   JOIN approval_escalation_config aec ON we.workflow_definition_id = aec.workflow_definition_id
      //   WHERE se.status = 'PENDING'
      //     AND se.tenant_id = :tenantId
      //     AND aec.is_active = true
      //     AND aec.tenant_id = :tenantId
      //     AND se.assigned_at < NOW() - (aec.timeout_hours * INTERVAL '1 hour')
      //     AND COALESCE(se.reminder_count, 0) < aec.max_escalations

      for each staleStep:
        target = resolveEscalationTarget(staleStep, config)
        if target == null OR target.isDeleted OR target.status == 'TERMINATED':
          // Fallback: try next escalation type, or notify HR Admin
          target = resolveFallbackTarget(staleStep, config, tenant.id)
        if target != null:
          staleStep.setStatus(ESCALATED)
          staleStep.setEscalated(true)
          staleStep.setEscalatedAt(Instant.now())
          staleStep.setEscalatedToUserId(target.id)
          staleStep.setReminderCount(staleStep.getReminderCount() + 1)
          stepExecutionRepository.save(staleStep)

          // Create new PENDING step for the escalation target
          newStep = StepExecution.builder()
            .workflowExecution(staleStep.getWorkflowExecution())
            .approvalStep(staleStep.getApprovalStep())
            .status(PENDING)
            .assignedToUserId(target.id)
            .assignedAt(Instant.now())
            .stepName("Escalated: " + staleStep.getStepName())
            .build()
          stepExecutionRepository.save(newStep)

          if config.notifyOnEscalation:
            kafkaTemplate.send("notification-events", NotificationEvent.escalation(staleStep, target))
          kafkaTemplate.send("audit-events", AuditEvent.escalation(staleStep, target))
    finally:
      TenantContext.clear()
```

### 6.2 Escalation Target Resolution

```
resolveEscalationTarget(step, config):
  switch config.escalationType:
    SKIP_LEVEL_MANAGER:
      approver = userRepository.findById(step.assignedToUserId)
      approverEmployee = employeeRepository.findByUserId(approver.id)
      if approverEmployee.managerId == null: return null
      managerEmployee = employeeRepository.findById(approverEmployee.managerId)
      return userRepository.findByEmployeeId(managerEmployee.id)
    DEPARTMENT_HEAD:
      requester = workflowExecution.requestedByUser
      requesterEmployee = employeeRepository.findByUserId(requester.id)
      department = departmentRepository.findById(requesterEmployee.departmentId)
      if department.managerId == null: return null
      return userRepository.findByEmployeeId(department.managerId)
    SPECIFIC_ROLE:
      return userRepository.findFirstByRoleAndTenantId(config.fallbackRoleId, config.tenantId)
    SPECIFIC_USER:
      return userRepository.findById(config.fallbackUserId)

resolveFallbackTarget(step, config, tenantId):
  // If primary target is null/deleted, try HR_MANAGER role as fallback
  hrManagers = userRepository.findByRoleCodeAndTenantId("HR_MANAGER", tenantId)
  return hrManagers.isEmpty() ? null : hrManagers.get(0)
```

---

## 7. Frontend Changes

### 7.1 New Page: `/admin/implicit-roles/page.tsx`

CRUD for implicit role rules with:
- Table: Rule Name, Condition Type, Target Role, Scope, Active toggle, Actions
- Create/Edit modal: Rule name, Condition type dropdown, Target role dropdown, Scope dropdown
- Preview panel: "This rule currently affects X users" (calls `/affected-users` endpoint)
- Bulk actions: Activate/Deactivate selected rules

### 7.2 Enhanced: User Detail / Employee Profile

New "Role Assignment" panel showing:
- **Assigned Roles** — Existing explicit roles (editable)
- **Implicit Roles** — Auto-assigned roles with badge "Auto-assigned: {derived_from_context}" (read-only)

### 7.3 Enhanced: `/admin/roles/page.tsx`

New "Parent Role" dropdown in role create/edit form. When parent selected, show "Inherited Permissions" as grayed-out read-only entries labeled "(inherited from {parentRoleName})". Descendants excluded from dropdown to prevent cycles.

### 7.4 Enhanced: Workflow Definition Edit

New "Escalation Settings" section: enable toggle, timeout hours, escalation target type, conditional role/user picker, max escalations, notify checkbox.

---

## 8. Migration Plan

### V48 — Schema Changes

All SQL provided in Section 3 above. Single migration file containing:
1. `CREATE TABLE implicit_role_rules` with RLS
2. `CREATE TABLE implicit_user_roles` with RLS
3. `CREATE TABLE approval_escalation_config` with RLS
4. `ALTER TABLE roles ADD COLUMN parent_role_id`
5. All indexes and constraints as specified

### V49 — Seed Data

```sql
-- Seed implicit role rules for NuLogic demo tenant
INSERT INTO implicit_role_rules (tenant_id, rule_name, description, condition_type, target_role_id, scope, priority)
SELECT
  '660e8400-e29b-41d4-a716-446655440001',
  'Reporting Managers get MANAGER role',
  'Auto-assigns MANAGER role with TEAM scope to any employee who has direct reports',
  'IS_REPORTING_MANAGER',
  r.id,
  'TEAM',
  10
FROM roles r WHERE r.code = 'MANAGER' AND r.tenant_id = '660e8400-e29b-41d4-a716-446655440001';

INSERT INTO implicit_role_rules (tenant_id, rule_name, description, condition_type, target_role_id, scope, priority)
SELECT
  '660e8400-e29b-41d4-a716-446655440001',
  'Department Heads get DEPARTMENT_HEAD role',
  'Auto-assigns DEPARTMENT_HEAD role with DEPARTMENT scope to department managers',
  'IS_DEPARTMENT_HEAD',
  r.id,
  'DEPARTMENT',
  20
FROM roles r WHERE r.code = 'DEPARTMENT_HEAD' AND r.tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Seed role hierarchy: MANAGER -> TEAM_LEAD -> EMPLOYEE
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE code = 'TEAM_LEAD' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001')
WHERE code = 'MANAGER' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE code = 'EMPLOYEE' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001')
WHERE code = 'TEAM_LEAD' AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Seed escalation config for leave and expense workflows (48h timeout)
INSERT INTO approval_escalation_config (tenant_id, workflow_definition_id, timeout_hours, escalation_type, max_escalations)
SELECT
  '660e8400-e29b-41d4-a716-446655440001',
  wd.id,
  48,
  'SKIP_LEVEL_MANAGER',
  2
FROM workflow_definitions wd
WHERE wd.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND wd.entity_type IN ('LEAVE_REQUEST', 'EXPENSE_CLAIM');
```

---

## 9. API Endpoints

### Implicit Role Rules

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/implicit-role-rules?page=0&size=20&active=true&sortBy=priority` | `ROLE:MANAGE` | List rules (paginated, filterable) |
| POST | `/api/v1/implicit-role-rules` | `ROLE:MANAGE` | Create rule |
| PUT | `/api/v1/implicit-role-rules/{id}` | `ROLE:MANAGE` | Update rule |
| DELETE | `/api/v1/implicit-role-rules/{id}` | `ROLE:MANAGE` | Delete rule |
| GET | `/api/v1/implicit-role-rules/{id}/affected-users` | `ROLE:MANAGE` | Preview affected user count |
| POST | `/api/v1/implicit-role-rules/recompute-all?ruleId={optional}` | `ROLE:MANAGE` | Trigger recomputation (all or per-rule) |
| POST | `/api/v1/implicit-role-rules/bulk-activate` | `ROLE:MANAGE` | Bulk activate rules (body: `{ruleIds: [...]}`) |
| POST | `/api/v1/implicit-role-rules/bulk-deactivate` | `ROLE:MANAGE` | Bulk deactivate rules (body: `{ruleIds: [...]}`) |

### Implicit User Roles (read-only)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/users/{userId}/implicit-roles` | `ROLE:READ` | Get user's implicit roles |
| GET | `/api/v1/implicit-user-roles?page=0&size=20` | `ROLE:MANAGE` | List all assignments (paginated) |

### Escalation Config

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/workflows/{workflowId}/escalation-config` | `APPROVAL:READ` | Get escalation config |
| PUT | `/api/v1/workflows/{workflowId}/escalation-config` | `APPROVAL:MANAGE` | Create/update config |
| DELETE | `/api/v1/workflows/{workflowId}/escalation-config` | `APPROVAL:MANAGE` | Remove config |
| POST | `/api/v1/workflows/{workflowId}/escalate-pending?dryRun=true` | `APPROVAL:MANAGE` | Manual escalation trigger (dryRun=true previews) |

### Role Hierarchy (enhanced existing)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| PUT | `/api/v1/roles/{id}` | `ROLE:MANAGE` | Now accepts `parentRoleId` field |
| GET | `/api/v1/roles/{id}/effective-permissions` | `ROLE:READ` | Flattened permissions including inherited |

---

## 10. Testing Strategy

### Unit Tests
- `ImplicitRoleEngineTest`: Rule evaluation for each condition type, cascade recomputation for old/new manager, diff logic (add/remove/unchanged)
- `RoleHierarchyServiceTest`: Permission flattening, cycle detection, max depth enforcement, cache invalidation cascade with tenant-scoped CTE
- `ApprovalEscalationJobTest`: Stale task detection with tenant filtering, escalation target resolution, max escalation limit, fallback to HR_MANAGER when target deleted/terminated
- `SecurityServiceTest`: Permission merge (explicit + implicit + inherited), scope ranking, user-keyed cache

### Integration Tests
- Full lifecycle: Create employee with manager → verify implicit MANAGER role → change manager → verify old manager loses role (if no other reports) → verify new manager gains role
- Role hierarchy: Create MANAGER with parent EMPLOYEE → verify inherited permissions in `getCachedPermissions()`
- Escalation: Create approval task → wait timeout → verify step_execution updated with escalated=true + new PENDING step created

### Edge Cases
- Employee is both reporting manager AND department head (gets both implicit roles)
- Circular role hierarchy attempt (should throw `CircularReferenceException`)
- Manager terminated while having pending implicit roles (deactivate all implicit roles for user)
- Escalation with deleted/terminated target (fallback to HR_MANAGER)
- Redis unavailable during cache invalidation: log warning, set short TTL on next cache write (5 min instead of 1 hour) so stale data self-heals
- Self-referential dept head: employee is head of dept D, then transfers out — verify dept head role removed
- Recompute-all for large tenant (1000+ employees): batch in groups of 50, use `@Async` to parallelize
- Kafka consumer restart: idempotent recomputation (diff-based, not blind overwrite)

---

## 11. Performance Considerations

- **Implicit role recomputation:** O(rules * 1 SQL query) per user. ~5 rules, each query hits indexed columns → sub-100ms per user
- **Permission cache:** User-keyed adds more Redis entries than role-set-keyed. For 1000 users: 1000 cache entries vs. ~10 role-set entries. Redis handles millions of keys trivially. TTL: 1 hour
- **Escalation job:** Runs every 15 minutes, queries indexed columns (`status`, `assigned_at`, `tenant_id`). Handles 10K+ pending tasks efficiently
- **Role hierarchy flattening:** Max depth 10. Cached in Redis per-user. Only recomputed on role change or cache miss
- **Bulk recompute-all:** Batched in groups of 50, parallelized with `@Async`. For 1000 users: ~20 batches × 100ms = 2 seconds

---

## 12. Rollout Plan

1. **Phase 1 (V48-V49 migrations):** Schema + seed data. No behavior change. Behind `enable_implicit_roles` feature flag.
2. **Phase 2 (Backend):** ImplicitRoleEngine + Kafka consumer, role hierarchy service, escalation job. Feature-flagged.
3. **Phase 3 (Frontend):** Admin UI for implicit rules, role hierarchy UI, escalation config UI.
4. **Phase 4 (Go-live):** Enable feature flag for demo tenant → QA sweep → production rollout.
