import { apiClient } from '../api/client';
import { DashboardAnalytics } from '../types/analytics';

export const analyticsService = {
  // Get dashboard analytics
  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    const response = await apiClient.get<DashboardAnalytics>('/analytics/dashboard');
    return response.data;
  },
};
