export enum ExitType {
  RESIGNATION = 'RESIGNATION',
  TERMINATION = 'TERMINATION',
  RETIREMENT = 'RETIREMENT',
  END_OF_CONTRACT = 'END_OF_CONTRACT',
  ABSCONDING = 'ABSCONDING',
}

export enum ExitStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  CLEARANCE_PENDING = 'CLEARANCE_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ExitProcess {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  exitType: ExitType;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status: ExitStatus;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  exitInterviewFeedback?: string;
  finalSettlementAmount?: number;
  settlementDate?: string;
  managerId?: string;
  managerName?: string;
  hrSpocId?: string;
  hrSpocName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExitProcessRequest {
  employeeId: string;
  exitType: ExitType;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status?: ExitStatus;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  managerId?: string;
  hrSpocId?: string;
  notes?: string;
}

export interface UpdateExitProcessRequest {
  exitType?: ExitType;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status?: ExitStatus;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  exitInterviewFeedback?: string;
  finalSettlementAmount?: number;
  settlementDate?: string;
  managerId?: string;
  hrSpocId?: string;
  notes?: string;
}

export interface ExitProcessesResponse {
  content: ExitProcess[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ExitDashboard {
  totalExits: number;
  initiated: number;
  inProgress: number;
  clearancePending: number;
  completed: number;
  monthlyTrend?: { month: string; count: number }[];
  exitTypeBreakdown?: { type: string; count: number }[];
}

// ─── Exit Clearance Types ─────────────────────────────────────────────────────

export enum ClearanceDepartment {
  IT = 'IT',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  HR = 'HR',
  REPORTING_MANAGER = 'REPORTING_MANAGER',
  LIBRARY = 'LIBRARY',
  FACILITIES = 'FACILITIES',
}

export enum ClearanceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export interface ExitClearance {
  id: string;
  tenantId: string;
  exitProcessId: string;
  employeeName?: string;
  department: ClearanceDepartment;
  approverId: string;
  approverName?: string;
  status: ClearanceStatus;
  requestedDate?: string;
  approvedDate?: string;
  comments?: string;
  checklistItems?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExitClearanceRequest {
  exitProcessId: string;
  department: ClearanceDepartment;
  approverId: string;
  status?: ClearanceStatus;
  requestedDate?: string;
  comments?: string;
  checklistItems?: string;
}

export interface UpdateExitClearanceRequest {
  exitProcessId?: string;
  department?: ClearanceDepartment;
  approverId?: string;
  status?: ClearanceStatus;
  requestedDate?: string;
  approvedDate?: string;
  comments?: string;
  checklistItems?: string;
}

// ─── Full & Final Settlement Types ────────────────────────────────────────────

export enum SettlementStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMode {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  DEMAND_DRAFT = 'DEMAND_DRAFT',
}

export interface FullAndFinalSettlement {
  id: string;
  tenantId: string;
  exitProcessId: string;
  employeeId: string;
  employeeName?: string;

  // Earnings
  pendingSalary: number;
  leaveEncashment: number;
  bonusAmount: number;
  gratuityAmount: number;
  noticePeriodRecovery: number;
  reimbursements: number;
  otherEarnings: number;

  // Deductions
  noticeBuyout: number;
  loanRecovery: number;
  advanceRecovery: number;
  assetDamageDeduction: number;
  taxDeduction: number;
  otherDeductions: number;

  // Totals
  totalEarnings: number;
  totalDeductions: number;
  netPayable: number;

  // Settlement details
  status: SettlementStatus;
  paymentMode?: PaymentMode;
  paymentReference?: string;
  paymentDate?: string;
  preparedBy?: string;
  preparedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvalDate?: string;
  remarks?: string;

  // Gratuity
  yearsOfService?: number;
  isGratuityEligible?: boolean;
  lastDrawnSalary?: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateFnFSettlementRequest {
  exitProcessId: string;
  employeeId: string;
  pendingSalary?: number;
  leaveEncashment?: number;
  bonusAmount?: number;
  gratuityAmount?: number;
  noticePeriodRecovery?: number;
  reimbursements?: number;
  otherEarnings?: number;
  noticeBuyout?: number;
  loanRecovery?: number;
  advanceRecovery?: number;
  assetDamageDeduction?: number;
  taxDeduction?: number;
  otherDeductions?: number;
  paymentMode?: PaymentMode;
  remarks?: string;
  yearsOfService?: number;
  lastDrawnSalary?: number;
}

export interface UpdateFnFSettlementRequest {
  pendingSalary?: number;
  leaveEncashment?: number;
  bonusAmount?: number;
  gratuityAmount?: number;
  noticePeriodRecovery?: number;
  reimbursements?: number;
  otherEarnings?: number;
  noticeBuyout?: number;
  loanRecovery?: number;
  advanceRecovery?: number;
  assetDamageDeduction?: number;
  taxDeduction?: number;
  otherDeductions?: number;
  paymentMode?: PaymentMode;
  remarks?: string;
  yearsOfService?: number;
  lastDrawnSalary?: number;
}

export interface FnFSettlementsResponse {
  content: FullAndFinalSettlement[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Exit Interview Types ─────────────────────────────────────────────────────

export enum InterviewMode {
  IN_PERSON = 'IN_PERSON',
  VIDEO_CALL = 'VIDEO_CALL',
  PHONE = 'PHONE',
  WRITTEN_SURVEY = 'WRITTEN_SURVEY',
}

export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
}

export enum LeavingReason {
  BETTER_OPPORTUNITY = 'BETTER_OPPORTUNITY',
  COMPENSATION = 'COMPENSATION',
  CAREER_GROWTH = 'CAREER_GROWTH',
  WORK_LIFE_BALANCE = 'WORK_LIFE_BALANCE',
  MANAGEMENT_ISSUES = 'MANAGEMENT_ISSUES',
  RELOCATION = 'RELOCATION',
  PERSONAL_REASONS = 'PERSONAL_REASONS',
  HEALTH_ISSUES = 'HEALTH_ISSUES',
  HIGHER_EDUCATION = 'HIGHER_EDUCATION',
  STARTING_OWN_BUSINESS = 'STARTING_OWN_BUSINESS',
  RETIREMENT = 'RETIREMENT',
  COMPANY_CULTURE = 'COMPANY_CULTURE',
  JOB_SECURITY = 'JOB_SECURITY',
  OTHER = 'OTHER',
}

export interface ExitInterview {
  id: string;
  tenantId: string;
  exitProcessId: string;
  employeeId: string;
  employeeName?: string;
  interviewerId?: string;
  interviewerName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  actualDate?: string;
  interviewMode?: InterviewMode;
  status: InterviewStatus;

  // Ratings (1-5)
  overallExperienceRating?: number;
  managementRating?: number;
  workLifeBalanceRating?: number;
  growthOpportunitiesRating?: number;
  compensationRating?: number;
  teamCultureRating?: number;
  averageRating?: number;

  // Feedback
  primaryReasonForLeaving?: LeavingReason;
  detailedReason?: string;
  whatLikedMost?: string;
  whatCouldImprove?: string;
  suggestions?: string;
  wouldRecommendCompany?: boolean;
  wouldConsiderReturning?: boolean;

  // New employer info
  newEmployer?: string;
  newRole?: string;
  newSalaryIncreasePercentage?: number;

  interviewerNotes?: string;
  isConfidential?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateExitInterviewRequest {
  exitProcessId: string;
  employeeId: string;
  interviewerId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  interviewMode?: InterviewMode;
}

export interface ConductExitInterviewRequest {
  actualDate?: string;
  overallExperienceRating?: number;
  managementRating?: number;
  workLifeBalanceRating?: number;
  growthOpportunitiesRating?: number;
  compensationRating?: number;
  teamCultureRating?: number;
  primaryReasonForLeaving?: LeavingReason;
  detailedReason?: string;
  whatLikedMost?: string;
  whatCouldImprove?: string;
  suggestions?: string;
  wouldRecommendCompany?: boolean;
  wouldConsiderReturning?: boolean;
  newEmployer?: string;
  newRole?: string;
  newSalaryIncreasePercentage?: number;
  interviewerNotes?: string;
  isConfidential?: boolean;
}

export interface ExitInterviewsResponse {
  content: ExitInterview[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Asset Recovery Types ─────────────────────────────────────────────────────

export enum AssetType {
  LAPTOP = 'LAPTOP',
  DESKTOP = 'DESKTOP',
  MOBILE_PHONE = 'MOBILE_PHONE',
  TABLET = 'TABLET',
  MONITOR = 'MONITOR',
  KEYBOARD_MOUSE = 'KEYBOARD_MOUSE',
  HEADSET = 'HEADSET',
  WEBCAM = 'WEBCAM',
  ID_CARD = 'ID_CARD',
  ACCESS_CARD = 'ACCESS_CARD',
  PARKING_CARD = 'PARKING_CARD',
  KEYS = 'KEYS',
  UNIFORM = 'UNIFORM',
  SAFETY_EQUIPMENT = 'SAFETY_EQUIPMENT',
  VEHICLE = 'VEHICLE',
  CREDIT_CARD = 'CREDIT_CARD',
  SIM_CARD = 'SIM_CARD',
  FURNITURE = 'FURNITURE',
  BOOKS_MATERIALS = 'BOOKS_MATERIALS',
  OTHER = 'OTHER',
}

export enum RecoveryStatus {
  PENDING = 'PENDING',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  WAIVED = 'WAIVED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
  NON_FUNCTIONAL = 'NON_FUNCTIONAL',
}

export interface AssetRecovery {
  id: string;
  tenantId: string;
  exitProcessId: string;
  employeeId: string;
  employeeName?: string;
  assetId?: string;
  assetName: string;
  assetType: AssetType;
  assetTag?: string;
  serialNumber?: string;
  assignedDate?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  status: RecoveryStatus;
  conditionOnReturn?: AssetCondition;
  damageDescription?: string;
  deductionAmount: number;
  recoveredBy?: string;
  recoveredByName?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verificationDate?: string;
  remarks?: string;
  isWaived?: boolean;
  waiverReason?: string;
  waivedBy?: string;
  waivedByName?: string;
  isRecovered?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRecoveryRequest {
  exitProcessId: string;
  employeeId: string;
  assetId?: string;
  assetName: string;
  assetType: AssetType;
  assetTag?: string;
  serialNumber?: string;
  assignedDate?: string;
  expectedReturnDate?: string;
}

export interface RecordAssetReturnRequest {
  actualReturnDate?: string;
  status?: RecoveryStatus;
  conditionOnReturn?: AssetCondition;
  damageDescription?: string;
  deductionAmount?: number;
  remarks?: string;
}
