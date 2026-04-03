// Leave Management Types

// Leave Type Configuration
export type AccrualType =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'
  | 'NO_ACCRUAL';

export type GenderSpecific =
  | 'MALE'
  | 'FEMALE'
  | 'ALL';

export interface LeaveType {
  id: string;
  tenantId: string;
  leaveCode: string;
  leaveName: string;
  description?: string;
  isPaid: boolean;
  colorCode?: string;
  annualQuota?: number;
  maxConsecutiveDays?: number;
  minDaysNotice?: number;
  maxDaysPerRequest?: number;
  isCarryForwardAllowed: boolean;
  maxCarryForwardDays?: number;
  isEncashable: boolean;
  requiresDocument: boolean;
  applicableAfterDays?: number;
  accrualType?: AccrualType;
  accrualRate?: number;
  genderSpecific?: GenderSpecific;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveTypeRequest {
  leaveCode: string;
  leaveName: string;
  description?: string;
  isPaid: boolean;
  colorCode?: string;
  annualQuota?: number;
  maxConsecutiveDays?: number;
  minDaysNotice?: number;
  maxDaysPerRequest?: number;
  isCarryForwardAllowed: boolean;
  maxCarryForwardDays?: number;
  isEncashable: boolean;
  requiresDocument: boolean;
  applicableAfterDays?: number;
  accrualType?: AccrualType;
  accrualRate?: number;
  genderSpecific?: GenderSpecific;
}

// Leave Request
export type LeaveRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type HalfDayPeriod = 'FIRST_HALF' | 'SECOND_HALF';

export interface LeaveRequest {
  id: string;
  tenantId?: string;
  employeeId: string;
  leaveTypeId: string;
  requestNumber: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: HalfDayPeriod;
  reason: string;
  status: LeaveRequestStatus;
  documentPath?: string;
  appliedOn: string; // ISO 8601 DateTime
  approvedBy?: string;
  approverName?: string; // Name of the person who approved/rejected
  approvedOn?: string; // ISO 8601 DateTime
  rejectionReason?: string;
  cancelledOn?: string; // ISO 8601 DateTime
  cancellationReason?: string;
  comments?: string;
  // Approver info - the reporting manager who should approve this request
  approverId?: string;
  pendingApproverName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequestRequest {
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  isHalfDay?: boolean;
  halfDayPeriod?: HalfDayPeriod;
  reason: string;
  documentPath?: string;
}

export interface LeaveBalance {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  year: number;
  openingBalance: number;
  accrued: number;
  used: number;
  pending: number;
  available: number;
  carriedForward: number;
  encashed: number;
  lapsed: number;
  lastAccrualDate?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
