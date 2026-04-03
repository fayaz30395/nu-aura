-- V59: Add indexes to accelerate login flow queries
-- Addresses slow queries: findUserApplications (306ms), findByUserIdWithUser (309ms),
-- and ImplicitRoleService manager hierarchy lookups.

-- user_app_access: cover the login queries that filter by user_id + status
-- Used by: findUserApplications, findByUserIdAndAppCodeWithPermissions, findActiveApplicationCodesByUserId
CREATE INDEX IF NOT EXISTS idx_user_app_access_user_status
  ON user_app_access(user_id, status);

-- user_app_access: cover the query that joins on application_id with user_id filter
CREATE INDEX IF NOT EXISTS idx_user_app_access_user_app
  ON user_app_access(user_id, application_id);

-- employees: cover manager hierarchy lookups (direct reports, skip-level reports)
-- Used by: findEmployeeIdsByManagerIds, countDirectReportsByManagerId
CREATE INDEX IF NOT EXISTS idx_employees_manager_tenant_status
  ON employees(manager_id, tenant_id, status);

-- employees: cover findByUserIdWithUser and findByUserIdAndTenantId
CREATE INDEX IF NOT EXISTS idx_employees_user_tenant
  ON employees(user_id, tenant_id);

-- nu_applications: cover JOIN filter on status + display_order (used in app switcher queries)
CREATE INDEX IF NOT EXISTS idx_nu_applications_status_order
  ON nu_applications(status, display_order);
