// =============================================
// EXECUTIVE DASHBOARD TYPES
// =============================================

export interface ExecutiveDashboardData {
  keyMetrics: KpiCard[];
  financialSummary: FinancialSummary | null;
  workforceSummary: WorkforceSummary | null;
  productivityMetrics: ProductivityMetrics | null;
  riskIndicators: RiskIndicators | null;
  trendCharts: TrendCharts | null;
  strategicAlerts: StrategicAlert[];
}

export interface KpiCard {
  name: string;
  value: string;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  changePercent: number;
  changeDescription: string;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  icon: string;
  color: string;
}

export interface FinancialSummary {
  monthlyPayrollCost: number;
  yearToDatePayrollCost: number;
  projectedAnnualPayrollCost: number;
  payrollCostChangePercent: number;
  avgCostPerEmployee: number;
  costPerEmployeeChange: number;
  budgetAllocated: number;
  budgetUtilized: number;
  budgetUtilizationPercent: number;
  revenuePerEmployee: number;
  departmentCosts: DepartmentCost[];
  costBreakdown: CostBreakdown | null;
}

export interface DepartmentCost {
  departmentId: string;
  departmentName: string;
  totalCost: number;
  headcount: number;
  costPerHead: number;
  percentOfTotal: number;
}

export interface CostBreakdown {
  baseSalary: number;
  benefits: number;
  bonuses: number;
  taxes: number;
  training: number;
  recruitment: number;
  other: number;
}

export interface WorkforceSummary {
  totalHeadcount: number;
  activeEmployees: number;
  contractorCount: number;
  openPositions: number;
  newHiresThisMonth: number;
  newHiresThisQuarter: number;
  newHiresThisYear: number;
  terminationsThisMonth: number;
  terminationsThisQuarter: number;
  terminationsThisYear: number;
  attritionRate: number;
  retentionRate: number;
  hiringVelocity: number;
  byDepartment: DemographicBreakdown[];
  byLocation: DemographicBreakdown[];
  byEmploymentType: DemographicBreakdown[];
  tenureDistribution: TenureDistribution | null;
}

export interface DemographicBreakdown {
  category: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

export interface TenureDistribution {
  lessThan1Year: number;
  oneToThreeYears: number;
  threeToFiveYears: number;
  fiveToTenYears: number;
  moreThan10Years: number;
  avgTenureYears: number;
}

export interface ProductivityMetrics {
  avgAttendanceRate: number;
  absenteeismRate: number;
  avgWorkingHours: number;
  avgPerformanceRating: number;
  highPerformersCount: number;
  lowPerformersCount: number;
  performanceImprovementRate: number;
  engagementScore: number;
  engagementChangePercent: number;
  eNPS: number;
  trainingHoursPerEmployee: number;
  trainingCompletionRate: number;
  certificationCount: number;
  goalCompletionRate: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsDelayed: number;
}

export interface RiskIndicators {
  highRiskEmployees: number;
  criticalRiskEmployees: number;
  predictedAttritionRate: number;
  departmentRisks: DepartmentRisk[];
  complianceIssuesCount: number;
  overdueTrainings: number;
  expiredCertifications: number;
  criticalSkillGaps: number;
  totalSkillGaps: number;
  skillCoveragePercent: number;
  keyPositionsWithoutSuccessor: number;
  successionReadyPercentage: number;
  employeesWithHighWorkload: number;
  employeesWithExcessiveOvertime: number;
  avgOvertimeHours: number;
}

export interface DepartmentRisk {
  departmentId: string;
  departmentName: string;
  atRiskCount: number;
  avgRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface TrendCharts {
  headcountTrend: TrendPoint[];
  payrollCostTrend: TrendPoint[];
  attritionTrend: TrendPoint[];
  engagementTrend: TrendPoint[];
  hiringVsAttrition: HiringAttritionPoint[];
}

export interface TrendPoint {
  period: string;
  value: number;
  previousValue: number;
  changePercent: number;
}

export interface HiringAttritionPoint {
  period: string;
  hires: number;
  terminations: number;
  netChange: number;
}

export interface StrategicAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'ATTRITION' | 'COMPLIANCE' | 'BUDGET' | 'PERFORMANCE';
  title: string;
  description: string;
  recommendation: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  trend: 'IMPROVING' | 'WORSENING' | 'STABLE';
  createdAt: string;
}

// =============================================
// EMPLOYEE DASHBOARD TYPES
// =============================================

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

  leaveBalances: LeaveBalanceItem[];

  careerProgress: {
    currentGoals: CareerGoal[];
    recentReviews: PerformanceReview[];
    completedTrainings: number;
    upcomingTrainings: number;
  };

  upcomingEvents: UpcomingEvent[];

  stats: {
    totalLeavesTaken: number;
    totalLeavesRemaining: number;
    pendingLeaveRequests: number;
    pendingApprovals: number;
  };
}

// =============================================
// MANAGER DASHBOARD TYPES
// =============================================

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
  engagementScore: number;
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

// =============================================
// MANAGER TEAM PROJECTS TYPES
// =============================================

export interface TeamMemberProjectAllocation {
  projectId: string;
  projectName: string;
  projectCode: string;
  role: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string | null;
  projectStatus: 'IN_PROGRESS' | 'PLANNED' | 'DRAFT' | 'COMPLETED' | 'ON_HOLD';
  projectPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TeamMemberWithProjects {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  level: string;
  projects: TeamMemberProjectAllocation[];
  totalAllocation: number;
  isOverAllocated: boolean;
}

export interface TeamProjectsSummary {
  totalReports: number;
  allocatedCount: number;
  unallocatedCount: number;
  overAllocatedCount: number;
  avgAllocation: number;
}

export interface ManagerTeamProjectsResponse {
  teamMembers: TeamMemberWithProjects[];
  summary: TeamProjectsSummary;
}
