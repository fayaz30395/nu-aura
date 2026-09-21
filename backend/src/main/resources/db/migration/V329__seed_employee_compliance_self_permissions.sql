-- ============================================================================
-- V329: Seed COMPLIANCE:VIEW_SELF / COMPLIANCE:ACKNOWLEDGE and grant to EMPLOYEE
-- ============================================================================
-- These permission codes were added to Permission.java (R3 fix, production
-- release validation pass) so employees can view applicable policies and
-- acknowledge them without the full admin-scoped COMPLIANCE:VIEW permission.
-- RoleHierarchy.getEmployeePermissions() was updated to include them, but per
-- V93's own precedent comment: "Without seeding them, non-SuperAdmin users
-- are denied access because the codes don't exist in the permissions table."
-- Live-verified: the permissions table (not RoleHierarchy.java) is the actual
-- runtime source of truth via SecurityService.getCachedPermissions(), which
-- reads role.getPermissions() from the role_permissions join table.
--
-- NOTE: only the currently-populated tenant is seeded here, matching V93's
-- scoping. A tenant provisioned later via POST /api/v1/tenants/register does
-- not currently get a full role/permission catalog seeded automatically
-- (TenantProvisioningService only creates a TENANT_ADMIN role) — granting
-- these to a new tenant's EMPLOYEE role, if/when one is created, is a
-- separate follow-up, not addressed by this migration.
-- ============================================================================

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPLIANCE:VIEW_SELF', 'View Own Compliance Policies',
        'View applicable/active company policies and own acknowledgment status', 'compliance', 'view_self', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPLIANCE:ACKNOWLEDGE', 'Acknowledge Compliance Policy',
        'Acknowledge a required company policy on behalf of self', 'compliance', 'acknowledge', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

DO $$
DECLARE
    r RECORD;
BEGIN
    PERFORM set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

    FOR r IN
        SELECT rl.tenant_id, rl.id AS role_id
        FROM roles rl
        WHERE rl.code = 'EMPLOYEE'
          AND rl.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
          AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
    LOOP
        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT
            gen_random_uuid(),
            r.tenant_id,
            r.role_id,
            p.id,
            'ALL',
            NOW(),
            NOW(),
            0,
            false
        FROM permissions p
        WHERE p.code IN ('COMPLIANCE:VIEW_SELF', 'COMPLIANCE:ACKNOWLEDGE')
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
