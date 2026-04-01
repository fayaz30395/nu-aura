// Shift Management Types

export type ShiftType = 'FIXED' | 'ROTATING' | 'FLEXIBLE' | 'SPLIT';
export type RotationType = 'FIXED' | 'WEEKLY_ROTATING' | 'BIWEEKLY_ROTATING' | 'CUSTOM';
export type AssignmentType = 'PERMANENT' | 'TEMPORARY' | 'ROTATION' | 'OVERRIDE';
export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
export type SwapType = 'SWAP' | 'GIVE_AWAY' | 'PICK_UP';
export type SwapStatus =
  | 'PENDING'
  | 'TARGET_ACCEPTED'
  | 'TARGET_DECLINED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

// ─── Shift Definition ──────────────────────────────────────────────────────

export interface ShiftDefinition {
  id: string;
  shiftCode: string;
  shiftName: string;
  description?: string;
  startTime: string; // "HH:mm:ss"
  endTime: string;
  gracePeriodInMinutes: number;
  lateMarkAfterMinutes: number;
  halfDayAfterMinutes: number;
  fullDayHours: number;
  breakDurationMinutes: number;
  isNightShift: boolean;
  workingDays: string; // "MON,TUE,WED,THU,FRI"
  isActive: boolean;
  shiftType: ShiftType;
  colorCode: string;
  isFlexible: boolean;
  flexibleWindowMinutes: number;
  minGapBetweenShiftsHours: number;
  allowsOvertime: boolean;
  overtimeMultiplier: number;
  netWorkingHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftDefinitionRequest {
  shiftCode: string;
  shiftName: string;
  description?: string;
  startTime: string;
  endTime: string;
  gracePeriodInMinutes?: number;
  lateMarkAfterMinutes?: number;
  halfDayAfterMinutes?: number;
  fullDayHours?: number;
  breakDurationMinutes?: number;
  isNightShift?: boolean;
  workingDays?: string;
  isActive?: boolean;
  shiftType?: string;
  colorCode?: string;
  isFlexible?: boolean;
  flexibleWindowMinutes?: number;
  minGapBetweenShiftsHours?: number;
  allowsOvertime?: boolean;
  overtimeMultiplier?: number;
}

// ─── Shift Pattern ─────────────────────────────────────────────────────────

export interface ShiftPattern {
  id: string;
  name: string;
  description?: string;
  rotationType: RotationType;
  /** JSON string: array of shift UUIDs or "OFF" */
  pattern: string;
  cycleDays: number;
  isActive: boolean;
  colorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftPatternRequest {
  name: string;
  description?: string;
  rotationType: string;
  pattern: string;
  cycleDays: number;
  isActive?: boolean;
  colorCode?: string;
}

// ─── Shift Assignment ──────────────────────────────────────────────────────

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  shiftId: string;
  shiftName: string;
  shiftCode: string;
  shiftStartTime: string;
  shiftEndTime: string;
  assignmentDate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  isRecurring: boolean;
  recurrencePattern?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignmentRequest {
  employeeId: string;
  shiftId: string;
  assignmentDate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  assignmentType: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  notes?: string;
}

// ─── Schedule ──────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  shiftId: string;
  shiftName: string;
  shiftCode: string;
  colorCode: string;
  startTime: string;
  endTime: string;
  date: string;
  isNightShift: boolean;
  isDayOff: boolean;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
}

export interface GenerateScheduleRequest {
  departmentId?: string;
  employeeIds?: string[];
  shiftPatternId: string;
  startDate: string;
  endDate: string;
  overwrite?: boolean;
}

// ─── Shift Swap ────────────────────────────────────────────────────────────

export interface ShiftSwapRequest {
  id: string;
  tenantId: string;
  requesterEmployeeId: string;
  requesterAssignmentId: string;
  requesterShiftDate: string;
  targetEmployeeId?: string;
  targetAssignmentId?: string;
  targetShiftDate?: string;
  swapType: SwapType;
  status: SwapStatus;
  reason?: string;
  requestedAt: string;
  targetEmployeeResponse?: string;
  targetEmployeeAction?: string;
  approverId?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitSwapRequest {
  requesterEmployeeId: string;
  requesterAssignmentId: string;
  requesterShiftDate: string;
  targetEmployeeId?: string;
  targetAssignmentId?: string;
  targetShiftDate?: string;
  swapType: string;
  reason?: string;
}

// ─── Rule Violation ────────────────────────────────────────────────────────

export interface ShiftRuleViolation {
  employeeId: string;
  employeeName: string;
  date: string;
  rule: string;
  description: string;
  severity: 'WARNING' | 'ERROR';
}

// ─── Page type ─────────────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
