export interface Shift {
  id: string;
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
  isActive: boolean;
  shiftType?: string;
  colorCode?: string;
  allowsOvertime?: boolean;
  overtimeMultiplier?: number;
  netWorkingHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftRequest {
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
  allowsOvertime?: boolean;
  overtimeMultiplier?: number;
}

export interface UpdateShiftRequest {
  shiftName?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
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
  allowsOvertime?: boolean;
  overtimeMultiplier?: number;
}

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
  assignmentType: string;
  status: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftAssignmentRequest {
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

export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}
