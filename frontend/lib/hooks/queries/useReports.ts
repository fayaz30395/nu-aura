'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ReportRequest, reportService} from '@/lib/services/core/report.service';
import {scheduledReportService} from '@/lib/services/core/scheduled-report.service';
import {utilizationService} from '@/lib/services/hrms/utilization.service';
import {ScheduledReportRequest,} from '@/lib/types/core/analytics';
import {UtilizationFilterOptions,} from '@/lib/types/hrms/utilization';

// Query key factory for reports
export const reportKeys = {
  all: ['reports'] as const,
  scheduled: () => [...reportKeys.all, 'scheduled'] as const,
  scheduledList: (page: number, size: number) =>
    [...reportKeys.scheduled(), {page, size}] as const,
  scheduledById: (id: string) => [...reportKeys.scheduled(), id] as const,
  scheduledActive: () => [...reportKeys.scheduled(), 'active'] as const,
  utilization: () => [...reportKeys.all, 'utilization'] as const,
  utilizationDashboard: (filters: UtilizationFilterOptions) =>
    [...reportKeys.utilization(), 'dashboard', filters] as const,
  utilizationEmployee: (employeeId: string, startDate: string, endDate: string) =>
    [...reportKeys.utilization(), 'employee', {employeeId, startDate, endDate}] as const,
  utilizationAllEmployees: (startDate: string, endDate: string, page: number, size: number) =>
    [...reportKeys.utilization(), 'all-employees', {startDate, endDate, page, size}] as const,
};

// Scheduled Report Queries
export function useScheduledReports(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: reportKeys.scheduledList(page, size),
    queryFn: () => scheduledReportService.getAll(page, size),
  });
}

export function useScheduledReportById(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: reportKeys.scheduledById(id),
    queryFn: () => scheduledReportService.getById(id),
    enabled,
  });
}

export function useActiveScheduledReports() {
  return useQuery({
    queryKey: reportKeys.scheduledActive(),
    queryFn: () => scheduledReportService.getActive(),
  });
}

// Scheduled Report Mutations
export function useCreateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScheduledReportRequest) =>
      scheduledReportService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: reportKeys.scheduled()});
    },
  });
}

export function useUpdateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data}: { id: string; data: ScheduledReportRequest }) =>
      scheduledReportService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: reportKeys.scheduled()});
    },
  });
}

export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduledReportService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: reportKeys.scheduled()});
    },
  });
}

export function useToggleScheduledReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduledReportService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: reportKeys.scheduled()});
    },
  });
}

// Utilization Queries
export function useUtilizationDashboard(
  filters: UtilizationFilterOptions,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportKeys.utilizationDashboard(filters),
    queryFn: () => utilizationService.getDashboardData(filters),
    enabled,
  });
}

export function useEmployeeUtilization(
  employeeId: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportKeys.utilizationEmployee(employeeId, startDate, endDate),
    queryFn: () =>
      utilizationService.getEmployeeUtilization(employeeId, startDate, endDate),
    enabled: enabled && !!employeeId && !!startDate && !!endDate,
  });
}

export function useAllEmployeesUtilization(
  startDate: string,
  endDate: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: reportKeys.utilizationAllEmployees(startDate, endDate, page, size),
    queryFn: () =>
      utilizationService.getAllEmployeesUtilization(startDate, endDate, page, size),
    enabled: enabled && !!startDate && !!endDate,
  });
}

// Report Download Mutations (no caching, immediate download)
export function useDownloadPayrollReport() {
  return useMutation({
    mutationFn: (request: ReportRequest) =>
      reportService.downloadPayrollReport(request),
  });
}

export function useDownloadEmployeeReport() {
  return useMutation({
    mutationFn: (request: ReportRequest) =>
      reportService.downloadEmployeeReport(request),
  });
}

export function useDownloadAttendanceReport() {
  return useMutation({
    mutationFn: (request: ReportRequest) =>
      reportService.downloadAttendanceReport(request),
  });
}

export function useDownloadLeaveReport() {
  return useMutation({
    mutationFn: (request: ReportRequest) =>
      reportService.downloadLeaveReport(request),
  });
}

export function useDownloadDepartmentReport() {
  return useMutation({
    mutationFn: (request: ReportRequest) =>
      reportService.downloadDepartmentReport(request),
  });
}

export function useDownloadPerformanceReport() {
  return useMutation({
    mutationFn: (request: ReportRequest) =>
      reportService.downloadPerformanceReport(request),
  });
}

export function useExportUtilizationReport() {
  return useMutation({
    mutationFn: ({
                   format,
                   filters,
                 }: {
      format: 'csv' | 'excel' | 'pdf';
      filters: UtilizationFilterOptions;
    }) => utilizationService.exportReport(format, filters),
  });
}
