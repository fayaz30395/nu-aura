// ──────────────────────────────────────────────────────────────
// Referral types — mirrors backend DTOs in api/referral/dto/
// ──────────────────────────────────────────────────────────────

export type ReferralStatus =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'OFFER_MADE'
  | 'OFFER_ACCEPTED'
  | 'JOINED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ON_HOLD';

export type ReferralRelationship =
  | 'FORMER_COLLEAGUE'
  | 'FRIEND'
  | 'FAMILY'
  | 'CLASSMATE'
  | 'PROFESSIONAL_NETWORK'
  | 'OTHER';

export type BonusStatus =
  | 'NOT_ELIGIBLE'
  | 'PENDING_ELIGIBILITY'
  | 'ELIGIBLE'
  | 'PROCESSING'
  | 'PAID';

export type PolicyApplicableFor =
  | 'ALL'
  | 'DEPARTMENT_SPECIFIC'
  | 'LEVEL_SPECIFIC';

// ── Request DTOs ──────────────────────────────────────────────

export interface ReferralRequest {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateLinkedin?: string;
  resumePath?: string;
  jobId?: string;
  jobTitle?: string;
  departmentId?: string;
  relationship?: ReferralRelationship;
  knownSince?: string; // ISO date
  referrerNotes?: string;
}

export interface ReferralPolicyRequest {
  name: string;
  description?: string;
  applicableFor: PolicyApplicableFor;
  departmentId?: string;
  jobLevel?: string;
  baseBonusAmount: number;
  joiningBonusPercentage?: number;
  retentionBonusPercentage?: number;
  retentionPeriodMonths?: number;
  minServiceMonths?: number;
  probationEligible?: boolean;
  maxReferralsPerMonth?: number;
  selfReferralAllowed?: boolean;
  sameDepartmentAllowed?: boolean;
  effectiveFrom?: string; // ISO date
  effectiveTo?: string; // ISO date
}

// ── Response DTOs ─────────────────────────────────────────────

export interface ReferralResponse {
  id: string;
  referrerId: string;
  referrerName: string;
  referralCode: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateLinkedin: string;
  resumePath: string;
  jobId: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  relationship: ReferralRelationship;
  knownSince: string;
  referrerNotes: string;
  status: ReferralStatus;
  submittedDate: string;
  screeningDate: string;
  interviewDate: string;
  offerDate: string;
  joiningDate: string;
  hiredEmployeeId: string;
  rejectionReason: string;
  rejectionStage: string;
  bonusAmount: number;
  bonusStatus: BonusStatus;
  bonusEligibleDate: string;
  bonusPaidDate: string;
  bonusPaymentReference: string;
  processingNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralPolicyResponse {
  id: string;
  name: string;
  description: string;
  applicableFor: PolicyApplicableFor;
  departmentId: string;
  departmentName: string;
  jobLevel: string;
  baseBonusAmount: number;
  joiningBonusPercentage: number;
  retentionBonusPercentage: number;
  retentionPeriodMonths: number;
  minServiceMonths: number;
  probationEligible: boolean;
  maxReferralsPerMonth: number;
  selfReferralAllowed: boolean;
  sameDepartmentAllowed: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralDashboard {
  totalReferrals: number;
  activeReferrals: number;
  hiredReferrals: number;
  rejectedReferrals: number;
  conversionRate: number;
  totalBonusesPaid: number;
  pendingBonuses: number;
  bonusPaymentsPending: number;
  statusCounts: Record<string, number>;
  topReferrers: TopReferrer[];
  departmentStats: DepartmentStats[];
  monthlyTrend: MonthlyTrend[];
}

export interface TopReferrer {
  employeeId: string;
  employeeName: string;
  department: string;
  totalReferrals: number;
  successfulHires: number;
  totalBonusEarned: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalReferrals: number;
  hired: number;
  conversionRate: number;
}

export interface MonthlyTrend {
  month: string;
  submitted: number;
  hired: number;
  rejected: number;
}

// ── Paginated response ────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
