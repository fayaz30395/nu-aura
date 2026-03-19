// Compensation Types

export enum CycleType {
  ANNUAL = 'ANNUAL',
  MID_YEAR = 'MID_YEAR',
  QUARTERLY = 'QUARTERLY',
  SPECIAL = 'SPECIAL',
  AD_HOC = 'AD_HOC',
}

export enum CycleStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  APPROVAL = 'APPROVAL',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RevisionType {
  ANNUAL_INCREMENT = 'ANNUAL_INCREMENT',
  PROMOTION = 'PROMOTION',
  ROLE_CHANGE = 'ROLE_CHANGE',
  MARKET_ADJUSTMENT = 'MARKET_ADJUSTMENT',
  PERFORMANCE_BONUS = 'PERFORMANCE_BONUS',
  SPECIAL_INCREMENT = 'SPECIAL_INCREMENT',
  PROBATION_CONFIRMATION = 'PROBATION_CONFIRMATION',
  RETENTION = 'RETENTION',
  CORRECTION = 'CORRECTION',
}

export enum RevisionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVIEWED = 'REVIEWED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  APPLIED = 'APPLIED',
}

export interface CompensationReviewCycle {
  id: string;
  name: string;
  description?: string;
  cycleType: CycleType;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  effectiveDate: string;
  status: CycleStatus;
  budgetAmount?: number;
  utilizedAmount?: number;
  minIncrementPercentage?: number;
  maxIncrementPercentage?: number;
  averageIncrementTarget?: number;
  includeAllEmployees?: boolean;
  minTenureMonths?: number;
  excludeProbationers?: boolean;
  excludeNoticePeriod?: boolean;
  allowPromotions?: boolean;
  requirePerformanceRating?: boolean;
  minPerformanceRating?: number;
  totalEmployees?: number;
  revisionsDrafted?: number;
  revisionsApproved?: number;
  revisionsApplied?: number;
  currency?: string;
  createdBy?: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  designation?: string;
  reviewCycleId?: string;
  reviewCycleName?: string;
  revisionType: RevisionType;
  previousSalary: number;
  newSalary: number;
  incrementAmount?: number;
  incrementPercentage?: number;
  previousDesignation?: string;
  newDesignation?: string;
  previousLevel?: string;
  newLevel?: string;
  effectiveDate: string;
  status: RevisionStatus;
  justification?: string;
  performanceRating?: number;
  proposedBy?: string;
  proposedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewerComments?: string;
  approvedBy?: string;
  approvedDate?: string;
  approverComments?: string;
  rejectionReason?: string;
  letterGenerated?: boolean;
  payrollProcessed?: boolean;
  currency?: string;
}

export interface CompensationStatistics {
  totalEmployees: number;
  eligibleEmployees: number;
  revisionsCompleted: number;
  averageIncrement: number;
  totalBudget: number;
  utilizedBudget: number;
  pendingApprovals: number;
  promotionsCount: number;
}

export interface CompensationCycleRequest {
  name: string;
  description?: string;
  cycleType: CycleType;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  effectiveDate: string;
  budgetAmount?: number;
  minIncrementPercentage?: number;
  maxIncrementPercentage?: number;
  averageIncrementTarget?: number;
  includeAllEmployees?: boolean;
  minTenureMonths?: number;
  excludeProbationers?: boolean;
  excludeNoticePeriod?: boolean;
  allowPromotions?: boolean;
  requirePerformanceRating?: boolean;
  minPerformanceRating?: number;
  currency?: string;
}

export interface SalaryRevisionRequest {
  employeeId: string;
  reviewCycleId?: string;
  revisionType: RevisionType;
  newSalary: number;
  newDesignation?: string;
  newLevel?: string;
  effectiveDate: string;
  justification?: string;
  performanceRating?: number;
}
