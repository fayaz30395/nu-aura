-- ====================================
-- V13: User App Access Join Tables
-- ====================================
-- Creates the missing join tables for user_app_access relationships:
-- 1. user_app_roles: Links UserAppAccess to AppRole
-- 2. user_app_direct_permissions: Links UserAppAccess to directly assigned AppPermission

-- Join table: User App Access -> App Roles
CREATE TABLE IF NOT EXISTS user_app_roles
(
  user_app_access_id
  UUID
  NOT
  NULL,
  role_id
  UUID
  NOT
  NULL,
  PRIMARY
  KEY
(
  user_app_access_id,
  role_id
),
  CONSTRAINT fk_user_app_roles_access FOREIGN KEY
(
  user_app_access_id
)
  REFERENCES user_app_access
(
  id
) ON DELETE CASCADE,
  CONSTRAINT fk_user_app_roles_role FOREIGN KEY
(
  role_id
)
  REFERENCES app_roles
(
  id
)
  ON DELETE CASCADE
  );

CREATE INDEX IF NOT EXISTS idx_user_app_roles_access ON user_app_roles(user_app_access_id);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_role ON user_app_roles(role_id);

-- Join table: User App Access -> Direct Permissions
CREATE TABLE IF NOT EXISTS user_app_direct_permissions
(
  user_app_access_id
  UUID
  NOT
  NULL,
  permission_id
  UUID
  NOT
  NULL,
  PRIMARY
  KEY
(
  user_app_access_id,
  permission_id
),
  CONSTRAINT fk_user_app_direct_perm_access FOREIGN KEY
(
  user_app_access_id
)
  REFERENCES user_app_access
(
  id
) ON DELETE CASCADE,
  CONSTRAINT fk_user_app_direct_perm_perm FOREIGN KEY
(
  permission_id
)
  REFERENCES app_permissions
(
  id
)
  ON DELETE CASCADE
  );

CREATE INDEX IF NOT EXISTS idx_user_app_direct_perm_access ON user_app_direct_permissions(user_app_access_id);
CREATE INDEX IF NOT EXISTS idx_user_app_direct_perm_perm ON user_app_direct_permissions(permission_id);

COMMENT
ON TABLE user_app_roles IS 'Join table linking user app access to app roles';
COMMENT
ON TABLE user_app_direct_permissions IS 'Join table for direct permission assignments (beyond role permissions)';
