---
name: nu-permission
description: Use when asked to add a permission, wire RBAC, create a new permission for a module, or when creating any new endpoint that needs authorization. Wires permissions across all 4 layers (backend constant, controller annotation, frontend constant, database seed) in one shot.
---

# RBAC Permission Wiring

## Autonomy Contract

- **Runs without further prompts** once invoked. Infer module + action from the request; ask at most
  ONE clarifying question only if the permission key is ambiguous.
- **Halts autonomously** when all 4 layers are wired: backend constant, controller annotation,
  frontend constant, and database seed (Flyway migration appended or new `V{next}__` file written).
- **Never invokes another skill.** Does not call `nu-chrome-e2e`, `nu-migration`, or `skill-management`.
- **Single concern:** RBAC wiring only. Schema changes go through `nu-migration`; end-to-end RBAC
  verification (URL + DOM + negative API 403) is the job of `nu-chrome-e2e`.

> **Purpose:** Wire a new permission across ALL 4 layers of the NU-AURA RBAC system in a single
> pass.
> Prevents the common bug where a permission exists in one layer but is missing in another.
> Every endpoint in NU-AURA must be protected by `@RequiresPermission` -- this skill ensures the
> full chain is connected.

## When to Use

- User says "add permission", "wire RBAC", "new permission for X"
- Creating any new API endpoint (every endpoint needs `@RequiresPermission`)
- Adding a new module or feature that needs authorization
- Fixing "403 Forbidden" errors caused by missing permission wiring

## Input Required

