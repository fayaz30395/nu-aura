-- ============================================================================
-- V336: Grant WORKFLOW:VIEW to TENANT_ADMIN (SEC-3)
--
-- TENANT_ADMIN holds WORKFLOW:MANAGE but not WORKFLOW:VIEW, and every read
-- endpoint on WorkflowController is annotated @RequiresPermission("WORKFLOW:VIEW")
-- (WorkflowController.java:38,44,50,81,87,144,150,156,164,180...). A tenant admin
-- could therefore create and manage workflows but got 403 on every GET — the
-- workflows page loaded empty for the one role that owns it.
--
-- Least privilege: VIEW only. EXECUTE stays with the roles that already hold it.
--
-- Uses NOT EXISTS rather than ON CONFLICT DO NOTHING: role_permissions has no
-- unique constraint on (role_id, permission_id) — its only unique index is the
-- primary key on id — so ON CONFLICT DO NOTHING (as used by V325) matches
-- nothing and silently inserts duplicates.
-- ============================================================================

DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, 'ALL', NOW(), NOW(), 0, false
        FROM roles r
        CROSS JOIN permissions p
        WHERE r.tenant_id = tt.id
          AND r.code = 'TENANT_ADMIN'
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND p.code = 'WORKFLOW:VIEW'
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM role_permissions rp
              WHERE rp.role_id = r.id
                AND rp.permission_id = p.id
                AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          );
    END LOOP;
END $$;
