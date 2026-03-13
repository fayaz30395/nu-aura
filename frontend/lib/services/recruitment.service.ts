import { apiClient } from '../api/client';
import {
  JobOpening,
  CreateJobOpeningRequest,
  Candidate,
  CreateCandidateRequest,
  Interview,
  CreateInterviewRequest,
  Page,
  JobStatus,
  AcceptOfferRequest,
  DeclineOfferRequest,
  MoveStageRequest,
  CreateOfferRequest,
} from '../types/recruitment';

class RecruitmentService {
  // ==================== Job Opening Methods ====================

  async createJobOpening(data: CreateJobOpeningRequest): Promise<JobOpening> {
    const response = await apiClient.post<JobOpening>('/recruitment/job-openings', data);
    return response.data;
  }

  async updateJobOpening(id: string, data: CreateJobOpeningRequest): Promise<JobOpening> {
    const response = await apiClient.put<JobOpening>(`/recruitment/job-openings/${id}`, data);
    return response.data;
  }

  async getJobOpening(id: string): Promise<JobOpening> {
    const response = await apiClient.get<JobOpening>(`/recruitment/job-openings/${id}`);
    return response.data;
  }

  async getAllJobOpenings(page: number = 0, size: number = 20): Promise<Page<JobOpening>> {
    const response = await apiClient.get<Page<JobOpening>>('/recruitment/job-openings', {
      params: { page, size },
    });
    return response.data;
  }

  async getJobOpeningsByStatus(status: JobStatus): Promise<JobOpening[]> {
    const response = await apiClient.get<JobOpening[]>(`/recruitment/job-openings/status/${status}`);
    return response.data;
  }

  async deleteJobOpening(id: string): Promise<void> {
    await apiClient.delete(`/recruitment/job-openings/${id}`);
  }

  // ==================== Candidate Methods ====================

  async createCandidate(data: CreateCandidateRequest): Promise<Candidate> {
    const response = await apiClient.post<Candidate>('/recruitment/candidates', data);
    return response.data;
  }

  async updateCandidate(id: string, data: CreateCandidateRequest): Promise<Candidate> {
    const response = await apiClient.put<Candidate>(`/recruitment/candidates/${id}`, data);
    return response.data;
  }

  async getCandidate(id: string): Promise<Candidate> {
    const response = await apiClient.get<Candidate>(`/recruitment/candidates/${id}`);
    return response.data;
  }

  async getAllCandidates(page: number = 0, size: number = 20): Promise<Page<Candidate>> {
    const response = await apiClient.get<Page<Candidate>>('/recruitment/candidates', {
      params: { page, size },
    });
    return response.data;
  }

  async getCandidatesByJobOpening(jobOpeningId: string): Promise<Candidate[]> {
    const response = await apiClient.get<Candidate[]>(`/recruitment/candidates/job-opening/${jobOpeningId}`);
    return response.data;
  }

  async deleteCandidate(id: string): Promise<void> {
    await apiClient.delete(`/recruitment/candidates/${id}`);
  }

  async getCandidatesByJob(jobId: string): Promise<Candidate[]> {
    const response = await apiClient.get<Page<Candidate>>(`/recruitment/candidates/job-opening/${jobId}`);
    return response.data.content;
  }

  async moveCandidateStage(candidateId: string, data: MoveStageRequest): Promise<Candidate> {
    const response = await apiClient.put<Candidate>(`/recruitment/candidates/${candidateId}/stage`, data);
    return response.data;
  }

  async createOffer(candidateId: string, data: CreateOfferRequest): Promise<Candidate> {
    const response = await apiClient.post<Candidate>(`/recruitment/candidates/${candidateId}/offer`, data);
    return response.data;
  }

  // ==================== Offer Response Methods ====================

  async acceptOffer(candidateId: string, data?: AcceptOfferRequest): Promise<Candidate> {
    const response = await apiClient.post<Candidate>(
      `/recruitment/candidates/${candidateId}/accept-offer`,
      data || {}
    );
    return response.data;
  }

  async declineOffer(candidateId: string, data?: DeclineOfferRequest): Promise<Candidate> {
    const response = await apiClient.post<Candidate>(
      `/recruitment/candidates/${candidateId}/decline-offer`,
      data || {}
    );
    return response.data;
  }

  // ==================== Interview Methods ====================

  async getAllInterviews(page: number = 0, size: number = 100): Promise<Page<Interview>> {
    const response = await apiClient.get<Page<Interview>>('/recruitment/interviews', {
      params: { page, size },
    });
    return response.data;
  }

  async scheduleInterview(data: CreateInterviewRequest): Promise<Interview> {
    const response = await apiClient.post<Interview>('/recruitment/interviews', data);
    return response.data;
  }

  async updateInterview(id: string, data: CreateInterviewRequest): Promise<Interview> {
    const response = await apiClient.put<Interview>(`/recruitment/interviews/${id}`, data);
    return response.data;
  }

  async getInterview(id: string): Promise<Interview> {
    const response = await apiClient.get<Interview>(`/recruitment/interviews/${id}`);
    return response.data;
  }

  async getInterviewsByCandidate(candidateId: string): Promise<Interview[]> {
    const response = await apiClient.get<Interview[]>(`/recruitment/interviews/candidate/${candidateId}`);
    return response.data;
  }

  async deleteInterview(id: string): Promise<void> {
    await apiClient.delete(`/recruitment/interviews/${id}`);
  }
}

export const recruitmentService = new RecruitmentService();
