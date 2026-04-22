-- ============================================================================
-- V127: Add WALL:VIEW permission to HR Admin, HR Manager, Team Lead, Employee
-- The WALL:VIEW permission exists (seeded in V66/V96) but may be missing from
-- some roles, preventing access to the NU-Fluence wall feature.
-- ============================================================================

-- Tenant: NuLogic
-- Role IDs:
--   HR_ADMIN:     550e8400-e29b-41d4-a716-446655440021
--   HR_MANAGER:   48000000-0e01-0000-0000-000000000002
--   TEAM_LEAD:    48000000-0e01-0000-0000-000000000001
--   EMPLOYEE:     550e8400-e29b-41d4-a716-446655440023

-- HR_ADMIN
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
WHERE p.code = 'WALL:VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
                    AND rp.permission_id = p.id
                    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
                    AND rp.is_deleted = false);

-- HR_MANAGER
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
WHERE p.code = 'WALL:VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
                    AND rp.permission_id = p.id
                    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
                    AND rp.is_deleted = false);

-- TEAM_LEAD
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000001',
       p.id,
       'TEAM',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code = 'WALL:VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
                    AND rp.permission_id = p.id
                    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
                    AND rp.is_deleted = false);

-- EMPLOYEE
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440023',
       p.id,
       'SELF',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code = 'WALL:VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
                    AND rp.permission_id = p.id
                    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
                    AND rp.is_deleted = false);
