// Expense Management Types

export type ExpenseCategory =
  | 'TRAVEL'
  | 'ACCOMMODATION'
  | 'MEALS'
  | 'TRANSPORT'
  | 'OFFICE_SUPPLIES'
  | 'EQUIPMENT'
  | 'SOFTWARE'
  | 'TRAINING'
  | 'COMMUNICATION'
  | 'ENTERTAINMENT'
  | 'MEDICAL'
  | 'RELOCATION'
  | 'OTHER';

export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'REIMBURSED'
  | 'PAID'
  | 'CANCELLED';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR';

export type AdvanceStatus = 'REQUESTED' | 'APPROVED' | 'DISBURSED' | 'SETTLED' | 'CANCELLED';

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  claimDate: string;
  category: ExpenseCategory;
  categoryDisplayName: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  status: ExpenseStatus;
  statusDisplayName: string;
  receiptUrl?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paymentDate?: string;
  paymentReference?: string;
  reimbursedAt?: string;
  reimbursementRef?: string;
  notes?: string;
  title?: string;
  policyId?: string;
  totalItems: number;
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
  title?: string;
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

// ─── Category Entity (tenant-configurable) ─────────────────────────────────
export interface ExpenseCategoryEntity {
  id: string;
  name: string;
  description?: string;
  maxAmount?: number;
  requiresReceipt: boolean;
  isActive: boolean;
  parentCategoryId?: string;
  glCode?: string;
  iconName?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryRequest {
  name: string;
  description?: string;
  maxAmount?: number;
  requiresReceipt: boolean;
  parentCategoryId?: string;
  glCode?: string;
  iconName?: string;
  sortOrder?: number;
}

// ─── Policy ─────────────────────────────────────────────────────────────────
export interface ExpensePolicyEntity {
  id: string;
  name: string;
  description?: string;
  applicableDepartments: string[];
  applicableDesignations: string[];
  dailyLimit?: number;
  monthlyLimit?: number;
  yearlyLimit?: number;
  singleClaimLimit?: number;
  requiresPreApproval: boolean;
  preApprovalThreshold?: number;
  receiptRequiredAbove?: number;
  isActive: boolean;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePolicyRequest {
  name: string;
  description?: string;
  applicableDepartments?: string[];
  applicableDesignations?: string[];
  dailyLimit?: number;
  monthlyLimit?: number;
  yearlyLimit?: number;
  singleClaimLimit?: number;
  requiresPreApproval: boolean;
  preApprovalThreshold?: number;
  receiptRequiredAbove?: number;
  currency?: string;
}

// ─── Expense Item (line item per claim) ─────────────────────────────────────
export interface ExpenseItemEntity {
  id: string;
  expenseClaimId: string;
  categoryId?: string;
  categoryName?: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  receiptStoragePath?: string;
  receiptFileName?: string;
  merchantName?: string;
  isBillable: boolean;
  projectCode?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateExpenseItemRequest {
  categoryId?: string;
  description: string;
  amount: number;
  currency?: string;
  expenseDate: string;
  merchantName?: string;
  isBillable?: boolean;
  projectCode?: string;
  notes?: string;
}

// ─── Expense Advance ────────────────────────────────────────────────────────
export interface ExpenseAdvanceEntity {
  id: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  currency: string;
  purpose: string;
  status: AdvanceStatus;
  requestedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  disbursedAt?: string;
  settledAt?: string;
  settlementClaimId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseAdvanceRequest {
  amount: number;
  currency?: string;
  purpose: string;
  notes?: string;
}

// ─── Report types ───────────────────────────────────────────────────────────
export interface ExpenseReportData {
  totalClaims: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byCategory: Record<string, { count: number; amount: number }>;
  monthlyTrend: Array<{ month: string; count: number; amount: number }>;
  startDate: string;
  endDate: string;
}

// ─── OCR Receipt Scanning ──────────────────────────────────────────────────
export interface OcrResult {
  merchantName: string | null;
  amount: number | null;
  currency: string;
  receiptDate: string | null;
  rawText: string;
  confidence: number;
  receiptStoragePath: string;
  receiptFileName: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Mileage Tracking ────────────────────────────────────────────────────────

export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'BICYCLE' | 'PUBLIC_TRANSPORT';

export type MileageStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface MileageLogEntry {
  id: string;
  employeeId: string;
  employeeName?: string;
  travelDate: string;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  purpose?: string;
  vehicleType: VehicleType;
  ratePerKm: number;
  reimbursementAmount: number;
  status: MileageStatus;
  expenseClaimId?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMileageLogRequest {
  travelDate: string;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  purpose?: string;
  vehicleType: VehicleType;
  notes?: string;
}

export interface MileagePolicyEntity {
  id: string;
  name: string;
  ratePerKm: number;
  maxDailyKm?: number;
  maxMonthlyKm?: number;
  vehicleRates?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMileagePolicyRequest {
  name: string;
  ratePerKm: number;
  maxDailyKm?: number;
  maxMonthlyKm?: number;
  vehicleRates?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface MileageSummary {
  year: number;
  month: number;
  totalDistanceKm: number;
  totalReimbursement: number;
  totalTrips: number;
  policyMaxMonthlyKm?: number;
  remainingMonthlyKm?: number;
}
