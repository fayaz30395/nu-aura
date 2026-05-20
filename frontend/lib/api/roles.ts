import {
  addPermissions as addPermissionsGenerated,
  assignPermissions as assignPermissionsGenerated,
  assignPermissionsWithScope as assignPermissionsWithScopeGenerated,
  createRole as createRoleGenerated,
  deleteRole as deleteRoleGenerated,
  getAllRoles as getAllRolesGenerated,
  getEffectivePermissions as getEffectivePermissionsGenerated,
  getRoleById as getRoleByIdGenerated,
  removePermissions as removePermissionsGenerated,
  updatePermissionScope as updatePermissionScopeGenerated,
  updateRole as updateRoleGenerated,
} from '@/lib/generated/api/role-controller/role-controller';
import {
  getAllPermissions as getAllPermissionsGenerated,
  getPermissionsByResource as getPermissionsByResourceGenerated,
} from '@/lib/generated/api/permission-controller/permission-controller';
import {
  AssignPermissionsRequest,
  AssignPermissionsWithScopeRequest,
  CreateRoleRequest,
  Permission,
  Role,
  UpdatePermissionScopeRequest,
  UpdateRoleRequest,
} from '../types/core/roles';

/**
 * T3-12 migration (wave 3): thin facade over the orval-generated
 * `role-controller` and `permission-controller` clients. The public
 * `rolesApi` (10 methods) and `permissionsApi` (2 methods) surfaces are
 * preserved so existing callers (admin role/permission pages, RBAC hooks)
 * need no edits.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, preserving
 * cookie auth, CSRF double-submit, the 401 refresh mutex, and tenant headers.
 *
 * Page-size adapters for `getAllRoles` (size: 100) and `getAllPermissions`
 * (size: 500) are LOAD-BEARING — the admin UI consumes the unwrapped
 * `.content` array and relies on the workaround to see all rows in a
 * single request. Both unwraps fall back to `[]` so a malformed page
 * shape never crashes the consumer.
 */
export const rolesApi = {
  getAllRoles: async (): Promise<Role[]> => {
    // Bug #4 FIX: backend returns Page<Role>; extract .content with a large page size
    // so the "Roles Defined" stat in admin reflects actual role count.
    const response = await getAllRolesGenerated({pageable: {size: 100}});
    const page = response as unknown as {content?: Role[]};
    return page.content ?? [];
  },

  getRoleById: async (id: string): Promise<Role> => {
    const response = await getRoleByIdGenerated(id);
    return response as unknown as Role;
  },

  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await createRoleGenerated(
      data as unknown as Parameters<typeof createRoleGenerated>[0]
    );
    return response as unknown as Role;
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response = await updateRoleGenerated(
      id,
      data as unknown as Parameters<typeof updateRoleGenerated>[1]
    );
    return response as unknown as Role;
  },

  deleteRole: async (id: string): Promise<void> => {
    await deleteRoleGenerated(id);
  },

  // Legacy permission assignment (without scopes)
  assignPermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await assignPermissionsGenerated(
      id,
      data as unknown as Parameters<typeof assignPermissionsGenerated>[1]
    );
    return response as unknown as Role;
  },

  addPermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await addPermissionsGenerated(
      id,
      data as unknown as Parameters<typeof addPermissionsGenerated>[1]
    );
    return response as unknown as Role;
  },

  removePermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await removePermissionsGenerated(
      id,
      data as unknown as Parameters<typeof removePermissionsGenerated>[1]
    );
    return response as unknown as Role;
  },

  // New scope-aware permission assignment (Keka-style RBAC)
  assignPermissionsWithScope: async (
    id: string,
    data: AssignPermissionsWithScopeRequest
  ): Promise<Role> => {
    const response = await assignPermissionsWithScopeGenerated(
      id,
      data as unknown as Parameters<typeof assignPermissionsWithScopeGenerated>[1]
    );
    return response as unknown as Role;
  },

  updatePermissionScope: async (
    roleId: string,
    permissionCode: string,
    data: UpdatePermissionScopeRequest
  ): Promise<Role> => {
    const response = await updatePermissionScopeGenerated(
      roleId,
      permissionCode,
      data as unknown as Parameters<typeof updatePermissionScopeGenerated>[2]
    );
    return response as unknown as Role;
  },

  getEffectivePermissions: async (roleId: string): Promise<Permission[]> => {
    const response = await getEffectivePermissionsGenerated(roleId);
    return response as unknown as Permission[];
  },
};

export const permissionsApi = {
  getAllPermissions: async (): Promise<Permission[]> => {
    // Backend returns Page<Permission>; extract .content with a large page size
    const response = await getAllPermissionsGenerated({pageable: {size: 500}});
    const page = response as unknown as {content?: Permission[]};
    return page.content ?? [];
  },

  getPermissionsByResource: async (resource: string): Promise<Permission[]> => {
    const response = await getPermissionsByResourceGenerated(resource);
    return response as unknown as Permission[];
  },
};
