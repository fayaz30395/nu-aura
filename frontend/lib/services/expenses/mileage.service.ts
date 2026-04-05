import {apiClient} from '../../api/client';
import {
  CreateMileageLogRequest,
  CreateMileagePolicyRequest,
  MileageLogEntry,
  MileagePolicyEntity,
  MileageSummary,
  Page,
} from '../../types/hrms/expense';

class MileageService {
  // ─── Mileage Logs ───────────────────────────────────────────────────────────

  async createMileageLog(employeeId: string, data: CreateMileageLogRequest): Promise<MileageLogEntry> {
    const response = await apiClient.post<MileageLogEntry>(
      `/expenses/mileage/employees/${employeeId}`,
      data
    );
    return response.data;
  }

  async updateMileageLog(logId: string, data: CreateMileageLogRequest): Promise<MileageLogEntry> {
    const response = await apiClient.put<MileageLogEntry>(`/expenses/mileage/${logId}`, data);
    return response.data;
  }

  async submitMileageLog(logId: string): Promise<MileageLogEntry> {
    const response = await apiClient.post<MileageLogEntry>(`/expenses/mileage/${logId}/submit`);
    return response.data;
  }

  async approveMileageLog(logId: string): Promise<MileageLogEntry> {
    const response = await apiClient.post<MileageLogEntry>(`/expenses/mileage/${logId}/approve`);
    return response.data;
  }

  async rejectMileageLog(logId: string, reason: string): Promise<MileageLogEntry> {
    const response = await apiClient.post<MileageLogEntry>(
      `/expenses/mileage/${logId}/reject`,
      null,
      {params: {reason}}
    );
    return response.data;
  }

  async getEmployeeMileageLogs(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<MileageLogEntry>> {
    const response = await apiClient.get<Page<MileageLogEntry>>(
      `/expenses/mileage/employee/${employeeId}`,
      {params: {page, size, sort: 'travelDate,desc'}}
    );
    return response.data;
  }

  async getMonthlySummary(
    employeeId: string,
    year: number,
    month: number
  ): Promise<MileageSummary> {
    const response = await apiClient.get<MileageSummary>(
      `/expenses/mileage/summary/${employeeId}`,
      {params: {year, month}}
    );
    return response.data;
  }

  async getPendingApprovals(page: number = 0, size: number = 20): Promise<Page<MileageLogEntry>> {
    const response = await apiClient.get<Page<MileageLogEntry>>(
      '/expenses/mileage/pending-approvals',
      {params: {page, size}}
    );
    return response.data;
  }

  // ─── Mileage Policies ──────────────────────────────────────────────────────

  async getActiveMileagePolicies(): Promise<MileagePolicyEntity[]> {
    const response = await apiClient.get<MileagePolicyEntity[]>(
      '/expenses/mileage/policies/active'
    );
    return response.data;
  }

  async getMileagePolicy(policyId: string): Promise<MileagePolicyEntity> {
    const response = await apiClient.get<MileagePolicyEntity>(
      `/expenses/mileage/policies/${policyId}`
    );
    return response.data;
  }

  async createMileagePolicy(data: CreateMileagePolicyRequest): Promise<MileagePolicyEntity> {
    const response = await apiClient.post<MileagePolicyEntity>(
      '/expenses/mileage/policies',
      data
    );
    return response.data;
  }

  async updateMileagePolicy(
    policyId: string,
    data: CreateMileagePolicyRequest
  ): Promise<MileagePolicyEntity> {
    const response = await apiClient.put<MileagePolicyEntity>(
      `/expenses/mileage/policies/${policyId}`,
      data
    );
    return response.data;
  }

  async toggleMileagePolicy(policyId: string, active: boolean): Promise<void> {
    await apiClient.patch(`/expenses/mileage/policies/${policyId}/toggle`, null, {
      params: {active},
    });
  }

  async deleteMileagePolicy(policyId: string): Promise<void> {
    await apiClient.delete(`/expenses/mileage/policies/${policyId}`);
  }
}

export const mileageService = new MileageService();
