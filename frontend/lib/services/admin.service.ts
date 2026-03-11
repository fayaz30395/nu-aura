import axios from 'axios';
import { apiClient } from '../api/client';
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
      const response = await axios.get<HealthResponse>(healthUrl, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      // If the health endpoint is not available, return a DOWN status
      return {
        status: 'DOWN',
        components: {
          error: {
            status: 'DOWN',
            details: {
              message: error instanceof Error ? error.message : 'Health check failed',
            },
          },
        },
      };
    }
  }
}

export const adminService = new AdminService();

