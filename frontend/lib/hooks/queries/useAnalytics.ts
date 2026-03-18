'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/services/analytics.service';
import type { AnalyticsSummary, OrganizationHealth } from '@/lib/types/analytics';

// Query keys for cache management
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  dashboard: (startDate?: string, endDate?: string) =>
    startDate && endDate
      ? [...analyticsKeys.all, 'dashboard', startDate, endDate]
      : ([...analyticsKeys.all, 'dashboard'] as const),
  orgHealth: () => [...analyticsKeys.all, 'orgHealth'] as const,
};

/**
 * Hook to fetch the lightweight analytics summary for the main dashboard KPI widget.
 * Returns: totalEmployees, presentToday, onLeaveToday, pendingApprovals,
 *          payrollProcessedThisMonth, openPositions.
 *
 * staleTime: 5 minutes — KPI numbers don't need real-time refresh.
 */
export function useAnalyticsSummary(enabled: boolean = true) {
  return useQuery<AnalyticsSummary>({
    queryKey: analyticsKeys.summary(),
    queryFn: () => analyticsService.getAnalyticsSummary(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export interface DashboardAnalyticsParams {
  startDate?: string;
  endDate?: string;
}

/**
 * Hook to fetch role-based dashboard analytics.
 * Accepts optional startDate / endDate (ISO date strings: YYYY-MM-DD) for custom range filtering.
 */
export function useDashboardAnalytics(enabled: boolean = true, params?: DashboardAnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(params?.startDate, params?.endDate),
    queryFn: () => analyticsService.getDashboardAnalytics(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch organization health metrics.
 * Returns: healthScore, turnover, diversity, tenure, engagement, training.
 */
export function useOrganizationHealth(enabled: boolean = true) {
  return useQuery<OrganizationHealth>({
    queryKey: analyticsKeys.orgHealth(),
    queryFn: () => analyticsService.getOrganizationHealth(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
