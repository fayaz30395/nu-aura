-- V175: Grant onboarding and exit workflow permissions to HR roles
-- ============================================================================
-- HR_MANAGER is the primary owner for onboarding/offboarding operations in the UI
-- and RoleHierarchy, but the persisted role_permissions seed missed the canonical
-- ONBOARDING and EXIT permissions used by route guards and API authorization.
-- ============================================================================

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       r.tenant_id,
       r.id,
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM roles r
JOIN permissions p
  ON p.code IN (
       'ONBOARDING:VIEW',
       'ONBOARDING:CREATE',
       'ONBOARDING:MANAGE',
       'EXIT:VIEW',
       'EXIT:INITIATE',
       'EXIT:MANAGE',
       'EXIT:APPROVE'
     )
 AND p.is_deleted = false
WHERE r.code IN ('HR_MANAGER', 'HR_ADMIN')
  AND r.is_deleted = false
ON CONFLICT DO NOTHING;
