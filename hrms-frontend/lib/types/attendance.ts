// Attendance Module Types

export interface Shift {
  id: string;
  tenantId: string;
  shiftCode: string;
  shiftName: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string;
  gracePeriodInMinutes: number;
  lateMarkAfterMinutes: number;
  halfDayAfterMinutes: number;
  fullDayHours: number;
  breakDurationMinutes: number;
  isNightShift: boolean;
  workingDays?: string;
  weeklyOffDays: number;
  isRotational: boolean;
  isActive: boolean;
  totalWorkHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftRequest {
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
  weeklyOffDays?: number;
  isRotational?: boolean;
}

export type HolidayType =
  | 'NATIONAL'
  | 'REGIONAL'
  | 'OPTIONAL'
  | 'RESTRICTED'
  | 'FESTIVAL'
  | 'COMPANY_EVENT';

export interface Holiday {
  id: string;
  tenantId: string;
  holidayName: string;
  holidayDate: string; // YYYY-MM-DD
  holidayType: HolidayType;
  description?: string;
  isOptional: boolean;
  isRestricted: boolean;
  applicableLocations?: string;
  applicableDepartments?: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayRequest {
  holidayName: string;
  holidayDate: string;
  holidayType: HolidayType;
  description?: string;
  isOptional?: boolean;
  isRestricted?: boolean;
  applicableLocations?: string;
  applicableDepartments?: string;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'WEEKLY_OFF'
  | 'HOLIDAY'
  | 'PENDING_REGULARIZATION'
  | 'LATE'
  | 'LEAVE';

export type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftId?: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInSource?: string;
  checkOutSource?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInIp?: string;
  checkOutIp?: string;
  status: AttendanceStatus;
  workDurationMinutes?: number;
  breakDurationMinutes?: number;
  overtimeMinutes?: number;
  totalWorkHours?: number;
  isLate?: boolean;
  lateByMinutes?: number;
  isEarlyDeparture?: boolean;
  earlyDepartureMinutes?: number;
  isHalfDay?: boolean;
  isOvertime?: boolean;
  isRegularization?: boolean;
  notes?: string;
  remarks?: string;
  regularizationRequested?: boolean;
  regularizationApproved?: boolean;
  regularizationReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInRequest {
  employeeId: string;
  checkInTime?: string;
  source?: string;
  location?: string;
  ip?: string;
  attendanceDate?: string; // Client's local date (YYYY-MM-DD) to handle timezone differences
}

export interface CheckOutRequest {
  employeeId: string;
  checkOutTime?: string;
  source?: string;
  location?: string;
  ip?: string;
  attendanceDate?: string; // Client's local date (YYYY-MM-DD) to handle timezone differences
}

export interface RegularizationRequest {
  reason: string;
}

export interface AttendanceResponse {
  id: string;
  employeeId: string;
  shiftId?: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkHours?: number;
  status?: AttendanceStatus;
  isRegularization: boolean;
  regularizationStatus?: RegularizationStatus;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type TimeEntryType = 'REGULAR' | 'BREAK' | 'LUNCH' | 'MEETING' | 'CLIENT_VISIT' | 'OTHER';

export interface TimeEntry {
  id: string;
  attendanceRecordId: string;
  entryType: TimeEntryType;
  checkInTime: string;
  checkOutTime?: string;
  checkInSource?: string;
  checkOutSource?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  durationMinutes: number;
  notes?: string;
  sequenceNumber: number;
  open?: boolean; // Jackson serializes boolean 'isOpen' as 'open'
}
