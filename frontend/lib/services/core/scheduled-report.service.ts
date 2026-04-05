import {apiClient} from '../../api/client';
import {ScheduledReport, ScheduledReportRequest,} from '../../types/core/analytics';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const scheduledReportService = {
  // Create a new scheduled report
  create: async (data: ScheduledReportRequest): Promise<ScheduledReport> => {
    const response = await apiClient.post<ScheduledReport>('/scheduled-reports', data);
    return response.data;
  },

  // Update an existing scheduled report
  update: async (id: string, data: ScheduledReportRequest): Promise<ScheduledReport> => {
    const response = await apiClient.put<ScheduledReport>(`/scheduled-reports/${id}`, data);
    return response.data;
  },

  // Get scheduled report by ID
  getById: async (id: string): Promise<ScheduledReport> => {
    const response = await apiClient.get<ScheduledReport>(`/scheduled-reports/${id}`);
    return response.data;
  },

  // Get all scheduled reports with pagination
  getAll: async (page = 0, size = 20): Promise<PaginatedResponse<ScheduledReport>> => {
    const response = await apiClient.get<PaginatedResponse<ScheduledReport>>('/scheduled-reports', {
      params: {page, size},
    });
    return response.data;
  },

  // Get active scheduled reports
  getActive: async (): Promise<ScheduledReport[]> => {
    const response = await apiClient.get<ScheduledReport[]>('/scheduled-reports/active');
    return response.data;
  },

  // Delete a scheduled report
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduled-reports/${id}`);
  },

  // Toggle scheduled report status (active/inactive)
  toggleStatus: async (id: string): Promise<ScheduledReport> => {
    const response = await apiClient.post<ScheduledReport>(`/scheduled-reports/${id}/toggle-status`);
    return response.data;
  },
};
