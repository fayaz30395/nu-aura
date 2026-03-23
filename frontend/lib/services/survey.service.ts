import { apiClient } from '../api/client';
import type {
  Survey,
  SurveyRequest,
  SurveyStatus,
} from '../types/survey';

const BASE_URL = '/survey-management';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const surveyService = {
  async createSurvey(data: SurveyRequest): Promise<Survey> {
    const response = await apiClient.post<Survey>(BASE_URL, data);
    return response.data;
  },

  async updateSurvey(surveyId: string, data: SurveyRequest): Promise<Survey> {
    const response = await apiClient.put<Survey>(`${BASE_URL}/${surveyId}`, data);
    return response.data;
  },

  async updateStatus(surveyId: string, status: SurveyStatus): Promise<Survey> {
    const response = await apiClient.patch<Survey>(`${BASE_URL}/${surveyId}/status?status=${status}`);
    return response.data;
  },

  async launchSurvey(surveyId: string): Promise<Survey> {
    const response = await apiClient.post<Survey>(`${BASE_URL}/${surveyId}/launch`);
    return response.data;
  },

  async completeSurvey(surveyId: string): Promise<Survey> {
    const response = await apiClient.post<Survey>(`${BASE_URL}/${surveyId}/complete`);
    return response.data;
  },

  async getSurveyById(surveyId: string): Promise<Survey> {
    const response = await apiClient.get<Survey>(`${BASE_URL}/${surveyId}`);
    return response.data;
  },

  async getAllSurveys(page = 0, size = 20): Promise<PagedResponse<Survey>> {
    const response = await apiClient.get<PagedResponse<Survey>>(`${BASE_URL}?page=${page}&size=${size}`);
    return response.data;
  },

  async getSurveysByStatus(status: SurveyStatus): Promise<Survey[]> {
    const response = await apiClient.get<Survey[]>(`${BASE_URL}/status/${status}`);
    return response.data;
  },

  async getActiveSurveys(): Promise<Survey[]> {
    const response = await apiClient.get<Survey[]>(`${BASE_URL}/active`);
    return response.data;
  },

  async deleteSurvey(surveyId: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${surveyId}`);
  },
};
