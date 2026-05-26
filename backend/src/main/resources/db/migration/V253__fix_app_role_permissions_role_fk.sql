ALTER TABLE app_role_permissions
  DROP CONSTRAINT IF EXISTS fk_app_role_perms_role;

UPDATE app_role_permissions arp
SET tenant_id = r.tenant_id
FROM app_roles r
WHERE arp.role_id = r.id
  AND arp.tenant_id IS NULL;

DELETE FROM app_role_permissions
WHERE role_id NOT IN (SELECT id FROM app_roles);

ALTER TABLE app_role_permissions
  ADD CONSTRAINT fk_app_role_perms_role
    FOREIGN KEY (role_id) REFERENCES app_roles (id)
    ON DELETE CASCADE;
