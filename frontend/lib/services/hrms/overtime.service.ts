import {apiClient} from '../../api/client';
import {
  CompTimeBalance,
  OvertimeApprovalRequest,
  OvertimeRecordRequest,
  OvertimeRecordResponse,
  Page,
} from '../../types/hrms/overtime';

const BASE_URL = '/overtime';

export const overtimeService = {
  // ── Overtime Records ────────────────────────────────────────

  createOvertimeRecord: async (
    data: OvertimeRecordRequest
  ): Promise<OvertimeRecordResponse> => {
    const response = await apiClient.post<OvertimeRecordResponse>(BASE_URL, data);
    return response.data;
  },

  getOvertimeRecordById: async (recordId: string): Promise<OvertimeRecordResponse> => {
    const response = await apiClient.get<OvertimeRecordResponse>(`${BASE_URL}/${recordId}`);
    return response.data;
  },

  getEmployeeOvertimeRecords: async (
    employeeId: string,
    page = 0,
    size = 10
  ): Promise<Page<OvertimeRecordResponse>> => {
    const response = await apiClient.get<Page<OvertimeRecordResponse>>(
      `${BASE_URL}/employee/${employeeId}`,
      {params: {page, size}}
    );
    return response.data;
  },

  getPendingOvertimeRecords: async (
    page = 0,
    size = 10
  ): Promise<Page<OvertimeRecordResponse>> => {
    const response = await apiClient.get<Page<OvertimeRecordResponse>>(
      `${BASE_URL}/pending`,
      {params: {page, size}}
    );
    return response.data;
  },

  getAllOvertimeRecords: async (
    page = 0,
    size = 10,
    sortBy = 'overtimeDate',
    sortDirection = 'DESC'
  ): Promise<Page<OvertimeRecordResponse>> => {
    const response = await apiClient.get<Page<OvertimeRecordResponse>>(BASE_URL, {
      params: {page, size, sortBy, sortDirection},
    });
    return response.data;
  },

  approveOrRejectOvertime: async (
    recordId: string,
    approverId: string,
    data: OvertimeApprovalRequest
  ): Promise<OvertimeRecordResponse> => {
    const response = await apiClient.post<OvertimeRecordResponse>(
      `${BASE_URL}/${recordId}/approve`,
      data,
      {params: {approverId}}
    );
    return response.data;
  },

  deleteOvertimeRecord: async (recordId: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${recordId}`);
  },

  // ── Comp Time ───────────────────────────────────────────────

  getCompTimeBalance: async (employeeId: string): Promise<CompTimeBalance> => {
    const response = await apiClient.get<CompTimeBalance>(
      `${BASE_URL}/comp-time/balance/${employeeId}`
    );
    return response.data;
  },
};