- **Module name**: The domain area (e.g., `ASSET`, `TRAINING`, `RECRUITMENT`)
- **Action(s)**: What operations to permit (e.g., `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `MANAGE`,
  `APPROVE`)
- **Which roles** should get this permission by default (or ask user)
- **Endpoint(s)** that will use this permission (optional but recommended)

## Steps

### Step 1: Define the Permission Code

Follow the existing naming convention from `Permission.java`:

**Format:** `MODULE_ACTION` (constant name) = `"MODULE:ACTION"` (string value)

Examples from the codebase:

```java
public static final String EMPLOYEE_READ = "EMPLOYEE:READ";
public static final String PAYROLL_APPROVE = "PAYROLL:APPROVE";
public static final String KNOWLEDGE_WIKI_CREATE = "KNOWLEDGE:WIKI_CREATE";
public static final String HELPDESK_TICKET_ASSIGN = "HELPDESK:TICKET_ASSIGN";
```

Rules:

- Module name: UPPER_SNAKE_CASE, matches the domain area
- Action: typically one of `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `MANAGE`, `APPROVE`, `SUBMIT`,
  `ASSIGN`, `SIGN`
- `MANAGE` implies all CRUD operations for that module (frontend `usePermissions` checks this via
  hierarchy)
- Compound modules use underscore: `LEAVE_TYPE`, `LEAVE_BALANCE`, `OFFICE_LOCATION`, `FEEDBACK_360`

### Step 2: Add Backend Constant

**File:** `backend/src/main/java/com/hrms/common/security/Permission.java`

Add the constant in the appropriate section (grouped by module, alphabetical within group):

```java
// {Module Name}
public static final String {MODULE}_{ACTION} = "{MODULE}:{ACTION}";
```

If adding a new module section, add a comment header matching the existing style:

```java
// Asset Maintenance
public static final String ASSET_MAINTENANCE_VIEW = "ASSET_MAINTENANCE:VIEW";
public static final String ASSET_MAINTENANCE_CREATE = "ASSET_MAINTENANCE:CREATE";
public static final String ASSET_MAINTENANCE_MANAGE = "ASSET_MAINTENANCE:MANAGE";
```

Place new sections before the `private Permission()` constructor at the bottom of the file.

### Step 3: Annotate the Controller Endpoint

**File:** `backend/src/main/java/com/hrms/api/{module}/controller/{Module}Controller.java`

Add `@RequiresPermission` to the endpoint method:

```java
@RequiresPermission(Permission.{MODULE}_{ACTION})
@GetMapping("/{id}")
public ResponseEntity<ModuleDto> getById(@PathVariable UUID id) {
    // ...
}
```

Common patterns:

- `GET` (list/read) -> `Permission.MODULE_VIEW` or `Permission.MODULE_VIEW_ALL`
- `POST` (create) -> `Permission.MODULE_CREATE`
- `PUT` (update) -> `Permission.MODULE_UPDATE`
- `DELETE` (delete) -> `Permission.MODULE_DELETE`
- `POST /approve` -> `Permission.MODULE_APPROVE`
- Admin endpoints -> `Permission.MODULE_MANAGE`

**Note:** SuperAdmin bypasses ALL `@RequiresPermission` checks automatically via `PermissionAspect`.
This means during admin testing, missing permissions will not surface as errors -- always test with
a non-admin role.

### Step 4: Add Frontend Constant

**File:** `frontend/lib/hooks/usePermissions.ts`

Add to the `Permissions` object in the matching section:

```typescript
export const Permissions = {
  // ... existing permissions ...

  // {Module Name}
  {MODULE}_{ACTION}: '{MODULE}:{ACTION}',
} as const;
```

The string value MUST exactly match the backend `Permission.java` value. The frontend
`usePermissions` hook normalizes both `MODULE:ACTION` (colon, uppercase) and `module.action` (dot,
lowercase from DB) formats, so only the colon-uppercase format is needed here.

**Usage in components:**

```tsx
const { hasPermission } = usePermissions();

// Gate a button
{hasPermission(Permissions.MODULE_CREATE) && <Button>Create</Button>}

// Gate a route/section in sidebar (via menuSections.tsx)
{ label: 'Module', requiredPermission: Permissions.MODULE_VIEW }
```

### Step 5: Generate Database Seed Migration

**File:** `backend/src/main/resources/db/migration/V{N}__seed_{module}_permissions.sql`

Determine the next migration number by scanning existing files (see nu-migration skill).

Generate INSERT statements following the V96 canonical pattern:

```sql
-- V{N}: Seed {module} permissions

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '{MODULE}:{ACTION}', '{Module} {Action}', '{Description of what this permission allows}', '{module}', '{action}', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;
```

**Column mapping:**
| Column | Value | Example |
|--------|-------|---------|
| `code` | `MODULE:ACTION` (uppercase, colon-separated) | `ASSET_MAINTENANCE:VIEW` |
| `name` | Human-readable name | `Asset Maintenance View` |
| `description` | What the permission allows | `View asset maintenance requests` |
| `resource` | Module name (lowercase) | `asset_maintenance` |
| `action` | Action name (lowercase) | `view` |

### Step 6: Assign Permission to Roles (Template)

Generate role-permission assignment SQL. Default role assignments follow this pattern:

| Permission Type      | Roles That Typically Get It                                                                |
|----------------------|--------------------------------------------------------------------------------------------|
| `VIEW` / `VIEW_SELF` | EMPLOYEE, TEAM_LEAD, HR_MANAGER, HR_ADMIN, TENANT_ADMIN                                    |
| `VIEW_TEAM`          | TEAM_LEAD, DEPARTMENT_HEAD, HR_MANAGER, HR_ADMIN                                           |
| `VIEW_ALL`           | HR_MANAGER, HR_ADMIN, TENANT_ADMIN                                                         |
| `CREATE`             | Varies by module (HR_MANAGER for HR, RECRUITER for recruitment)                            |
| `UPDATE`             | Same as CREATE, plus the resource owner                                                    |
| `DELETE`             | HR_ADMIN, TENANT_ADMIN (restrictive)                                                       |
| `APPROVE`            | One level above the requester (TEAM_LEAD approves EMPLOYEE, HR_MANAGER approves TEAM_LEAD) |
| `MANAGE`             | HR_ADMIN, TENANT_ADMIN (full control)                                                      |

```sql
-- Assign permissions to roles
-- NOTE: HrmsRoleInitializer.java handles runtime role-permission assignment at startup.
-- These INSERTs are for explicit DB-level seeding. If HrmsRoleInitializer already covers
-- this module, you may skip this step and configure in the initializer instead.

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, 'GLOBAL', NOW(), NOW(), 0, false
FROM roles r
CROSS JOIN permissions p
WHERE r.code = '{ROLE_CODE}'
  AND p.code = '{MODULE}:{ACTION}'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.is_deleted = false
  );
```

### Step 7: Verify Wiring Completeness

After completing all steps, verify:

## Output Checklist

- [ ] **Backend constant** added to `Permission.java` (
  `backend/src/main/java/com/hrms/common/security/Permission.java`)
- [ ] **Controller annotation** `@RequiresPermission(Permission.MODULE_ACTION)` on every endpoint
- [ ] **Frontend constant** added to `Permissions` object in `frontend/lib/hooks/usePermissions.ts`
- [ ] **String values match exactly** between backend (`Permission.java`), frontend (
  `usePermissions.ts`), and DB seed
- [ ] **Database migration** created with INSERT into `permissions` table using
  `ON CONFLICT DO NOTHING`
- [ ] **Role assignment** either via migration SQL or documented for `HrmsRoleInitializer`
- [ ] **No orphaned permissions**: every backend constant is used in at least one
  `@RequiresPermission`
- [ ] **SuperAdmin note**: Permission is automatically bypassed for SUPER_ADMIN and TENANT_ADMIN
  roles (both backend and frontend). Test with a lower-privilege role to verify enforcement.
- [ ] **Sidebar/UI gating**: If this permission gates a menu item, update
  `frontend/components/layout/menuSections.tsx` with `requiredPermission`

## Common Mistakes to Avoid

1. **Typo mismatch**: Backend says `ASSET:VIEW` but frontend says `ASSETS:VIEW` -- always copy-paste
   the exact string
2. **Missing colon**: Backend uses `MODULE:ACTION` (colon), DB seed `resource` and `action` columns
   use lowercase without colon
3. **Forgetting VIEW permission**: A module with CREATE/UPDATE/DELETE but no VIEW means users can
   modify but not see
4. **Not scoping MANAGE**: The frontend `usePermissions` hook treats `MODULE:MANAGE` as implying all
   actions in that module -- if you add `MANAGE`, you usually do not need separate
   VIEW/CREATE/UPDATE/DELETE checks in the UI
5. **Testing with SuperAdmin only**: SuperAdmin bypasses all checks. A missing permission will not
   cause a 403 for SuperAdmin but will block all other roles.
