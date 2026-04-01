-- ============================================================================
-- V75: Add composite indexes on role_permissions for auth query optimization
--
-- Fixes: SQL_SLOW warnings on user -> roles -> permissions joins (400ms+).
-- The existing indexes idx_role_permission_role and idx_role_permission_permission
-- (from JPA @Index on RolePermission entity) cover single-column lookups, but
-- the auth flow queries JOIN on (role_id, tenant_id) and need permission_id
-- for the nested fetch. These composite indexes reduce the join cost.
-- ============================================================================

-- Composite index: covers the JOIN from Role to RolePermission filtered by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_role_tenant
    ON role_permissions(role_id, tenant_id)
    WHERE is_deleted = false;

-- Composite index: covers the JOIN from RolePermission to Permission
-- (supplements the existing single-column idx_role_permission_permission)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_perm_role
    ON role_permissions(permission_id, role_id)
    WHERE is_deleted = false;

-- user_roles join table: composite index for the reverse lookup
-- (role_id, user_id) covers lookups from role -> users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role_user
    ON user_roles(role_id, user_id);
