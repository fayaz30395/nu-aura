/**
 * Lightweight summary returned by GET /api/v1/analytics/summary
 * for the main dashboard KPI widget.
 */
export interface AnalyticsSummary {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  payrollProcessedThisMonth: boolean;
  openPositions: number;
}

export type ViewType = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface DashboardAnalytics {
  viewType: ViewType;
  viewLabel: string;
  teamSize: number;
  attendance: AttendanceAnalytics;
  leave: LeaveAnalytics;
  payroll: PayrollAnalytics | null; // null for non-admin users
  headcount: HeadcountAnalytics;
  upcomingEvents: UpcomingEvents;
}

export interface AttendanceAnalytics {
  present: number;
  absent: number;
  onLeave: number;
  onTime: number;
  late: number;
  attendancePercentage: number;
  trend: TrendData[];
}

export interface LeaveAnalytics {
  pending: number;
  approved: number;
  rejected: number;
  utilizationPercentage: number;
  trend: TrendData[];
  distribution: LeaveTypeDistribution[];
}

export interface PayrollAnalytics {
  currentMonth: CurrentMonthPayroll;
  costTrend: PayrollTrendData[];
  averageSalary: number;
}

export interface CurrentMonthPayroll {
  total: number;
  processed: number;
  pending: number;
  status: string;
}

export interface HeadcountAnalytics {
  total: number;
  newJoinees: number;
  exits: number;
  growthPercentage: number;
  trend: TrendData[];
  departmentDistribution: DepartmentDistribution[];
}

export interface UpcomingEvents {
  birthdays: BirthdayEvent[];
  anniversaries: AnniversaryEvent[];
  holidays: HolidayEvent[];
}

export interface TrendData {
  date: string;
  value: number;
  label: string;
}

export interface PayrollTrendData {
  month: string;
  amount: number;
}

export interface LeaveTypeDistribution {
  leaveType: string;
  count: number;
  color: string;
}

export interface DepartmentDistribution {
  department: string;
  count: number;
}

export interface BirthdayEvent {
  employeeName: string;
  date: string;
  department: string;
}

export interface AnniversaryEvent {
  employeeName: string;
  date: string;
  years: number;
  department: string;
}

export interface HolidayEvent {
  name: string;
  date: string;
  type: string;
}

export interface OrganizationHealth {
  healthScore: OverallHealth;
  turnover: TurnoverMetrics;
  diversity: DiversityMetrics;
  tenure: TenureMetrics;
  engagement: EngagementMetrics;
  training: TrainingMetrics;
}

export interface OverallHealth {
  score: number;
  status: 'CRITICAL' | 'WARNING' | 'GOOD' | 'EXCELLENT';
  trend: number;
}

export interface TurnoverMetrics {
  annualTurnoverRate: number;
  monthlyExits: number;
  monthlyJoiners: number;
  trend: DataPoint[];
}

export interface DiversityMetrics {
  genderDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  genderParityIndex: number;
}

export interface TenureMetrics {
  averageTenureYears: number;
  tenureDistribution: Record<string, number>;
}

export interface EngagementMetrics {
  overallEngagementScore: number;
  participationRate: number;
  engagementTrend: DataPoint[];
}

export interface TrainingMetrics {
  completionRate: number;
  totalTrainingHours: number;
  activeLearners: number;
}

export interface DataPoint {
  label: string;
  value: number;
}

// ==================== Scheduled Reports Types ====================

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ReportType = 'EMPLOYEE_DIRECTORY' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'PERFORMANCE' | 'DEPARTMENT_HEADCOUNT';
export type ExportFormat = 'EXCEL' | 'PDF' | 'CSV';

export interface ScheduledReport {
  id: string;
  scheduleName: string;
  reportType: ReportType;
  frequency: Frequency;
  dayOfWeek?: number; // 1=Monday, 7=Sunday (for WEEKLY)
  dayOfMonth?: number; // 1-31 (for MONTHLY)
  timeOfDay: string; // HH:mm format
  recipients: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt?: string;
  createdByName?: string;
  // Report parameters
  departmentId?: string;
  departmentName?: string;
  status?: string;
  exportFormat: ExportFormat;
}

export interface ScheduledReportRequest {
  scheduleName: string;
  reportType: ReportType;
  frequency: Frequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  recipients: string[];
  departmentId?: string;
  status?: string;
  exportFormat?: ExportFormat;
  isActive?: boolean;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  EMPLOYEE_DIRECTORY: 'Employee Directory',
  ATTENDANCE: 'Attendance',
  LEAVE: 'Leave',
  PAYROLL: 'Payroll',
  PERFORMANCE: 'Performance',
  DEPARTMENT_HEADCOUNT: 'Department Headcount',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};
