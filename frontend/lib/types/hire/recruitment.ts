export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
export type JobStatus = 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type CandidateSource =
  'JOB_PORTAL'
  | 'REFERRAL'
  | 'LINKEDIN'
  | 'COMPANY_WEBSITE'
  | 'WALK_IN'
  | 'CAMPUS'
  | 'CONSULTANT'
  | 'OTHER';
export type CandidateStatus =
  'NEW'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFER_EXTENDED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'REJECTED'
  | 'WITHDRAWN';
export type RecruitmentStage =
  | 'RECRUITERS_PHONE_CALL'
  | 'PANEL_REVIEW'
  | 'PANEL_REJECT'
  | 'PANEL_SHORTLISTED'
  | 'TECHNICAL_INTERVIEW_SCHEDULED'
  | 'TECHNICAL_INTERVIEW_COMPLETED'
  | 'MANAGEMENT_INTERVIEW_SCHEDULED'
  | 'MANAGEMENT_INTERVIEW_COMPLETED'
  | 'CLIENT_INTERVIEW_SCHEDULED'
  | 'CLIENT_INTERVIEW_COMPLETED'
  | 'HR_FINAL_INTERVIEW_COMPLETED'
  | 'CANDIDATE_REJECTED'
  | 'OFFER_NDA_TO_BE_RELEASED';

export type InterviewRound = 'SCREENING' | 'TECHNICAL_1' | 'TECHNICAL_2' | 'HR' | 'MANAGERIAL' | 'FINAL';
export type InterviewType = 'PHONE' | 'VIDEO' | 'IN_PERSON';
export type InterviewStatus = 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type InterviewResult = 'SELECTED' | 'REJECTED' | 'ON_HOLD' | 'PENDING';

