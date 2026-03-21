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
      '/implicit-role-rules',
      { params }
    );
    return response.data;
  },

  createRule: async (data: ImplicitRoleRuleRequest): Promise<ImplicitRoleRule> => {
    const response = await apiClient.post<ImplicitRoleRule>('/implicit-role-rules', data);
    return response.data;
  },

  updateRule: async (id: string, data: ImplicitRoleRuleRequest): Promise<ImplicitRoleRule> => {
    const response = await apiClient.put<ImplicitRoleRule>(`/implicit-role-rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/implicit-role-rules/${id}`);
  },

  // Affected Users
  getAffectedUsers: async (ruleId: string, page: number = 0, size: number = 20): Promise<PaginatedResponse<ImplicitUserRole>> => {
    const response = await apiClient.get<PaginatedResponse<ImplicitUserRole>>(
      `/implicit-role-rules/${ruleId}/affected-users`,
      { params: { page, size } }
    );
    return response.data;
  },

  // Recomputation
  recomputeAll: async (): Promise<{ status: string; message: string; tenantId: string }> => {
    const response = await apiClient.post<{ status: string; message: string; tenantId: string }>(
      '/implicit-role-rules/recompute-all'
    );
    return response.data;
  },

  // Bulk Operations
  bulkActivate: async (data: BulkRuleIdsRequest): Promise<{ operationType: string; totalRequested: number; totalProcessed: number }> => {
    const response = await apiClient.post<{ operationType: string; totalRequested: number; totalProcessed: number }>(
      '/implicit-role-rules/bulk-activate',
      data
    );
    return response.data;
  },

  bulkDeactivate: async (data: BulkRuleIdsRequest): Promise<{ operationType: string; totalRequested: number; totalProcessed: number }> => {
    const response = await apiClient.post<{ operationType: string; totalRequested: number; totalProcessed: number }>(
      '/implicit-role-rules/bulk-deactivate',
      data
    );
    return response.data;
  },

  // User Implicit Roles
  getUserImplicitRoles: async (userId: string): Promise<ImplicitUserRole[]> => {
    const response = await apiClient.get<ImplicitUserRole[]>(
      `/implicit-role-rules/user/${userId}/implicit-roles`
    );
    return response.data;
  },
};
