/**
 * Unit Tests for Admin Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/lib/api/public-client', () => ({
  publicApiClient: { get: vi.fn() },
}));
vi.mock('@/lib/config', () => ({
  apiConfig: { baseUrl: 'http://localhost:8080/api/v1' },
}));

import { adminService } from './admin.service';
import { apiClient } from '@/lib/api/client';
import { publicApiClient } from '@/lib/api/public-client';

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};
const mockedPublicApiClient = publicApiClient as { get: ReturnType<typeof vi.fn> };

interface AdminStats { totalTenants: number; totalUsers: number; activeUsers: number; }
interface AdminUserSummary { id: string; email: string; tenantId: string; role: string; }
interface Page<T> { content: T[]; totalElements: number; totalPages: number; }

describe('AdminService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getStats', () => {
    it('should return admin stats', async () => {
      const mockStats: AdminStats = { totalTenants: 5, totalUsers: 100, activeUsers: 80 };
      mockedApiClient.get.mockResolvedValueOnce({ data: mockStats });
      const result = await adminService.getStats();
      expect(result).toEqual(mockStats);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/admin/stats');
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(adminService.getStats()).rejects.toThrow('Network error');
    });
  });

  describe('getUsers', () => {
    it('should fetch users with default pagination', async () => {
      const mockPage: Page<AdminUserSummary> = {
        content: [{ id: '1', email: 'a@b.com', tenantId: 't1', role: 'ADMIN' }],
        totalElements: 1,
        totalPages: 1,
      };
      mockedApiClient.get.mockResolvedValueOnce({ data: mockPage });
      const result = await adminService.getUsers();
      expect(result).toEqual(mockPage);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 0, size: 20, search: undefined },
      });
    });

    it('should pass search parameter when provided', async () => {
      const mockPage: Page<AdminUserSummary> = { content: [], totalElements: 0, totalPages: 0 };
      mockedApiClient.get.mockResolvedValueOnce({ data: mockPage });
      await adminService.getUsers(0, 10, 'john');
      expect(mockedApiClient.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 0, size: 10, search: 'john' },
      });
    });

    it('should throw on error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Forbidden'));
      await expect(adminService.getUsers()).rejects.toThrow('Forbidden');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({ data: undefined });
      await adminService.updateUserRole('user-1', 'HR_ADMIN');
      expect(mockedApiClient.patch).toHaveBeenCalledWith('/admin/users/user-1/role', { role: 'HR_ADMIN' });
    });

    it('should throw on error', async () => {
      mockedApiClient.patch.mockRejectedValueOnce(new Error('Not Found'));
      await expect(adminService.updateUserRole('bad-id', 'ROLE')).rejects.toThrow('Not Found');
    });
  });

  describe('getSystemHealth', () => {
    it('should return health data from publicApiClient', async () => {
      const mockHealth = {
        status: 'UP',
        components: { db: { status: 'UP' }, redis: { status: 'UP' } },
      };
      mockedPublicApiClient.get.mockResolvedValueOnce({ data: mockHealth });
      const result = await adminService.getSystemHealth();
      expect(result).toEqual(mockHealth);
      expect(mockedPublicApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/actuator/health')
      );
    });

    it('should return DEGRADED fallback when health endpoint fails', async () => {
      mockedPublicApiClient.get.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await adminService.getSystemHealth();
      expect(result.status).toBe('DEGRADED');
      expect(result.components.db.status).toBe('UNAVAILABLE');
      expect(result.components.redis.status).toBe('UNAVAILABLE');
    });

    it('should construct health URL by removing /api/v1', async () => {
      mockedPublicApiClient.get.mockResolvedValueOnce({ data: { status: 'UP', components: {} } });
      await adminService.getSystemHealth();
      const calledUrl = mockedPublicApiClient.get.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('/api/v1');
      expect(calledUrl).toContain('/actuator/health');
    });
  });
});
