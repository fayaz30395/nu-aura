import { apiClient } from './client';
import {
  ImplicitRoleRule,
  ImplicitRoleRuleRequest,
  ImplicitUserRole,
  BulkRuleIdsRequest,
} from '../types/implicitRoles';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface ListParams {
  page?: number;
  size?: number;
  search?: string;
  isActive?: boolean;
}

export const implicitRolesApi = {
  // Rules Management
  listRules: async (params?: ListParams): Promise<PaginatedResponse<ImplicitRoleRule>> => {
    const response = await apiClient.get<PaginatedResponse<ImplicitRoleRule>>(
      '/implicit-roles/rules',
      { params }
    );
    return response.data;
  },

  createRule: async (data: ImplicitRoleRuleRequest): Promise<ImplicitRoleRule> => {
    const response = await apiClient.post<ImplicitRoleRule>('/implicit-roles/rules', data);
    return response.data;
  },

  updateRule: async (id: string, data: ImplicitRoleRuleRequest): Promise<ImplicitRoleRule> => {
    const response = await apiClient.put<ImplicitRoleRule>(`/implicit-roles/rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/implicit-roles/rules/${id}`);
  },

  // Affected Users
  getAffectedUsers: async (ruleId: string, page: number = 0, size: number = 20): Promise<PaginatedResponse<ImplicitUserRole>> => {
    const response = await apiClient.get<PaginatedResponse<ImplicitUserRole>>(
      `/implicit-roles/rules/${ruleId}/affected-users`,
      { params: { page, size } }
    );
    return response.data;
  },

  // Recomputation
  recomputeAll: async (ruleId?: string): Promise<{ recomputedCount: number }> => {
    const url = ruleId ? `/implicit-roles/recompute/${ruleId}` : '/implicit-roles/recompute';
    const response = await apiClient.post<{ recomputedCount: number }>(url);
    return response.data;
  },

  // Bulk Operations
  bulkActivate: async (data: BulkRuleIdsRequest): Promise<{ activatedCount: number }> => {
    const response = await apiClient.post<{ activatedCount: number }>(
      '/implicit-roles/rules/bulk/activate',
      data
    );
    return response.data;
  },

  bulkDeactivate: async (data: BulkRuleIdsRequest): Promise<{ deactivatedCount: number }> => {
    const response = await apiClient.post<{ deactivatedCount: number }>(
      '/implicit-roles/rules/bulk/deactivate',
      data
    );
    return response.data;
  },

  // User Implicit Roles
  getUserImplicitRoles: async (userId: string): Promise<ImplicitUserRole[]> => {
    const response = await apiClient.get<ImplicitUserRole[]>(
      `/implicit-roles/users/${userId}/roles`
    );
    return response.data;
  },
};
