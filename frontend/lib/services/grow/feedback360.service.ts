import { apiClient } from '../../api/client';

export interface Feedback360Cycle {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'NOMINATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  startDate: string;
  endDate: string;
  nominationDeadline?: string;
  selfReviewDeadline?: string;
  peerReviewDeadline?: string;
  managerReviewDeadline?: string;
  minPeersRequired: number;
  maxPeersAllowed: number;
  isAnonymous: boolean;
  includeSelfReview: boolean;
  includeManagerReview: boolean;
  includePeerReview: boolean;
  includeUpwardReview: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Feedback360Request {
  id: string;
  tenantId: string;
  cycleId: string;
  subjectEmployeeId: string;
  reviewerId: string;
  reviewerType: 'SELF' | 'MANAGER' | 'PEER' | 'DIRECT_REPORT' | 'EXTERNAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';
  nominationApproved: boolean;
  reminderCount: number;
  createdAt: string;
}

export interface FeedbackResponse {
  requestId: string;
  isDraft: boolean;
  overallRating?: number;
  communicationRating?: number;
  teamworkRating?: number;
  leadershipRating?: number;
  problemSolvingRating?: number;
  technicalSkillsRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  additionalComments?: string;
}

export interface Feedback360Summary {
  id: string;
  cycleId: string;
  subjectEmployeeId: string;
  totalReviewers: number;
  responsesReceived: number;
  selfReviewCompleted: boolean;
  managerReviewCompleted: boolean;
  peerReviewsCompleted: number;
  finalRating?: number;
  avgCommunication?: number;
  avgTeamwork?: number;
  avgLeadership?: number;
  consolidatedStrengths?: string;
  consolidatedImprovements?: string;
  sharedWithEmployee: boolean;
  createdAt: string;
}

export interface CycleRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  nominationDeadline?: string;
  selfReviewDeadline?: string;
  peerReviewDeadline?: string;
  managerReviewDeadline?: string;
  minPeersRequired?: number;
  maxPeersAllowed?: number;
  isAnonymous?: boolean;
  includeSelfReview?: boolean;
  includeManagerReview?: boolean;
  includePeerReview?: boolean;
  includeUpwardReview?: boolean;
}

class Feedback360Service {
  async createCycle(data: CycleRequest): Promise<Feedback360Cycle> {
    const response = await apiClient.post<Feedback360Cycle>('/feedback360/cycles', data);
    return response.data;
  }

  async getCycles(page: number = 0, size: number = 20): Promise<{ content: Feedback360Cycle[], totalElements: number }> {
    const response = await apiClient.get<{ content: Feedback360Cycle[], totalElements: number }>('/feedback360/cycles', { params: { page, size } });
    return response.data;
  }

  async getActiveCycles(): Promise<Feedback360Cycle[]> {
    const response = await apiClient.get<Feedback360Cycle[]>('/feedback360/cycles/active');
    return response.data;
  }

  async getCycle(id: string): Promise<Feedback360Cycle> {
    const response = await apiClient.get<Feedback360Cycle>(`/feedback360/cycles/${id}`);
    return response.data;
  }

  async activateCycle(id: string): Promise<void> {
    await apiClient.post(`/feedback360/cycles/${id}/activate`);
  }

  async closeCycle(id: string): Promise<void> {
    await apiClient.post(`/feedback360/cycles/${id}/close`);
  }

  async deleteCycle(id: string): Promise<void> {
    await apiClient.delete(`/feedback360/cycles/${id}`);
  }

  async getMyPendingReviews(): Promise<Feedback360Request[]> {
    const response = await apiClient.get<Feedback360Request[]>('/feedback360/my-pending-reviews');
    return response.data;
  }

  async submitResponse(data: FeedbackResponse): Promise<void> {
    await apiClient.post('/feedback360/responses', data);
  }

  async getMySummaries(): Promise<Feedback360Summary[]> {
    const response = await apiClient.get<Feedback360Summary[]>('/feedback360/my-summaries');
    return response.data;
  }

  async generateSummary(cycleId: string, subjectEmployeeId: string): Promise<Feedback360Summary> {
    const response = await apiClient.post<Feedback360Summary>(
      `/feedback360/cycles/${cycleId}/summaries/${subjectEmployeeId}/generate`
    );
    return response.data;
  }

  async shareWithEmployee(summaryId: string): Promise<void> {
    await apiClient.post(`/feedback360/summaries/${summaryId}/share`);
  }

  async getDashboard(): Promise<unknown> {
    const response = await apiClient.get('/feedback360/dashboard');
    return response.data;
  }
}

export const feedback360Service = new Feedback360Service();
