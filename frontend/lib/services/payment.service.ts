import { apiClient } from '../api/client';
import {
  PaymentTransaction,
  PaymentTransactionListItem,
  CreatePaymentTransactionRequest,
  UpdatePaymentTransactionRequest,
  PaymentConfig,
  SavePaymentConfigRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  PaymentRefund,
  PaymentRefundListItem,
  ProcessRefundRequest,
  PaymentStats,
  PaymentStatusCheckResponse,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  Page,
} from '../types/payment';

class PaymentService {
  // ===================== Transaction CRUD =====================

  async initiatePayment(data: CreatePaymentTransactionRequest): Promise<PaymentTransaction> {
    const response = await apiClient.post<PaymentTransaction>('/payments', data);
    return response.data;
  }

  async getPayment(id: string): Promise<PaymentTransaction> {
    const response = await apiClient.get<PaymentTransaction>(`/payments/${id}`);
    return response.data;
  }

  async getPayments(page: number = 0, size: number = 20): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>('/payments', {
      params: { page, size },
    });
    return response.data;
  }

  async updatePayment(id: string, data: UpdatePaymentTransactionRequest): Promise<PaymentTransaction> {
    const response = await apiClient.put<PaymentTransaction>(`/payments/${id}`, data);
    return response.data;
  }

  // ===================== Payment Status & Checks =====================

  async checkStatus(transactionId: string): Promise<PaymentStatusCheckResponse> {
    const response = await apiClient.get<PaymentStatusCheckResponse>(`/payments/${transactionId}/status`);
    return response.data;
  }

  async getPaymentsByStatus(
    status: PaymentStatus,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>(`/payments/status/${status}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getPaymentsByType(
    type: PaymentType,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>(`/payments/type/${type}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getPaymentsByProvider(
    provider: PaymentProvider,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>(`/payments/provider/${provider}`, {
      params: { page, size },
    });
    return response.data;
  }

  // ===================== Refund Management =====================

  async processRefund(data: ProcessRefundRequest): Promise<PaymentRefund> {
    const response = await apiClient.post<PaymentRefund>('/payments/refunds', data);
    return response.data;
  }

  async getRefund(refundId: string): Promise<PaymentRefund> {
    const response = await apiClient.get<PaymentRefund>(`/payments/refunds/${refundId}`);
    return response.data;
  }

  async getRefunds(page: number = 0, size: number = 20): Promise<Page<PaymentRefundListItem>> {
    const response = await apiClient.get<Page<PaymentRefundListItem>>('/payments/refunds', {
      params: { page, size },
    });
    return response.data;
  }

  async getRefundsByTransaction(
    transactionId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentRefundListItem>> {
    const response = await apiClient.get<Page<PaymentRefundListItem>>(
      `/payments/${transactionId}/refunds`,
      { params: { page, size } }
    );
    return response.data;
  }

  // ===================== Payment Config =====================

  async getConfig(provider: PaymentProvider): Promise<PaymentConfig> {
    const response = await apiClient.get<PaymentConfig>(`/payments/config/${provider}`);
    return response.data;
  }

  async getAllConfigs(): Promise<PaymentConfig[]> {
    const response = await apiClient.get<PaymentConfig[]>('/payments/config');
    return response.data;
  }

  async saveConfig(data: SavePaymentConfigRequest): Promise<PaymentConfig> {
    const response = await apiClient.post<PaymentConfig>('/payments/config', data);
    return response.data;
  }

  async testConnection(data: TestConnectionRequest): Promise<TestConnectionResponse> {
    const response = await apiClient.post<TestConnectionResponse>('/payments/config/test', data);
    return response.data;
  }

  async toggleConfigActive(provider: PaymentProvider, isActive: boolean): Promise<PaymentConfig> {
    const response = await apiClient.patch<PaymentConfig>(`/payments/config/${provider}/toggle`, {
      isActive,
    });
    return response.data;
  }

  // ===================== Statistics =====================

  async getStats(): Promise<PaymentStats> {
    const response = await apiClient.get<PaymentStats>('/payments/stats');
    return response.data;
  }

  async getStatsByType(type: PaymentType): Promise<PaymentStats> {
    const response = await apiClient.get<PaymentStats>(`/payments/stats/type/${type}`);
    return response.data;
  }

  // ===================== Helpers =====================

  getStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      INITIATED: 'Initiated',
      PROCESSING: 'Processing',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      REFUNDED: 'Refunded',
      PARTIAL_REFUND: 'Partially Refunded',
      REVERSED: 'Reversed',
    };
    return labels[status] || status;
  }

  getStatusColor(status: PaymentStatus): string {
    const colors: Record<PaymentStatus, string> = {
      INITIATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      PROCESSING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      REFUNDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      PARTIAL_REFUND: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
      REVERSED: 'bg-gray-100 text-gray-700 dark:bg-surface-950/50 dark:text-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-surface-950/50 dark:text-gray-300';
  }

  getTypeLabel(type: PaymentType): string {
    const labels: Record<PaymentType, string> = {
      PAYROLL: 'Payroll',
      EXPENSE_REIMBURSEMENT: 'Expense Reimbursement',
      LOAN: 'Loan',
      BENEFIT_PAYMENT: 'Benefit Payment',
    };
    return labels[type] || type;
  }

  getProviderLabel(provider: PaymentProvider): string {
    const labels: Record<PaymentProvider, string> = {
      RAZORPAY: 'Razorpay',
      STRIPE: 'Stripe',
      BANK_TRANSFER: 'Bank Transfer',
      PAYPAL: 'PayPal',
    };
    return labels[provider] || provider;
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export const paymentService = new PaymentService();
