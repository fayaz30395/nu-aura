import { apiClient } from '../../api/client';
import { AdminStats, AdminUserSummary, Page, HealthResponse } from '../../types/core/admin';

class AdminService {
  async getStats(): Promise<AdminStats> {
    const response = await apiClient.get<AdminStats>('/admin/stats');
    return response.data;
  }

  async getUsers(
    page: number = 0,
    size: number = 20,
    search?: string
  ): Promise<Page<AdminUserSummary>> {
    const response = await apiClient.get<Page<AdminUserSummary>>('/admin/users', {
      params: {
        page,
        size,
        search: search || undefined,
      },
    });
    return response.data;
  }

  async updateUserRole(userId: string, roleCode: string): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/role`, {
      role: roleCode,
    });
  }

  async getSystemHealth(): Promise<HealthResponse> {
    try {
      const response = await apiClient.get<HealthResponse>('/admin/health');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return {
        status: 'DEGRADED',
        components: {
          db: { status: 'UNAVAILABLE', details: { message: 'Unable to reach server' } },
          redis: { status: 'UNAVAILABLE', details: { message: 'Unable to reach server' } },
          kafka: { status: 'UNAVAILABLE', details: { message: 'Unable to reach server' } },
          livenessState: { status: 'UP', details: { message: 'Application is running' } },
          readinessState: { status: 'UNAVAILABLE', details: { message: 'Unable to reach server' } },
        },
      };
    }
  }
}

export const adminService = new AdminService();

