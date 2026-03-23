import { apiClient } from '../api/client';
import {
  EmployeeLoan,
  CreateLoanRequest,
  LoanStatus,
  LoanFilters,
  LoanSummary,
  Page,
} from '../types/loan';

class LoanService {
  // Loan Management
  async createLoan(data: CreateLoanRequest): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>('/loans', data);
    return response.data;
  }

  async updateLoan(id: string, data: CreateLoanRequest): Promise<EmployeeLoan> {
    const response = await apiClient.put<EmployeeLoan>(`/loans/${id}`, data);
    return response.data;
  }

  async getLoanById(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.get<EmployeeLoan>(`/loans/${id}`);
    return response.data;
  }

  async deleteLoan(id: string): Promise<void> {
    await apiClient.delete(`/loans/${id}`);
  }

  // Employee's Loans
  async getMyLoans(page: number = 0, size: number = 20): Promise<Page<EmployeeLoan>> {
    const response = await apiClient.get<Page<EmployeeLoan>>('/loans/my', {
      params: { page, size },
    });
    return response.data;
  }

  // Admin Operations
  async getAllLoans(
    page: number = 0,
    size: number = 20,
    filters?: LoanFilters
  ): Promise<Page<EmployeeLoan>> {
    const params: Record<string, unknown> = { page, size };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.loanType) params.loanType = filters.loanType;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.search) params.search = filters.search;
    }

    const response = await apiClient.get<Page<EmployeeLoan>>('/loans', { params });
    return response.data;
  }

  async getPendingApprovals(page: number = 0, size: number = 20): Promise<Page<EmployeeLoan>> {
    const response = await apiClient.get<Page<EmployeeLoan>>('/loans/pending', {
      params: { page, size },
    });
    return response.data;
  }

  // Status Operations
  async submitLoan(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/submit`);
    return response.data;
  }

  // BUG-FIX: Backend expects @RequestBody ApproveLoanRequest, not query params.
  async approveLoan(id: string, approvedAmount?: number): Promise<EmployeeLoan> {
    const body: { approvedAmount?: number } = {};
    if (approvedAmount !== undefined) body.approvedAmount = approvedAmount;

    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/approve`, body);
    return response.data;
  }

  // BUG-FIX: Backend expects @RequestBody RejectLoanRequest with 'reason' field.
  async rejectLoan(id: string, reason: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/reject`, { reason });
    return response.data;
  }

  async disburseLoan(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/disburse`);
    return response.data;
  }

  async recordPayment(id: string, amount: number): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(
      `/loans/${id}/payment`,
      null,
      { params: { amount } }
    );
    return response.data;
  }

  async closeLoan(id: string): Promise<EmployeeLoan> {
    const response = await apiClient.post<EmployeeLoan>(`/loans/${id}/close`);
    return response.data;
  }

  // Summary
  async getLoanSummary(): Promise<LoanSummary> {
    const response = await apiClient.get<LoanSummary>('/loans/summary');
    return response.data;
  }

  // Helpers
  getStatusColor(status: LoanStatus): string {
    const colors: Record<LoanStatus, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      DISBURSED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      CLOSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      DEFAULTED: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
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
      PERSONAL: 'Personal Loan',
      HOME: 'Home Loan',
      VEHICLE: 'Vehicle Loan',
      EDUCATION: 'Education Loan',
      MEDICAL: 'Medical Loan',
      EMERGENCY: 'Emergency Loan',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }
}

export const loanService = new LoanService();
