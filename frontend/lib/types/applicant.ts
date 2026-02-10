export enum ApplicationStatus {
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  PHONE_SCREEN = 'PHONE_SCREEN',
  INTERVIEW = 'INTERVIEW',
  TECHNICAL_ROUND = 'TECHNICAL_ROUND',
  HR_ROUND = 'HR_ROUND',
  OFFER_PENDING = 'OFFER_PENDING',
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ApplicationSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  JOB_BOARD = 'JOB_BOARD',
  LINKEDIN = 'LINKEDIN',
  CAMPUS = 'CAMPUS',
  AGENCY = 'AGENCY',
  OTHER = 'OTHER',
}

export interface Applicant {
  id: string;
  tenantId: string;
  candidateId: string;
  jobOpeningId: string;
  status: ApplicationStatus;
  source?: ApplicationSource;
  appliedDate?: string;
  currentStageEnteredAt?: string;
  notes?: string;
  rating?: number;
  resumeFileId?: string;
  rejectionReason?: string;
  offeredSalary?: number;
  expectedSalary?: number;
  candidateName?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  version?: number;
}

export interface ApplicantRequest {
  candidateId: string;
  jobOpeningId: string;
  source?: ApplicationSource;
  notes?: string;
  expectedSalary?: number;
}

export interface ApplicantStatusUpdate {
  status: ApplicationStatus;
  notes?: string;
  rejectionReason?: string;
}

export type PipelineData = Record<ApplicationStatus, Applicant[]>;

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}
