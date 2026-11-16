-- DEF-RBAC-01 / DEF-RBAC-02 (release-readiness 2026-11-15).
-- Enforcement reads role_permissions, but seeds never caught up with RoleHierarchy defaults, so
-- EMPLOYEE lacked 20 default self-service grants and no non-admin role could read Fluence (KNOWLEDGE).
-- Also PROJECT:UPDATE/DELETE and TRAINING:UPDATE/DELETE had no holder at all.
--
-- Forward-only, idempotent (NOT EXISTS), per tenant with the tx-local tenant GUC so RLS (V254/V306)
-- does not turn the inserts into silent no-ops (same pattern as V341/V344). Tenants without the
-- permission rows (e.g. SQL-seeded test tenants) are skipped naturally by the permissions join.
--
-- Deliberately NOT granted (stay SUPER_ADMIN-only, human decision): the other codes listed in
-- evidence/defects-rbac.md DEF-RBAC-02. KNOWLEDGE create/update/delete/publish are read-only here by design.
DO $$
DECLARE
    tt RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope,
                                      created_at, updated_at, version, is_deleted)
        SELECT gen_random_uuid(), tt.id, r.id, p.id, g.scope, NOW(), NOW(), 0, false
        FROM (VALUES
            -- EMPLOYEE: RoleHierarchy.getEmployeePermissions entries missing from role_permissions
            ('EMPLOYEE', 'TDS:DECLARE', 'SELF'),
            ('EMPLOYEE', 'SELF_SERVICE:VIEW_PAYSLIP', 'SELF'),
            ('EMPLOYEE', 'SELF_SERVICE:VIEW_LETTERS', 'SELF'),
            ('EMPLOYEE', 'SELF_SERVICE:DOCUMENT_REQUEST', 'SELF'),
            ('EMPLOYEE', 'SELF_SERVICE:PROFILE_UPDATE', 'SELF'),
            ('EMPLOYEE', 'DOCUMENT:UPLOAD', 'SELF'),
            ('EMPLOYEE', 'DOCUMENT:VIEW', 'SELF'),
            ('EMPLOYEE', 'WALL:POST', 'SELF'),
            ('EMPLOYEE', 'WALL:REACT', 'SELF'),
            ('EMPLOYEE', 'WALL:COMMENT', 'SELF'),
            ('EMPLOYEE', 'SURVEY:SUBMIT', 'SELF'),
            ('EMPLOYEE', 'MEETING:VIEW', 'SELF'),
            ('EMPLOYEE', 'MEETING:CREATE', 'SELF'),
            ('EMPLOYEE', 'BENEFIT:VIEW_SELF', 'SELF'),
            ('EMPLOYEE', 'BENEFIT:ENROLL', 'SELF'),
            ('EMPLOYEE', 'BENEFIT:CLAIM_SUBMIT', 'SELF'),
            ('EMPLOYEE', 'OVERTIME:REQUEST', 'SELF'),
            ('EMPLOYEE', 'OKR:CREATE', 'SELF'),
            ('EMPLOYEE', 'OKR:UPDATE', 'SELF'),
            ('EMPLOYEE', 'PROJECT:VIEW', 'SELF'),
            -- Fluence read-only access for everyday roles
            ('EMPLOYEE', 'KNOWLEDGE:WIKI_READ', 'ALL'),
            ('EMPLOYEE', 'KNOWLEDGE:BLOG_READ', 'ALL'),
            ('EMPLOYEE', 'KNOWLEDGE:SEARCH', 'ALL'),
            ('MANAGER', 'KNOWLEDGE:WIKI_READ', 'ALL'),
            ('MANAGER', 'KNOWLEDGE:BLOG_READ', 'ALL'),
            ('MANAGER', 'KNOWLEDGE:SEARCH', 'ALL'),
            ('TEAM_LEAD', 'KNOWLEDGE:WIKI_READ', 'ALL'),
            ('TEAM_LEAD', 'KNOWLEDGE:BLOG_READ', 'ALL'),
            ('TEAM_LEAD', 'KNOWLEDGE:SEARCH', 'ALL'),
            ('HR_MANAGER', 'KNOWLEDGE:WIKI_READ', 'ALL'),
            ('HR_MANAGER', 'KNOWLEDGE:BLOG_READ', 'ALL'),
            ('HR_MANAGER', 'KNOWLEDGE:SEARCH', 'ALL'),
            -- DEF-RBAC-02: codes with no holder at all
            ('HR_ADMIN', 'PROJECT:UPDATE', 'ALL'),
            ('HR_ADMIN', 'PROJECT:DELETE', 'ALL'),
            ('HR_ADMIN', 'TRAINING:UPDATE', 'ALL'),
            ('HR_ADMIN', 'TRAINING:DELETE', 'ALL'),
            ('TENANT_ADMIN', 'PROJECT:UPDATE', 'ALL'),
            ('TENANT_ADMIN', 'PROJECT:DELETE', 'ALL'),
            ('TENANT_ADMIN', 'TRAINING:UPDATE', 'ALL'),
            ('TENANT_ADMIN', 'TRAINING:DELETE', 'ALL')
        ) AS g(role_code, perm_code, scope)
                 JOIN roles r ON r.code = g.role_code AND r.tenant_id = tt.id
                      AND (r.is_deleted = false OR r.is_deleted IS NULL)
                 JOIN permissions p ON p.code = g.perm_code AND p.tenant_id = tt.id
        WHERE NOT EXISTS (SELECT 1
                          FROM role_permissions x
                          WHERE x.role_id = r.id
                            AND x.permission_id = p.id
                            AND (x.is_deleted = false OR x.is_deleted IS NULL));
    END LOOP;
END $$;
