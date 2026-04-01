-- V68: Add missing ASSET and PREBOARDING permissions for EMPLOYEE and HR_ADMIN roles
-- Author: Wave 2 RBAC Fixes - Co-Working Mode
-- Date: 2026-03-22
-- Purpose: Grant asset and preboarding permissions to support self-service and HR admin workflows

-- =============================================================================
-- EMPLOYEE ROLE: Asset Self-Service Permissions
-- =============================================================================
-- Allow employees to view their assigned assets

INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    t.id AS tenant_id
FROM roles r
CROSS JOIN permissions p
CROSS JOIN tenants t
WHERE r.name = 'EMPLOYEE'
  AND p.name IN (
    'ASSET:VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.tenant_id = t.id
  );

-- =============================================================================
-- HR_ADMIN ROLE: Asset Management Permissions
-- =============================================================================
-- Allow HR admins to view, create, assign, and manage assets

INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    t.id AS tenant_id
FROM roles r
CROSS JOIN permissions p
CROSS JOIN tenants t
WHERE r.name = 'HR_ADMIN'
  AND p.name IN (
    'ASSET:VIEW',
    'ASSET:CREATE',
    'ASSET:ASSIGN',
    'ASSET:MANAGE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.tenant_id = t.id
  );

-- =============================================================================
-- HR_ADMIN ROLE: Preboarding/Onboarding Management Permissions
-- =============================================================================
-- Allow HR admins to manage the entire preboarding workflow

INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    t.id AS tenant_id
FROM roles r
CROSS JOIN permissions p
CROSS JOIN tenants t
WHERE r.name = 'HR_ADMIN'
  AND p.name IN (
    'PREBOARDING:VIEW',
    'PREBOARDING:CREATE',
    'PREBOARDING:MANAGE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.tenant_id = t.id
  );

-- =============================================================================
-- VERIFICATION QUERY (uncomment to verify after migration)
-- =============================================================================
-- SELECT
--   r.name AS role_name,
--   p.name AS permission_name,
--   COUNT(*) AS tenant_count
-- FROM role_permissions rp
-- JOIN roles r ON rp.role_id = r.id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE p.name LIKE 'ASSET:%' OR p.name LIKE 'PREBOARDING:%'
-- GROUP BY r.name, p.name
-- ORDER BY r.name, p.name;
