'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { resourceManagementService } from '@/lib/services/resource-management.service';
import {
  EmployeeCapacity,
  AllocationApprovalRequest,
  CreateAllocationApprovalRequest,
  ApproveAllocationRequest,
  RejectAllocationRequest,
  AllocationValidationResult,
  UpdateAllocationRequest,
  EmployeeAvailability,
  TeamAvailabilityView,
  ResourceCalendarFilter,
  Holiday,
  WorkloadDashboardData,
  WorkloadFilterOptions,
  EmployeeWorkload,
  DepartmentWorkload,
  WorkloadHeatmapRow,
} from '@/lib/types/resource-management';
import { useToast } from '@/components/notifications/ToastProvider';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Query key factory
export const resourceKeys = {
  all: ['resources'] as const,
  capacity: () => [...resourceKeys.all, 'capacity'] as const,
  capacityDetail: (employeeId: string) => [...resourceKeys.capacity(), employeeId] as const,
  capacityOverAllocated: (departmentId?: string) => [
    ...resourceKeys.capacity(),
    'over-allocated',
    departmentId,
  ] as const,
  capacityAvailable: (departmentId?: string) => [
    ...resourceKeys.capacity(),
    'available',
    departmentId,
  ] as const,

  allocations: () => [...resourceKeys.all, 'allocations'] as const,
  allocationHistory: (employeeId: string) => [...resourceKeys.allocations(), 'history', employeeId] as const,
  allocationRequests: () => [...resourceKeys.all, 'allocation-requests'] as const,
  allocationRequestPending: (departmentId?: string) => [
    ...resourceKeys.allocationRequests(),
    'pending',
    departmentId,
  ] as const,
  allocationRequestDetail: (requestId: string) => [
    ...resourceKeys.allocationRequests(),
    requestId,
  ] as const,
  myPendingApprovals: () => [...resourceKeys.allocationRequests(), 'my-pending'] as const,

  availability: () => [...resourceKeys.all, 'availability'] as const,
  employeeAvailability: (employeeId: string, startDate: string, endDate: string) => [
    ...resourceKeys.availability(),
    'employee',
    employeeId,
    startDate,
    endDate,
  ] as const,
  teamAvailability: (filter: ResourceCalendarFilter) => [
    ...resourceKeys.availability(),
    'team',
    filter,
  ] as const,
  aggregatedAvailability: (startDate: string, endDate: string, departmentId?: string) => [
    ...resourceKeys.availability(),
    'aggregated',
    startDate,
    endDate,
    departmentId,
  ] as const,
  holidays: (startDate: string, endDate: string, locationId?: string) => [
    ...resourceKeys.availability(),
    'holidays',
    startDate,
    endDate,
    locationId,
  ] as const,

  workload: () => [...resourceKeys.all, 'workload'] as const,
  workloadDashboard: (filters?: WorkloadFilterOptions) => [
    ...resourceKeys.workload(),
    'dashboard',
    filters,
  ] as const,
  workloadEmployees: (filters?: WorkloadFilterOptions) => [
    ...resourceKeys.workload(),
    'employees',
    filters,
  ] as const,
  workloadEmployeeDetail: (employeeId: string) => [
    ...resourceKeys.workload(),
    'employee',
    employeeId,
  ] as const,
  workloadDepartments: (startDate?: string, endDate?: string) => [
    ...resourceKeys.workload(),
    'departments',
    startDate,
    endDate,
  ] as const,
  workloadHeatmap: (startDate: string, endDate: string, departmentId?: string) => [
    ...resourceKeys.workload(),
    'heatmap',
    startDate,
    endDate,
    departmentId,
  ] as const,

  pool: () => [...resourceKeys.all, 'pool'] as const,
  allocationSummary: () => [...resourceKeys.pool(), 'allocation-summary'] as const,
  availableResources: () => [...resourceKeys.pool(), 'available'] as const,
  employeeTimeline: (employeeId: string) => [...resourceKeys.pool(), 'timeline', employeeId] as const,

  pendingApprovalsCount: () => [...resourceKeys.all, 'pending-approvals-count'] as const,
};

