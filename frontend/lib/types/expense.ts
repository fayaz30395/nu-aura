// Expense Management Types

export type ExpenseCategory =
  | 'TRAVEL'
  | 'ACCOMMODATION'
  | 'MEALS'
  | 'TRANSPORTATION'
  | 'OFFICE_SUPPLIES'
  | 'EQUIPMENT'
  | 'TRAINING'
  | 'COMMUNICATION'
  | 'ENTERTAINMENT'
  | 'MEDICAL'
  | 'OTHER';

export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR';

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  claimDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: CurrencyCode;
  status: ExpenseStatus;
  receiptUrl?: string;
  submittedAt?: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectorName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paymentDate?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseClaimRequest {
  claimDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: CurrencyCode;
  receiptUrl?: string;
  notes?: string;
}

export interface ApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface ExpenseClaimFilters {
  employeeId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
