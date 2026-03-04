import { apiClient } from '../api/client';
import { AllocationPage, AllocationSummaryPage, ProjectAllocation } from '../types/hrms-allocation';

export const hrmsProjectAllocationService = {
  async assignEmployee(
    projectId: string,
    request: {
      employeeId: string;
      role: string;
      allocationPercentage: number;
      startDate: string;
      endDate?: string;
    }
  ): Promise<ProjectAllocation> {
    const response = await apiClient.post<ProjectAllocation>(
      `/projects/${projectId}/assign`,
      request
    );
    return response.data;
  },

  async listProjectAllocations(projectId: string, page = 0, size = 20): Promise<AllocationPage> {
    const response = await apiClient.get<AllocationPage>(`/projects/${projectId}/allocations`, {
      params: { page, size },
    });
    return response.data;
  },

  async exportProjectAllocations(projectId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/projects/${projectId}/allocations/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async endAllocation(projectId: string, allocationId: string, endDate?: string): Promise<ProjectAllocation> {
    const response = await apiClient.post<ProjectAllocation>(
      `/projects/${projectId}/allocations/${allocationId}/end`,
      endDate ? { endDate } : undefined
    );
    return response.data;
  },

  async listAllocationSummary(
    scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG',
    startDate: string,
    endDate: string,
    page = 0,
    size = 20,
    employeeSearch?: string,
    employeeId?: string
  ): Promise<AllocationSummaryPage> {
    const response = await apiClient.get<AllocationSummaryPage>('/allocations/summary', {
      params: {
        scope,
        startDate,
        endDate,
        page,
        size,
        employeeSearch: employeeSearch || undefined,
        employeeId: employeeId || undefined,
      },
    });
    return response.data;
  },

  async exportAllocationSummary(
    scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG',
    startDate: string,
    endDate: string,
    employeeSearch?: string,
    employeeId?: string
  ): Promise<Blob> {
    const response = await apiClient.get<Blob>('/allocations/export', {
      params: {
        summary: true,
        scope,
        startDate,
        endDate,
        employeeSearch: employeeSearch || undefined,
        employeeId: employeeId || undefined,
      },
      responseType: 'blob',
    });
    return response.data;
  },
};
