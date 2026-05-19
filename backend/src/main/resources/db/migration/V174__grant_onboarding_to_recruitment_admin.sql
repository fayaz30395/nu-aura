-- ============================================================================
-- V174: Grant onboarding permissions to RECRUITMENT_ADMIN
-- ============================================================================
-- RoleHierarchy grants RECRUITMENT_ADMIN full NU-Hire access, including
-- onboarding. The repopulated demo role-permission seed missed the onboarding
-- permissions, which blocked recruitment admins from /onboarding.
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
  ON p.code IN ('ONBOARDING:VIEW', 'ONBOARDING:CREATE', 'ONBOARDING:MANAGE')
 AND p.is_deleted = false
WHERE r.code = 'RECRUITMENT_ADMIN'
  AND r.is_deleted = false
ON CONFLICT DO NOTHING;
