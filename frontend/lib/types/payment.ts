export enum PaymentProvider {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL'
}

export enum PaymentType {
  PAYROLL = 'PAYROLL',
  EXPENSE_REIMBURSEMENT = 'EXPENSE_REIMBURSEMENT',
  LOAN = 'LOAN',
  BENEFIT_PAYMENT = 'BENEFIT_PAYMENT',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  REVERSED = 'REVERSED'
}

export interface PaymentTransaction {
  id: string;
  transactionRef: string;
  externalRef?: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  employeeId?: string;
  payrollRunId?: string;
  expenseClaimId?: string;
  recipientName?: string;
  recipientAccountNumber?: string;
  recipientIfsc?: string;
  provider: PaymentProvider;
  failedReason?: string;
  initiatedAt: string;
  completedAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfig {
  id: string;
  provider: PaymentProvider;
  apiKeyMasked: string;
  merchantId?: string;
  isActive: boolean;
  configKey: string;
}

export interface PaymentConfigRequest {
  provider: PaymentProvider;
  apiKey: string;
  merchantId?: string;
  webhookSecret?: string;
  isActive: boolean;
}

export interface PaymentBatch {
  id: string;
  batchRef: string;
  type: PaymentType;
  totalAmount: number;
  transactionCount: number;
  status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED';
  payrollRunId?: string;
  initiatedBy: string;
  completedBy?: string;
  completedAt?: string;
  failedCount: number;
  successCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRefund {
  id: string;
  transactionId: string;
  refundRef: string;
  externalRefundId?: string;
  amount: number;
  status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reason?: string;
  initiatedBy: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  totalProcessed: number;
  totalAmount: number;
  completedCount: number;
  failedCount: number;
  processingCount: number;
  averageAmount: number;
}