// ============================================
// CAPACITY QUERIES
// ============================================

export const useEmployeeCapacity = (
  employeeId: string,
  asOfDate?: string
): UseQueryResult<EmployeeCapacity, Error> =>
  useQuery({
    queryKey: resourceKeys.capacityDetail(employeeId),
    queryFn: () => resourceManagementService.getEmployeeCapacity(employeeId, asOfDate),
  });

export const useOverAllocatedEmployees = (
  departmentId?: string,
  page: number = 0,
  size: number = 20
): UseQueryResult<PageResponse<EmployeeCapacity>, Error> =>
  useQuery({
    queryKey: [...resourceKeys.capacityOverAllocated(departmentId), page, size] as const,
    queryFn: () => resourceManagementService.getOverAllocatedEmployees(departmentId, page, size),
  });

export const useAvailableEmployees = (
  minCapacity?: number,
  departmentId?: string,
  page: number = 0,
  size: number = 20
): UseQueryResult<PageResponse<EmployeeCapacity>, Error> =>
  useQuery({
    queryKey: [...resourceKeys.capacityAvailable(departmentId), minCapacity, page, size] as const,
    queryFn: () =>
      resourceManagementService.getAvailableEmployees(minCapacity, departmentId, page, size),
  });

export const useEmployeesCapacity = (
  employeeIds: string[],
  asOfDate?: string
): UseQueryResult<EmployeeCapacity[], Error> =>
  useQuery({
    queryKey: [...resourceKeys.capacity(), 'multiple', employeeIds, asOfDate] as const,
    queryFn: () => resourceManagementService.getEmployeesCapacity(employeeIds, asOfDate),
  });

// ============================================
// ALLOCATION REQUEST QUERIES
// ============================================

export const useAllocationRequest = (
  requestId: string
): UseQueryResult<AllocationApprovalRequest, Error> =>
  useQuery({
    queryKey: resourceKeys.allocationRequestDetail(requestId),
    queryFn: () => resourceManagementService.getAllocationRequest(requestId),
  });

export const usePendingRequests = (
  departmentId?: string,
  page: number = 0,
  size: number = 20
): UseQueryResult<PageResponse<AllocationApprovalRequest>, Error> =>
  useQuery({
    queryKey: [...resourceKeys.allocationRequestPending(departmentId), page, size] as const,
    queryFn: () =>
      resourceManagementService.getAllPendingRequests(departmentId, page, size),
  });

export const useEmployeeAllocationHistory = (
  employeeId: string,
  page: number = 0,
  size: number = 20
): UseQueryResult<PageResponse<AllocationApprovalRequest>, Error> =>
  useQuery({
    queryKey: [...resourceKeys.allocationHistory(employeeId), page, size] as const,
    queryFn: () =>
      resourceManagementService.getEmployeeAllocationHistory(employeeId, page, size),
  });

export const useMyPendingApprovals = (
  page: number = 0,
  size: number = 20
): UseQueryResult<PageResponse<AllocationApprovalRequest>, Error> =>
  useQuery({
    queryKey: [...resourceKeys.myPendingApprovals(), page, size] as const,
    queryFn: () =>
      resourceManagementService.getMyPendingApprovals(page, size),
  });

export const usePendingApprovalsCount = (): UseQueryResult<number, Error> =>
  useQuery({
    queryKey: resourceKeys.pendingApprovalsCount(),
    queryFn: () => resourceManagementService.getPendingApprovalsCount(),
  });

// ============================================
// ALLOCATION MUTATIONS
// ============================================

export const useCreateAllocationRequest = (): UseMutationResult<
  AllocationApprovalRequest,
  Error,
  CreateAllocationApprovalRequest
> => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (data) => resourceManagementService.createAllocationRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.allocationRequests() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.myPendingApprovals() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.pendingApprovalsCount() });
      toast.success('Request Created', 'Allocation request has been submitted for approval');
    },
    onError: (error: Error) => {
      toast.error('Request Failed', error.message || 'Failed to create allocation request');
    },
  });
};

