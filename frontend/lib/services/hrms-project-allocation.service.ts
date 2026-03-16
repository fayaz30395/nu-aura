import { apiClient } from '../api/client';
import { logger } from '@/lib/utils/logger';
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
    try {
      const response = await apiClient.post<ProjectAllocation>(
        `/projects/${projectId}/assign`,
        request
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to assign employee:', error);
      throw error;
    }
  },

  async listProjectAllocations(projectId: string, page = 0, size = 20): Promise<AllocationPage> {
    try {
      const response = await apiClient.get<AllocationPage>(`/projects/${projectId}/allocations`, {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to list project allocations:', error);
      throw error;
    }
  },

  async exportProjectAllocations(projectId: string): Promise<Blob> {
    try {
      const response = await apiClient.get<Blob>(`/projects/${projectId}/allocations/export`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to export project allocations:', error);
      throw error;
    }
  },

  async endAllocation(projectId: string, allocationId: string, endDate?: string): Promise<ProjectAllocation> {
    try {
      const response = await apiClient.post<ProjectAllocation>(
        `/projects/${projectId}/allocations/${allocationId}/end`,
        endDate ? { endDate } : {}
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to end allocation:', error);
      throw error;
    }
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
    try {
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
    } catch (error) {
      logger.error('Failed to list allocation summary:', error);
      throw error;
    }
  },

  async exportAllocationSummary(
    scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG',
    startDate: string,
    endDate: string,
    employeeSearch?: string,
    employeeId?: string
  ): Promise<Blob> {
    try {
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
    } catch (error) {
      logger.error('Failed to export allocation summary:', error);
      throw error;
    }
  },
};
