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
