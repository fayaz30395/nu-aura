export interface ExecutiveDashboardData {
  csuite: CSuiteMetrics;
  financial: FinancialMetrics;
  strategic: StrategicInsights;
  workforce: WorkforceSummary;
  timestamp: string;
}

export interface CSuiteMetrics {
  headcount: {
    total: number;
    activeEmployees: number;
    newHires: number;
    terminations: number;
    growth: number;
    growthPercentage: number;
  };
  revenuePerEmployee: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  };
  costMetrics: {
    totalCost: number;
    costPerEmployee: number;
    payrollCost: number;
    benefitsCost: number;
    operationalCost: number;
  };
  productivity: {
    utilizationRate: number;
    billableHours: number;
    nonBillableHours: number;
    efficiency: number;
  };
}

export interface FinancialMetrics {
  payroll: {
    currentMonth: number;
    previousMonth: number;
    change: number;
    changePercentage: number;
    processed: number;
    pending: number;
    trend: MonthlyTrend[];
  };
  compensation: {
    totalCompensation: number;
    averageSalary: number;
    medianSalary: number;
    salaryRange: {
      min: number;
      max: number;
    };
    byDepartment: DepartmentCompensation[];
  };
  benefits: {
    totalBenefitsCost: number;
    perEmployee: number;
    healthInsurance: number;
    retirement: number;
    other: number;
    enrollment: number;
  };
  expenses: {
    total: number;
    pending: number;
    approved: number;
    reimbursed: number;
    byCategory: ExpenseCategory[];
  };
}

export interface StrategicInsights {
  alerts: Alert[];
  recommendations: Recommendation[];
  trends: Trend[];
  risks: Risk[];
}

export interface WorkforceSummary {
  demographics: {
    byDepartment: DepartmentBreakdown[];
    byLocation: LocationBreakdown[];
    byTenure: TenureBreakdown[];
    byAge: AgeBreakdown[];
  };
  attendance: {
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    attendanceRate: number;
    trend: DailyAttendance[];
  };
  performance: {
    highPerformers: number;
    meetingExpectations: number;
    needsImprovement: number;
    averageRating: number;
    reviewsCompleted: number;
    reviewsPending: number;
  };
  engagement: {
    eNPS: number;
    satisfactionScore: number;
    turnoverRate: number;
    retentionRate: number;
    activeOnboarding: number;
  };
}

export interface MonthlyTrend {
  month: string;
  value: number;
  label: string;
}

export interface DepartmentCompensation {
  department: string;
  totalCompensation: number;
  averageSalary: number;
  employeeCount: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  count: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  potentialSavings?: number;
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  changePercentage: number;
  description: string;
}

export interface Risk {
  id: string;
  category: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  probability: number;
  impact: string;
  mitigation?: string;
}

export interface DepartmentBreakdown {
  department: string;
  count: number;
  percentage: number;
}

export interface LocationBreakdown {
  location: string;
  count: number;
  percentage: number;
}

export interface TenureBreakdown {
  range: string;
  count: number;
  percentage: number;
}

export interface AgeBreakdown {
  range: string;
  count: number;
  percentage: number;
}

export interface DailyAttendance {
  date: string;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  attendanceRate: number;
}

// Employee Dashboard Types

export interface AttendanceHistory {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'LEAVE' | 'WEEKLY_OFF' | 'HOLIDAY';
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkHours?: number;
  isLate?: boolean;
  lateByMinutes?: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  onTime: number;
  late: number;
  totalHours: number;
}

export interface LeaveBalanceItem {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorCode?: string;
  totalQuota: number;
  available: number;
  used: number;
  pending: number;
  percentage: number;
}

export interface CareerGoal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  reviewPeriod: string;
  reviewType: string;
  overallRating?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  reviewDate?: string;
  reviewerName?: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  type: 'HOLIDAY' | 'BIRTHDAY' | 'ANNIVERSARY' | 'MEETING' | 'TRAINING' | 'OTHER';
  date: string;
  description?: string;
}

export interface EmployeeDashboardData {
  employeeId: string;
  employeeName: string;
  designation?: string;
  department?: string;

  // Attendance Summary
  attendanceSummary: {
    currentMonth: {
      present: number;
      absent: number;
      late: number;
      onLeave: number;
      totalWorkingDays: number;
      attendancePercentage: number;
      averageWorkHours: number;
    };
    recentHistory: AttendanceHistory[];
    weeklyTrend: AttendanceTrend[];
  };

  // Leave Balances
  leaveBalances: LeaveBalanceItem[];

