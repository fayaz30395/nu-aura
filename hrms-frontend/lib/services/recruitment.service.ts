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

  // ==================== Interview Methods ====================

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
