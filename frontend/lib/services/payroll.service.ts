import { apiClient } from '../api/client';
import {
  PayrollRun,
  PayrollRunRequest,
  Payslip,
  PayslipRequest,
  SalaryStructure,
  SalaryStructureRequest,
  Page,
} from '../types/payroll';

class PayrollService {
  // Payroll Runs Management
  async createPayrollRun(data: PayrollRunRequest): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRun>('/payroll/runs', data);
    return response.data;
  }

  async updatePayrollRun(id: string, data: PayrollRunRequest): Promise<PayrollRun> {
    const response = await apiClient.put<PayrollRun>(`/payroll/runs/${id}`, data);
    return response.data;
  }

  async getPayrollRunById(id: string): Promise<PayrollRun> {
    const response = await apiClient.get<PayrollRun>(`/payroll/runs/${id}`);
    return response.data;
  }

  async getAllPayrollRuns(page: number = 0, size: number = 20): Promise<Page<PayrollRun>> {
    const response = await apiClient.get<Page<PayrollRun>>('/payroll/runs', {
      params: { page, size },
    });
    return response.data;
  }

  async getPayrollRunsByStatus(
    status: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PayrollRun>> {
    const response = await apiClient.get<Page<PayrollRun>>(`/payroll/runs/status/${status}`, {
      params: { page, size },
    });
    return response.data;
  }

  async processPayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRun>(`/payroll/runs/${id}/process`);
    return response.data;
  }

  async approvePayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRun>(`/payroll/runs/${id}/approve`);
    return response.data;
  }

  async lockPayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRun>(`/payroll/runs/${id}/lock`);
    return response.data;
  }

  async deletePayrollRun(id: string): Promise<void> {
    await apiClient.delete(`/payroll/runs/${id}`);
  }

  // Payslips Management
  async createPayslip(data: PayslipRequest): Promise<Payslip> {
    const response = await apiClient.post<Payslip>('/payroll/payslips', data);
    return response.data;
  }

  async updatePayslip(id: string, data: PayslipRequest): Promise<Payslip> {
    const response = await apiClient.put<Payslip>(`/payroll/payslips/${id}`, data);
    return response.data;
  }

  async getPayslipById(id: string): Promise<Payslip> {
    const response = await apiClient.get<Payslip>(`/payroll/payslips/${id}`);
    return response.data;
  }

  async getAllPayslips(page: number = 0, size: number = 20): Promise<Page<Payslip>> {
    const response = await apiClient.get<Page<Payslip>>('/payroll/payslips', {
      params: { page, size },
    });
    return response.data;
  }

  async getPayslipsByEmployee(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<Payslip>> {
    const response = await apiClient.get<Page<Payslip>>(
      `/payroll/payslips/employee/${employeeId}`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getPayslipsByPayrollRun(
    payrollRunId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<Payslip>> {
    const response = await apiClient.get<Page<Payslip>>(
      `/payroll/payslips/run/${payrollRunId}/paged`,
      {
        params: { page, size },
      }
    );
    return response.data;
  }

  async getPayslipsByPayrollRunList(payrollRunId: string): Promise<Payslip[]> {
    const response = await apiClient.get<Payslip[]>(
      `/payroll/payslips/run/${payrollRunId}`
    );
    return response.data;
  }

  async getPayslipByEmployeeAndPeriod(
    employeeId: string,
    year: number,
    month: number
  ): Promise<Payslip> {
    const response = await apiClient.get<Payslip>(
      `/payroll/payslips/employee/${employeeId}/period`,
      { params: { year, month } }
    );
    return response.data;
  }

  async getPayslipsByEmployeeAndYear(
    employeeId: string,
    year: number
  ): Promise<Payslip[]> {
    const response = await apiClient.get<Payslip[]>(
      `/payroll/payslips/employee/${employeeId}/year/${year}`
    );
    return response.data;
  }

  /**
   * @deprecated CRIT-003: Backend endpoint not implemented.
   * Use getPayslipByEmployeeAndPeriod() or getPayslipsByPayrollRun() instead.
   * Returns an empty page to avoid UI crashes.
   */
  async getPayslipsByPeriod(
    _startDate: string,
    _endDate: string,
    _page: number = 0,
    _size: number = 20
  ): Promise<Page<Payslip>> {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: _size,
      first: true,
      last: true,
      empty: true,
    } as Page<Payslip>;
  }

  async deletePayslip(id: string): Promise<void> {
    await apiClient.delete(`/payroll/payslips/${id}`);
  }

  // Payslip PDF Downloads
  async downloadPayslipPdf(payslipId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/payroll/payslips/${payslipId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadPayslipPdfByPeriod(employeeId: string, year: number, month: number): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/payroll/payslips/employee/${employeeId}/period/pdf`, {
      params: { year, month },
      responseType: 'blob',
    });
    return response.data;
  }

  // Salary Structures Management
  async createSalaryStructure(data: SalaryStructureRequest): Promise<SalaryStructure> {
    const response = await apiClient.post<SalaryStructure>('/payroll/salary-structures', data);
    return response.data;
  }

  async updateSalaryStructure(id: string, data: SalaryStructureRequest): Promise<SalaryStructure> {
    const response = await apiClient.put<SalaryStructure>(
      `/payroll/salary-structures/${id}`,
      data
    );
    return response.data;
  }

  async getSalaryStructureById(id: string): Promise<SalaryStructure> {
    const response = await apiClient.get<SalaryStructure>(`/payroll/salary-structures/${id}`);
    return response.data;
  }

  async getAllSalaryStructures(page: number = 0, size: number = 20): Promise<Page<SalaryStructure>> {
    const response = await apiClient.get<Page<SalaryStructure>>('/payroll/salary-structures', {
      params: { page, size },
    });
    return response.data;
  }

  async getSalaryStructureByEmployee(employeeId: string): Promise<SalaryStructure[]> {
    const response = await apiClient.get<SalaryStructure[]>(
      `/payroll/salary-structures/employee/${employeeId}`
    );
    return response.data;
  }

  async deactivateSalaryStructure(id: string): Promise<SalaryStructure> {
    const response = await apiClient.post<SalaryStructure>(
      `/payroll/salary-structures/${id}/deactivate`
    );
    return response.data;
  }

  async getActiveSalaryStructure(employeeId: string, date?: string): Promise<SalaryStructure> {
    const response = await apiClient.get<SalaryStructure>(
      `/payroll/salary-structures/employee/${employeeId}/active`,
      { params: date ? { date } : undefined }
    );
    return response.data;
  }

  async getActiveSalaryStructures(page: number = 0, size: number = 20): Promise<Page<SalaryStructure>> {
    const response = await apiClient.get<Page<SalaryStructure>>(
      '/payroll/salary-structures/active',
      { params: { page, size } }
    );
    return response.data;
  }

  async deleteSalaryStructure(id: string): Promise<void> {
    await apiClient.delete(`/payroll/salary-structures/${id}`);
  }

  // CRIT-008: Backend endpoints for bulk processing not implemented.
  // These stubs exist so the BulkProcessingWizard component does not crash.
  // They are feature-flagged in the UI — the wizard shows a "Coming Soon" banner.

  async bulkProcessPayroll(_data: {
    employeeIds: string[];
    payrollPeriodStart: string;
    payrollPeriodEnd: string;
    paymentDate: string;
    runName?: string;
  }): Promise<{ payrollRunId: string; processedCount: number; failedCount: number }> {
    throw new Error('Bulk payroll processing is not yet available. This feature is under development.');
  }

  async getBulkProcessingStatus(_payrollRunId: string): Promise<{
    status: string;
    processedCount: number;
    totalCount: number;
    errors?: Array<{ employeeId: string; error: string }>;
  }> {
    throw new Error('Bulk processing status is not yet available. This feature is under development.');
  }

  async previewBulkProcessing(_data: {
    employeeIds: string[];
    payrollPeriodStart: string;
    payrollPeriodEnd: string;
  }): Promise<Array<{
    employeeId: string;
    employeeName: string;
    baseSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    grossAmount: number;
    netAmount: number;
  }>> {
    throw new Error('Bulk processing preview is not yet available. This feature is under development.');
  }
}

export const payrollService = new PayrollService();

/**
 * CRIT-008: Bulk payroll processing backend endpoints are not yet implemented.
 * Use this flag to gate UI features that depend on bulk processing.
 */
export const BULK_PROCESSING_AVAILABLE = false;
