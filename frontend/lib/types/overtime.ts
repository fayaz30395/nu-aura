// ──────────────────────────────────────────────────────────────
// Overtime types — mirrors backend DTOs in api/overtime/dto/
// ──────────────────────────────────────────────────────────────

export type OvertimeType = 'REGULAR' | 'WEEKEND' | 'HOLIDAY' | 'EMERGENCY';

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// ── Request DTOs ──────────────────────────────────────────────

export interface OvertimeRecordRequest {
  employeeId: string;
  overtimeDate: string; // ISO date
  shiftId?: string;
  regularHours: number;
  actualHours: number;
  overtimeHours: number;
  overtimeType: string;
  notes?: string;
  isPreApproved?: boolean;
}

export interface OvertimeApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

// ── Response DTOs ─────────────────────────────────────────────

export interface OvertimeRecordResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  overtimeDate: string;
  shiftId: string;
  shiftName: string;
  regularHours: number;
  actualHours: number;
  overtimeHours: number;
  overtimeType: string;
  multiplier: number;
  effectiveHours: number;
  status: string;
  isPreApproved: boolean;
  approvedBy: string;
  approverName: string;
  approvedAt: string;
  rejectedBy: string;
  rejectorName: string;
  rejectedAt: string;
  rejectionReason: string;
  payrollRunId: string;
  processedInPayroll: boolean;
  processedAt: string;
  notes: string;
  autoCalculated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompTimeBalance {
  employeeId: string;
  totalBalance: number;
  fiscalYear?: number;
  currentYearBalance?: number;
  totalAccrued?: number;
  totalUsed?: number;
  totalExpired?: number;
}

// ── Paginated response ────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
