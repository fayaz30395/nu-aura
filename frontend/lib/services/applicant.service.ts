import { apiClient } from '../api/client';
import type {
  Applicant,
  ApplicantRequest,
  ApplicantStatusUpdate,
  PageResponse,
  PipelineData,
} from '../types/applicant';

class ApplicantService {
  async createApplicant(data: ApplicantRequest): Promise<Applicant> {
    const response = await apiClient.post<Applicant>('/recruitment/applicants', data);
    return response.data;
  }

  async getApplicant(id: string): Promise<Applicant> {
    const response = await apiClient.get<Applicant>(`/recruitment/applicants/${id}`);
    return response.data;
  }

  async listApplicants(params: {
    jobOpeningId?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Applicant>> {
    const response = await apiClient.get<PageResponse<Applicant>>('/recruitment/applicants', {
      params,
    });
    return response.data;
  }

  async updateStatus(id: string, data: ApplicantStatusUpdate): Promise<Applicant> {
    const response = await apiClient.put<Applicant>(`/recruitment/applicants/${id}/status`, data);
    return response.data;
  }

  async getPipeline(jobOpeningId: string): Promise<PipelineData> {
    const response = await apiClient.get<{ pipeline: PipelineData }>(
      `/recruitment/applicants/pipeline/${jobOpeningId}`
    );
    return response.data.pipeline;
  }

  async rateApplicant(id: string, rating: number): Promise<Applicant> {
    const response = await apiClient.put<Applicant>(`/recruitment/applicants/${id}/rating`, null, {
      params: { rating },
    });
    return response.data;
  }

  async deleteApplicant(id: string): Promise<void> {
    await apiClient.delete(`/recruitment/applicants/${id}`);
  }
}

export const applicantService = new ApplicantService();
