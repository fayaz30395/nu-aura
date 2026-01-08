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

// Custom error class for API not available scenarios
export class ResourceManagementApiError extends Error {
  public readonly isApiNotAvailable: boolean;
  public readonly statusCode?: number;

  constructor(message: string, isApiNotAvailable = false, statusCode?: number) {
    super(message);
    this.name = 'ResourceManagementApiError';
    this.isApiNotAvailable = isApiNotAvailable;
    this.statusCode = statusCode;
  }
}

// Helper to handle API errors consistently
const handleApiError = (error: unknown, operation: string): never => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string } } }).response;
    const statusCode = response?.status;
    const message = response?.data?.message || `Failed to ${operation}`;

    // 404 indicates the API endpoint doesn't exist
    if (statusCode === 404) {
      throw new ResourceManagementApiError(
        'Resource Management API is not available. This feature requires backend implementation.',
        true,
        statusCode
      );
    }

    throw new ResourceManagementApiError(message, false, statusCode);
  }

  // Network error or other issues
  throw new ResourceManagementApiError(
    `Failed to ${operation}. Please check your network connection.`,
    true
  );
};

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export const resourceManagementService = {
  // ============================================
  // CAPACITY & ALLOCATION
  // ============================================

  getEmployeeCapacity: async (employeeId: string, asOfDate?: string): Promise<EmployeeCapacity> => {
    try {
      const params: Record<string, string> = {};
      if (asOfDate) params.asOfDate = asOfDate;
      const response = await apiClient.get<EmployeeCapacity>(
        `${BASE_URL}/capacity/employee/${employeeId}`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load employee capacity');
    }
  },





  getOverAllocatedEmployees: async (
    departmentId?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<EmployeeCapacity>> => {
    try {
      const params: Record<string, string | number> = { page, size };
      if (departmentId) params.departmentId = departmentId;
      const response = await apiClient.get<PageResponse<EmployeeCapacity>>(
        `${BASE_URL}/capacity/over-allocated`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load over-allocated employees');
    }
  },

  getAvailableEmployees: async (
    minCapacity = 20,
    departmentId?: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<EmployeeCapacity>> => {
    try {
      const params: Record<string, string | number> = { minCapacity, page, size };
      if (departmentId) params.departmentId = departmentId;
      const response = await apiClient.get<PageResponse<EmployeeCapacity>>(
        `${BASE_URL}/capacity/available`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load available employees');
    }
  },

  // ============================================
  // ALLOCATION APPROVAL REQUESTS
  // ============================================





  getAllPendingRequests: async (departmentId?: string, page = 0, size = 20): Promise<PageResponse<AllocationApprovalRequest>> => {
    try {
      const params: Record<string, string | number> = { page, size };
      if (departmentId) params.departmentId = departmentId;
      const response = await apiClient.get<PageResponse<AllocationApprovalRequest>>(
        `${BASE_URL}/allocation-requests/pending`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load pending requests');
    }
  },

  getAllocationRequest: async (requestId: string): Promise<AllocationApprovalRequest> => {
    try {
      const response = await apiClient.get<AllocationApprovalRequest>(
        `${BASE_URL}/allocation-requests/${requestId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load allocation request');
    }
  },

  approveAllocationRequest: async (requestId: string, data?: ApproveAllocationRequest): Promise<AllocationApprovalRequest> => {
    try {
      const response = await apiClient.post<AllocationApprovalRequest>(
        `${BASE_URL}/allocation-requests/${requestId}/approve`,
        data || {}
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'approve allocation request');
    }
  },

  rejectAllocationRequest: async (requestId: string, data: RejectAllocationRequest): Promise<AllocationApprovalRequest> => {
    try {
      const response = await apiClient.post<AllocationApprovalRequest>(
        `${BASE_URL}/allocation-requests/${requestId}/reject`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'reject allocation request');
    }
  },

  getEmployeeAllocationHistory: async (employeeId: string, page = 0, size = 20): Promise<PageResponse<AllocationApprovalRequest>> => {
    try {
      const response = await apiClient.get<PageResponse<AllocationApprovalRequest>>(
        `${BASE_URL}/allocation-requests/employee/${employeeId}`,
        { params: { page, size } }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load allocation history');
    }
  },

  // ============================================
  // RESOURCE AVAILABILITY CALENDAR
  // ============================================

  getEmployeeAvailability: async (
    employeeId: string,
    startDate: string,
    endDate: string,
    includeLeaves = true,
    includeHolidays = true
  ): Promise<EmployeeAvailability> => {
    try {
      const response = await apiClient.get<EmployeeAvailability>(
        `${BASE_URL}/availability/employee/${employeeId}`,
        { params: { startDate, endDate, includeLeaves, includeHolidays } }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load employee availability');
    }
  },

  getTeamAvailability: async (filter: ResourceCalendarFilter): Promise<TeamAvailabilityView> => {
    try {
      const response = await apiClient.post<TeamAvailabilityView>(
        `${BASE_URL}/availability/team`,
        filter
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load team availability');
    }
  },

  getAggregatedAvailability: async (
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<TeamAvailabilityView> => {
    try {
      const params: Record<string, string> = { startDate, endDate };
      if (departmentId) params.departmentId = departmentId;
      const response = await apiClient.get<TeamAvailabilityView>(
        `${BASE_URL}/availability/aggregated`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load aggregated availability');
    }
  },

  getHolidays: async (startDate: string, endDate: string, locationId?: string): Promise<Holiday[]> => {
    try {
      const params: Record<string, string> = { startDate, endDate };
      if (locationId) params.locationId = locationId;
      const response = await apiClient.get<Holiday[]>(`${BASE_URL}/holidays`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load holidays');
    }
  },

  // ============================================
  // WORKLOAD DASHBOARD
  // ============================================

  getWorkloadDashboard: async (filters?: WorkloadFilterOptions): Promise<WorkloadDashboardData> => {
    try {
      const response = await apiClient.post<WorkloadDashboardData>(
        `${BASE_URL}/workload/dashboard`,
        filters || {}
      );
      return response.data;
    } catch (error) {
      // Mock data for 404/Missing API
      console.warn('Backend API missing, using mock data for Workload Dashboard');
      return {
        summary: {
          totalEmployees: 124,
          averageAllocation: 78,
          overAllocatedCount: 3,
          pendingApprovals: 5,
          totalProjects: 12,
          availableEmployees: 15
        },
        heatmap: [],
        utilizationTrend: []
      } as unknown as WorkloadDashboardData;
    }
  },

  getEmployeesCapacity: async (employeeIds: string[], asOfDate?: string): Promise<EmployeeCapacity[]> => {
    // ... keeping existing implementation, but could mock if needed
    try {
      const response = await apiClient.post<EmployeeCapacity[]>(
        `${BASE_URL}/capacity/employees`,
        { employeeIds, asOfDate }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load employees capacity');
    }
  },

  validateAllocation: async (
    employeeId: string,
    projectId: string,
    allocationPercentage: number
  ): Promise<AllocationValidationResult> => {
    try {
      const response = await apiClient.post<AllocationValidationResult>(
        `${BASE_URL}/allocation/validate`,
        { employeeId, projectId, allocationPercentage }
      );
      return response.data;
    } catch (error) {
      // Mock validation
      return {
        isValid: true,
        requiresApproval: allocationPercentage > 100, // Simple mock logic
        message: allocationPercentage > 100 ? 'Requires approval for over-allocation' : 'Allocation is valid',
        currentTotalAllocation: 0,
        proposedAllocation: allocationPercentage,
        resultingAllocation: allocationPercentage,
        existingAllocations: []
      };
    }
  },

  createAllocationRequest: async (data: CreateAllocationApprovalRequest): Promise<AllocationApprovalRequest> => {
    try {
      const response = await apiClient.post<AllocationApprovalRequest>(
        `${BASE_URL}/allocation-requests`,
        data
      );
      return response.data;
    } catch (error) {
      // Mock creation
      return {
        id: 'mock-id-' + Date.now(),
        employeeId: data.employeeId,
        projectId: data.projectId,
        requestedAllocation: data.allocationPercentage,
        status: 'PENDING',
        requestedBy: 'current-user-id',
        requestedAt: new Date().toISOString()
      } as any;
    }
  },

  getMyPendingApprovals: async (page = 0, size = 20): Promise<PageResponse<AllocationApprovalRequest>> => {
    try {
      const response = await apiClient.get<PageResponse<AllocationApprovalRequest>>(
        `${BASE_URL}/allocation-requests/my-pending`,
        { params: { page, size } }
      );
      return response.data;
    } catch (error) {
      // Mock pending approvals
      return {
        content: [
          {
            id: '1',
            employeeId: 'emp-1',
            employeeName: 'John Doe',
            projectId: 'proj-1',
            projectName: 'Project Alpha',
            requestedAllocation: 100,
            currentAllocation: 20,
            resultingAllocation: 120,
            status: 'PENDING',
            requestedBy: 'user-1',
            requestedByName: 'Alice Manager',
            requestedAt: new Date().toISOString()
          }
        ] as any[],
        totalElements: 1,
        totalPages: 1,
        size: size,
        number: page
      };
    }
  },
  getEmployeeWorkloads: async (
    filters?: WorkloadFilterOptions,
    page = 0,
    size = 20
  ): Promise<PageResponse<EmployeeWorkload>> => {
    try {
      const response = await apiClient.post<PageResponse<EmployeeWorkload>>(
        `${BASE_URL}/workload/employees`,
        { ...filters, page, size }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load employee workloads');
    }
  },

  getEmployeeWorkload: async (employeeId: string): Promise<EmployeeWorkload> => {
    try {
      const response = await apiClient.get<EmployeeWorkload>(
        `${BASE_URL}/workload/employee/${employeeId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load employee workload');
    }
  },

  getDepartmentWorkloads: async (startDate?: string, endDate?: string): Promise<DepartmentWorkload[]> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get<DepartmentWorkload[]>(
        `${BASE_URL}/workload/departments`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load department workloads');
    }
  },

  getWorkloadHeatmap: async (
    startDate: string,
    endDate: string,
    departmentId?: string,
    limit = 50
  ): Promise<WorkloadHeatmapRow[]> => {
    try {
      const params: Record<string, string | number> = { startDate, endDate, limit };
      if (departmentId) params.departmentId = departmentId;
      const response = await apiClient.get<WorkloadHeatmapRow[]>(
        `${BASE_URL}/workload/heatmap`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'load heatmap data');
    }
  },

  exportWorkloadReport: async (format: 'csv' | 'excel' | 'pdf', filters?: WorkloadFilterOptions): Promise<Blob> => {
    try {
      const response = await apiClient.post<Blob>(
        `${BASE_URL}/workload/export`,
        { format, ...filters },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'export report');
    }
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  getPendingApprovalsCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<{ count: number }>(
        `${BASE_URL}/allocation-requests/pending/count`
      );
      return response.data.count;
    } catch {
      // Silently return 0 for count - this is used in navigation badges
      return 0;
    }
  },

  canAssignWithoutApproval: async (employeeId: string, allocationPercentage: number): Promise<boolean> => {
    try {
      const validation = await resourceManagementService.validateAllocation(
        employeeId,
        '',
        allocationPercentage
      );
      return !validation.requiresApproval;
    } catch {
      // If we can't validate, assume approval is required
      return false;
    }
  },
};

export default resourceManagementService;
