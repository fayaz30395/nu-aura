import { apiClient } from './client';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest, AssignPermissionsRequest } from '../types/roles';

export const rolesApi = {
  getAllRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get<Role[]>('/roles');
    return response.data;
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

  assignPermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await apiClient.put<Role>(`/roles/${id}/permissions`, data);
    return response.data;
  },

  addPermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await apiClient.post<Role>(`/roles/${id}/permissions`, data);
    return response.data;
  },

  removePermissions: async (id: string, data: AssignPermissionsRequest): Promise<Role> => {
    const response = await apiClient.delete<Role>(`/roles/${id}/permissions`, { data });
    return response.data;
  },
};

export const permissionsApi = {
  getAllPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get<Permission[]>('/permissions');
    return response.data;
  },

  getPermissionsByResource: async (resource: string): Promise<Permission[]> => {
    const response = await apiClient.get<Permission[]>(`/permissions/resource/${resource}`);
    return response.data;
  },
};
