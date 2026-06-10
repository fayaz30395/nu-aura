import {apiClient} from '../../api/client';
import {CreateLoanRequest, EmployeeLoan, LoanFilters, LoanStatus, Page,} from '../../types/hrms/loan';

// DEV-5: LoanController exposes POST /, GET /{id}, approve, reject, disburse,
// activate, repayment, cancel, my, pending, GET / and active ONLY.
// PUT /{id}, DELETE /{id}, POST /{id}/submit and GET /summary do not exist on
// the backend — those FE actions were removed (loans are created already
// submitted/PENDING).
class LoanService {
  // Loan Management
  async createLoan(data: CreateLoanRequest): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>('/loans', data);
    return response.data;
  }

  async getLoanById(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.get<EmployeeLoan>(`/loans/${id}`);
    return response.data;
  }

  // Employee's Loans
  async getMyLoans(page: number = 0, size: number = 20): Promise<Page<EmployeeLoan>> {
    const response = await apiClient.get<Page<EmployeeLoan>>('/loans/my', {
      params: {page, size},
    });
    return response.data;
  }

  // Admin Operations
  async getAllLoans(
    page: number = 0,
    size: number = 20,
    filters?: LoanFilters
  ): Promise<Page<EmployeeLoan>> {
    const params: Record<string, unknown> = {page, size};

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.loanType) params.loanType = filters.loanType;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.search) params.search = filters.search;
    }

    const response = await apiClient.get<Page<EmployeeLoan>>('/loans', {params});
    return response.data;
  }

  async getPendingApprovals(page: number = 0, size: number = 20): Promise<Page<EmployeeLoan>> {
    const response = await apiClient.get<Page<EmployeeLoan>>('/loans/pending', {
      params: {page, size},
    });
    return response.data;
  }

  // Status Operations
  // BUG-FIX: Backend expects @RequestBody ApproveLoanRequest, not query params.
  async approveLoan(id: string, approvedAmount?: number): Promise<EmployeeLoan> {
    const body: { approvedAmount?: number } = {};
    if (approvedAmount !== undefined) body.approvedAmount = approvedAmount;

    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/approve`, body);
    return response.data;
  }

  // BUG-FIX: Backend expects @RequestBody RejectLoanRequest with 'reason' field.
  async rejectLoan(id: string, reason: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/reject`, {reason});
    return response.data;
  }

  async disburseLoan(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/disburse`);
    return response.data;
  }

  async activateLoan(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/activate`);
    return response.data;
  }

  // DEV-5: backend route is POST /loans/{id}/repayment with @RequestBody
  // RecordRepaymentRequest { amount } — not /payment with query params.
  async recordPayment(id: string, amount: number): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(
      `/loans/${id}/repayment`,
      {amount}
    );
    return response.data;
  }

  // DEV-5: backend models "close" as POST /loans/{id}/cancel (no /close route).
  async closeLoan(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/cancel`);
    return response.data;
  }

  // Helpers
  getStatusColor(status: LoanStatus): string {
    const colors: Record<LoanStatus, string> = {
      PENDING: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
      APPROVED: 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300',
      REJECTED: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
      DISBURSED: 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300',
      ACTIVE: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
      CLOSED: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
      DEFAULTED: 'bg-danger-200 text-danger-800 dark:bg-danger-900 dark:text-danger-200',
      CANCELLED: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
    };
    return colors[status] || colors.PENDING;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getLoanTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      SALARY_ADVANCE: 'Salary Advance',
      PERSONAL_LOAN: 'Personal Loan',
      EMERGENCY_LOAN: 'Emergency Loan',
      EDUCATION_LOAN: 'Education Loan',
      HOUSING_LOAN: 'Home Loan',
      VEHICLE_LOAN: 'Vehicle Loan',
      MEDICAL_LOAN: 'Medical Loan',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }
}

export const loanService = new LoanService();
