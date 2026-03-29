// Restricted Holidays Types

export type HolidayCategory = 'RELIGIOUS' | 'REGIONAL' | 'CULTURAL' | 'NATIONAL' | 'OTHER';
export type SelectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RestrictedHoliday {
  id: string;
  holidayName: string;
  holidayDate: string;
  description: string | null;
  category: HolidayCategory;
  applicableRegions: string | null;
  applicableDepartments: string | null;
  year: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  selectionCount: number | null;
}

export interface RestrictedHolidayRequest {
  holidayName: string;
  holidayDate: string;
  description?: string;
  category?: HolidayCategory;
  applicableRegions?: string;
  applicableDepartments?: string;
  isActive?: boolean;
}

export interface RestrictedHolidaySelection {
  id: string;
  employeeId: string;
  restrictedHolidayId: string;
  holidayName: string | null;
  holidayDate: string | null;
  holidayCategory: HolidayCategory | null;
  status: SelectionStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface SelectionActionRequest {
  rejectionReason?: string;
}

export interface RestrictedHolidayPolicy {
  id: string | null;
  maxSelectionsPerYear: number;
  requiresApproval: boolean;
  applicableDepartments: string | null;
  year: number;
  isActive: boolean;
  minDaysBeforeSelection: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PolicyRequest {
  maxSelectionsPerYear: number;
  requiresApproval: boolean;
  applicableDepartments?: string;
  year: number;
  minDaysBeforeSelection?: number;
}

export interface EmployeeSummary {
  year: number;
  maxSelections: number;
  usedSelections: number;
  remainingSelections: number;
  requiresApproval: boolean;
}

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
