import {apiClient} from '../../api/client';
import {
  Page,
  ReferralDashboard,
  ReferralPolicyRequest,
  ReferralPolicyResponse,
  ReferralRequest,
  ReferralResponse,
  ReferralStatus,
} from '../../types/hire/referral';

const BASE_URL = '/referrals';

export const referralService = {
  // ── Referral Submission ─────────────────────────────────────

  submitReferral: async (data: ReferralRequest): Promise<ReferralResponse> => {
    const response = await apiClient.post<ReferralResponse>(BASE_URL, data);
    return response.data;
  },

  getReferral: async (id: string): Promise<ReferralResponse> => {
    const response = await apiClient.get<ReferralResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  getMyReferrals: async (): Promise<ReferralResponse[]> => {
    const response = await apiClient.get<ReferralResponse[]>(`${BASE_URL}/my-referrals`);
    return response.data;
  },

  getAllReferrals: async (page = 0, size = 20): Promise<Page<ReferralResponse>> => {
    const response = await apiClient.get<Page<ReferralResponse>>(BASE_URL, {
      params: {page, size},
    });
    return response.data;
  },

  getReferralsByStatus: async (status: ReferralStatus): Promise<ReferralResponse[]> => {
    const response = await apiClient.get<ReferralResponse[]>(`${BASE_URL}/status/${status}`);
    return response.data;
  },

  // ── Status Management ───────────────────────────────────────

  updateStatus: async (
    id: string,
    status: ReferralStatus,
    notes?: string
  ): Promise<ReferralResponse> => {
    const response = await apiClient.put<ReferralResponse>(`${BASE_URL}/${id}/status`, null, {
      params: {status, notes},
    });
    return response.data;
  },

  rejectReferral: async (
    id: string,
    reason: string,
    stage?: string
  ): Promise<ReferralResponse> => {
    const response = await apiClient.put<ReferralResponse>(`${BASE_URL}/${id}/reject`, null, {
      params: {reason, stage},
    });
    return response.data;
  },

  linkToHiredEmployee: async (
    id: string,
    employeeId: string
  ): Promise<ReferralResponse> => {
    const response = await apiClient.put<ReferralResponse>(`${BASE_URL}/${id}/link-employee`, null, {
      params: {employeeId},
    });
    return response.data;
  },

  // ── Bonus Management ────────────────────────────────────────

  getBonusEligibleReferrals: async (): Promise<ReferralResponse[]> => {
    const response = await apiClient.get<ReferralResponse[]>(`${BASE_URL}/bonus-eligible`);
    return response.data;
  },

  processBonus: async (id: string): Promise<ReferralResponse> => {
    const response = await apiClient.post<ReferralResponse>(`${BASE_URL}/${id}/process-bonus`);
    return response.data;
  },

  markBonusPaid: async (id: string, paymentReference: string): Promise<ReferralResponse> => {
    const response = await apiClient.post<ReferralResponse>(
      `${BASE_URL}/${id}/mark-bonus-paid`,
      null,
      {params: {paymentReference}}
    );
    return response.data;
  },

  // ── Policy Management ───────────────────────────────────────

  createPolicy: async (data: ReferralPolicyRequest): Promise<ReferralPolicyResponse> => {
    const response = await apiClient.post<ReferralPolicyResponse>(`${BASE_URL}/policies`, data);
    return response.data;
  },

  updatePolicy: async (
    id: string,
    data: ReferralPolicyRequest
  ): Promise<ReferralPolicyResponse> => {
    const response = await apiClient.put<ReferralPolicyResponse>(
      `${BASE_URL}/policies/${id}`,
      data
    );
    return response.data;
  },

  getPolicy: async (id: string): Promise<ReferralPolicyResponse> => {
    const response = await apiClient.get<ReferralPolicyResponse>(`${BASE_URL}/policies/${id}`);
    return response.data;
  },

  getActivePolicies: async (): Promise<ReferralPolicyResponse[]> => {
    const response = await apiClient.get<ReferralPolicyResponse[]>(`${BASE_URL}/policies`);
    return response.data;
  },

  togglePolicyStatus: async (
    id: string,
    active: boolean
  ): Promise<ReferralPolicyResponse> => {
    const response = await apiClient.put<ReferralPolicyResponse>(
      `${BASE_URL}/policies/${id}/toggle`,
      null,
      {params: {active}}
    );
    return response.data;
  },

  // ── Dashboard ───────────────────────────────────────────────

  getDashboard: async (): Promise<ReferralDashboard> => {
    const response = await apiClient.get<ReferralDashboard>(`${BASE_URL}/dashboard`);
    return response.data;
  },
};