export const useApproveAllocationRequest = (): UseMutationResult<
  AllocationApprovalRequest,
  Error,
  { requestId: string; data?: ApproveAllocationRequest }
> => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ requestId, data }) =>
      resourceManagementService.approveAllocationRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.allocationRequests() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.myPendingApprovals() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.pendingApprovalsCount() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.capacity() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.workload() });
      toast.success('Request Approved', 'Allocation request has been approved');
    },
    onError: (error: Error) => {
      toast.error('Approval Failed', error.message || 'Failed to approve allocation request');
    },
  });
};

export const useRejectAllocationRequest = (): UseMutationResult<
  AllocationApprovalRequest,
  Error,
  { requestId: string; data: RejectAllocationRequest }
> => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ requestId, data }) =>
      resourceManagementService.rejectAllocationRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.allocationRequests() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.myPendingApprovals() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.pendingApprovalsCount() });
      toast.info('Request Rejected', 'Allocation request has been rejected');
    },
    onError: (error: Error) => {
      toast.error('Rejection Failed', error.message || 'Failed to reject allocation request');
    },
  });
};

export const useUpdateAllocation = (): UseMutationResult<
  EmployeeWorkload,
  Error,
  UpdateAllocationRequest
> => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (data) => resourceManagementService.updateAllocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.capacity() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.workload() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.allocationRequests() });
      toast.success('Allocation Updated', 'Resource allocation has been updated');
    },
    onError: (error: Error) => {
      toast.error('Update Failed', error.message || 'Failed to update allocation');
    },
  });
};

export const useValidateAllocation = (): UseMutationResult<
  AllocationValidationResult,
  Error,
  { employeeId: string; projectId: string; allocationPercentage: number }
> => {
  return useMutation({
    mutationFn: ({ employeeId, projectId, allocationPercentage }) =>
      resourceManagementService.validateAllocation(
        employeeId,
        projectId,
        allocationPercentage
      ),
  });
};

// ============================================
// AVAILABILITY QUERIES
// ============================================

export const useEmployeeAvailability = (
  employeeId: string,
  startDate: string,
  endDate: string,
  includeLeaves?: boolean,
  includeHolidays?: boolean
): UseQueryResult<EmployeeAvailability, Error> =>
  useQuery({
    queryKey: resourceKeys.employeeAvailability(employeeId, startDate, endDate),
    queryFn: () =>
      resourceManagementService.getEmployeeAvailability(
        employeeId,
        startDate,
        endDate,
        includeLeaves,
        includeHolidays
      ),
  });

export const useTeamAvailability = (
  filter: ResourceCalendarFilter
): UseQueryResult<TeamAvailabilityView, Error> =>
  useQuery({
    queryKey: resourceKeys.teamAvailability(filter),
    queryFn: () => resourceManagementService.getTeamAvailability(filter),
  });

export const useAggregatedAvailability = (
  startDate: string,
  endDate: string,
  departmentId?: string
): UseQueryResult<TeamAvailabilityView, Error> =>
  useQuery({
    queryKey: resourceKeys.aggregatedAvailability(startDate, endDate, departmentId),
    queryFn: () =>
      resourceManagementService.getAggregatedAvailability(startDate, endDate, departmentId),
  });

export const useHolidays = (
  startDate: string,
  endDate: string,
  locationId?: string
): UseQueryResult<Holiday[], Error> =>
  useQuery({
    queryKey: resourceKeys.holidays(startDate, endDate, locationId),
    queryFn: () =>
      resourceManagementService.getHolidays(startDate, endDate, locationId),
  });

// ============================================
// WORKLOAD QUERIES
// ============================================

export const useWorkloadDashboard = (
  filters?: WorkloadFilterOptions
): UseQueryResult<WorkloadDashboardData, Error> =>
  useQuery({
    queryKey: resourceKeys.workloadDashboard(filters),
    queryFn: () => resourceManagementService.getWorkloadDashboard(filters),
  });

