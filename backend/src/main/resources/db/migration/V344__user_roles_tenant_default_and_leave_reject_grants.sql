-- DEF-HRMS-02: user_roles is a Hibernate @JoinTable (User.roles) so inserts never set tenant_id,
-- and the RLS WITH CHECK (tenant_id = app.current_tenant_id) rejects them -> PUT /users/{id}/roles 500.
-- Default the column from the tx-local tenant GUC (the same one the policies compare against).
ALTER TABLE user_roles
    ALTER COLUMN tenant_id SET DEFAULT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;

-- DEF-HRMS-03: V69 granted LEAVE:REJECT but V96's canonical reseed dropped it for everyone except
-- SUPER_ADMIN, while LEAVE:APPROVE (same endpoints' sibling) stayed. Mirror each existing
-- LEAVE:APPROVE grant (role + scope) as LEAVE:REJECT, per tenant, RLS-safely (see V341 pattern).
DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope,
                                      created_at, updated_at, version, is_deleted)
        SELECT gen_random_uuid(), rp.tenant_id, rp.role_id, rej.id, rp.scope, NOW(), NOW(), 0, false
        FROM role_permissions rp
                 JOIN permissions app ON app.id = rp.permission_id AND app.code = 'LEAVE:APPROVE'
                 JOIN permissions rej ON rej.code = 'LEAVE:REJECT'
        WHERE rp.tenant_id = tt.id
          AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          AND NOT EXISTS (SELECT 1
                          FROM role_permissions x
                          WHERE x.role_id = rp.role_id
                            AND x.permission_id = rej.id
                            AND (x.is_deleted = false OR x.is_deleted IS NULL));
    END LOOP;
END $$;
