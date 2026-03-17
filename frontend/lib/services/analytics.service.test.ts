/**
 * Unit Tests for Analytics Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

import { analyticsService } from './analytics.service';
import { apiClient } from '@/lib/api/client';

const mockedGet = (apiClient as { get: ReturnType<typeof vi.fn> }).get;

describe('AnalyticsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary', async () => {
      const mock = { headcount: 150, turnoverRate: 4.5, avgTenure: 2.3 };
      mockedGet.mockResolvedValueOnce({ data: mock });
      const result = await analyticsService.getAnalyticsSummary();
      expect(result).toEqual(mock);
      expect(mockedGet).toHaveBeenCalledWith('/analytics/summary');
    });

    it('should throw on error', async () => {
      mockedGet.mockRejectedValueOnce(new Error('Server error'));
      await expect(analyticsService.getAnalyticsSummary()).rejects.toThrow('Server error');
    });
  });

  describe('getDashboardAnalytics', () => {
    it('should return dashboard analytics', async () => {
      const mock = { totalEmployees: 200, departmentBreakdown: [] };
      mockedGet.mockResolvedValueOnce({ data: mock });
      const result = await analyticsService.getDashboardAnalytics();
      expect(result).toEqual(mock);
      expect(mockedGet).toHaveBeenCalledWith('/analytics/dashboard');
    });

    it('should throw on error', async () => {
      mockedGet.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(analyticsService.getDashboardAnalytics()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getOrganizationHealth', () => {
    it('should return organization health data', async () => {
      const mock = { score: 78, engagementScore: 82, retentionRate: 92 };
      mockedGet.mockResolvedValueOnce({ data: mock });
      const result = await analyticsService.getOrganizationHealth();
      expect(result).toEqual(mock);
      expect(mockedGet).toHaveBeenCalledWith('/analytics/org-health');
    });

    it('should throw on error', async () => {
      mockedGet.mockRejectedValueOnce(new Error('Timeout'));
      await expect(analyticsService.getOrganizationHealth()).rejects.toThrow('Timeout');
    });
  });
});
