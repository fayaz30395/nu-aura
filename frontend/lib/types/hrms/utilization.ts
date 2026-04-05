// Utilization Report Types

export interface UtilizationReport {
  employeeId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  expectedHours: number;
  actualHours: number;
  billableHours: number;
  utilizationRate: number; // percentage (actual/expected * 100)
  billableRate: number; // percentage (billable/actual * 100)
  workingDays: number;
}

export interface TimeSummaryReport {
  employeeId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  byType: Record<TimeEntryType, number>;
  byProject: ProjectHoursSummary[];
}

export interface ProjectHoursSummary {
  projectId: string;
  projectName: string;
  hours: number;
  billableHours: number;
  billedAmount: number;
}

export interface WeeklyTimeReport {
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  billableHours: number;
  overtimeHours: number;
  dailyBreakdown: DailyHours[];
}

export interface DailyHours {
  date: string;
  dayOfWeek: string;
  hours: number;
  isWeekend: boolean;
}

export interface MonthlyTimeReport {
  employeeId: string;
  year: number;
  month: number;
  totalHours: number;
  billableHours: number;
  averageHoursPerDay: number;
  utilizationRate: number;
  weeklyBreakdown: WeeklyHours[];
}

export interface WeeklyHours {
  weekNumber: number;
  startDate: string;
  endDate: string;
  hours: number;
  billableHours: number;
}

export interface ProjectTimeReport {
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  billableHours: number;
  billedAmount: number;
  byEmployee: EmployeeProjectHours[];
  byType: Record<TimeEntryType, number>;
}

export interface EmployeeProjectHours {
  employeeId: string;
  employeeName: string;
  hours: number;
  billableHours: number;
  billedAmount: number;
  allocationPercentage: number;
}

export type TimeEntryType =
  | 'REGULAR'
  | 'OVERTIME'
  | 'MEETING'
  | 'TRAINING'
  | 'SUPPORT'
  | 'DEVELOPMENT'
  | 'TESTING'
  | 'DOCUMENTATION'
  | 'OTHER';

export type TimeEntryStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'BILLED';

export interface TimeEntry {
  id: string;
  tenantId: string;
  projectId: string;
  projectName?: string;
  employeeId: string;
  employeeName?: string;
  workDate: string;
  hoursWorked: number;
  description?: string;
  taskName?: string;
  entryType: TimeEntryType;
  isBillable: boolean;
  billingRate?: number;
  billedAmount?: number;
  status: TimeEntryStatus;
  approvedBy?: string;
  approvedAt?: string;
  submittedAt?: string;
  rejectedReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  projectName?: string;
  employeeId: string;
  employeeName?: string;
  role: ProjectRole;
  allocationPercentage: number;
  billingRate?: number;
  costRate?: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  canApproveTime: boolean;
}

export type ProjectRole =
  | 'PROJECT_MANAGER'
  | 'TEAM_LEAD'
  | 'DEVELOPER'
  | 'SENIOR_DEVELOPER'
  | 'QA_ENGINEER'
  | 'BUSINESS_ANALYST'
  | 'DESIGNER'
  | 'DEVOPS'
  | 'CONSULTANT'
  | 'OTHER';

// Dashboard aggregated data
export interface UtilizationDashboardData {
  summary: {
    totalEmployees: number;
    averageUtilization: number;
    totalBillableHours: number;
    totalNonBillableHours: number;
    billedAmount: number;
  };
  byDepartment: DepartmentUtilization[];
  byProject: ProjectUtilization[];
  topPerformers: EmployeeUtilization[];
  underUtilized: EmployeeUtilization[];
  trends: UtilizationTrend[];
}

export interface DepartmentUtilization {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  averageUtilization: number;
  totalHours: number;
  billableHours: number;
}

export interface ProjectUtilization {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  billedAmount: number;
  teamSize: number;
  utilizationRate: number;
}

export interface EmployeeUtilization {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  departmentName?: string;
  designation?: string;
  totalHours: number;
  billableHours: number;
  utilizationRate: number;
  billableRate: number;
}

export interface UtilizationTrend {
  period: string; // e.g., "2025-W01" or "2025-01"
  utilizationRate: number;
  billableRate: number;
  totalHours: number;
}

// Filter options for reports
export interface UtilizationFilterOptions {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  projectId?: string;
  employeeId?: string;
  minUtilization?: number;
  maxUtilization?: number;
}

// Utility functions
export const getUtilizationColor = (rate: number): string => {
  if (rate >= 90) return 'text-success-600 dark:text-success-400';
  if (rate >= 75) return 'text-accent-600 dark:text-accent-400';
  if (rate >= 50) return 'text-warning-600 dark:text-warning-400';
  return 'text-danger-600 dark:text-danger-400';
};

export const getUtilizationBgColor = (rate: number): string => {
  if (rate >= 90) return 'bg-success-100 dark:bg-success-900/30';
  if (rate >= 75) return 'bg-accent-100 dark:bg-accent-900/30';
  if (rate >= 50) return 'bg-warning-100 dark:bg-warning-900/30';
  return 'bg-danger-100 dark:bg-danger-900/30';
};

export const formatHours = (hours: number): string => {
  return `${hours.toFixed(1)}h`;
};

export const formatPercentage = (rate: number): string => {
  return `${rate.toFixed(1)}%`;
};

export {formatCurrency} from '@/lib/utils';
