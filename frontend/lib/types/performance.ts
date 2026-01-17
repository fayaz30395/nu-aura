// Performance Management TypeScript Types

export type GoalType = 'OKR' | 'KPI' | 'PERSONAL' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION';
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD' | 'IN_PROGRESS';

export interface Goal {
  id: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  description?: string;
  goalType: GoalType;
  category?: string;
  targetValue?: number;
  currentValue?: number;
  measurementUnit?: string;
  unit?: string;
  startDate: string;
  dueDate: string;
  endDate?: string;
  status: GoalStatus;
  progressPercentage: number;
  parentGoalId?: string;
  parentGoalTitle?: string;
  weight: number;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalRequest {
  employeeId: string;
  title: string;
  description?: string;
  goalType: GoalType;
  category?: string;
  targetValue?: number;
  currentValue?: number;
  measurementUnit?: string;
  unit?: string;
  startDate: string;
  dueDate?: string;
  endDate?: string;
  status?: GoalStatus;
  progressPercentage?: number;
  parentGoalId?: string;
  weight?: number;
}

export type ReviewType = 'SELF' | 'MANAGER' | 'PEER' | 'UPWARD' | 'THREE_SIXTY' | 'SUBORDINATE' | 'SKIP_LEVEL';
export type ReviewStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'ACKNOWLEDGED' | 'APPROVED' | 'REJECTED';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName?: string;
  reviewerId: string;
  reviewerName?: string;
  reviewCycleId?: string;
  cycleId?: string;
  reviewCycleName?: string;
  reviewType: ReviewType;
  reviewPeriodStart?: string;
  reviewPeriodEnd?: string;
  status: ReviewStatus;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  achievements?: string;
  goalsForNextPeriod?: string;
  goals?: string;
  managerComments?: string;
  reviewerComments?: string;
  employeeComments?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewRequest {
  employeeId: string;
  reviewerId: string;
  reviewCycleId?: string;
  cycleId?: string;
  reviewType: ReviewType;
  reviewPeriodStart?: string;
  reviewPeriodEnd?: string;
  status?: ReviewStatus;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  achievements?: string;
  goalsForNextPeriod?: string;
  goals?: string;
  managerComments?: string;
  reviewerComments?: string;
  employeeComments?: string;
  submittedAt?: string;
  completedAt?: string;
}

export type CompetencyCategory = 'TECHNICAL' | 'BEHAVIORAL' | 'LEADERSHIP' | 'DOMAIN' | 'PROBLEM_SOLVING';

export interface ReviewCompetency {
  id: string;
  reviewId: string;
  competencyName: string;
  category: CompetencyCategory;
  rating: number;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompetencyRequest {
  reviewId: string;
  competencyName: string;
  category: CompetencyCategory;
  rating: number;
  comments?: string;
}

export type FeedbackType = 'PRAISE' | 'CONSTRUCTIVE' | 'GENERAL' | 'REQUEST';

export interface Feedback {
  id: string;
  recipientId: string;
  recipientName?: string;
  giverId: string;
  giverName?: string;
  feedbackType: FeedbackType;
  category?: string;
  feedbackText: string;
  isAnonymous: boolean;
  isPublic: boolean;
  relatedReviewId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackRequest {
  recipientId: string;
  giverId: string;
  feedbackType: FeedbackType;
  category?: string;
  feedbackText: string;
  isAnonymous?: boolean;
  isPublic?: boolean;
  relatedReviewId?: string;
}

export type CycleType = 'ANNUAL' | 'QUARTERLY' | 'PROBATION' | 'MID_YEAR' | 'PROJECT_END' | 'SEMI_ANNUAL' | 'MONTHLY';
export type CycleStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS';

export interface ReviewCycle {
  id: string;
  name?: string;
  cycleName: string;
  cycleType: CycleType;
  startDate?: string;
  endDate?: string;
  selfReviewDeadline?: string;
  reviewDeadline?: string;
  managerReviewDeadline?: string;
  status: CycleStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  // Activation metadata (populated when activating a cycle)
  employeesInScope?: number;
  reviewsCreated?: number;
}

// Activation Types
export type ScopeType = 'ALL' | 'DEPARTMENT' | 'LOCATION';

export interface ActivateCycleRequest {
  scopeType: ScopeType;
  departmentIds?: string[];
  locationIds?: string[];
  createSelfReviews?: boolean;
  createManagerReviews?: boolean;
}

export interface ActivateCycleResponse {
  id: string;
  cycleName: string;
  cycleType: CycleType;
  startDate?: string;
  endDate?: string;
  selfReviewDeadline?: string;
  managerReviewDeadline?: string;
  status: CycleStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  employeesInScope: number;
  reviewsCreated: number;
}

export interface ReviewCycleRequest {
  name?: string;
  cycleName?: string;
  cycleType: CycleType;
  startDate?: string;
  endDate?: string;
  selfReviewDeadline?: string;
  reviewDeadline?: string;
  managerReviewDeadline?: string;
  status?: CycleStatus;
  description?: string;
}

export interface GoalAnalytics {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  averageProgress: number;
}

// ==================== OKR Types ====================

export type ObjectiveLevel = 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
export type ObjectiveStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED' | 'CANCELLED';
export type MeasurementType = 'PERCENTAGE' | 'NUMBER' | 'CURRENCY' | 'BINARY' | 'MILESTONE';
export type KeyResultStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED';
export type CheckInType = 'PROGRESS_UPDATE' | 'STATUS_CHANGE' | 'WEEKLY_REVIEW' | 'FINAL_REVIEW';
export type Visibility = 'PUBLIC' | 'TEAM' | 'PRIVATE';
export type CheckInFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface Objective {
  id: string;
  ownerId: string;
  ownerName?: string;
  cycleId?: string;
  parentObjectiveId?: string;
  title: string;
  description?: string;
  level: ObjectiveLevel;
  status: ObjectiveStatus;
  startDate: string;
  endDate: string;
  progressPercentage: number;
  weight?: number;
  isStretchGoal: boolean;
  alignedToCompanyObjective: boolean;
  departmentId?: string;
  teamId?: string;
  visibility: Visibility;
  approvedBy?: string;
  checkInFrequency?: CheckInFrequency;
  lastCheckInDate?: string;
  createdAt: string;
  updatedAt: string;
  keyResults?: KeyResult[];
}

export interface ObjectiveRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  level: ObjectiveLevel;
  parentObjectiveId?: string;
  cycleId?: string;
  departmentId?: string;
  teamId?: string;
  weight?: number;
  isStretchGoal?: boolean;
  alignedToCompanyObjective?: boolean;
  visibility?: Visibility;
  checkInFrequency?: CheckInFrequency;
  keyResults?: KeyResultRequest[];
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  ownerId?: string;
  title: string;
  description?: string;
  measurementType: MeasurementType;
  startValue: number;
  currentValue: number;
  targetValue: number;
  measurementUnit?: string;
  status: KeyResultStatus;
  progressPercentage: number;
  weight?: number;
  dueDate?: string;
  isMilestone: boolean;
  milestoneOrder?: number;
  confidenceLevel?: number;
  lastUpdatedNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeyResultRequest {
  title: string;
  description?: string;
  measurementType: MeasurementType;
  startValue: number;
  targetValue: number;
  measurementUnit?: string;
  weight?: number;
  dueDate?: string;
  isMilestone?: boolean;
  milestoneOrder?: number;
  ownerId?: string;
}

export interface OkrCheckIn {
  id: string;
  objectiveId?: string;
  keyResultId?: string;
  employeeId: string;
  checkInDate: string;
  previousValue?: number;
  newValue?: number;
  previousProgress?: number;
  newProgress?: number;
  confidenceLevel?: number;
  notes?: string;
  blockers?: string;
  nextSteps?: string;
  checkInType: CheckInType;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInRequest {
  objectiveId?: string;
  keyResultId?: string;
  newValue?: number;
  newProgress?: number;
  confidenceLevel?: number;
  notes?: string;
  blockers?: string;
  nextSteps?: string;
  checkInType: CheckInType;
}

// ==================== 360 Feedback Types ====================

export type Feedback360Status = 'DRAFT' | 'NOMINATION_OPEN' | 'IN_PROGRESS' | 'REVIEW_COMPLETE' | 'CLOSED';
export type ReviewerType = 'SELF' | 'MANAGER' | 'PEER' | 'DIRECT_REPORT' | 'EXTERNAL';
export type RequestStatus = 'PENDING' | 'NOMINATED' | 'APPROVED' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED';

export interface Feedback360Cycle {
  id: string;
  name: string;
  description?: string;
  status: Feedback360Status;
  startDate: string;
  endDate: string;
  nominationDeadline?: string;
  selfReviewDeadline?: string;
  peerReviewDeadline?: string;
  managerReviewDeadline?: string;
  minPeersRequired: number;
  maxPeersAllowed: number;
  isAnonymous: boolean;
  includeSelfReview: boolean;
  includeManagerReview: boolean;
  includePeerReview: boolean;
  includeUpwardReview: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback360CycleRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  nominationDeadline?: string;
  selfReviewDeadline?: string;
  peerReviewDeadline?: string;
  managerReviewDeadline?: string;
  minPeersRequired?: number;
  maxPeersAllowed?: number;
  isAnonymous?: boolean;
  includeSelfReview?: boolean;
  includeManagerReview?: boolean;
  includePeerReview?: boolean;
  includeUpwardReview?: boolean;
}

export interface Feedback360Request {
  id: string;
  cycleId: string;
  subjectEmployeeId: string;
  subjectEmployeeName?: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerType: ReviewerType;
  status: RequestStatus;
  nominatedBy?: string;
  nominationApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback360Response {
  id: string;
  requestId: string;
  cycleId: string;
  subjectEmployeeId: string;
  reviewerId: string;
  reviewerType: ReviewerType;
  submittedAt?: string;
  isDraft: boolean;
  overallRating?: number;
  communicationRating?: number;
  teamworkRating?: number;
  leadershipRating?: number;
  problemSolvingRating?: number;
  technicalSkillsRating?: number;
  adaptabilityRating?: number;
  workQualityRating?: number;
  timeManagementRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  additionalComments?: string;
  specificExamples?: string;
  developmentSuggestions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback360Summary {
  id: string;
  cycleId: string;
  subjectEmployeeId: string;
  subjectEmployeeName?: string;
  totalReviewers: number;
  responsesReceived: number;
  selfReviewCompleted: boolean;
  managerReviewCompleted: boolean;
  peerReviewsCompleted: number;
  upwardReviewsCompleted: number;
  selfRating?: number;
  managerRating?: number;
  peerAvgRating?: number;
  upwardAvgRating?: number;
  finalRating?: number;
  avgCommunicationRating?: number;
  avgTeamworkRating?: number;
  avgLeadershipRating?: number;
  avgProblemSolvingRating?: number;
  avgTechnicalSkillsRating?: number;
  avgAdaptabilityRating?: number;
  avgWorkQualityRating?: number;
  avgTimeManagementRating?: number;
  consolidatedStrengths?: string;
  consolidatedImprovements?: string;
  actionItems?: string;
  generatedAt: string;
  sharedWithEmployee: boolean;
  sharedAt?: string;
}

// ==================== Dashboard & Analytics ====================

export interface OkrSummary {
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  objectivesByStatus: Record<string, number>;
  objectivesByLevel: Record<string, number>;
}

export interface Feedback360Dashboard {
  activeCycles: number;
  pendingReviews: number;
  completedReviews: number;
  averageRating: number;
  responseRate: number;
}

// ==================== Utility Functions ====================

export const getGoalStatusColor = (status: GoalStatus): string => {
  const colors: Record<GoalStatus, string> = {
    DRAFT: 'gray',
    ACTIVE: 'blue',
    COMPLETED: 'green',
    CANCELLED: 'red',
    ON_HOLD: 'yellow',
    IN_PROGRESS: 'blue',
  };
  return colors[status] || 'gray';
};

export const getReviewStatusColor = (status: ReviewStatus): string => {
  const colors: Record<ReviewStatus, string> = {
    DRAFT: 'gray',
    SUBMITTED: 'blue',
    IN_REVIEW: 'yellow',
    COMPLETED: 'green',
    ACKNOWLEDGED: 'purple',
    APPROVED: 'emerald',
    REJECTED: 'red',
  };
  return colors[status] || 'gray';
};

export const getObjectiveStatusColor = (status: ObjectiveStatus): string => {
  const colors: Record<ObjectiveStatus, string> = {
    DRAFT: 'gray',
    PENDING_APPROVAL: 'yellow',
    ACTIVE: 'blue',
    ON_TRACK: 'green',
    AT_RISK: 'orange',
    BEHIND: 'red',
    COMPLETED: 'emerald',
    CANCELLED: 'gray',
  };
  return colors[status] || 'gray';
};

export const getRatingColor = (rating: number): string => {
  if (rating >= 4.5) return 'emerald';
  if (rating >= 4) return 'green';
  if (rating >= 3) return 'yellow';
  if (rating >= 2) return 'orange';
  return 'red';
};

export const getProgressColor = (progress: number): string => {
  if (progress >= 80) return 'green';
  if (progress >= 50) return 'blue';
  if (progress >= 25) return 'yellow';
  return 'red';
};

export const formatRating = (rating?: number): string => {
  if (rating === undefined || rating === null) return 'N/A';
  return rating.toFixed(1);
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  OKR: 'OKR',
  KPI: 'KPI',
  PERSONAL: 'Personal',
  TEAM: 'Team',
  DEPARTMENT: 'Department',
  ORGANIZATION: 'Organization',
};

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  SELF: 'Self Review',
  MANAGER: 'Manager Review',
  PEER: 'Peer Review',
  UPWARD: 'Upward Review',
  THREE_SIXTY: '360° Review',
  SUBORDINATE: 'Subordinate Review',
  SKIP_LEVEL: 'Skip Level Review',
};

export const CYCLE_TYPE_LABELS: Record<CycleType, string> = {
  ANNUAL: 'Annual',
  QUARTERLY: 'Quarterly',
  PROBATION: 'Probation',
  MID_YEAR: 'Mid-Year',
  PROJECT_END: 'Project End',
  SEMI_ANNUAL: 'Semi-Annual',
  MONTHLY: 'Monthly',
};

export const OBJECTIVE_LEVEL_LABELS: Record<ObjectiveLevel, string> = {
  COMPANY: 'Company',
  DEPARTMENT: 'Department',
  TEAM: 'Team',
  INDIVIDUAL: 'Individual',
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  PRAISE: 'Praise',
  CONSTRUCTIVE: 'Constructive',
  GENERAL: 'General',
  REQUEST: 'Request',
};

// ==================== Performance Revolution Types ====================

export interface OKRGraphResponse {
  nodes: OKRNode[];
  links: OKRLink[];
}

export interface OKRNode {
  id: string;
  title: string;
  type: string;
  progress: number;
  ownerName: string;
}

export interface OKRLink {
  source: string;
  target: string;
}

export interface PerformanceSpiderResponse {
  metrics: SpiderData[];
}

export interface SpiderData {
  subject: string;
  self: number;
  peer: number;
  manager: number;
  fullMark: number;
}
