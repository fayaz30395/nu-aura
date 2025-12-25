import { apiClient } from '../api/client';
import {
  EmployeeCapacity,
  AllocationApprovalRequest,
  CreateAllocationApprovalRequest,
  ApproveAllocationRequest,
  RejectAllocationRequest,
  AllocationValidationResult,
  EmployeeAvailability,
  TeamAvailabilityView,
  ResourceCalendarFilter,
  Holiday,
  WorkloadDashboardData,
  WorkloadFilterOptions,
  EmployeeWorkload,
  DepartmentWorkload,
  WorkloadHeatmapRow,
} from '../types/resource-management';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const BASE_URL = '/resource-management';

export const resourceManagementService = {
  // ============================================
  // CAPACITY & ALLOCATION
  // ============================================

  /**
   * Get employee's current capacity with all allocations
   */
  getEmployeeCapacity: async (employeeId: string, asOfDate?: string): Promise<EmployeeCapacity> => {
    const params: Record<string, string> = {};
    if (asOfDate) params.asOfDate = asOfDate;

    const response = await apiClient.get<EmployeeCapacity>(
      `${BASE_URL}/capacity/employee/${employeeId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get capacity for multiple employees (bulk)
   */
  getEmployeesCapacity: async (
    employeeIds: string[],
    asOfDate?: string
  ): Promise<EmployeeCapacity[]> => {
    const response = await apiClient.post<EmployeeCapacity[]>(
      `${BASE_URL}/capacity/employees`,
      { employeeIds, asOfDate }
    );
    return response.data;
  },

  /**
   * Validate allocation before assignment (check if approval is needed)
   */
  validateAllocation: async (
    employeeId: string,
    projectId: string,
    allocationPercentage: number
  ): Promise<AllocationValidationResult> => {
    const response = await apiClient.post<AllocationValidationResult>(
      `${BASE_URL}/allocation/validate`,
      { employeeId, projectId, allocationPercentage }
    );
    return response.data;
  },

  /**
   * Get all over-allocated employees
   */
  getOverAllocatedEmployees: async (
    departmentId?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<EmployeeCapacity>> => {
    const params: Record<string, string | number> = { page, size };
    if (departmentId) params.departmentId = departmentId;

    const response = await apiClient.get<PageResponse<EmployeeCapacity>>(
      `${BASE_URL}/capacity/over-allocated`,
      { params }
    );
    return response.data;
  },

  /**
   * Get employees with available capacity
   */
  getAvailableEmployees: async (
    minCapacity = 20,
    departmentId?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<EmployeeCapacity>> => {
    const params: Record<string, string | number> = { minCapacity, page, size };
    if (departmentId) params.departmentId = departmentId;

    const response = await apiClient.get<PageResponse<EmployeeCapacity>>(
      `${BASE_URL}/capacity/available`,
      { params }
    );
    return response.data;
  },

  // ============================================
  // ALLOCATION APPROVAL REQUESTS
  // ============================================

  /**
   * Create an allocation approval request (for over-allocation)
   */
  createAllocationRequest: async (
    data: CreateAllocationApprovalRequest
  ): Promise<AllocationApprovalRequest> => {
    const response = await apiClient.post<AllocationApprovalRequest>(
      `${BASE_URL}/allocation-requests`,
      data
    );
    return response.data;
  },

  /**
   * Get pending approval requests for the current user (as approver)
   */
  getMyPendingApprovals: async (
    page = 0,
    size = 20
  ): Promise<PageResponse<AllocationApprovalRequest>> => {
    const response = await apiClient.get<PageResponse<AllocationApprovalRequest>>(
      `${BASE_URL}/allocation-requests/my-pending`,
      { params: { page, size } }
    );
    return response.data;
  },

  /**
   * Get all pending allocation requests (for admins)
   */
  getAllPendingRequests: async (
    departmentId?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<AllocationApprovalRequest>> => {
    const params: Record<string, string | number> = { page, size };
    if (departmentId) params.departmentId = departmentId;

    const response = await apiClient.get<PageResponse<AllocationApprovalRequest>>(
      `${BASE_URL}/allocation-requests/pending`,
      { params }
    );
    return response.data;
  },

  /**
   * Get allocation request by ID
   */
  getAllocationRequest: async (requestId: string): Promise<AllocationApprovalRequest> => {
    const response = await apiClient.get<AllocationApprovalRequest>(
      `${BASE_URL}/allocation-requests/${requestId}`
    );
    return response.data;
  },

  /**
   * Approve an allocation request
   */
  approveAllocationRequest: async (
    requestId: string,
    data?: ApproveAllocationRequest
  ): Promise<AllocationApprovalRequest> => {
    const response = await apiClient.post<AllocationApprovalRequest>(
      `${BASE_URL}/allocation-requests/${requestId}/approve`,
      data || {}
    );
    return response.data;
  },

  /**
   * Reject an allocation request
   */
  rejectAllocationRequest: async (
    requestId: string,
    data: RejectAllocationRequest
  ): Promise<AllocationApprovalRequest> => {
    const response = await apiClient.post<AllocationApprovalRequest>(
      `${BASE_URL}/allocation-requests/${requestId}/reject`,
      data
    );
    return response.data;
  },

  /**
   * Get allocation request history for an employee
   */
  getEmployeeAllocationHistory: async (
    employeeId: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<AllocationApprovalRequest>> => {
    const response = await apiClient.get<PageResponse<AllocationApprovalRequest>>(
      `${BASE_URL}/allocation-requests/employee/${employeeId}`,
      { params: { page, size } }
    );
    return response.data;
  },

  // ============================================
  // RESOURCE AVAILABILITY CALENDAR
  // ============================================

  /**
   * Get availability for a single employee
   */
  getEmployeeAvailability: async (
    employeeId: string,
    startDate: string,
    endDate: string,
    includeLeaves = true,
    includeHolidays = true
  ): Promise<EmployeeAvailability> => {
    const response = await apiClient.get<EmployeeAvailability>(
      `${BASE_URL}/availability/employee/${employeeId}`,
      {
        params: { startDate, endDate, includeLeaves, includeHolidays },
      }
    );
    return response.data;
  },

  /**
   * Get team/department availability (calendar view)
   */
  getTeamAvailability: async (filter: ResourceCalendarFilter): Promise<TeamAvailabilityView> => {
    const response = await apiClient.post<TeamAvailabilityView>(
      `${BASE_URL}/availability/team`,
      filter
    );
    return response.data;
  },

  /**
   * Get aggregated availability for a period
   */
  getAggregatedAvailability: async (
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<TeamAvailabilityView> => {
    const params: Record<string, string> = { startDate, endDate };
    if (departmentId) params.departmentId = departmentId;

    const response = await apiClient.get<TeamAvailabilityView>(
      `${BASE_URL}/availability/aggregated`,
      { params }
    );
    return response.data;
  },

  /**
   * Get holidays for a period
   */
  getHolidays: async (
    startDate: string,
    endDate: string,
    locationId?: string
  ): Promise<Holiday[]> => {
    const params: Record<string, string> = { startDate, endDate };
    if (locationId) params.locationId = locationId;

    const response = await apiClient.get<Holiday[]>(`${BASE_URL}/holidays`, { params });
    return response.data;
  },

  // ============================================
  // WORKLOAD DASHBOARD
  // ============================================

  /**
   * Get comprehensive workload dashboard data
   */
  getWorkloadDashboard: async (filters?: WorkloadFilterOptions): Promise<WorkloadDashboardData> => {
    const response = await apiClient.post<WorkloadDashboardData>(
      `${BASE_URL}/workload/dashboard`,
      filters || {}
    );
    return response.data;
  },

  /**
   * Get individual employee workloads with pagination
   */
  getEmployeeWorkloads: async (
    filters?: WorkloadFilterOptions,
    page = 0,
    size = 20
  ): Promise<PageResponse<EmployeeWorkload>> => {
    const response = await apiClient.post<PageResponse<EmployeeWorkload>>(
      `${BASE_URL}/workload/employees`,
      { ...filters, page, size }
    );
    return response.data;
  },

  /**
   * Get single employee workload details
   */
  getEmployeeWorkload: async (employeeId: string): Promise<EmployeeWorkload> => {
    const response = await apiClient.get<EmployeeWorkload>(
      `${BASE_URL}/workload/employee/${employeeId}`
    );
    return response.data;
  },

  /**
   * Get department-level workload aggregations
   */
  getDepartmentWorkloads: async (
    startDate?: string,
    endDate?: string
  ): Promise<DepartmentWorkload[]> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiClient.get<DepartmentWorkload[]>(
      `${BASE_URL}/workload/departments`,
      { params }
    );
    return response.data;
  },

  /**
   * Get workload heatmap data
   */
  getWorkloadHeatmap: async (
    startDate: string,
    endDate: string,
    departmentId?: string,
    limit = 50
  ): Promise<WorkloadHeatmapRow[]> => {
    const params: Record<string, string | number> = { startDate, endDate, limit };
    if (departmentId) params.departmentId = departmentId;

    const response = await apiClient.get<WorkloadHeatmapRow[]>(
      `${BASE_URL}/workload/heatmap`,
      { params }
    );
    return response.data;
  },

  /**
   * Export workload report
   */
  exportWorkloadReport: async (
    format: 'csv' | 'excel' | 'pdf',
    filters?: WorkloadFilterOptions
  ): Promise<Blob> => {
    const response = await apiClient.post<Blob>(
      `${BASE_URL}/workload/export`,
      { format, ...filters },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get pending approvals count for badge display
   */
  getPendingApprovalsCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>(
      `${BASE_URL}/allocation-requests/pending/count`
    );
    return response.data.count;
  },

  /**
   * Check if an employee can be assigned to a project without approval
   */
  canAssignWithoutApproval: async (
    employeeId: string,
    allocationPercentage: number
  ): Promise<boolean> => {
    const validation = await resourceManagementService.validateAllocation(
      employeeId,
      '', // project doesn't matter for this check
      allocationPercentage
    );
    return !validation.requiresApproval;
  },
};

export default resourceManagementService;
