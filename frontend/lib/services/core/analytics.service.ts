import { apiClient } from '../../api/client';
import { AnalyticsSummary, DashboardAnalytics, OrganizationHealth } from '../../types/core/analytics';

export const analyticsService = {
  // Get lightweight dashboard summary for KPI widget
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const response = await apiClient.get<AnalyticsSummary>('/analytics/summary');
    return response.data;
  },

  // Get dashboard analytics — returns null for roles without analytics permission
  getDashboardAnalytics: async (params?: { startDate?: string; endDate?: string }): Promise<DashboardAnalytics | null> => {
    try {
      const response = await apiClient.getPermissive<DashboardAnalytics>('/analytics/dashboard', { params });
      return response.status === 403 ? null : response.data;
    } catch {
      return null;
    }
  },

  // Get organization health analytics
  getOrganizationHealth: async (): Promise<OrganizationHealth> => {
    const response = await apiClient.get<OrganizationHealth>('/analytics/org-health');
    return response.data;
  },
};
