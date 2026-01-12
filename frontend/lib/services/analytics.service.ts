import { apiClient } from '../api/client';
import { DashboardAnalytics, OrganizationHealth } from '../types/analytics';

export const analyticsService = {
  // Get dashboard analytics
  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    const response = await apiClient.get<DashboardAnalytics>('/analytics/dashboard');
    return response.data;
  },

  // Get organization health analytics
  getOrganizationHealth: async (): Promise<OrganizationHealth> => {
    const response = await apiClient.get<OrganizationHealth>('/analytics/org-health');
    return response.data;
  },
};
