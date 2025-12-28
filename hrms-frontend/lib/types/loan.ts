// Employee Loan Management Types

export type LoanType =
  | 'PERSONAL'
  | 'HOME'
  | 'VEHICLE'
  | 'EDUCATION'
  | 'MEDICAL'
  | 'EMERGENCY'
  | 'OTHER';

export type LoanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'CLOSED'
  | 'DEFAULTED';

export type RepaymentFrequency =
  | 'MONTHLY'
  | 'BI_WEEKLY'
  | 'WEEKLY';

export interface EmployeeLoan {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  loanType: LoanType;
  loanNumber?: string;
  requestedAmount: number;
  approvedAmount?: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment?: number;
  totalPayable?: number;
  purpose: string;
  status: LoanStatus;
  requestDate: string;
  approvedDate?: string;
  disbursedDate?: string;
  approvedBy?: string;
  approverName?: string;
  rejectionReason?: string;
  repaymentFrequency: RepaymentFrequency;
  amountRepaid: number;
  remainingBalance: number;
  nextPaymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanRequest {
  loanType: LoanType;
  requestedAmount: number;
  interestRate?: number;
  termMonths: number;
  purpose: string;
  repaymentFrequency?: RepaymentFrequency;
  notes?: string;
}

export interface LoanSummary {
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  totalOutstanding: number;
  pendingApprovals: number;
}

export interface LoanFilters {
  status?: LoanStatus;
  loanType?: LoanType;
  employeeId?: string;
  search?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
