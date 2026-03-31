export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type ActivityType =
  | 'DEVELOPMENT'
  | 'TESTING'
  | 'DESIGN'
  | 'DOCUMENTATION'
  | 'MEETING'
  | 'CODE_REVIEW'
  | 'PLANNING'
  | 'SUPPORT'
  | 'RESEARCH'
  | 'OTHER';

export interface Timesheet {
  id: string;
  tenantId: string;
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  billableHours?: number;
  nonBillableHours?: number;
  status: TimesheetStatus;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TimeEntry {
  id: string;
  tenantId: string;
  timesheetId: string;
  employeeId: string;
  projectId: string;
  taskId?: string;
  entryDate: string;
  hours: number;
  isBillable: boolean;
  workDescription?: string;
  activityType?: ActivityType;
  isOvertime?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTimesheetRequest {
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  billableHours?: number;
  nonBillableHours?: number;
}

export interface CreateTimeEntryRequest {
  employeeId: string;
  projectId: string;
  taskId?: string;
  entryDate: string;
  hours: number;
  isBillable: boolean;
  workDescription?: string;
  activityType?: ActivityType;
  isOvertime?: boolean;
}

export interface TimesheetWithEntries extends Timesheet {
  entries: TimeEntry[];
}
