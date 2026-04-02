import { apiClient } from '@/lib/api/client';
import { SettlementStatus, PaymentMode } from '@/lib/types/hrms/exit';

// ─── Types for FnFController (auto-calculate endpoint) ───────────────────────

export interface FnFCalculationResponse {
  id: string;
  exitProcessId: string;
  employeeId: string;
  employeeName: string;

  // Earnings
  pendingSalary: number;
  leaveEncashment: number;
  bonusAmount: number;
  gratuityAmount: number;
  noticePeriodRecovery: number;
  reimbursements: number;
  otherEarnings: number;

  // Deductions
  noticeBuyout: number;
  loanRecovery: number;
  advanceRecovery: number;
  assetDamageDeduction: number;
  taxDeduction: number;
  otherDeductions: number;

  // Totals
  totalEarnings: number;
  totalDeductions: number;
  netPayable: number;

  // Gratuity
  yearsOfService?: number;
  isGratuityEligible?: boolean;
  lastDrawnSalary?: number;

  // Status
  status: SettlementStatus;
  paymentMode?: PaymentMode;
  paymentReference?: string;
  paymentDate?: string;
  remarks?: string;
  approvalDate?: string;
}

export interface FnFAdjustmentPayload {
  noticeBuyout?: number;
  loanRecovery?: number;
  advanceRecovery?: number;
  assetDamageDeduction?: number;
  taxDeduction?: number;
  otherDeductions?: number;
  otherEarnings?: number;
  reimbursements?: number;
  remarks?: string;
  paymentMode?: PaymentMode;
}

export interface FnFCalculationPage {
  content: FnFCalculationResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const BASE = '/exit';

export const fnfService = {
  /**
   * GET /api/v1/exit/{exitProcessId}/fnf
   * Fetches existing F&F calculation or auto-calculates one.
   */
  getOrCalculate: async (exitProcessId: string): Promise<FnFCalculationResponse> => {
    const res = await apiClient.get<FnFCalculationResponse>(`${BASE}/${exitProcessId}/fnf`);
    return res.data;
  },

  /**
   * PUT /api/v1/exit/{exitProcessId}/fnf/adjustments
   * HR adjustments: add/update deductions and earnings overrides.
   */
  adjust: async (exitProcessId: string, data: FnFAdjustmentPayload): Promise<FnFCalculationResponse> => {
    const res = await apiClient.put<FnFCalculationResponse>(`${BASE}/${exitProcessId}/fnf/adjustments`, data);
    return res.data;
  },

  /**
   * POST /api/v1/exit/{exitProcessId}/fnf/approve
   * Approve the F&F settlement.
   */
  approve: async (exitProcessId: string): Promise<FnFCalculationResponse> => {
    const res = await apiClient.post<FnFCalculationResponse>(`${BASE}/${exitProcessId}/fnf/approve`);
    return res.data;
  },

  /**
   * GET /api/v1/exit/fnf
   * Paginated list of all F&F settlements for HR dashboard.
   */
  getAll: async (page = 0, size = 20): Promise<FnFCalculationPage> => {
    const res = await apiClient.get<FnFCalculationPage>(`${BASE}/fnf`, {
      params: { page, size },
    });
    return res.data;
  },
};
