-- ============================================================================
-- V70: Fix Review/Goal permission gaps for Team Lead and other roles
-- ============================================================================
-- BUG-006: Team Lead gets 403 on /api/v1/goals and /api/v1/review-cycles/active
-- because REVIEW:VIEW, GOAL:CREATE, GOAL:APPROVE permissions don't exist in DB.
--
-- Root cause: V66 added many permissions but missed REVIEW and GOAL module.
-- V67 was created to fix this but was disabled due to schema issues.
--
-- This migration:
-- 1. Inserts missing REVIEW and GOAL permissions
-- 2. Assigns them to TEAM_LEAD, MANAGER, HR_MANAGER, HR_ADMIN, EMPLOYEE roles
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Idempotent: ON CONFLICT DO NOTHING
-- ============================================================================

-- ============================================================================
-- STEP 1: Insert missing permission codes
-- ============================================================================

-- Review / Performance permissions
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'REVIEW:VIEW', 'View Reviews', 'View performance reviews and goals', 'review', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'REVIEW:CREATE', 'Create Reviews', 'Create performance review cycles', 'review', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'REVIEW:SUBMIT', 'Submit Reviews', 'Submit completed performance reviews', 'review', 'submit', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'REVIEW:APPROVE', 'Approve Reviews', 'Approve performance reviews', 'review', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'GOAL:CREATE', 'Create Goals', 'Create performance goals', 'goal', 'create', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'GOAL:APPROVE', 'Approve Goals', 'Approve performance goals', 'goal', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Assign permissions to roles
-- ============================================================================

-- Role IDs (from V0 seed):
--   HR_ADMIN:    550e8400-e29b-41d4-a716-446655440021
--   MANAGER:     550e8400-e29b-41d4-a716-446655440022
--   EMPLOYEE:    550e8400-e29b-41d4-a716-446655440023
--   TEAM_LEAD:   48000000-0e01-0000-0000-000000000001
--   HR_MANAGER:  48000000-0e01-0000-0000-000000000002

-- EMPLOYEE: REVIEW:VIEW, REVIEW:SUBMIT, GOAL:CREATE (SELF scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440023', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:SUBMIT', 'GOAL:CREATE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- TEAM_LEAD: All REVIEW + GOAL permissions (TEAM scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE', 'GOAL:CREATE', 'GOAL:APPROVE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- MANAGER: All REVIEW + GOAL permissions (TEAM scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE', 'GOAL:CREATE', 'GOAL:APPROVE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- HR_MANAGER: All REVIEW + GOAL permissions (ALL scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000002', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE', 'GOAL:CREATE', 'GOAL:APPROVE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- HR_ADMIN: All REVIEW + GOAL permissions (ALL scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE', 'GOAL:CREATE', 'GOAL:APPROVE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);
