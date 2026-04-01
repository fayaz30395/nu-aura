// ──────────────────────────────────────────────────────────────
// Probation types — mirrors backend DTOs in api/probation/dto/
// ──────────────────────────────────────────────────────────────

export type ProbationStatus =
  | 'ACTIVE'
  | 'EXTENDED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'TERMINATED'
  | 'ON_HOLD';

export type EvaluationType =
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'MID_PROBATION'
  | 'FINAL';

export type ProbationRecommendation =
  | 'CONFIRM'
  | 'EXTEND'
  | 'TERMINATE'
  | 'NEEDS_IMPROVEMENT'
  | 'ON_TRACK';

// ── Request DTOs ──────────────────────────────────────────────

export interface ProbationPeriodRequest {
  employeeId: string;
  startDate: string; // ISO date
  durationMonths: number;
  managerId?: string;
  evaluationFrequencyDays?: number;
  notes?: string;
}

export interface ProbationEvaluationRequest {
  probationPeriodId: string;
  evaluationDate?: string; // ISO date
  evaluationType: EvaluationType;
  performanceRating?: number;
  attendanceRating?: number;
  communicationRating?: number;
  teamworkRating?: number;
  technicalSkillsRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  goalsForNextPeriod?: string;
  managerComments?: string;
  recommendation: ProbationRecommendation;
  recommendationReason?: string;
  isFinalEvaluation?: boolean;
}

export interface ProbationExtensionRequest {
  extensionDays: number;
  reason: string;
}

export interface ProbationConfirmationRequest {
  finalRating?: number;
  notes?: string;
  generateConfirmationLetter?: boolean;
}

export interface ProbationTerminationRequest {
  reason: string;
  notifyEmployee?: boolean;
  initiateExitProcess?: boolean;
}

// ── Response DTOs ─────────────────────────────────────────────

export interface ProbationPeriodResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  startDate: string;
  originalEndDate: string;
  endDate: string;
  durationMonths: number;
  status: ProbationStatus;
  statusDisplayName: string;
  extensionCount: number;
  totalExtensionDays: number;
  confirmationDate: string;
  terminationDate: string;
  finalRating: number;
  managerId: string;
  managerName: string;
  hrId: string;
  hrName: string;
  notes: string;
  terminationReason: string;
  nextEvaluationDate: string;
  evaluationFrequencyDays: number;
  evaluationCount: number;
  averageRating: number;
  daysRemaining: number;
  isOverdue: boolean;
  isEvaluationDue: boolean;
  recentEvaluations: ProbationEvaluationResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ProbationEvaluationResponse {
  id: string;
  probationPeriodId: string;
  evaluationDate: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluationType: EvaluationType;
  evaluationTypeDisplayName: string;
  performanceRating: number;
  attendanceRating: number;
  communicationRating: number;
  teamworkRating: number;
  technicalSkillsRating: number;
  overallRating: number;
  strengths: string;
  areasForImprovement: string;
  goalsForNextPeriod: string;
  managerComments: string;
  employeeComments: string;
  recommendation: ProbationRecommendation;
  recommendationDisplayName: string;
  recommendationReason: string;
  isFinalEvaluation: boolean;
  employeeAcknowledged: boolean;
  acknowledgedDate: string;
  createdAt: string;
}

export interface ProbationStatisticsResponse {
  totalActiveProbations: number;
  overdueCount: number;
  endingThisWeek: number;
  endingThisMonth: number;
  evaluationsDue: number;
  confirmationsThisMonth: number;
  terminationsThisMonth: number;
  averageConfirmationRate: number;
  averageProbationDuration: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
}

// ── Paginated response ────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
