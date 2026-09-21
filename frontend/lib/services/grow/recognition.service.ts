import {apiClient} from '../../api/client';
import type {
  EmployeePoints,
  EngagementDashboard,
  Milestone,
  ReactionType,
  Recognition,
  RecognitionBadge,
  RecognitionComment,
  RecognitionRequest,
} from '../../types/grow/recognition';

const BASE_URL = '/recognition';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const recognitionService = {
  async giveRecognition(data: RecognitionRequest): Promise<Recognition> {
    const response = await apiClient.post<Recognition>(BASE_URL, data);
    return response.data;
  },

  async getRecognitionById(id: string): Promise<Recognition> {
    const response = await apiClient.get<Recognition>(`${BASE_URL}/${id}`);
    return response.data;
  },

  async getPublicFeed(page = 0, size = 20): Promise<PagedResponse<Recognition>> {
    const response = await apiClient.get<PagedResponse<Recognition>>(
      `${BASE_URL}/feed`, {params: {page, size}}
    );
    return response.data;
  },

  async getMyReceivedRecognitions(page = 0, size = 20): Promise<PagedResponse<Recognition>> {
    const response = await apiClient.get<PagedResponse<Recognition>>(
      `${BASE_URL}/received`, {params: {page, size}}
    );
    return response.data;
  },

  async getMyGivenRecognitions(page = 0, size = 20): Promise<PagedResponse<Recognition>> {
    const response = await apiClient.get<PagedResponse<Recognition>>(
      `${BASE_URL}/given`, {params: {page, size}}
    );
    return response.data;
  },

  async addReaction(recognitionId: string, reactionType: ReactionType): Promise<void> {
    await apiClient.post(`${BASE_URL}/${recognitionId}/react`, undefined, {params: {reactionType}});
  },

  async removeReaction(recognitionId: string, reactionType: ReactionType): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${recognitionId}/react`, {params: {reactionType}});
  },

  async getActiveBadges(): Promise<RecognitionBadge[]> {
    const response = await apiClient.get<RecognitionBadge[]>(`${BASE_URL}/badges`);
    return response.data;
  },

  async getMyPoints(): Promise<EmployeePoints> {
    const response = await apiClient.get<EmployeePoints>(`${BASE_URL}/points`);
    return response.data;
  },

  async getLeaderboard(limit = 10): Promise<EmployeePoints[]> {
    const response = await apiClient.get<EmployeePoints[]>(`${BASE_URL}/leaderboard`, {params: {limit}});
    return response.data;
  },

  async getDashboard(): Promise<EngagementDashboard> {
    const response = await apiClient.get<EngagementDashboard>(`${BASE_URL}/dashboard`);
    return response.data;
  },

  async getUpcomingMilestones(days = 7): Promise<Milestone[]> {
    const response = await apiClient.get<Milestone[]>(`${BASE_URL}/milestones/upcoming`, {params: {days}});
    return response.data;
  },

  async addComment(recognitionId: string, content: string): Promise<RecognitionComment> {
    const response = await apiClient.post<RecognitionComment>(`${BASE_URL}/${recognitionId}/comments`, {content});
    return response.data;
  },

  async getComments(recognitionId: string, page = 0, size = 20): Promise<PagedResponse<RecognitionComment>> {
    const response = await apiClient.get<PagedResponse<RecognitionComment>>(
      `${BASE_URL}/${recognitionId}/comments`, {params: {page, size}}
    );
    return response.data;
  },

  async deleteComment(recognitionId: string, commentId: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${recognitionId}/comments/${commentId}`);
  },
};
