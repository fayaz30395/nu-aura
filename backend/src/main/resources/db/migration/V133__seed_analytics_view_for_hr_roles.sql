-- ============================================================================
-- V133: Seed ANALYTICS:VIEW permission for HR Manager and HR Admin roles
-- GAP-R01: HR Managers cannot access /api/v1/analytics/org-health because
-- ANALYTICS:VIEW was never assigned to any role in V107 migration.
-- ============================================================================

-- Ensure the ANALYTICS:VIEW permission exists
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ANALYTICS:VIEW', 'Analytics View', 'View analytics and org health dashboards', 'analytics',
        'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

-- HR_MANAGER role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000002',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code = 'ANALYTICS:VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
                    AND rp.permission_id = p.id
                    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
                    AND rp.is_deleted = false);

-- HR_ADMIN role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440021',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code = 'ANALYTICS:VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
                    AND rp.permission_id = p.id
                    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
                    AND rp.is_deleted = false);
