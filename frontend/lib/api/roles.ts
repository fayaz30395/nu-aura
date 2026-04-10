import {apiClient} from './client';
import {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionsRequest,
  AssignPermissionsWithScopeRequest,
  UpdatePermissionScopeRequest,
} from '../types/core/roles';

export const rolesApi = {
  getAllRoles: async (): Promise<Role[]> => {
    // Bug #4 FIX: backend returns Page<Role>; extract .content with a large page size
    // so the "Roles Defined" stat in admin reflects actual role count.
    const response = await apiClient.get<{ content: Role[]; totalElements: number }>('/roles', {
      params: {size: 100},
    });
    return response.data.content ?? [];
  },

  getRoleById: async (id: string): Promise<Role> => {
    const response = await apiClient.get<Role>(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await apiClient.post<Role>('/roles', data);
    return response.data;
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    const response = await apiClient.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  // Legacy permission assignment (without scopes)
  assignPermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await apiClient.put<Role>(`/roles/${id}/permissions`, data);
    return response.data;
  },

  addPermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await apiClient.post<Role>(`/roles/${id}/permissions`, data);
    return response.data;
  },

  removePermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await apiClient.delete<Role>(`/roles/${id}/permissions`, {data});
    return response.data;
  },

  // New scope-aware permission assignment (Keka-style RBAC)
  assignPermissionsWithScope: async (id: string, data: AssignPermissionsWithScopeRequest): Promise<Role> => {
    const response = await apiClient.put<Role>(`/roles/${id}/permissions-with-scope`, data);
    return response.data;
  },

  updatePermissionScope: async (roleId: string, permissionCode: string, data: UpdatePermissionScopeRequest): Promise<Role> => {
    const response = await apiClient.patch<Role>(`/roles/${roleId}/permissions/${permissionCode}/scope`, data);
    return response.data;
  },

  getEffectivePermissions: async (roleId: string): Promise<Permission[]> => {
    const response = await apiClient.get<Permission[]>(`/roles/${roleId}/effective-permissions`);
    return response.data;
  },
};

export const permissionsApi = {
  getAllPermissions: async (): Promise<Permission[]> => {
    // Backend returns Page<Permission>; extract .content with a large page size
    const response = await apiClient.get<{ content: Permission[]; totalElements: number }>('/permissions', {
      params: {size: 500},
    });
    return response.data.content ?? [];
  },

  getPermissionsByResource: async (resource: string): Promise<Permission[]> => {
    const response = await apiClient.get<Permission[]>(`/permissions/resource/${resource}`);
    return response.data;
  },
};
