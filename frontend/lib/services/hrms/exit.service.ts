import { apiClient } from '../../api/client';
import {
  ExitProcess,
  CreateExitProcessRequest,
  UpdateExitProcessRequest,
  ExitProcessesResponse,
  ExitStatus,
  ExitDashboard,
  ExitClearance,
  CreateExitClearanceRequest,
  UpdateExitClearanceRequest,
  FullAndFinalSettlement,
  CreateFnFSettlementRequest,
  UpdateFnFSettlementRequest,
  FnFSettlementsResponse,
  PaymentMode,
  ExitInterview,
  CreateExitInterviewRequest,
  ConductExitInterviewRequest,
  ExitInterviewsResponse,
  AssetRecovery,
  CreateAssetRecoveryRequest,
  RecordAssetReturnRequest,
} from '../../types/hrms/exit';

const BASE_URL = '/exit';

export const exitService = {
  // ==================== Exit Process ====================

  getAllExitProcesses: async (page = 0, size = 20): Promise<ExitProcessesResponse> => {
    const response = await apiClient.get<ExitProcessesResponse>(`${BASE_URL}/processes`, {
      params: { page, size },
    });
    return response.data;
  },

  getExitProcess: async (id: string): Promise<ExitProcess> => {
    const response = await apiClient.get<ExitProcess>(`${BASE_URL}/processes/${id}`);
    return response.data;
  },

  getExitProcessByEmployee: async (employeeId: string): Promise<ExitProcess> => {
    const response = await apiClient.get<ExitProcess>(`${BASE_URL}/processes/employee/${employeeId}`);
    return response.data;
  },

  getExitProcessesByStatus: async (status: ExitStatus): Promise<ExitProcess[]> => {
    const response = await apiClient.get<ExitProcess[]>(`${BASE_URL}/processes/status/${status}`);
    return response.data;
  },

  createExitProcess: async (data: CreateExitProcessRequest): Promise<ExitProcess> => {
    const response = await apiClient.post<ExitProcess>(`${BASE_URL}/processes`, data);
    return response.data;
  },

  updateExitProcess: async (id: string, data: UpdateExitProcessRequest): Promise<ExitProcess> => {
    const response = await apiClient.put<ExitProcess>(`${BASE_URL}/processes/${id}`, data);
    return response.data;
  },

  updateExitStatus: async (id: string, status: ExitStatus): Promise<ExitProcess> => {
    const response = await apiClient.patch<ExitProcess>(`${BASE_URL}/processes/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  deleteExitProcess: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/processes/${id}`);
  },

  getDashboard: async (): Promise<ExitDashboard> => {
    const response = await apiClient.get<ExitDashboard>(`${BASE_URL}/dashboard`);
    return response.data;
  },

  // ==================== Exit Clearance ====================

  createClearance: async (data: CreateExitClearanceRequest): Promise<ExitClearance> => {
    const response = await apiClient.post<ExitClearance>(`${BASE_URL}/clearances`, data);
    return response.data;
  },

  updateClearance: async (id: string, data: UpdateExitClearanceRequest): Promise<ExitClearance> => {
    const response = await apiClient.put<ExitClearance>(`${BASE_URL}/clearances/${id}`, data);
    return response.data;
  },

  getClearancesByExitProcess: async (exitProcessId: string): Promise<ExitClearance[]> => {
    const response = await apiClient.get<ExitClearance[]>(`${BASE_URL}/clearances/process/${exitProcessId}`);
    return response.data;
  },

  getClearancesByApprover: async (approverId: string): Promise<ExitClearance[]> => {
    const response = await apiClient.get<ExitClearance[]>(`${BASE_URL}/clearances/approver/${approverId}`);
    return response.data;
  },

  deleteClearance: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/clearances/${id}`);
  },

  // ==================== Full & Final Settlement ====================

  createSettlement: async (data: CreateFnFSettlementRequest): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.post<FullAndFinalSettlement>(`${BASE_URL}/settlements`, data);
    return response.data;
  },

  updateSettlement: async (id: string, data: UpdateFnFSettlementRequest): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.put<FullAndFinalSettlement>(`${BASE_URL}/settlements/${id}`, data);
    return response.data;
  },

  submitSettlementForApproval: async (id: string): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.post<FullAndFinalSettlement>(`${BASE_URL}/settlements/${id}/submit`);
    return response.data;
  },

  approveSettlement: async (id: string): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.post<FullAndFinalSettlement>(`${BASE_URL}/settlements/${id}/approve`);
    return response.data;
  },

  processSettlementPayment: async (
    id: string,
    paymentMode: PaymentMode,
    paymentReference: string
  ): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.post<FullAndFinalSettlement>(`${BASE_URL}/settlements/${id}/pay`, null, {
      params: { paymentMode, paymentReference },
    });
    return response.data;
  },

  getSettlementById: async (id: string): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.get<FullAndFinalSettlement>(`${BASE_URL}/settlements/${id}`);
    return response.data;
  },

  getSettlementByExitProcess: async (exitProcessId: string): Promise<FullAndFinalSettlement> => {
    const response = await apiClient.get<FullAndFinalSettlement>(`${BASE_URL}/settlements/process/${exitProcessId}`);
    return response.data;
  },

  getAllSettlements: async (page = 0, size = 20): Promise<FnFSettlementsResponse> => {
    const response = await apiClient.get<FnFSettlementsResponse>(`${BASE_URL}/settlements`, {
      params: { page, size },
    });
    return response.data;
  },

  getPendingApprovals: async (): Promise<FullAndFinalSettlement[]> => {
    const response = await apiClient.get<FullAndFinalSettlement[]>(`${BASE_URL}/settlements/pending-approvals`);
    return response.data;
  },

  // ==================== Exit Interview ====================

  createExitInterview: async (data: CreateExitInterviewRequest): Promise<ExitInterview> => {
    const response = await apiClient.post<ExitInterview>(`${BASE_URL}/interviews`, data);
    return response.data;
  },

  conductExitInterview: async (id: string, data: ConductExitInterviewRequest): Promise<ExitInterview> => {
    const response = await apiClient.put<ExitInterview>(`${BASE_URL}/interviews/${id}/conduct`, data);
    return response.data;
  },

  rescheduleInterview: async (id: string, newDate: string): Promise<ExitInterview> => {
    const response = await apiClient.patch<ExitInterview>(`${BASE_URL}/interviews/${id}/reschedule`, null, {
      params: { newDate },
    });
    return response.data;
  },

  getExitInterviewById: async (id: string): Promise<ExitInterview> => {
    const response = await apiClient.get<ExitInterview>(`${BASE_URL}/interviews/${id}`);
    return response.data;
  },

  getAllExitInterviews: async (page = 0, size = 20): Promise<ExitInterviewsResponse> => {
    const response = await apiClient.get<ExitInterviewsResponse>(`${BASE_URL}/interviews`, {
      params: { page, size },
    });
    return response.data;
  },

  getScheduledInterviews: async (): Promise<ExitInterview[]> => {
    const response = await apiClient.get<ExitInterview[]>(`${BASE_URL}/interviews/scheduled`);
    return response.data;
  },

  getExitInterviewAnalytics: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<Record<string, unknown>>(`${BASE_URL}/interviews/analytics`);
    return response.data;
  },

  // ==================== Asset Recovery ====================

  createAssetRecovery: async (data: CreateAssetRecoveryRequest): Promise<AssetRecovery> => {
    const response = await apiClient.post<AssetRecovery>(`${BASE_URL}/assets`, data);
    return response.data;
  },

  recordAssetReturn: async (id: string, data: RecordAssetReturnRequest): Promise<AssetRecovery> => {
    const response = await apiClient.put<AssetRecovery>(`${BASE_URL}/assets/${id}/return`, data);
    return response.data;
  },

  markAssetAsLost: async (id: string, deductionAmount?: number, remarks?: string): Promise<AssetRecovery> => {
    const response = await apiClient.patch<AssetRecovery>(`${BASE_URL}/assets/${id}/lost`, null, {
      params: { deductionAmount, remarks },
    });
    return response.data;
  },

  waiveAssetRecovery: async (id: string, waiverReason: string): Promise<AssetRecovery> => {
    const response = await apiClient.patch<AssetRecovery>(`${BASE_URL}/assets/${id}/waive`, null, {
      params: { waiverReason },
    });
    return response.data;
  },

  verifyAssetReturn: async (id: string): Promise<AssetRecovery> => {
    const response = await apiClient.patch<AssetRecovery>(`${BASE_URL}/assets/${id}/verify`);
    return response.data;
  },

  getAssetsByExitProcess: async (exitProcessId: string): Promise<AssetRecovery[]> => {
    const response = await apiClient.get<AssetRecovery[]>(`${BASE_URL}/assets/process/${exitProcessId}`);
    return response.data;
  },

  getPendingAssetRecoveries: async (): Promise<AssetRecovery[]> => {
    const response = await apiClient.get<AssetRecovery[]>(`${BASE_URL}/assets/pending`);
    return response.data;
  },

  getTotalDeductions: async (exitProcessId: string): Promise<number> => {
    const response = await apiClient.get<number>(`${BASE_URL}/assets/process/${exitProcessId}/deductions`);
    return response.data;
  },

  areAllAssetsRecovered: async (exitProcessId: string): Promise<boolean> => {
    const response = await apiClient.get<boolean>(`${BASE_URL}/assets/process/${exitProcessId}/recovered`);
    return response.data;
  },
};
