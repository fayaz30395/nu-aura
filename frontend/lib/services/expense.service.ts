import { apiClient } from '../api/client';
import {
  ExpenseClaim,
  CreateExpenseClaimRequest,
  ApprovalRequest,
  ExpenseClaimFilters,
  Page,
} from '../types/expense';

class ExpenseService {
  // Create a new expense claim
  async createClaim(employeeId: string, data: CreateExpenseClaimRequest): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>('/expenses', data, {
      params: { employeeId },
    });
    return response.data;
  }

  // Get a single expense claim by ID
  async getClaimById(id: string): Promise<ExpenseClaim> {
    const response = await apiClient.get<ExpenseClaim>(`/expenses/${id}`);
    return response.data;
  }

  // Get all expense claims (admin)
  async getAllClaims(page: number = 0, size: number = 20): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>('/expenses', {
      params: { page, size },
    });
    return response.data;
  }

  // Get my expense claims
  async getMyClaims(
    employeeId: string,
    page: number = 0,
    size: number = 50
  ): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>('/expenses/my-claims', {
      params: { employeeId, page, size },
    });
    return response.data;
  }

  // Get pending claims for approval
  async getPendingClaims(page: number = 0, size: number = 50): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>('/expenses/pending', {
      params: { page, size },
    });
    return response.data;
  }

  // Get claims by status
  async getClaimsByStatus(
    status: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>(`/expenses/status/${status}`, {
      params: { page, size },
    });
    return response.data;
  }

  // Submit a draft claim for approval
  async submitClaim(claimId: string): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(`/expenses/${claimId}/submit`);
    return response.data;
  }

  // Approve or reject a claim
  async processApproval(
    claimId: string,
    approval: ApprovalRequest
  ): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(
      `/expenses/${claimId}/approve`,
      approval
    );
    return response.data;
  }

  // Update an existing claim (only for DRAFT status)
  async updateClaim(
    claimId: string,
    data: CreateExpenseClaimRequest
  ): Promise<ExpenseClaim> {
    const response = await apiClient.put<ExpenseClaim>(`/expenses/${claimId}`, data);
    return response.data;
  }

  // Delete a claim (only for DRAFT status)
  async deleteClaim(claimId: string): Promise<void> {
    await apiClient.delete(`/expenses/${claimId}`);
  }

  // Mark a claim as paid
  async markAsPaid(
    claimId: string,
    paymentReference: string
  ): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(
      `/expenses/${claimId}/pay`,
      null,
      {
        params: { paymentReference },
      }
    );
    return response.data;
  }

  // Get expense statistics for an employee
  async getEmployeeStatistics(
    employeeId: string,
    year?: number
  ): Promise<ExpenseStatistics> {
    const response = await apiClient.get<ExpenseStatistics>(
      `/expenses/statistics/${employeeId}`,
      {
        params: year ? { year } : {},
      }
    );
    return response.data;
  }
}

// Statistics interface (if the backend provides it)
export interface ExpenseStatistics {
  totalClaims: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  paidAmount: number;
  byCategory: Record<string, number>;
}

export const expenseService = new ExpenseService();
