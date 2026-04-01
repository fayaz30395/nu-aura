/**
 * Types for the Predictive Analytics API
 * Maps to backend DTOs in com.hrms.api.analytics.dto
 */

// ==================== Attrition Prediction ====================

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AttritionPrediction {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  jobTitle: string;
  predictionDate: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedLeaveDate: string | null;
  confidenceScore: number;
  riskFactors: RiskFactor[];
  tenureMonths: number;
  salaryPercentile: number;
  lastPromotionMonths: number;
  engagementScore: number;
  performanceRating: number;
  recommendations: string[];
  actionTaken: boolean;
  actualOutcome: string | null;
  actualLeaveDate: string | null;
  createdAt: string;
}

// ==================== Workforce Trend ====================

export interface WorkforceTrend {
  id: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  trendType: string;
  departmentId: string | null;
  departmentName: string | null;
  totalHeadcount: number;
  newHires: number;
  terminations: number;
  voluntaryAttrition: number;
  involuntaryAttrition: number;
  internalTransfersIn: number;
  internalTransfersOut: number;
  netChange: number;
  attritionRate: number;
  voluntaryAttritionRate: number;
  hiringRate: number;
  growthRate: number;
  totalCompensation: number;
  avgSalary: number;
  avgSalaryIncrease: number;
  costPerHire: number;
  trainingCost: number;
  avgEngagementScore: number;
  avgPerformanceRating: number;
  highPerformersCount: number;
  lowPerformersCount: number;
  genderDiversityRatio: number;
  avgTenureMonths: number;
  avgAge: number;
  avgTimeToFillDays: number;
  openPositions: number;
}

// ==================== Analytics Insight ====================

export interface AnalyticsInsight {
  id: string;
  title: string;
  description: string;
  insightType: string;
  category: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  departmentId: string | null;
  departmentName: string | null;
  impactScore: number;
  affectedEmployees: number;
  potentialCostImpact: number;
  recommendation: string;
  actionItems: string[];
  status: string;
  assignedTo: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  dataSource: string;
  generatedAt: string;
  validUntil: string | null;
}

// ==================== Skill Gap ====================

export interface SkillGap {
  id: string;
  skillName: string;
  skillCategory: string;
  departmentId: string | null;
  departmentName: string | null;
  jobFamily: string;
  currentSupply: number;
  requiredSupply: number;
  gapCount: number;
  gapSeverity: number;
  avgProficiencyLevel: number;
  requiredProficiencyLevel: number;
  proficiencyGap: number;
  projectedDemandGrowth: number;
  projectionDate: string | null;
  estimatedRetirementLoss: number;
  estimatedAttritionLoss: number;
  futureGapCount: number;
  resolutionStrategy: 'TRAIN' | 'HIRE' | 'HYBRID' | null;
  trainingAvailable: boolean;
  estimatedTrainingCost: number;
  estimatedHiringCost: number;
  recommendedCost: number;
  timeToCloseMonths: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  analysisDate: string;
}

// ==================== Dashboard (Composite) ====================

export interface DepartmentRisk {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  atRiskCount: number;
  avgRiskScore: number;
  riskPercentage: number;
}

export interface AttritionSummary {
  totalEmployees: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  avgRiskScore: number;
  predictedAttritionRate: number;
  topAtRiskEmployees: AttritionPrediction[];
  departmentRisks: DepartmentRisk[];
}

export interface HeadcountTrend {
  direction: 'UP' | 'DOWN' | 'STABLE';
  changePercent: number;
  changeCount: number;
  comparisonPeriod: string;
}

export interface WorkforceSummary {
  currentHeadcount: number;
  yearToDateHires: number;
  yearToDateTerminations: number;
  yearToDateAttritionRate: number;
  avgTenureMonths: number;
  avgEngagementScore: number;
  avgPerformanceRating: number;
  openPositions: number;
  avgTimeToFill: number;
  headcountTrend: HeadcountTrend;
}

export interface CategoryGap {
  category: string;
  gapCount: number;
  skillsAffected: number;
  avgSeverity: number;
}

export interface SkillGapSummary {
  totalGaps: number;
  criticalGaps: number;
  highPriorityGaps: number;
  totalTrainingCostNeeded: number;
  totalHiringCostNeeded: number;
  topGaps: SkillGap[];
  gapsByCategory: CategoryGap[];
}

export interface KeyMetric {
  name: string;
  value: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  changePercent: number;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  description: string;
}

export interface PredictiveAnalyticsDashboard {
  attritionSummary: AttritionSummary;
  workforceSummary: WorkforceSummary;
  skillGapSummary: SkillGapSummary;
  criticalInsights: AnalyticsInsight[];
  totalActiveInsights: number;
  pendingActionItems: number;
  keyMetrics: KeyMetric[];
  monthlyTrends: WorkforceTrend[];
}

// ==================== Filter State ====================

export interface PredictiveFilters {
  department?: string;
  riskLevel?: string;
  dateRange: '3m' | '6m' | '12m';
  segment?: 'all' | 'high-performers' | 'new-hires' | 'managers';
}

// ==================== Paginated Response ====================

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
