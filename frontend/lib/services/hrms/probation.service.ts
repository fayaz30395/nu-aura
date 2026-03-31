import { apiClient } from '../../api/client';
import {
  ProbationPeriodRequest,
  ProbationPeriodResponse,
  ProbationEvaluationRequest,
  ProbationEvaluationResponse,
  ProbationExtensionRequest,
  ProbationConfirmationRequest,
  ProbationTerminationRequest,
  ProbationStatisticsResponse,
  ProbationStatus,
  Page,
} from '../../types/hrms/probation';

const BASE_URL = '/probation';

export const probationService = {
  // ── Probation Period CRUD ───────────────────────────────────

  createProbation: async (
    data: ProbationPeriodRequest
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(BASE_URL, data);
    return response.data;
  },

  getProbationById: async (probationId: string): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.get<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}`
    );
    return response.data;
  },

  getActiveProbationByEmployee: async (
    employeeId: string
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.get<ProbationPeriodResponse>(
      `${BASE_URL}/employee/${employeeId}`
    );
    return response.data;
  },

  getAllProbations: async (
    page = 0,
    size = 20
  ): Promise<Page<ProbationPeriodResponse>> => {
    const response = await apiClient.get<Page<ProbationPeriodResponse>>(BASE_URL, {
      params: { page, size },
    });
    return response.data;
  },

  getProbationsByStatus: async (
    status: ProbationStatus,
    page = 0,
    size = 20
  ): Promise<Page<ProbationPeriodResponse>> => {
    const response = await apiClient.get<Page<ProbationPeriodResponse>>(
      `${BASE_URL}/status/${status}`,
      { params: { page, size } }
    );
    return response.data;
  },

  getMyTeamProbations: async (
    page = 0,
    size = 20
  ): Promise<Page<ProbationPeriodResponse>> => {
    const response = await apiClient.get<Page<ProbationPeriodResponse>>(
      `${BASE_URL}/my-team`,
      { params: { page, size } }
    );
    return response.data;
  },

  // ── Probation Actions ───────────────────────────────────────

  extendProbation: async (
    probationId: string,
    data: ProbationExtensionRequest
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}/extend`,
      data
    );
    return response.data;
  },

  confirmEmployee: async (
    probationId: string,
    data: ProbationConfirmationRequest
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}/confirm`,
      data
    );
    return response.data;
  },

  failProbation: async (
    probationId: string,
    data: ProbationTerminationRequest
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}/fail`,
      data
    );
    return response.data;
  },

  terminateProbation: async (
    probationId: string,
    data: ProbationTerminationRequest
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}/terminate`,
      data
    );
    return response.data;
  },

  putOnHold: async (
    probationId: string,
    reason: string
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}/hold`,
      null,
      { params: { reason } }
    );
    return response.data;
  },

  resumeProbation: async (
    probationId: string,
    extensionDays?: number
  ): Promise<ProbationPeriodResponse> => {
    const response = await apiClient.post<ProbationPeriodResponse>(
      `${BASE_URL}/${probationId}/resume`,
      null,
      { params: extensionDays ? { extensionDays } : {} }
    );
    return response.data;
  },

  // ── Evaluations ─────────────────────────────────────────────

  addEvaluation: async (
    data: ProbationEvaluationRequest
  ): Promise<ProbationEvaluationResponse> => {
    const response = await apiClient.post<ProbationEvaluationResponse>(
      `${BASE_URL}/evaluations`,
      data
    );
    return response.data;
  },

  getEvaluationsForProbation: async (
    probationId: string
  ): Promise<ProbationEvaluationResponse[]> => {
    const response = await apiClient.get<ProbationEvaluationResponse[]>(
      `${BASE_URL}/${probationId}/evaluations`
    );
    return response.data;
  },

  acknowledgeEvaluation: async (
    evaluationId: string,
    comments?: string
  ): Promise<ProbationEvaluationResponse> => {
    const response = await apiClient.post<ProbationEvaluationResponse>(
      `${BASE_URL}/evaluations/${evaluationId}/acknowledge`,
      null,
      { params: comments ? { comments } : {} }
    );
    return response.data;
  },

  // ── Dashboard & Alerts ──────────────────────────────────────

  getOverdueProbations: async (): Promise<ProbationPeriodResponse[]> => {
    const response = await apiClient.get<ProbationPeriodResponse[]>(
      `${BASE_URL}/overdue`
    );
    return response.data;
  },

  getProbationsEndingSoon: async (
    daysAhead = 7
  ): Promise<ProbationPeriodResponse[]> => {
    const response = await apiClient.get<ProbationPeriodResponse[]>(
      `${BASE_URL}/ending-soon`,
      { params: { daysAhead } }
    );
    return response.data;
  },

  getProbationsWithEvaluationsDue: async (): Promise<ProbationPeriodResponse[]> => {
    const response = await apiClient.get<ProbationPeriodResponse[]>(
      `${BASE_URL}/evaluations-due`
    );
    return response.data;
  },

  getStatistics: async (): Promise<ProbationStatisticsResponse> => {
    const response = await apiClient.get<ProbationStatisticsResponse>(
      `${BASE_URL}/statistics`
    );
    return response.data;
  },

  getStatuses: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`${BASE_URL}/statuses`);
    return response.data;
  },
};
