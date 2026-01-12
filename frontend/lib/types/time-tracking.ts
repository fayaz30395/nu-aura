// Time Tracking Types

export type TimeEntryStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

export type EntryType =
  | 'REGULAR'
  | 'OVERTIME'
  | 'HOLIDAY'
  | 'WEEKEND';

export interface TimeEntry {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  hoursWorked: number;
  billableHours: number;
  isBillable: boolean;
  hourlyRate?: number;
  billingAmount?: number;
  entryType: EntryType;
  description?: string;
  notes?: string;
  status: TimeEntryStatus;
  submittedDate?: string;
  approvedBy?: string;
  approverName?: string;
  approvedDate?: string;
  rejectionReason?: string;
  clientId?: string;
  clientName?: string;
  externalRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryRequest {
  projectId?: string;
  taskId?: string;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  hoursWorked: number;
  billableHours?: number;
  isBillable?: boolean;
  hourlyRate?: number;
  entryType?: EntryType;
  description?: string;
  notes?: string;
  clientId?: string;
  clientName?: string;
  externalRef?: string;
}

export interface TimeSummary {
  startDate: string;
  endDate: string;
  totalHoursWorked: number;
  employeeId: string;
}

export interface ProjectTimeSummary {
  projectId: string;
  totalBillableHours: number;
  totalBillingAmount: number;
}

export interface TimeEntryFilters {
  status?: TimeEntryStatus;
  projectId?: string;
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
