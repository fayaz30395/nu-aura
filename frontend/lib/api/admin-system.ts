import { apiClient } from './client';
import {
  SystemOverview,
  TenantMetrics,
  ImpersonationToken,
  PaginatedTenantList,
  GrowthMetrics,
} from '../types/core/admin-system';

/**
 * API endpoints for SuperAdmin system-wide management
 * All endpoints require SYSTEM_ADMIN permission
 */
export const systemAdminApi = {
  /**
   * Get comprehensive system overview
   */
  getSystemOverview: async (): Promise<SystemOverview> => {
    const response = await apiClient.get<SystemOverview>('/admin/system/overview');
    return response.data;
  },

  /**
   * Get paginated list of all tenants
   */
  getTenantList: async (
    page: number = 0,
    size: number = 20,
    sort?: string
  ): Promise<PaginatedTenantList> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      ...(sort && { sort }),
    });

    const response = await apiClient.get<PaginatedTenantList>(
      `/admin/system/tenants?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get deep-dive metrics for a specific tenant
   */
  getTenantMetrics: async (tenantId: string): Promise<TenantMetrics> => {
    const response = await apiClient.get<TenantMetrics>(
      `/admin/system/tenants/${tenantId}/metrics`
    );
    return response.data;
  },

  /**
   * Get platform growth metrics over the last N months
   */
  getGrowthMetrics: async (months: number = 6): Promise<GrowthMetrics> => {
    const response = await apiClient.get<GrowthMetrics>(
      `/admin/system/growth-metrics?months=${months}`
    );
    return response.data;
  },

  /**
   * Generate an impersonation token for a specific tenant
   */
  generateImpersonationToken: async (tenantId: string): Promise<ImpersonationToken> => {
    const response = await apiClient.post<ImpersonationToken>(
      `/admin/system/tenants/${tenantId}/impersonate`
    );
    return response.data;
  },
};
