import { apiClient } from '../api/client';

export interface Application {
  id: string;
  code: string;
  name: string;
  description?: string;
  iconUrl?: string;
  baseUrl?: string;
  apiBasePath?: string;
  status: string;
  displayOrder: number;
  isSystemApp: boolean;
  appVersion?: string;
  permissionCount?: number;
}

export interface AppRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  isSystemRole: boolean;
  isDefaultRole: boolean;
  applicationCode: string;
  permissionCodes: string[];
  permissionCount: number;
}

export interface AppPermission {
  id: string;
  code: string;
  module: string;
  action: string;
  name: string;
  description?: string;
  category?: string;
  isSystemPermission: boolean;
  displayOrder: number;
  applicationCode: string;
}

export interface UserAppAccess {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  applicationCode: string;
  applicationName: string;
  status: string;
  grantedAt: string;
  grantedBy?: string;
  roleCodes: string[];
  permissions: string[];
}

export interface UserContext {
  userId: string;
  employeeId?: string;
  tenantId: string;
  appCode?: string;
  roles: string[];
  permissions: string[];
  accessibleApps: string[];
  isSystemAdmin: boolean;
}

export interface CreateRoleRequest {
  appCode: string;
  roleCode: string;
  name: string;
  description?: string;
  level: number;
  permissionCodes?: string[];
}

export interface GrantAccessRequest {
  userId: string;
  appCode: string;
  roleCodes?: string[];
}

class PlatformService {
  // ==================== Applications ====================

  async getAllApplications(): Promise<Application[]> {
    const response = await apiClient.get<Application[]>('/platform/applications');
    return response.data;
  }

  async getTenantApplications(): Promise<Application[]> {
    const response = await apiClient.get<Application[]>('/platform/applications/tenant');
    return response.data;
  }

  async getApplication(code: string): Promise<Application> {
    const response = await apiClient.get<Application>(`/platform/applications/${code}`);
    return response.data;
  }

  async getMyApplications(): Promise<UserAppAccess[]> {
    const response = await apiClient.get<UserAppAccess[]>('/platform/my-applications');
    return response.data;
  }

  // ==================== Permissions ====================

  async getApplicationPermissions(appCode: string): Promise<AppPermission[]> {
    const response = await apiClient.get<AppPermission[]>(`/platform/applications/${appCode}/permissions`);
    return response.data;
  }

  async getPermissionsByModule(appCode: string): Promise<Record<string, AppPermission[]>> {
    const response = await apiClient.get<Record<string, AppPermission[]>>(
      `/platform/applications/${appCode}/permissions/by-module`
    );
    return response.data;
  }

  async getPermissionsByCategory(appCode: string): Promise<Record<string, AppPermission[]>> {
    const response = await apiClient.get<Record<string, AppPermission[]>>(
      `/platform/applications/${appCode}/permissions/by-category`
    );
    return response.data;
  }

  // ==================== Roles ====================

  async getApplicationRoles(appCode: string): Promise<AppRole[]> {
    const response = await apiClient.get<AppRole[]>(`/platform/applications/${appCode}/roles`);
    return response.data;
  }

  async getRole(roleId: string): Promise<AppRole> {
    const response = await apiClient.get<AppRole>(`/platform/roles/${roleId}`);
    return response.data;
  }

  async createRole(request: CreateRoleRequest): Promise<AppRole> {
    const response = await apiClient.post<AppRole>('/platform/roles', request);
    return response.data;
  }

  async updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<AppRole> {
    const response = await apiClient.put<AppRole>(`/platform/roles/${roleId}/permissions`, permissionCodes);
    return response.data;
  }

  // ==================== User Access ====================

  async getApplicationUsers(appCode: string): Promise<UserAppAccess[]> {
    const response = await apiClient.get<UserAppAccess[]>(`/platform/applications/${appCode}/users`);
    return response.data;
  }

  async getUserAppAccess(userId: string, appCode: string): Promise<UserAppAccess> {
    const response = await apiClient.get<UserAppAccess>(`/platform/users/${userId}/access/${appCode}`);
    return response.data;
  }

  async getUserApplications(userId: string): Promise<UserAppAccess[]> {
    const response = await apiClient.get<UserAppAccess[]>(`/platform/users/${userId}/applications`);
    return response.data;
  }

  async grantAccess(request: GrantAccessRequest): Promise<UserAppAccess> {
    const response = await apiClient.post<UserAppAccess>('/platform/access/grant', request);
    return response.data;
  }

  async revokeAccess(userId: string, appCode: string): Promise<void> {
    await apiClient.post('/platform/access/revoke', null, {
      params: { userId, appCode }
    });
  }

  async updateUserRoles(userId: string, appCode: string, roleCodes: string[]): Promise<UserAppAccess> {
    const response = await apiClient.put<UserAppAccess>(
      `/platform/users/${userId}/access/${appCode}/roles`,
      roleCodes
    );
    return response.data;
  }

  // ==================== Permission Checks ====================

  async checkPermission(permission: string): Promise<boolean> {
    const response = await apiClient.get<{ hasPermission: boolean }>('/platform/check-permission', {
      params: { permission }
    });
    return response.data.hasPermission;
  }

  async checkPermissions(permissions: string[]): Promise<Record<string, boolean>> {
    const response = await apiClient.post<Record<string, boolean>>('/platform/check-permissions', permissions);
    return response.data;
  }

  async getMyPermissions(appCode: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/platform/my-permissions/${appCode}`);
    return response.data;
  }

  async getMyContext(): Promise<UserContext> {
    const response = await apiClient.get<UserContext>('/platform/my-context');
    return response.data;
  }
}

export const platformService = new PlatformService();
export default platformService;
