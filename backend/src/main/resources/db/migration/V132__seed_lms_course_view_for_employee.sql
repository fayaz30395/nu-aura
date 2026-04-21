-- ============================================================================
-- V132: Seed LMS:COURSE_VIEW permission for Employee and Team Lead roles
-- BUG-R04: Employee gets 403 on LMS endpoints despite having TRAINING:VIEW.
-- The controller accepts either TRAINING:VIEW or LMS:COURSE_VIEW, but to be
-- safe, seed the explicit LMS:COURSE_VIEW permission for all employee-level
-- roles that should access LMS content.
-- ============================================================================

-- Ensure the LMS:COURSE_VIEW permission exists
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LMS:COURSE_VIEW', 'LMS Course View', 'View LMS courses and content', 'lms', 'course_view',
        NOW(), NOW(), 0, false)
ON CONFLICT (code) DO NOTHING;

-- EMPLOYEE role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440023',
       p.id,
       'SELF',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LMS:COURSE_VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

-- TEAM_LEAD role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000001',
       p.id,
       'TEAM',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LMS:COURSE_VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

-- HR_MANAGER role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000002',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LMS:COURSE_VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

-- HR_ADMIN role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440021',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LMS:COURSE_VIEW'
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );
