import { apiClient } from '../../api/client';
import type {
  InterviewScorecard,
  ScorecardTemplate,
  CreateScorecardRequest,
  UpdateScorecardRequest,
  CreateScorecardTemplateRequest,
} from '../../types/hire/scorecard';

class ScorecardService {
  async getScorecardsByApplicant(applicantId: string): Promise<InterviewScorecard[]> {
    const response = await apiClient.get<InterviewScorecard[]>(
      `/recruitment/applicants/${applicantId}/scorecards`
    );
    return response.data;
  }

  async getScorecardsByInterview(interviewId: string): Promise<InterviewScorecard[]> {
    const response = await apiClient.get<InterviewScorecard[]>(
      `/recruitment/interviews/${interviewId}/scorecards`
    );
    return response.data;
  }

  async createScorecard(data: CreateScorecardRequest): Promise<InterviewScorecard> {
    const response = await apiClient.post<InterviewScorecard>(
      '/recruitment/scorecards',
      data
    );
    return response.data;
  }

  async updateScorecard(
    id: string,
    data: UpdateScorecardRequest
  ): Promise<InterviewScorecard> {
    const response = await apiClient.put<InterviewScorecard>(
      `/recruitment/scorecards/${id}`,
      data
    );
    return response.data;
  }

  async submitScorecard(id: string): Promise<InterviewScorecard> {
    const response = await apiClient.post<InterviewScorecard>(
      `/recruitment/scorecards/${id}/submit`
    );
    return response.data;
  }

  async getTemplates(): Promise<ScorecardTemplate[]> {
    const response = await apiClient.get<ScorecardTemplate[]>(
      '/recruitment/scorecard-templates'
    );
    return response.data;
  }

  async createTemplate(
    data: CreateScorecardTemplateRequest
  ): Promise<ScorecardTemplate> {
    const response = await apiClient.post<ScorecardTemplate>(
      '/recruitment/scorecard-templates',
      data
    );
    return response.data;
  }
}

export const scorecardService = new ScorecardService();