  // Career Progress
  careerProgress: {
    currentGoals: CareerGoal[];
    recentReviews: PerformanceReview[];
    completedTrainings: number;
    upcomingTrainings: number;
  };

  // Upcoming Events
  upcomingEvents: UpcomingEvent[];

  // Quick stats
  stats: {
    totalLeavesTaken: number;
    totalLeavesRemaining: number;
    pendingLeaveRequests: number;
    pendingApprovals: number;
  };
}

// Manager Dashboard Types

export interface ManagerDashboardResponse {
  managerId: string;
  managerName: string;
  departmentName: string;
  teamOverview: TeamOverview;
  teamAttendance: TeamAttendance;
  teamLeave: TeamLeave;
  teamPerformance: TeamPerformance;
  actionItems: ActionItems;
  teamMembers: TeamMemberSummary[];
  teamAlerts: TeamAlert[];
}

export interface TeamOverview {
  directReports: number;
  totalTeamSize: number;
  activeMembers: number;
  onLeave: number;
  onProbation: number;
  newJoinersThisMonth: number;
  exitsThisMonth: number;
  teamHealthScore: number;
  teamHealthStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  hierarchyLevels: number;
  avgSpanOfControl: number;
}

export interface TeamAttendance {
  presentToday: number;
  absentToday: number;
  workFromHomeToday: number;
  onLeaveToday: number;
  lateToday: number;
  weeklyAttendanceRate: number;
  totalLateArrivals: number;
  totalEarlyDepartures: number;
  monthlyAttendanceRate: number;
  avgWorkingHours: number;
  monthlyAttendanceChange: number;
  weeklyTrend: TeamDailyAttendance[];
  attendanceIssues: AttendanceIssue[];
}

export interface TeamDailyAttendance {
  date: string;
  dayOfWeek: string;
  present: number;
  absent: number;
  onLeave: number;
  attendanceRate: number;
}

export interface AttendanceIssue {
  employeeId: string;
  employeeName: string;
  issueType: 'FREQUENT_LATE' | 'FREQUENT_ABSENT' | 'LOW_HOURS';
  description: string;
  occurrences: number;
  period: string;
}

export interface TeamLeave {
  pendingApprovals: number;
  pendingLeaveRequests: PendingLeave[];
  onLeaveToday: number;
  upcomingLeaveThisWeek: number;
  upcomingLeaveThisMonth: number;
  avgLeaveUtilization: number;
  teamMembersLowLeaveBalance: number;
  leavePatterns: LeavePattern[];
  upcomingLeaves: UpcomingLeave[];
}

export interface PendingLeave {
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  submittedAt: string;
  urgency: string;
}

export interface LeavePattern {
  leaveType: string;
  totalDays: number;
  requestCount: number;
  percentOfTotal: number;
}

export interface UpcomingLeave {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export interface TeamPerformance {
  exceeding: number;
  meeting: number;
  needsImprovement: number;
  notRated: number;
  avgPerformanceRating: number;
  ratingChangeFromLastCycle: number;
  totalGoals: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsCompleted: number;
  goalCompletionRate: number;
  oneOnOnesScheduled: number;
  oneOnOnesOverdue: number;
  oneOnOnesCompletedThisMonth: number;
  pendingFeedbackRequests: number;
  avgFeedbackScore: number;
  pendingTrainings: number;
  trainingCompletionRate: number;
  performanceConcerns: PerformanceConcern[];
}

export interface PerformanceConcern {
  employeeId: string;
  employeeName: string;
  concernType: 'LOW_RATING' | 'DECLINING_PERFORMANCE' | 'MISSED_GOALS';
  description: string;
  severity: 'WARNING' | 'CRITICAL';
  recommendation: string;
}

export interface ActionItems {
  leaveApprovals: number;
  expenseApprovals: number;
  timesheetApprovals: number;
  overtimeApprovals: number;
  performanceReviewsDue: number;
  probationReviewsDue: number;
  oneOnOnesDue: number;
  overdueApprovals: number;
  overdueReviews: number;
  totalActionItems: number;
}

export interface TeamMemberSummary {
  employeeId: string;
  employeeName: string;
  designation: string;
  profilePicUrl: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'ON_PROBATION';
  todayStatus: 'PRESENT' | 'ABSENT' | 'WFH' | 'ON_LEAVE';
  performanceRating: number;
  attendanceRate: number;
  hasAttritionRisk: boolean;
  pendingLeaveBalance: number;
  joiningDate: string;
  tenureMonths: number;
}

export interface TeamAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'ATTENDANCE' | 'PERFORMANCE' | 'LEAVE' | 'PROBATION';
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
  actionRequired: string;
}
