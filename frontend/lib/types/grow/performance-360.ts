// 360 Feedback Types

export type ReviewerType = 'SELF' | 'MANAGER' | 'PEER' | 'DIRECT_REPORT' | 'EXTERNAL';

export type FeedbackRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';

export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'NOMINATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

export interface FeedbackReviewer {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  reviewerType: ReviewerType;
  department?: string;
  designation?: string;
}

export interface NominatePeersRequest {
  cycleId: string;
  subjectEmployeeId: string;
  peerIds: string[];
}

export interface FeedbackRequestCreate {
  cycleId: string;
  subjectEmployeeId: string;
  reviewerId: string;
  reviewerType: ReviewerType;
}

export interface FeedbackCompetencyRating {
  competencyName: string;
  rating: number;
  maxRating: number;
  weight?: number;
}

export interface FeedbackResponseDetailed {
  requestId: string;
  isDraft: boolean;
  overallRating?: number;
  competencyRatings?: FeedbackCompetencyRating[];
  communicationRating?: number;
  teamworkRating?: number;
  leadershipRating?: number;
  problemSolvingRating?: number;
  technicalSkillsRating?: number;
  innovationRating?: number;
  accountabilityRating?: number;
  customerFocusRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  developmentSuggestions?: string;
  additionalComments?: string;
}

export interface FeedbackSummaryDetailed {
  id: string;
  cycleId: string;
  cycleName: string;
  subjectEmployeeId: string;
  subjectEmployeeName: string;
  totalReviewers: number;
  responsesReceived: number;
  responseRate: number;
  selfReviewCompleted: boolean;
  managerReviewCompleted: boolean;
  peerReviewsCompleted: number;
  directReportReviewsCompleted: number;
  finalRating?: number;
  avgCommunication?: number;
  avgTeamwork?: number;
  avgLeadership?: number;
  avgProblemSolving?: number;
  avgTechnicalSkills?: number;
  avgInnovation?: number;
  avgAccountability?: number;
  avgCustomerFocus?: number;
  consolidatedStrengths?: string;
  consolidatedImprovements?: string;
  consolidatedDevelopment?: string;
  ratingsByReviewerType?: { [key: string]: number };
  competencyBreakdown?: FeedbackCompetencyRating[];
  sharedWithEmployee: boolean;
  sharedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// Performance Calibration Types

export type PerformanceRating = 'EXCEEDS' | 'MEETS' | 'NEEDS_IMPROVEMENT' | 'UNSATISFACTORY' | 'NOT_RATED';

export type PotentialRating = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_RATED';

export type CalibrationStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FINALIZED';

export interface CalibrationSession {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  reviewCycleId?: string;
  departmentId?: string;
  departmentName?: string;
  facilitatorId: string;
  facilitatorName: string;
  participants: string[]; // Manager IDs
  participantNames?: string[];
  status: CalibrationStatus;
  scheduledDate?: string;
  completedDate?: string;
  employeeCount: number;
  calibratedCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeCalibration {
  id: string;
  sessionId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  department?: string;
  managerId?: string;
  managerName?: string;
  performanceRating: PerformanceRating;
  potentialRating: PotentialRating;
  currentPosition: {
    performance: number; // 1-3 (Low to High)
    potential: number; // 1-3 (Low to High)
  };
  previousRating?: PerformanceRating;
  reviewScore?: number;
  feedbackScore?: number;
  goalCompletion?: number;
  keyAchievements?: string;
  developmentAreas?: string;
  successorReadiness?: 'READY_NOW' | 'READY_1_2_YEARS' | 'READY_3_PLUS_YEARS' | 'NOT_READY';
  retentionRisk?: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  calibratedBy?: string;
  calibratedAt?: string;
}

export interface CalibrationSessionCreate {
  name: string;
  description?: string;
  reviewCycleId?: string;
  departmentId?: string;
  facilitatorId: string;
  participants: string[];
  scheduledDate?: string;
}

export interface CalibrationUpdate {
  employeeId: string;
  performanceRating: PerformanceRating;
  potentialRating: PotentialRating;
  currentPosition: {
    performance: number;
    potential: number;
  };
  successorReadiness?: 'READY_NOW' | 'READY_1_2_YEARS' | 'READY_3_PLUS_YEARS' | 'NOT_READY';
  retentionRisk?: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

export interface NineBoxMatrix {
  highPerformanceHighPotential: EmployeeCalibration[]; // Stars / Top Talent
  highPerformanceMediumPotential: EmployeeCalibration[]; // Core Contributors
  highPerformanceLowPotential: EmployeeCalibration[]; // Solid Performers
  mediumPerformanceHighPotential: EmployeeCalibration[]; // High Potential
  mediumPerformanceMediumPotential: EmployeeCalibration[]; // Solid Contributors
  mediumPerformanceLowPotential: EmployeeCalibration[]; // Underperformers
  lowPerformanceHighPotential: EmployeeCalibration[]; // Enigmas / Rough Diamonds
  lowPerformanceMediumPotential: EmployeeCalibration[]; // Inconsistent Performers
  lowPerformanceLowPotential: EmployeeCalibration[]; // Low Performers
}

export interface CalibrationDistribution {
  totalEmployees: number;
  exceedsExpectations: number;
  meetsExpectations: number;
  needsImprovement: number;
  unsatisfactory: number;
  notRated: number;
  highPotential: number;
  mediumPotential: number;
  lowPotential: number;
}

export interface CalibrationExportData {
  sessionId: string;
  sessionName: string;
  exportedAt: string;
  employees: EmployeeCalibration[];
  distribution: CalibrationDistribution;
  nineBoxMatrix: NineBoxMatrix;
}
