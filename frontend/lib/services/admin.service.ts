import { apiClient } from '../api/client';
import { publicApiClient } from '../api/public-client';
import { AdminStats, AdminUserSummary, Page, HealthResponse } from '../types/admin';
import { apiConfig } from '../config';

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
    // /actuator/health is at the root of the server, not under /api/v1
    // We need to construct the URL by removing /api/v1 from the base URL
    const baseUrl = apiConfig.baseUrl.replace('/api/v1', '');
    const healthUrl = `${baseUrl}/actuator/health`;

    try {
      // publicApiClient is used here because /actuator/health is unauthenticated.
      // It accepts absolute URLs — the URL normalizer only strips `/api/v1` from relative paths.
      const response = await publicApiClient.get<HealthResponse>(healthUrl);
      return response.data;
    } catch (_error) {
      // If the health endpoint is not available or times out, return a graceful response
      // Mark components as UNAVAILABLE instead of DOWN to indicate connectivity issues
      return {
        status: 'DEGRADED',
        components: {
          db: { status: 'UNAVAILABLE', details: { message: 'Database service unavailable' } },
          redis: { status: 'UNAVAILABLE', details: { message: 'Redis cache unavailable' } },
          kafka: { status: 'UNAVAILABLE', details: { message: 'Kafka messaging unavailable' } },
          livenessState: { status: 'UP' },
          readinessState: { status: 'UNAVAILABLE' },
        },
      };
    }
  }
}

export const adminService = new AdminService();

