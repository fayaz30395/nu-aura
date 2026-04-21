-- ============================================================================
-- V130: Grant HELPDESK:TICKET_VIEW + HELPDESK:TICKET_CREATE to EMPLOYEE role
-- ----------------------------------------------------------------------------
-- BUG F-06: EMPLOYEE users see "Access Denied" on /helpdesk/tickets because
-- the frontend sidebar gates /helpdesk/* on HELPDESK:TICKET_VIEW, while
-- V107 only seeded HELPDESK:VIEW and HELPDESK:CREATE for EMPLOYEE.
--
-- Helpdesk self-service ticket listing (own tickets) MUST be accessible to
-- every EMPLOYEE per CLAUDE.md: "Every User Is an Employee. Roles are additive."
--
-- The backend controller already allows EMPLOYEE_VIEW_SELF, so this gap is
-- purely a missing role-permission row for the granular HELPDESK:TICKET_*
-- codes that the frontend checks.
-- ============================================================================

-- Tenant: NuLogic
-- Role IDs:
--   EMPLOYEE:     550e8400-e29b-41d4-a716-446655440023
--   TEAM_LEAD:    48000000-0e01-0000-0000-000000000001
--   HR_MANAGER:   48000000-0e01-0000-0000-000000000002
--   HR_ADMIN:     550e8400-e29b-41d4-a716-446655440021

-- Grant HELPDESK:TICKET_VIEW + HELPDESK:TICKET_CREATE to EMPLOYEE
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
WHERE p.code IN ('HELPDESK:TICKET_VIEW', 'HELPDESK:TICKET_CREATE')
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

-- Also propagate to TEAM_LEAD, HR_MANAGER, HR_ADMIN (additive, should inherit)
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
WHERE p.code IN ('HELPDESK:TICKET_VIEW', 'HELPDESK:TICKET_CREATE')
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

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
WHERE p.code IN ('HELPDESK:TICKET_VIEW', 'HELPDESK:TICKET_CREATE')
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

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
WHERE p.code IN ('HELPDESK:TICKET_VIEW', 'HELPDESK:TICKET_CREATE')
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );
