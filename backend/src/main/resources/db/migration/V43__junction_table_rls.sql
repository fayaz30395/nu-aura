-- V43__junction_table_rls.sql
-- Enable RLS on user_roles and app_role_permissions junction tables
-- These were missed by V36/V37 explicit lists and need explicit coverage

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_allow_all
  ON user_roles AS PERMISSIVE FOR ALL USING (true);

CREATE POLICY user_roles_tenant_rls
  ON user_roles AS RESTRICTIVE FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );

-- app_role_permissions
ALTER TABLE app_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_role_permissions_allow_all
  ON app_role_permissions AS PERMISSIVE FOR ALL USING (true);

CREATE POLICY app_role_permissions_tenant_rls
  ON app_role_permissions AS RESTRICTIVE FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.current_tenant_id', true) IS NULL
    OR current_setting('app.current_tenant_id', true) = ''
  );
