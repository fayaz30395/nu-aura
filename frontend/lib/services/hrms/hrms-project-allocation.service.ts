import { apiClient } from '../../api/client';
import { logger } from '@/lib/utils/logger';
import { AllocationPage, AllocationSummaryItem, AllocationSummaryPage, ProjectAllocation } from '../../types/hrms/hrms-allocation';

/**
 * Shape returned by GET /resources/allocation-summary (backend ResourceController).
 */
interface BackendAllocationSummaryEntry {
  employeeId: string;
  employeeName: string | null;
  designation: string | null;
  department: string | null;
  totalAllocationPercent: number;
  overAllocated: boolean;
  projects: {
    projectId: string;
    projectName: string | null;
    role: string | null;
    allocationPercent: number;
    startDate: string | null;
    endDate: string | null;
  }[];
}

/**
 * Map the flat backend response list into the paginated AllocationSummaryPage
 * the frontend page component expects.  Client-side filtering and pagination
 * are applied because the backend endpoint does not support them natively.
 */
function mapToAllocationSummaryPage(
  entries: BackendAllocationSummaryEntry[],
  page: number,
  size: number,
  employeeSearch?: string,
  employeeId?: string
): AllocationSummaryPage {
  let filtered = entries;

  if (employeeId) {
    filtered = filtered.filter((e) => e.employeeId === employeeId);
  }

  if (employeeSearch) {
    const term = employeeSearch.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        (e.employeeName ?? '').toLowerCase().includes(term) ||
        (e.designation ?? '').toLowerCase().includes(term)
    );
  }

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const slice = filtered.slice(start, start + size);

  const content: AllocationSummaryItem[] = slice.map((entry) => ({
    employeeId: entry.employeeId,
    employeeCode: null as string | null,
    employeeName: entry.employeeName,
    employeeEmail: null as string | null,
    allocationPercent: entry.totalAllocationPercent,
    activeProjectCount: entry.projects?.length ?? 0,
    overAllocated: entry.overAllocated,
  }));

  return { content, totalElements, totalPages, size, number: page };
}

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
    _scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG',
    _startDate: string,
    _endDate: string,
    page = 0,
    size = 20,
    employeeSearch?: string,
    employeeId?: string
  ): Promise<AllocationSummaryPage> {
    try {
      // Backend endpoint: GET /api/v1/resources/allocation-summary
      // Returns List<AllocationSummaryResponse> (flat list, no pagination).
      // We map and paginate client-side.
      const response = await apiClient.get<BackendAllocationSummaryEntry[]>(
        '/resources/allocation-summary'
      );
      return mapToAllocationSummaryPage(response.data, page, size, employeeSearch, employeeId);
    } catch (error) {
      logger.error('Failed to list allocation summary:', error);
      throw error;
    }
  },

  async exportAllocationSummary(
    _scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG',
    _startDate: string,
    _endDate: string,
    employeeSearch?: string,
    employeeId?: string
  ): Promise<Blob> {
    try {
      // No dedicated backend export endpoint exists for allocation summary.
      // Fetch the summary data and build a CSV blob client-side.
      const response = await apiClient.get<BackendAllocationSummaryEntry[]>(
        '/resources/allocation-summary'
      );

      let entries = response.data;
      if (employeeId) {
        entries = entries.filter((e) => e.employeeId === employeeId);
      }
      if (employeeSearch) {
        const term = employeeSearch.toLowerCase();
        entries = entries.filter(
          (e) =>
            (e.employeeName ?? '').toLowerCase().includes(term) ||
            (e.designation ?? '').toLowerCase().includes(term)
        );
      }

      const header = 'Employee Name,Designation,Department,Allocation %,Over-Allocated,Active Projects\n';
      const rows = entries
        .map((e) =>
          [
            `"${(e.employeeName ?? '').replace(/"/g, '""')}"`,
            `"${(e.designation ?? '').replace(/"/g, '""')}"`,
            `"${(e.department ?? '').replace(/"/g, '""')}"`,
            e.totalAllocationPercent,
            e.overAllocated ? 'Yes' : 'No',
            e.projects?.length ?? 0,
          ].join(',')
        )
        .join('\n');

      return new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    } catch (error) {
      logger.error('Failed to export allocation summary:', error);
      throw error;
    }
  },
};
