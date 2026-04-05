import {apiClient} from '@/lib/api/client';
import {
  FilingRunResponse,
  FilingTypeInfo,
  GenerateFilingRequest,
  Page,
  SubmitFilingRequest,
  ValidationResult,
} from '@/lib/types/hrms/statutory-filing';

const BASE_URL = '/payroll/statutory-filings';

export const statutoryFilingService = {
  /**
   * Get all available filing types with metadata.
   */
  getFilingTypes: async (): Promise<FilingTypeInfo[]> => {
    const response = await apiClient.get<FilingTypeInfo[]>(`${BASE_URL}/types`);
    return response.data;
  },

  /**
   * Generate a statutory filing for a given type and period.
   */
  generateFiling: async (data: GenerateFilingRequest): Promise<FilingRunResponse> => {
    const response = await apiClient.post<FilingRunResponse>(`${BASE_URL}/generate`, data);
    return response.data;
  },

  /**
   * Get filing history with optional type filter and pagination.
   */
  getFilingHistory: async (
    page: number = 0,
    size: number = 20,
    filingType?: string
  ): Promise<Page<FilingRunResponse>> => {
    const params: Record<string, string | number> = {page, size};
    if (filingType) params.filingType = filingType;
    const response = await apiClient.get<Page<FilingRunResponse>>(BASE_URL, {params});
    return response.data;
  },

  /**
   * Get a single filing run detail.
   */
  getFilingRunDetail: async (id: string): Promise<FilingRunResponse> => {
    const response = await apiClient.get<FilingRunResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Download the generated filing file.
   */
  downloadFiling: async (id: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`${BASE_URL}/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Validate a filing run against statutory rules.
   */
  validateFiling: async (id: string): Promise<ValidationResult> => {
    const response = await apiClient.post<ValidationResult>(`${BASE_URL}/${id}/validate`);
    return response.data;
  },

  /**
   * Mark a filing run as submitted to the government portal.
   */
  submitFiling: async (id: string, data: SubmitFilingRequest): Promise<FilingRunResponse> => {
    const response = await apiClient.put<FilingRunResponse>(`${BASE_URL}/${id}/submit`, data);
    return response.data;
  },
};
