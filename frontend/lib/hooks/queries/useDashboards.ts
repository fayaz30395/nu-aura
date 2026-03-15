'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/lib/services/dashboard.service';
import {
  ExecutiveDashboardData,
  EmployeeDashboardData,
  ManagerDashboardResponse,
} from '@/lib/types/dashboard';

// Query key factory for dashboard queries
export const dashboardKeys = {
  all: ['dashboards'] as const,
  executive: () => [...dashboardKeys.all, 'executive'] as const,
  executiveByDateRange: (startDate: string, endDate: string) =>
    [...dashboardKeys.executive(), { startDate, endDate }] as const,
  employee: () => [...dashboardKeys.all, 'employee'] as const,
  employeeById: (employeeId: string) =>
    [...dashboardKeys.employee(), employeeId] as const,
  manager: () => [...dashboardKeys.all, 'manager'] as const,
  managerById: (managerId: string) =>
    [...dashboardKeys.manager(), managerId] as const,
};

/**
 * Hook to fetch Executive Dashboard Data
 * Fetches comprehensive C-suite metrics, financial data, strategic insights, and workforce summary
 */
export function useExecutiveDashboard(enabled: boolean = true) {
  return useQuery<ExecutiveDashboardData>({
    queryKey: dashboardKeys.executive(),
    queryFn: async () => dashboardService.getExecutiveDashboard(),
    enabled,
  });
}

/**
 * Hook to fetch Executive Dashboard Data with custom date range
 */
export function useExecutiveDashboardByDateRange(
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  return useQuery<ExecutiveDashboardData>({
    queryKey: dashboardKeys.executiveByDateRange(startDate, endDate),
    queryFn: async () =>
      dashboardService.getExecutiveDashboardByDateRange(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
  });
}

/**
 * Hook to fetch Employee Dashboard Data
 * Fetches employee-specific dashboard data including attendance, leaves, career progress, and events
 */
export function useEmployeeDashboard(enabled: boolean = true) {
  return useQuery<EmployeeDashboardData>({
    queryKey: dashboardKeys.employee(),
    queryFn: async () => dashboardService.getEmployeeDashboard(),
    enabled,
  });
}

/**
 * Hook to fetch Employee Dashboard Data for a specific employee
 */
export function useEmployeeDashboardById(employeeId: string, enabled: boolean = true) {
  return useQuery<EmployeeDashboardData>({
    queryKey: dashboardKeys.employeeById(employeeId),
    queryFn: async () => dashboardService.getEmployeeDashboardById(employeeId),
    enabled: enabled && !!employeeId,
  });
}

/**
 * Hook to fetch Manager Dashboard Data
 * Fetches team-specific insights including attendance, leave, performance, and action items
 */
export function useManagerDashboard(enabled: boolean = true) {
  return useQuery<ManagerDashboardResponse>({
    queryKey: dashboardKeys.manager(),
    queryFn: async () => dashboardService.getManagerDashboard(),
    enabled,
  });
}

/**
 * Hook to fetch Manager Dashboard Data for a specific manager
 * Admin-only: View any manager's team dashboard
 */
export function useManagerDashboardById(managerId: string, enabled: boolean = true) {
  return useQuery<ManagerDashboardResponse>({
    queryKey: dashboardKeys.managerById(managerId),
    queryFn: async () => dashboardService.getManagerDashboardById(managerId),
    enabled: enabled && !!managerId,
  });
}
