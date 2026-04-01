// Employee Loan Management Types

export type LoanType =
  | 'PERSONAL'
  | 'HOME'
  | 'VEHICLE'
  | 'EDUCATION'
  | 'MEDICAL'
  | 'EMERGENCY'
  | 'OTHER';

// BUG-FIX: LoanStatus values must match backend EmployeeLoan.LoanStatus enum exactly.
// Backend enum: PENDING, APPROVED, REJECTED, DISBURSED, ACTIVE, CLOSED, DEFAULTED, CANCELLED.
export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'CLOSED'
  | 'DEFAULTED'
  | 'CANCELLED';

export type RepaymentFrequency =
  | 'MONTHLY'
  | 'BI_WEEKLY'
  | 'WEEKLY';

// BUG-FIX: Field names must match backend EmployeeLoanDto exactly.
// Previously used requestedAmount/termMonths/monthlyPayment/remainingBalance/amountRepaid
// which did not match the DTO's principalAmount/tenureMonths/emiAmount/outstandingAmount/paidAmount.
export interface EmployeeLoan {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  loanType: LoanType;
  loanNumber?: string;
  principalAmount: number;
  interestRate: number;
  totalAmount?: number;
  outstandingAmount?: number;
  emiAmount?: number;
  tenureMonths: number;
  purpose: string;
  status: LoanStatus;
  requestedDate?: string;
  approvedDate?: string;
  disbursementDate?: string;
  firstEmiDate?: string;
  lastEmiDate?: string;
  approvedBy?: string;
  approverName?: string;
  rejectedReason?: string;
  isSalaryDeduction?: boolean;
  guarantorName?: string;
  guarantorEmployeeId?: string;
  remarks?: string;
  paidEmis?: number;
  remainingEmis?: number;
  paidAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// BUG-FIX: Fields must match backend CreateLoanRequest DTO.
export interface CreateLoanRequest {
  loanType: LoanType;
  principalAmount: number;
  interestRate?: number;
  tenureMonths: number;
  purpose?: string;
  isSalaryDeduction?: boolean;
  guarantorName?: string;
  guarantorEmployeeId?: string;
  remarks?: string;
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
