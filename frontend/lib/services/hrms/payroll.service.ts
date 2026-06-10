import {apiClient} from '../../api/client';
import {
  ComponentType,
  EvaluateComponentsResponse,
  Page,
  PayrollComponent,
  PayrollComponentRequest,
  PayrollRun,
  PayrollRunRequest,
  Payslip,
  PayslipRequest,
  RunPayslip,
  SalaryStructure,
  SalaryStructureRequest,
} from '../../types/hrms/payroll';

type NumericApiValue = number | string | null | undefined;

interface PayrollRunApiResponse
  extends Partial<Omit<PayrollRun, 'totalEmployees' | 'totalGrossAmount' | 'totalDeductions' | 'totalNetAmount'>> {
  payPeriodMonth?: number | null;
  payPeriodYear?: number | null;
  payrollDate?: string | null;
  remarks?: string | null;
  totalEmployees?: NumericApiValue;
  totalGrossAmount?: NumericApiValue;
  totalDeductions?: NumericApiValue;
  totalNetAmount?: NumericApiValue;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toNumber(value: NumericApiValue): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function safePeriodYear(value: number | null | undefined): number {
  return value && value > 0 ? value : new Date().getFullYear();
}

function safePeriodMonth(value: number | null | undefined): number {
  return value && value >= 1 && value <= 12 ? value : 1;
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function isoMonthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function normalizePayrollRun(run: PayrollRunApiResponse): PayrollRun {
  const payPeriodYear = safePeriodYear(run.payPeriodYear);
  const payPeriodMonth = safePeriodMonth(run.payPeriodMonth);
  const payrollPeriodStart = run.payrollPeriodStart ?? isoDate(payPeriodYear, payPeriodMonth, 1);
  const payrollPeriodEnd = run.payrollPeriodEnd ?? isoMonthEnd(payPeriodYear, payPeriodMonth);
  const paymentDate = run.paymentDate ?? run.payrollDate?.slice(0, 10) ?? payrollPeriodEnd;
  const runName = run.runName ?? `Payroll ${MONTH_NAMES[payPeriodMonth - 1]} ${payPeriodYear}`;

  return {
    id: run.id ?? '',
    runName,
    payrollPeriodStart,
    payrollPeriodEnd,
    paymentDate,
    status: run.status ?? 'DRAFT',
    totalEmployees: toNumber(run.totalEmployees),
    totalGrossAmount: toNumber(run.totalGrossAmount),
    totalDeductions: toNumber(run.totalDeductions),
    totalNetAmount: toNumber(run.totalNetAmount),
    processedBy: run.processedBy,
    processedAt: run.processedAt,
    approvedBy: run.approvedBy,
    approvedAt: run.approvedAt,
    lockedBy: run.lockedBy,
    lockedAt: run.lockedAt,
    notes: run.notes ?? run.remarks ?? undefined,
    createdBy: run.createdBy,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

function normalizePayrollRunPage(page: Page<PayrollRunApiResponse>): Page<PayrollRun> {
  return {
    ...page,
    content: page.content.map(normalizePayrollRun),
  };
}

class PayrollService {
  // Payroll Runs Management
  async createPayrollRun(data: PayrollRunRequest): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRunApiResponse>('/payroll/runs', data);
    return normalizePayrollRun(response.data);
  }

  async updatePayrollRun(id: string, data: PayrollRunRequest): Promise<PayrollRun> {
    const response = await apiClient.put<PayrollRunApiResponse>(`/payroll/runs/${id}`, data);
    return normalizePayrollRun(response.data);
  }

  async getPayrollRunById(id: string): Promise<PayrollRun> {
    const response = await apiClient.get<PayrollRunApiResponse>(`/payroll/runs/${id}`);
    return normalizePayrollRun(response.data);
  }

  async getAllPayrollRuns(page: number = 0, size: number = 20): Promise<Page<PayrollRun>> {
    const response = await apiClient.get<Page<PayrollRunApiResponse>>('/payroll/runs', {
      params: {page, size},
    });
    return normalizePayrollRunPage(response.data);
  }

  async getPayrollRunsByStatus(
    status: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PayrollRun>> {
    const response = await apiClient.get<Page<PayrollRunApiResponse>>(`/payroll/runs/status/${status}`, {
      params: {page, size},
    });
    return normalizePayrollRunPage(response.data);
  }

  async processPayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRunApiResponse>(`/payroll/runs/${id}/process`);
    return normalizePayrollRun(response.data);
  }

  async approvePayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRunApiResponse>(`/payroll/runs/${id}/approve`);
    return normalizePayrollRun(response.data);
  }

  async lockPayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.post<PayrollRunApiResponse>(`/payroll/runs/${id}/lock`);
    return normalizePayrollRun(response.data);
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
      params: {page, size},
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
        params: {page, size},
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
        params: {page, size},
      }
    );
    return response.data;
  }

  /**
   * PROD-1: payslips for a run in the backend's real (entity) shape —
   * used by the run detail page (/payroll/runs/[id]).
   */
  async getRunPayslipDetails(
    payrollRunId: string,
    page: number = 0,
    size: number = 100
  ): Promise<Page<RunPayslip>> {
    const response = await apiClient.get<Page<RunPayslip>>(
      `/payroll/payslips/run/${payrollRunId}/paged`,
      {params: {page, size}}
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
      {params: {year, month}}
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
      params: {year, month},
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
      params: {page, size},
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
      {params: date ? {date} : undefined}
    );
    return response.data;
  }

  async getActiveSalaryStructures(page: number = 0, size: number = 20): Promise<Page<SalaryStructure>> {
    const response = await apiClient.get<Page<SalaryStructure>>(
      '/payroll/salary-structures/active',
      {params: {page, size}}
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

  // ── Payroll Component Methods ──────────────────────────────────────────────

  async getPayrollComponents(page = 0, size = 20): Promise<Page<PayrollComponent>> {
    const response = await apiClient.get<Page<PayrollComponent>>('/payroll/components', {
      params: {page, size, sort: 'evaluationOrder,asc'}
    });
    return response.data;
  }

  async getActivePayrollComponents(): Promise<PayrollComponent[]> {
    const response = await apiClient.get<PayrollComponent[]>('/payroll/components/active');
    return response.data;
  }

  async getActiveComponentsByType(type: ComponentType): Promise<PayrollComponent[]> {
    const response = await apiClient.get<PayrollComponent[]>(`/payroll/components/active/type/${type}`);
    return response.data;
  }

  async getPayrollComponentById(id: string): Promise<PayrollComponent> {
    const response = await apiClient.get<PayrollComponent>(`/payroll/components/${id}`);
    return response.data;
  }

  async createPayrollComponent(data: PayrollComponentRequest): Promise<PayrollComponent> {
    const response = await apiClient.post<PayrollComponent>('/payroll/components', data);
    return response.data;
  }

  async updatePayrollComponent(id: string, data: PayrollComponentRequest): Promise<PayrollComponent> {
    const response = await apiClient.put<PayrollComponent>(`/payroll/components/${id}`, data);
    return response.data;
  }

  async deletePayrollComponent(id: string): Promise<void> {
    await apiClient.delete(`/payroll/components/${id}`);
  }

  async evaluateComponents(inputValues: Record<string, number>): Promise<EvaluateComponentsResponse> {
    const response = await apiClient.post<EvaluateComponentsResponse>('/payroll/components/evaluate', inputValues);
    return response.data;
  }

  async recomputeEvaluationOrder(): Promise<void> {
    await apiClient.post('/payroll/components/recompute-order', {});
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
