// NU-AURA Payment Gateway Types

// ─── Enums ──────────────────────────────────────────────────────────────────

export type PaymentProvider = 'RAZORPAY' | 'STRIPE' | 'BANK_TRANSFER' | 'PAYPAL';

export type PaymentStatus =
  | 'INITIATED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIAL_REFUND'
  | 'REVERSED';

export type PaymentType = 'PAYROLL' | 'EXPENSE_REIMBURSEMENT' | 'LOAN' | 'BENEFIT_PAYMENT';

export type RefundStatus = 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED';

// ─── Transaction Types ──────────────────────────────────────────────────────

export interface PaymentTransaction {
  id: string;
  transactionReference: string;
  paymentType: PaymentType;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  description?: string;
  payeeId?: string;
  payeeName?: string;
  payeeEmail?: string;
  paymentDate: string; // ISO date
  completedAt?: string; // ISO date
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionListItem {
  id: string;
  transactionReference: string;
  paymentType: PaymentType;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  description?: string;
  payeeName?: string;
  paymentDate: string;
  completedAt?: string;
  createdAt: string;
}

export interface CreatePaymentTransactionRequest {
  paymentType: PaymentType;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  description?: string;
  payeeId?: string;
  payeeName?: string;
  payeeEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentTransactionRequest {
  status?: PaymentStatus;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

// ─── Payment Config Types ───────────────────────────────────────────────────

export interface PaymentConfig {
  id: string;
  provider: PaymentProvider;
  isActive: boolean;
  credentials: Record<string, unknown>;
  webhookSecret?: string;
  webhookUrl?: string;
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavePaymentConfigRequest {
  provider: PaymentProvider;
  credentials: Record<string, unknown>;
  webhookSecret?: string;
  webhookUrl?: string;
  testMode?: boolean;
}

export interface TestConnectionRequest {
  provider: PaymentProvider;
  credentials: Record<string, unknown>;
  testMode?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  provider: PaymentProvider;
}

// ─── Payment Batch Types ────────────────────────────────────────────────────

export interface PaymentBatch {
  id: string;
  batchReference: string;
  paymentType: PaymentType;
  status: 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalAmount: number;
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  currency: string;
  description?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBatchListItem {
  id: string;
  batchReference: string;
  paymentType: PaymentType;
  status: 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalAmount: number;
  totalTransactions: number;
  completedTransactions: number;
  currency: string;
  createdAt: string;
}

export interface CreatePaymentBatchRequest {
  paymentType: PaymentType;
  totalAmount: number;
  currency: string;
  description?: string;
  transactions: CreatePaymentTransactionRequest[];
}

// ─── Payment Refund Types ───────────────────────────────────────────────────

export interface PaymentRefund {
  id: string;
  refundReference: string;
  paymentTransactionId: string;
  transactionReference: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  notes?: string;
  initiatedAt: string;
  completedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessRefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
  notes?: string;
}

export interface PaymentRefundListItem {
  id: string;
  refundReference: string;
  transactionReference: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  initiatedAt: string;
  createdAt: string;
}

// ─── Pagination & Lists ─────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface PaymentStats {
  totalTransactions: number;
  completedTransactions: number;
  processingTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  completedAmount: number;
  failedAmount: number;
  refundedAmount: number;
}

// ─── Payment Status Check ────────────────────────────────────────────────────

export interface PaymentStatusCheckResponse {
  transactionId: string;
  transactionReference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  completedAt?: string;
  failureReason?: string;
}
