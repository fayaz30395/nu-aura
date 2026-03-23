import { apiClient } from '../api/client';
import type {
  CompensationReviewCycle,
  SalaryRevision,
  CompensationStatistics,
  CompensationCycleRequest,
  SalaryRevisionRequest,
  CycleStatus,
} from '../types/compensation';
import type { PaginatedResponse } from '../types/common';

const BASE_URL = '/compensation';

export const compensationService = {
  // Review Cycles
  async createCycle(data: CompensationCycleRequest): Promise<CompensationReviewCycle> {
    const response = await apiClient.post<CompensationReviewCycle>(`${BASE_URL}/cycles`, data);
    return response.data;
  },

  async getCycleById(cycleId: string): Promise<CompensationReviewCycle> {
    const response = await apiClient.get<CompensationReviewCycle>(`${BASE_URL}/cycles/${cycleId}`);
    return response.data;
  },

  async getAllCycles(page = 0, size = 10): Promise<PaginatedResponse<CompensationReviewCycle>> {
    const response = await apiClient.get<PaginatedResponse<CompensationReviewCycle>>(
      `${BASE_URL}/cycles?page=${page}&size=${size}`
    );
    return response.data;
  },

  async getActiveCycles(): Promise<CompensationReviewCycle[]> {
    const response = await apiClient.get<CompensationReviewCycle[]>(`${BASE_URL}/cycles/active`);
    return response.data;
  },

  async updateCycleStatus(cycleId: string, status: CycleStatus): Promise<CompensationReviewCycle> {
    const response = await apiClient.post<CompensationReviewCycle>(
      `${BASE_URL}/cycles/${cycleId}/status?status=${status}`
    );
    return response.data;
  },

  async getCycleStatistics(cycleId: string): Promise<CompensationStatistics> {
    const response = await apiClient.get<CompensationStatistics>(
      `${BASE_URL}/cycles/${cycleId}/statistics`
    );
    return response.data;
  },

  // Salary Revisions
  async createRevision(data: SalaryRevisionRequest): Promise<SalaryRevision> {
    const response = await apiClient.post<SalaryRevision>(`${BASE_URL}/revisions`, data);
    return response.data;
  },

  async getRevisionById(revisionId: string): Promise<SalaryRevision> {
    const response = await apiClient.get<SalaryRevision>(`${BASE_URL}/revisions/${revisionId}`);
    return response.data;
  },

  async getAllRevisions(page = 0, size = 10): Promise<PaginatedResponse<SalaryRevision>> {
    const response = await apiClient.get<PaginatedResponse<SalaryRevision>>(
      `${BASE_URL}/revisions?page=${page}&size=${size}`
    );
    return response.data;
  },

  async getRevisionsByCycle(cycleId: string, page = 0, size = 10): Promise<PaginatedResponse<SalaryRevision>> {
    const response = await apiClient.get<PaginatedResponse<SalaryRevision>>(
      `${BASE_URL}/cycles/${cycleId}/revisions?page=${page}&size=${size}`
    );
    return response.data;
  },

  async getEmployeeRevisionHistory(employeeId: string): Promise<SalaryRevision[]> {
    const response = await apiClient.get<SalaryRevision[]>(
      `${BASE_URL}/employees/${employeeId}/revisions`
    );
    return response.data;
  },

  async getPendingApprovals(page = 0, size = 10): Promise<PaginatedResponse<SalaryRevision>> {
    const response = await apiClient.get<PaginatedResponse<SalaryRevision>>(
      `${BASE_URL}/revisions/pending?page=${page}&size=${size}`
    );
    return response.data;
  },

  // Revision Workflow
  async submitRevision(revisionId: string): Promise<SalaryRevision> {
    const response = await apiClient.post<SalaryRevision>(`${BASE_URL}/revisions/${revisionId}/submit`);
    return response.data;
  },

  async reviewRevision(revisionId: string, comments?: string): Promise<SalaryRevision> {
    const params = comments ? `?comments=${encodeURIComponent(comments)}` : '';
    const response = await apiClient.post<SalaryRevision>(
      `${BASE_URL}/revisions/${revisionId}/review${params}`
    );
    return response.data;
  },

  async approveRevision(revisionId: string, comments?: string): Promise<SalaryRevision> {
    const params = comments ? `?comments=${encodeURIComponent(comments)}` : '';
    const response = await apiClient.post<SalaryRevision>(
      `${BASE_URL}/revisions/${revisionId}/approve${params}`
    );
    return response.data;
  },

  async rejectRevision(revisionId: string, reason: string): Promise<SalaryRevision> {
    const response = await apiClient.post<SalaryRevision>(
      `${BASE_URL}/revisions/${revisionId}/reject?reason=${encodeURIComponent(reason)}`
    );
    return response.data;
  },

  async applyRevision(revisionId: string): Promise<SalaryRevision> {
    const response = await apiClient.post<SalaryRevision>(`${BASE_URL}/revisions/${revisionId}/apply`);
    return response.data;
  },
};
