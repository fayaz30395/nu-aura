import axios from 'axios';
import { apiClient } from '../../api/client';
import { AdminStats, AdminUserSummary, Page, HealthResponse } from '../../types/core/admin';
import { apiConfig } from '../../config';

/**
 * Derive the backend server origin from the API base URL.
 * apiConfig.baseUrl is typically "http://localhost:8080/api/v1".
 * The actuator lives at the server root, e.g. "http://localhost:8080/actuator/health".
 */
function getServerOrigin(): string {
  const base = apiConfig.baseUrl;
  if (!base) {
    // Fallback for development when env var is missing
    return 'http://localhost:8080';
  }
  try {
    const url = new URL(base);
    return url.origin;
  } catch {
    // If the URL is malformed, strip /api/v1 as a best-effort fallback
    return base.replace(/\/api\/v1\/?$/, '');
  }
}

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
    // /actuator/health is at the server root, not under /api/v1.
    // Use a standalone axios call (no baseURL prefix) to hit the absolute URL.
    const healthUrl = `${getServerOrigin()}/actuator/health`;

    try {
      const response = await axios.get<HealthResponse>(healthUrl, {
        timeout: 10_000,
        // Send cookies so Spring Security recognises the SUPER_ADMIN session
        // if the actuator endpoint ever moves behind auth.
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      // If the health endpoint is not available or times out, return a graceful response.
      // Mark components as UNAVAILABLE instead of DOWN to indicate connectivity issues.
      console.error('Failed to fetch system health:', error);
      return {
        status: 'DEGRADED',
        components: {
          db: { status: 'UNAVAILABLE', details: { message: 'Database connectivity unavailable' } },
          redis: { status: 'UNAVAILABLE', details: { message: 'Redis cache service unavailable' } },
          kafka: { status: 'UNAVAILABLE', details: { message: 'Kafka messaging service unavailable' } },
          livenessState: { status: 'UP', details: { message: 'Application is running' } },
          readinessState: { status: 'UNAVAILABLE', details: { message: 'Service dependencies unavailable' } },
        },
      };
    }
  }
}

export const adminService = new AdminService();

