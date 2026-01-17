export enum LetterCategory {
  OFFER = 'OFFER',
  APPOINTMENT = 'APPOINTMENT',
  CONFIRMATION = 'CONFIRMATION',
  PROMOTION = 'PROMOTION',
  TRANSFER = 'TRANSFER',
  SALARY_REVISION = 'SALARY_REVISION',
  WARNING = 'WARNING',
  TERMINATION = 'TERMINATION',
  RESIGNATION_ACCEPTANCE = 'RESIGNATION_ACCEPTANCE',
  EXPERIENCE = 'EXPERIENCE',
  RELIEVING = 'RELIEVING',
  SALARY_CERTIFICATE = 'SALARY_CERTIFICATE',
  EMPLOYMENT_CERTIFICATE = 'EMPLOYMENT_CERTIFICATE',
  BONAFIDE = 'BONAFIDE',
  VISA_SUPPORT = 'VISA_SUPPORT',
  BANK_LETTER = 'BANK_LETTER',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  INTERNSHIP = 'INTERNSHIP',
  TRAINING_COMPLETION = 'TRAINING_COMPLETION',
  APPRECIATION = 'APPRECIATION',
  CUSTOM = 'CUSTOM',
}

export enum LetterStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export interface LetterTemplate {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: LetterCategory;
  categoryDisplayName?: string;
  templateContent: string;
  headerHtml?: string;
  footerHtml?: string;
  cssStyles?: string;
  includeCompanyLogo?: boolean;
  includeSignature?: boolean;
  signatureTitle?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  requiresApproval?: boolean;
  isActive?: boolean;
  isSystemTemplate?: boolean;
  version?: number;
  availablePlaceholders?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedLetter {
  id: string;
  referenceNumber: string;
  templateId: string;
  templateName?: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  category: LetterCategory;
  categoryDisplayName?: string;
  letterTitle: string;
  generatedContent?: string;
  pdfUrl?: string;
  letterDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  status: LetterStatus;
  statusDisplayName?: string;
  generatedBy?: string;
  generatedByName?: string;
  generatedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComments?: string;
  issuedBy?: string;
  issuedByName?: string;
  issuedAt?: string;
  sentToEmployee?: boolean;
  sentAt?: string;
  downloadedByEmployee?: boolean;
  downloadedAt?: string;
  additionalNotes?: string;
  version?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLetterTemplateRequest {
  name: string;
  code: string;
  description?: string;
  category: LetterCategory;
  templateContent: string;
  headerHtml?: string;
  footerHtml?: string;
  cssStyles?: string;
  includeCompanyLogo?: boolean;
  includeSignature?: boolean;
  signatureTitle?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  requiresApproval?: boolean;
  availablePlaceholders?: string;
}

export interface GenerateLetterRequest {
  templateId: string;
  employeeId: string;
  letterTitle?: string;
  letterDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  additionalNotes?: string;
  customPlaceholderValues?: Record<string, string>;
}

export interface GenerateOfferLetterRequest {
  templateId: string;
  candidateId: string;
  letterTitle?: string;
  offeredCtc: number;
  offeredDesignation: string;
  proposedJoiningDate: string;
  letterDate?: string;
  expiryDate?: string;
  customPlaceholderValues?: Record<string, string>;
  additionalNotes?: string;
  submitForApproval?: boolean;
  sendForESign?: boolean;
}

export interface LetterTemplatesResponse {
  content: LetterTemplate[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface GeneratedLettersResponse {
  content: GeneratedLetter[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