export interface JobOpening {
  id: string;
  tenantId: string;
  jobCode: string;
  jobTitle: string;
  departmentId?: string;
  departmentName?: string;
  location?: string;
  employmentType?: EmploymentType;
  experienceRequired?: string;
  minSalary?: number;
  maxSalary?: number;
  numberOfOpenings?: number;
  jobDescription?: string;
  requirements?: string;
  skillsRequired?: string;
  hiringManagerId?: string;
  hiringManagerName?: string;
  status: JobStatus;
  postedDate?: string;
  closingDate?: string;
  priority?: Priority;
  isActive: boolean;
  candidateCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateJobOpeningRequest {
  jobCode: string;
  jobTitle: string;
  departmentId?: string;
  location?: string;
  employmentType?: EmploymentType;
  experienceRequired?: string;
  minSalary?: number;
  maxSalary?: number;
  numberOfOpenings?: number;
  jobDescription?: string;
  requirements?: string;
  skillsRequired?: string;
  hiringManagerId?: string;
  status?: JobStatus;
  postedDate?: string;
  closingDate?: string;
  priority?: Priority;
  isActive?: boolean;
}

export interface Candidate {
  id: string;
  tenantId: string;
  candidateCode: string;
  jobOpeningId: string;
  jobTitle?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  currentLocation?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperience?: number;
  currentCtc?: number;
  expectedCtc?: number;
  noticePeriodDays?: number;
  resumeUrl?: string;
  source?: CandidateSource;
  status: CandidateStatus;
  currentStage?: RecruitmentStage;
  appliedDate?: string;
  notes?: string;
  assignedRecruiterId?: string;
  assignedRecruiterName?: string;
  offeredCtc?: number;
  offeredDesignation?: string;
  proposedJoiningDate?: string;
  offerLetterId?: string;
  offerExtendedDate?: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
  offerDeclineReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCandidateRequest {
  candidateCode: string;
  jobOpeningId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentLocation?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperience?: number;
  currentCtc?: number;
  expectedCtc?: number;
  noticePeriodDays?: number;
  resumeUrl?: string;
  source?: CandidateSource;
  status?: CandidateStatus;
  currentStage?: RecruitmentStage;
  appliedDate?: string;
  notes?: string;
  assignedRecruiterId?: string;
}

export interface Interview {
  id: string;
  tenantId: string;
  candidateId: string;
  candidateName?: string;
  jobOpeningId: string;
  jobTitle?: string;
  interviewRound?: InterviewRound;
  interviewType?: InterviewType;
  scheduledAt?: string;
  durationMinutes?: number;
  interviewerId?: string;
  interviewerName?: string;
  location?: string;
  meetingLink?: string;
  status: InterviewStatus;
  feedback?: string;
  rating?: number;
  result?: InterviewResult;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  googleMeetLink?: string;
  googleCalendarEventId?: string;
}

export interface CreateInterviewRequest {
  candidateId: string;
  jobOpeningId: string;
  interviewRound?: InterviewRound;
  interviewType?: InterviewType;
  scheduledAt?: string;
  durationMinutes?: number;
  interviewerId?: string;
  location?: string;
  meetingLink?: string;
  status?: InterviewStatus;
  feedback?: string;
  rating?: number;
  result?: InterviewResult;
  notes?: string;
  createGoogleMeet?: boolean;
  googleAccessToken?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type OfferResponse = 'ACCEPTED' | 'DECLINED';

export interface OfferResponseRequest {
  candidateId: string;
  response: OfferResponse;
  declineReason?: string;
  confirmedJoiningDate?: string;
  signatureData?: string;
}

export interface AcceptOfferRequest {
  confirmedJoiningDate?: string;
  signatureData?: string;
}

export interface DeclineOfferRequest {
  declineReason?: string;
}

/** CandidateStage is now unified with RecruitmentStage (13-stage NU-Hire pipeline) */
export type CandidateStage = RecruitmentStage;

export interface MoveStageRequest {
  stage: RecruitmentStage;
  notes?: string;
}

export interface CreateOfferRequest {
  offeredSalary: number;
  positionTitle?: string;
  joiningDate: string;
  offerExpiryDate?: string;
  notes?: string;
}

// ─── Agency Types ──────────────────────────────────────────────────────────

export type AgencyStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING_APPROVAL';
export type AgencyFeeType = 'FIXED' | 'PERCENTAGE' | 'RETAINER';
export type AgencySubmissionStatus = 'SUBMITTED' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEW' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export type AgencyInvoiceStatus = 'NOT_APPLICABLE' | 'PENDING' | 'INVOICED' | 'PAID';

export interface RecruitmentAgency {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  feeType?: AgencyFeeType;
  feeAmount?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  status: AgencyStatus;
  specializations?: string;
  notes?: string;
  rating?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface CreateAgencyRequest {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  feeType?: AgencyFeeType;
  feeAmount?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  status?: AgencyStatus;
  specializations?: string;
  notes?: string;
  rating?: number;
}

export interface UpdateAgencyRequest {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  feeType?: AgencyFeeType;
  feeAmount?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  status?: AgencyStatus;
  specializations?: string;
  notes?: string;
  rating?: number;
}

export interface AgencySubmission {
  id: string;
  tenantId: string;
  agencyId: string;
  agencyName?: string;
  candidateId: string;
  candidateName?: string;
  jobOpeningId: string;
  jobTitle?: string;
  submittedAt: string;
  feeAgreed?: number;
  feeCurrency: string;
  status: AgencySubmissionStatus;
  invoiceStatus: AgencyInvoiceStatus;
  invoiceAmount?: number;
  invoiceDate?: string;
  hiredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSubmissionRequest {
  candidateId: string;
  jobOpeningId: string;
  feeAgreed?: number;
  feeCurrency?: string;
  notes?: string;
}

export interface UpdateSubmissionStatusRequest {
  status: AgencySubmissionStatus;
  invoiceStatus?: AgencyInvoiceStatus;
  invoiceAmount?: number;
  invoiceDate?: string;
  hiredAt?: string;
  notes?: string;
}

export interface AgencyPerformance {
  agencyId: string;
  agencyName: string;
  totalSubmissions: number;
  hiredCount: number;
  rejectedCount: number;
  activeSubmissions: number;
  hireRate: number;
  totalFeesPaid: number;
  rating?: number;
}
