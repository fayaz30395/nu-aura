import { apiClient } from '@/lib/api/client';
import {
  LWFConfiguration,
  LWFConfigurationRequest,
  LWFDeduction,
  LWFCalculationRequest,
  LWFRemittanceReport,
} from '@/lib/types/hrms/lwf';

const BASE_URL = '/payroll/lwf';

export const lwfService = {
  // ─── Configuration Endpoints ──────────────────────────────────────────────

  getConfigurations: async (): Promise<LWFConfiguration[]> => {
    const response = await apiClient.get<LWFConfiguration[]>(`${BASE_URL}/configurations`);
    return response.data;
  },

  createOrUpdateConfiguration: async (
    data: LWFConfigurationRequest
  ): Promise<LWFConfiguration> => {
    const response = await apiClient.post<LWFConfiguration>(
      `${BASE_URL}/configurations`,
      data
    );
    return response.data;
  },

  deactivateConfiguration: async (stateCode: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/configurations/${stateCode}`);
  },

  // ─── Deduction Endpoints ──────────────────────────────────────────────────

  getDeductions: async (month: number, year: number): Promise<LWFDeduction[]> => {
    const response = await apiClient.get<LWFDeduction[]>(`${BASE_URL}/deductions`, {
      params: { month, year },
    });
    return response.data;
  },

  getEmployeeDeductions: async (
    employeeId: string,
    year?: number
  ): Promise<LWFDeduction[]> => {
    const response = await apiClient.get<LWFDeduction[]>(
      `${BASE_URL}/deductions/employee/${employeeId}`,
      { params: year ? { year } : undefined }
    );
    return response.data;
  },

  // ─── Report Endpoints ─────────────────────────────────────────────────────

  getRemittanceReport: async (
    month: number,
    year: number
  ): Promise<LWFRemittanceReport> => {
    const response = await apiClient.get<LWFRemittanceReport>(`${BASE_URL}/report`, {
      params: { month, year },
    });
    return response.data;
  },

  // ─── Calculation Endpoint ─────────────────────────────────────────────────

  calculateLWF: async (
    data: LWFCalculationRequest
  ): Promise<LWFDeduction[]> => {
    const response = await apiClient.post<LWFDeduction[]>(
      `${BASE_URL}/calculate`,
      data
    );
    return response.data;
  },
};
