import {apiClient} from '../../api/client';
import {
  CreatePaymentTransactionRequest,
  Page,
  PaymentConfig,
  PaymentProvider,
  PaymentRefund,
  PaymentRefundListItem,
  PaymentStats,
  PaymentStatus,
  PaymentStatusCheckResponse,
  PaymentTransaction,
  PaymentTransactionListItem,
  PaymentType,
  ProcessRefundRequest,
  SavePaymentConfigRequest,
  TestConnectionRequest,
  UpdatePaymentTransactionRequest,
} from '../../types/core/payment';

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
      params: {page, size},
    });
    return response.data;
  }

  // STUB: Backend endpoint not implemented — do not call.
  // No PUT /payments/{id} endpoint exists in PaymentController.
  async updatePayment(id: string, data: UpdatePaymentTransactionRequest): Promise<PaymentTransaction> {
    const response = await apiClient.put<PaymentTransaction>(`/payments/${id}`, data);
    return response.data;
  }

  // ===================== Payment Status & Checks =====================

  async checkStatus(transactionId: string): Promise<PaymentStatusCheckResponse> {
    const response = await apiClient.get<PaymentStatusCheckResponse>(`/payments/${transactionId}/status`);
    return response.data;
  }

  // STUB: Backend endpoints not implemented — do not call.
  // No /payments/status/{status}, /payments/type/{type}, or /payments/provider/{provider}
  // endpoints exist in PaymentController.
  async getPaymentsByStatus(
    status: PaymentStatus,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>(`/payments/status/${status}`, {
      params: {page, size},
    });
    return response.data;
  }

  async getPaymentsByType(
    type: PaymentType,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>(`/payments/type/${type}`, {
      params: {page, size},
    });
    return response.data;
  }

  async getPaymentsByProvider(
    provider: PaymentProvider,
    page: number = 0,
    size: number = 20
  ): Promise<Page<PaymentTransactionListItem>> {
    const response = await apiClient.get<Page<PaymentTransactionListItem>>(`/payments/provider/${provider}`, {
      params: {page, size},
    });
    return response.data;
  }

  // ===================== Refund Management =====================

  async processRefund(data: ProcessRefundRequest): Promise<string> {
    const response = await apiClient.post<string>(
      `/payments/${data.transactionId}/refund`,
      null,
      {params: {reason: data.reason || 'Refund requested'}}
    );
    return response.data;
  }

  // STUB: Backend endpoints not implemented — do not call.
  // No GET /payments/refunds or /payments/refunds/{id} endpoints exist in PaymentController.
  async getRefund(refundId: string): Promise<PaymentRefund> {
    const response = await apiClient.get<PaymentRefund>(`/payments/refunds/${refundId}`);
    return response.data;
  }

  async getRefunds(page: number = 0, size: number = 20): Promise<Page<PaymentRefundListItem>> {
    const response = await apiClient.get<Page<PaymentRefundListItem>>('/payments/refunds', {
      params: {page, size},
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
      {params: {page, size}}
    );
    return response.data;
  }

  // ===================== Payment Config =====================

  // STUB: Backend endpoint not implemented — do not call.
  // No GET /payments/config/{provider} endpoint exists in PaymentConfigController.
  async getConfig(provider: PaymentProvider): Promise<PaymentConfig> {
    const response = await apiClient.get<PaymentConfig>(`/payments/config/${provider}`);
    return response.data;
  }

  // STUB: Backend endpoint not implemented — do not call.
  // No GET /payments/config endpoint exists in PaymentConfigController.
  async getAllConfigs(): Promise<PaymentConfig[]> {
    const response = await apiClient.get<PaymentConfig[]>('/payments/config');
    return response.data;
  }

  async saveConfig(data: SavePaymentConfigRequest): Promise<PaymentConfig> {
    const response = await apiClient.post<PaymentConfig>('/payments/config', data);
    return response.data;
  }

  async testConnection(data: TestConnectionRequest): Promise<string> {
    const response = await apiClient.post<string>('/payments/config/test-connection', data);
    return response.data;
  }

  // STUB: Backend endpoint not implemented — do not call.
  // No PATCH /payments/config/{provider}/toggle endpoint exists in PaymentConfigController.
  async toggleConfigActive(provider: PaymentProvider, isActive: boolean): Promise<PaymentConfig> {
    const response = await apiClient.patch<PaymentConfig>(`/payments/config/${provider}/toggle`, {
      isActive,
    });
    return response.data;
  }

  // ===================== Statistics =====================
  // STUB: Backend endpoints not implemented — do not call.
  // No /payments/stats endpoints exist in PaymentController.

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
      INITIATED: "bg-accent-subtle text-accent",
      PROCESSING: "bg-status-warning-bg text-status-warning-text",
      COMPLETED: "bg-status-success-bg text-status-success-text",
      FAILED: "bg-status-danger-bg text-status-danger-text",
      REFUNDED: "bg-status-warning-bg text-status-warning-text",
      PARTIAL_REFUND: "bg-accent-subtle text-accent",
      REVERSED: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
    };
    return colors[status] || 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
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