export const useEmployeeWorkloads = (
  filters?: WorkloadFilterOptions,
  page: number = 0,
  size: number = 20
): UseQueryResult<PageResponse<EmployeeWorkload>, Error> =>
  useQuery({
    queryKey: [...resourceKeys.workloadEmployees(filters), page, size] as const,
    queryFn: () =>
      resourceManagementService.getEmployeeWorkloads(filters, page, size),
  });

export const useEmployeeWorkload = (
  employeeId: string
): UseQueryResult<EmployeeWorkload, Error> =>
  useQuery({
    queryKey: resourceKeys.workloadEmployeeDetail(employeeId),
    queryFn: () => resourceManagementService.getEmployeeWorkload(employeeId),
  });

export const useDepartmentWorkloads = (
  startDate?: string,
  endDate?: string
): UseQueryResult<DepartmentWorkload[], Error> =>
  useQuery({
    queryKey: resourceKeys.workloadDepartments(startDate, endDate),
    queryFn: () =>
      resourceManagementService.getDepartmentWorkloads(startDate, endDate),
  });

export const useWorkloadHeatmap = (
  startDate: string,
  endDate: string,
  departmentId?: string,
  limit?: number
): UseQueryResult<WorkloadHeatmapRow[], Error> =>
  useQuery({
    queryKey: resourceKeys.workloadHeatmap(startDate, endDate, departmentId),
    queryFn: () =>
      resourceManagementService.getWorkloadHeatmap(
        startDate,
        endDate,
        departmentId,
        limit
      ),
  });

export const useExportWorkloadReport = (): UseMutationResult<
  Blob,
  Error,
  { format: 'csv' | 'excel' | 'pdf'; filters?: WorkloadFilterOptions }
> => {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ format, filters }) =>
      resourceManagementService.exportWorkloadReport(format, filters),
    onSuccess: () => {
      toast.success('Export Complete', 'Workload report has been exported');
    },
    onError: (error: Error) => {
      toast.error('Export Failed', error.message || 'Failed to export workload report');
    },
  });
};

// ============================================
// RESOURCE POOL QUERIES
// ============================================

export const useResourceAllocationSummary = (): UseQueryResult<
  Array<{
    employeeId: string;
    employeeName: string;
    designation?: string;
    totalAllocationPercent: number;
    isOverAllocated: boolean;
    projects: Array<{
      projectId: string;
      projectName: string;
      role?: string;
      allocationPercent: number;
      startDate?: string;
      endDate?: string;
    }>;
  }>,
  Error
> =>
  useQuery({
    queryKey: resourceKeys.allocationSummary(),
    queryFn: () => resourceManagementService.getAllocationSummary(),
  });

export const useAvailableResources = (
  minAvailablePercent?: number
): UseQueryResult<
  Array<{
    employeeId: string;
    employeeName: string;
    designation?: string;
    currentAllocationPercent: number;
    availablePercent: number;
  }>,
  Error
> =>
  useQuery({
    queryKey: resourceKeys.availableResources(),
    queryFn: () =>
      resourceManagementService.getAvailableResources(minAvailablePercent),
  });

export const useEmployeeAllocationTimeline = (
  employeeId: string
): UseQueryResult<
  {
    employeeId: string;
    employeeName: string;
    timeline: Array<{
      projectId: string;
      projectName: string;
      startDate?: string;
      endDate?: string;
      allocationPercent: number;
      isActive: boolean;
    }>;
  },
  Error
> =>
  useQuery({
    queryKey: resourceKeys.employeeTimeline(employeeId),
    queryFn: () =>
      resourceManagementService.getEmployeeAllocationTimeline(employeeId),
  });

export const useReallocateResource = (): UseMutationResult<
  object,
  Error,
  { allocationId: string; data: { allocationPercentage?: number; role?: string; startDate?: string; endDate?: string } }
> => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ allocationId, data }) =>
      resourceManagementService.reallocate(allocationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.pool() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.capacity() });
      queryClient.invalidateQueries({ queryKey: resourceKeys.workload() });
      toast.success('Resource Reallocated', 'Resource has been reallocated successfully');
    },
    onError: (error: Error) => {
      toast.error('Reallocation Failed', error.message || 'Failed to reallocate resource');
    },
  });
};
