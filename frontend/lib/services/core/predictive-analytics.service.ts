import {apiClient} from '../../api/client';
import type {
  AnalyticsInsight,
  AttritionPrediction,
  PaginatedResponse,
  PredictiveAnalyticsDashboard,
  SkillGap,
  WorkforceTrend,
} from '../../types/core/predictive-analytics';

const BASE = '/predictive-analytics';

export const predictiveAnalyticsService = {
  // ==================== Dashboard ====================

  getDashboard: async (): Promise<PredictiveAnalyticsDashboard> => {
    const response = await apiClient.get<PredictiveAnalyticsDashboard>(`${BASE}/dashboard`);
    return response.data;
  },

  // ==================== Attrition ====================

  getHighRiskEmployees: async (minScore: number = 70): Promise<AttritionPrediction[]> => {
    const response = await apiClient.get<AttritionPrediction[]>(`${BASE}/attrition/high-risk`, {
      params: {minScore},
    });
    return response.data;
  },

  getByRiskLevel: async (riskLevel: string): Promise<AttritionPrediction[]> => {
    const response = await apiClient.get<AttritionPrediction[]>(
      `${BASE}/attrition/risk-level/${riskLevel}`
    );
    return response.data;
  },

  getEmployeePredictions: async (employeeId: string): Promise<AttritionPrediction[]> => {
    const response = await apiClient.get<AttritionPrediction[]>(
      `${BASE}/attrition/employee/${employeeId}`
    );
    return response.data;
  },

  runPrediction: async (employeeId: string): Promise<AttritionPrediction> => {
    const response = await apiClient.post<AttritionPrediction>(
      `${BASE}/attrition/predict/${employeeId}`
    );
    return response.data;
  },

  markActionTaken: async (predictionId: string, notes?: string): Promise<void> => {
    await apiClient.post(`${BASE}/attrition/${predictionId}/action-taken`, null, {
      params: {notes},
    });
  },

  recordOutcome: async (
    predictionId: string,
    outcome: string,
    leaveDate?: string
  ): Promise<void> => {
    await apiClient.post(`${BASE}/attrition/${predictionId}/outcome`, null, {
      params: {outcome, leaveDate},
    });
  },

  // ==================== Workforce Trends ====================

  getOrganizationTrends: async (year: number): Promise<WorkforceTrend[]> => {
    const response = await apiClient.get<WorkforceTrend[]>(`${BASE}/trends/organization`, {
      params: {year},
    });
    return response.data;
  },

  getDepartmentTrends: async (departmentId: string, year: number): Promise<WorkforceTrend[]> => {
    const response = await apiClient.get<WorkforceTrend[]>(
      `${BASE}/trends/department/${departmentId}`,
      {params: {year}}
    );
    return response.data;
  },

  compareDepartments: async (year: number, month: number): Promise<WorkforceTrend[]> => {
    const response = await apiClient.get<WorkforceTrend[]>(`${BASE}/trends/compare-departments`, {
      params: {year, month},
    });
    return response.data;
  },

  // ==================== Insights ====================

  getAllInsights: async (
    page: number = 0,
    size: number = 20
  ): Promise<PaginatedResponse<AnalyticsInsight>> => {
    const response = await apiClient.get<PaginatedResponse<AnalyticsInsight>>(
      `${BASE}/insights`,
      {params: {page, size}}
    );
    return response.data;
  },

  getInsightsByCategory: async (category: string): Promise<AnalyticsInsight[]> => {
    const response = await apiClient.get<AnalyticsInsight[]>(
      `${BASE}/insights/category/${category}`
    );
    return response.data;
  },

  getInsightsBySeverity: async (severity: string): Promise<AnalyticsInsight[]> => {
    const response = await apiClient.get<AnalyticsInsight[]>(
      `${BASE}/insights/severity/${severity}`
    );
    return response.data;
  },

  updateInsightStatus: async (
    insightId: string,
    status: string,
    notes?: string
  ): Promise<AnalyticsInsight> => {
    const response = await apiClient.patch<AnalyticsInsight>(
      `${BASE}/insights/${insightId}/status`,
      null,
      {params: {status, notes}}
    );
    return response.data;
  },

  // ==================== Skill Gaps ====================

  getLatestSkillGaps: async (): Promise<SkillGap[]> => {
    const response = await apiClient.get<SkillGap[]>(`${BASE}/skill-gaps`);
    return response.data;
  },

  getSkillGapsByPriority: async (priority: string): Promise<SkillGap[]> => {
    const response = await apiClient.get<SkillGap[]>(`${BASE}/skill-gaps/priority/${priority}`);
    return response.data;
  },

  getSkillGapsByDepartment: async (departmentId: string): Promise<SkillGap[]> => {
    const response = await apiClient.get<SkillGap[]>(
      `${BASE}/skill-gaps/department/${departmentId}`
    );
    return response.data;
  },

  getTrainableGaps: async (): Promise<SkillGap[]> => {
    const response = await apiClient.get<SkillGap[]>(`${BASE}/skill-gaps/trainable`);
    return response.data;
  },
};
