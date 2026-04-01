import { apiClient } from '../../api/client';
import {
  ExpenseClaim,
  CreateExpenseClaimRequest,
  Page,
  ExpenseCategoryEntity,
  CreateExpenseCategoryRequest,
  ExpensePolicyEntity,
  CreateExpensePolicyRequest,
  ExpenseItemEntity,
  CreateExpenseItemRequest,
  ExpenseAdvanceEntity,
  CreateExpenseAdvanceRequest,
  ExpenseReportData,
  OcrResult,
} from '../../types/hrms/expense';

class ExpenseService {
  // ─── Claims ─────────────────────────────────────────────────────────────────

  async createClaim(employeeId: string, data: CreateExpenseClaimRequest): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(`/expenses/employees/${employeeId}`, data);
    return response.data;
  }

  async getClaimById(id: string): Promise<ExpenseClaim> {
    const response = await apiClient.get<ExpenseClaim>(`/expenses/${id}`);
    return response.data;
  }

  async getAllClaims(page: number = 0, size: number = 20): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>('/expenses', {
      params: { page, size },
    });
    return response.data;
  }

  async getMyClaims(
    employeeId: string,
    page: number = 0,
    size: number = 50
  ): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>(`/expenses/employees/${employeeId}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getPendingClaims(page: number = 0, size: number = 50): Promise<Page<ExpenseClaim>> {
    const response = await apiClient.get<Page<ExpenseClaim>>('/expenses/pending-approvals', {
      params: { page, size },
    });
    return response.data;
  }

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

  async submitClaim(claimId: string): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(`/expenses/${claimId}/submit`);
    return response.data;
  }

  async approveClaim(claimId: string): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(`/expenses/${claimId}/approve`);
    return response.data;
  }

  async rejectClaim(claimId: string, reason: string): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(
      `/expenses/${claimId}/reject`,
      null,
      { params: { reason } }
    );
    return response.data;
  }

  async updateClaim(claimId: string, data: CreateExpenseClaimRequest): Promise<ExpenseClaim> {
    const response = await apiClient.put<ExpenseClaim>(`/expenses/${claimId}`, data);
    return response.data;
  }

  async deleteClaim(claimId: string): Promise<void> {
    await apiClient.delete(`/expenses/${claimId}`);
  }

  async markAsPaid(claimId: string, paymentReference: string): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(
      `/expenses/${claimId}/pay`,
      null,
      { params: { paymentReference } }
    );
    return response.data;
  }

  async markAsReimbursed(claimId: string, reimbursementRef: string): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>(
      `/expenses/${claimId}/reimburse`,
      null,
      { params: { reimbursementRef } }
    );
    return response.data;
  }

  async getEmployeeStatistics(
    employeeId: string,
    year?: number
  ): Promise<ExpenseStatistics> {
    const response = await apiClient.get<ExpenseStatistics>(
      `/expenses/statistics/${employeeId}`,
      { params: year ? { year } : {} }
    );
    return response.data;
  }

  async validatePolicy(employeeId: string, amount: number): Promise<string[]> {
    const response = await apiClient.get<string[]>('/expenses/validate-policy', {
      params: { employeeId, amount },
    });
    return response.data;
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getActiveCategories(): Promise<ExpenseCategoryEntity[]> {
    const response = await apiClient.get<ExpenseCategoryEntity[]>('/expenses/categories/active');
    return response.data;
  }

  async getAllCategories(page: number = 0, size: number = 50): Promise<Page<ExpenseCategoryEntity>> {
    const response = await apiClient.get<Page<ExpenseCategoryEntity>>('/expenses/categories', {
      params: { page, size },
    });
    return response.data;
  }

  async createCategory(data: CreateExpenseCategoryRequest): Promise<ExpenseCategoryEntity> {
    const response = await apiClient.post<ExpenseCategoryEntity>('/expenses/categories', data);
    return response.data;
  }

  async updateCategory(categoryId: string, data: CreateExpenseCategoryRequest): Promise<ExpenseCategoryEntity> {
    const response = await apiClient.put<ExpenseCategoryEntity>(`/expenses/categories/${categoryId}`, data);
    return response.data;
  }

  async toggleCategory(categoryId: string, active: boolean): Promise<void> {
    await apiClient.patch(`/expenses/categories/${categoryId}/toggle`, null, {
      params: { active },
    });
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await apiClient.delete(`/expenses/categories/${categoryId}`);
  }

  // ─── Policies ───────────────────────────────────────────────────────────────

  async getActivePolicies(): Promise<ExpensePolicyEntity[]> {
    const response = await apiClient.get<ExpensePolicyEntity[]>('/expenses/policies/active');
    return response.data;
  }

  async getAllPolicies(page: number = 0, size: number = 50): Promise<Page<ExpensePolicyEntity>> {
    const response = await apiClient.get<Page<ExpensePolicyEntity>>('/expenses/policies', {
      params: { page, size },
    });
    return response.data;
  }

  async createPolicy(data: CreateExpensePolicyRequest): Promise<ExpensePolicyEntity> {
    const response = await apiClient.post<ExpensePolicyEntity>('/expenses/policies', data);
    return response.data;
  }

  async updatePolicy(policyId: string, data: CreateExpensePolicyRequest): Promise<ExpensePolicyEntity> {
    const response = await apiClient.put<ExpensePolicyEntity>(`/expenses/policies/${policyId}`, data);
    return response.data;
  }

  async togglePolicy(policyId: string, active: boolean): Promise<void> {
    await apiClient.patch(`/expenses/policies/${policyId}/toggle`, null, {
      params: { active },
    });
  }

  async deletePolicy(policyId: string): Promise<void> {
    await apiClient.delete(`/expenses/policies/${policyId}`);
  }

  // ─── Items ──────────────────────────────────────────────────────────────────

  async getClaimItems(claimId: string): Promise<ExpenseItemEntity[]> {
    const response = await apiClient.get<ExpenseItemEntity[]>(`/expenses/claims/${claimId}/items`);
    return response.data;
  }

  async addClaimItem(claimId: string, data: CreateExpenseItemRequest): Promise<ExpenseItemEntity> {
    const response = await apiClient.post<ExpenseItemEntity>(`/expenses/claims/${claimId}/items`, data);
    return response.data;
  }

  async updateClaimItem(claimId: string, itemId: string, data: CreateExpenseItemRequest): Promise<ExpenseItemEntity> {
    const response = await apiClient.put<ExpenseItemEntity>(`/expenses/claims/${claimId}/items/${itemId}`, data);
    return response.data;
  }

  async deleteClaimItem(claimId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/expenses/claims/${claimId}/items/${itemId}`);
  }

  // ─── Advances ───────────────────────────────────────────────────────────────

  async createAdvance(employeeId: string, data: CreateExpenseAdvanceRequest): Promise<ExpenseAdvanceEntity> {
    const response = await apiClient.post<ExpenseAdvanceEntity>(`/expenses/advances/employees/${employeeId}`, data);
    return response.data;
  }

  async getMyAdvances(employeeId: string, page: number = 0, size: number = 20): Promise<Page<ExpenseAdvanceEntity>> {
    const response = await apiClient.get<Page<ExpenseAdvanceEntity>>(`/expenses/advances/employees/${employeeId}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getAllAdvances(page: number = 0, size: number = 20): Promise<Page<ExpenseAdvanceEntity>> {
    const response = await apiClient.get<Page<ExpenseAdvanceEntity>>('/expenses/advances', {
      params: { page, size },
    });
    return response.data;
  }

  async approveAdvance(advanceId: string): Promise<ExpenseAdvanceEntity> {
    const response = await apiClient.post<ExpenseAdvanceEntity>(`/expenses/advances/${advanceId}/approve`);
    return response.data;
  }

  async disburseAdvance(advanceId: string): Promise<ExpenseAdvanceEntity> {
    const response = await apiClient.post<ExpenseAdvanceEntity>(`/expenses/advances/${advanceId}/disburse`);
    return response.data;
  }

  async settleAdvance(advanceId: string, claimId: string): Promise<ExpenseAdvanceEntity> {
    const response = await apiClient.post<ExpenseAdvanceEntity>(`/expenses/advances/${advanceId}/settle`, null, {
      params: { claimId },
    });
    return response.data;
  }

  async cancelAdvance(advanceId: string): Promise<void> {
    await apiClient.post(`/expenses/advances/${advanceId}/cancel`);
  }

  // ─── OCR Receipt Scanning ────────────────────────────────────────────────────

  async scanReceipt(file: File): Promise<OcrResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<OcrResult>('/expenses/receipts/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // OCR can take longer
    });
    return response.data;
  }

  // ─── Reports ────────────────────────────────────────────────────────────────

  async getExpenseReport(
    startDate: string,
    endDate: string,
    departmentId?: string,
    category?: string,
    status?: string
  ): Promise<ExpenseReportData> {
    const response = await apiClient.get<ExpenseReportData>('/expenses/reports', {
      params: { startDate, endDate, departmentId, category, status },
    });
    return response.data;
  }
}

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
