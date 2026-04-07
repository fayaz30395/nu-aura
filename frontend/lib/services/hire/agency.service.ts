import { apiClient } from '../../api/client';
import {
  RecruitmentAgency,
  AgencySubmission,
  AgencyPerformance,
  CreateAgencyRequest,
  UpdateAgencyRequest,
  CreateSubmissionRequest,
  UpdateSubmissionStatusRequest,
  AgencyStatus,
  Page,
} from '../../types/hire/recruitment';

class AgencyService {
  // ─── Agency CRUD ──────────────────────────────────────────────────────────

  async createAgency(data: CreateAgencyRequest): Promise<RecruitmentAgency> {
    const response = await apiClient.post<RecruitmentAgency>(
      '/recruitment/agencies',
      data
    );
    return response.data;
  }

  async listAgencies(
    page: number = 0,
    size: number = 20,
    status?: AgencyStatus,
    search?: string
  ): Promise<Page<RecruitmentAgency>> {
    const params: Record<string, unknown> = { page, size };
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await apiClient.get<Page<RecruitmentAgency>>(
      '/recruitment/agencies',
      { params }
    );
    return response.data;
  }

  async getAgency(id: string): Promise<RecruitmentAgency> {
    const response = await apiClient.get<RecruitmentAgency>(
      `/recruitment/agencies/${id}`
    );
    return response.data;
  }

  async updateAgency(
    id: string,
    data: UpdateAgencyRequest
  ): Promise<RecruitmentAgency> {
    const response = await apiClient.put<RecruitmentAgency>(
      `/recruitment/agencies/${id}`,
      data
    );
    return response.data;
  }

  async deleteAgency(id: string): Promise<void> {
    await apiClient.delete(`/recruitment/agencies/${id}`);
  }

  // ─── Submissions ──────────────────────────────────────────────────────────

  async submitCandidate(
    agencyId: string,
    data: CreateSubmissionRequest
  ): Promise<AgencySubmission> {
    const response = await apiClient.post<AgencySubmission>(
      `/recruitment/agencies/${agencyId}/submissions`,
      data
    );
    return response.data;
  }

  async updateSubmissionStatus(
    agencyId: string,
    submissionId: string,
    data: UpdateSubmissionStatusRequest
  ): Promise<AgencySubmission> {
    const response = await apiClient.put<AgencySubmission>(
      `/recruitment/agencies/${agencyId}/submissions/${submissionId}/status`,
      data
    );
    return response.data;
  }

  async getAgencySubmissions(
    agencyId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<AgencySubmission>> {
    const response = await apiClient.get<Page<AgencySubmission>>(
      `/recruitment/agencies/${agencyId}/submissions`,
      { params: { page, size } }
    );
    return response.data;
  }

  async getSubmissionsByJob(
    jobOpeningId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<AgencySubmission>> {
    const response = await apiClient.get<Page<AgencySubmission>>(
      `/recruitment/agencies/submissions/job/${jobOpeningId}`,
      { params: { page, size } }
    );
    return response.data;
  }

  // ─── Performance ──────────────────────────────────────────────────────────

  async getAgencyPerformance(agencyId: string): Promise<AgencyPerformance> {
    const response = await apiClient.get<AgencyPerformance>(
      `/recruitment/agencies/${agencyId}/performance`
    );
    return response.data;
  }
}

export const agencyService = new AgencyService();
