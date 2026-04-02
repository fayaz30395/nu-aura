// ==================== E-Signature Types (NU-Hire) ====================

export type DocumentType =
  | 'OFFER_LETTER'
  | 'EMPLOYMENT_CONTRACT'
  | 'NDA'
  | 'POLICY_ACKNOWLEDGEMENT'
  | 'OTHER';

export type SignatureStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ApprovalStatus =
  | 'PENDING'
  | 'SENT'
  | 'VIEWED'
  | 'SIGNED'
  | 'DECLINED'
  | 'EXPIRED';

export type SignerRole = 'CANDIDATE' | 'EMPLOYEE' | 'MANAGER' | 'HR' | 'WITNESS' | 'OTHER';

export type SignatureMethod = 'TYPED' | 'DRAWN' | 'UPLOADED' | 'DIGITAL_CERTIFICATE';

// ---- Request types ----

export interface SignatureApprovalRequest {
  signerId?: string;
  signerEmail: string;
  signerRole: SignerRole;
  signingOrder?: number;
  isRequired?: boolean;
  comments?: string;
}

export interface CreateSignatureRequestRequest {
  title: string;
  description?: string;
  documentType: DocumentType;
  documentUrl?: string;
  documentName?: string;
  documentSize?: number;
  mimeType?: string;
  signatureOrder?: boolean;
  expiresAt?: string;
  reminderFrequencyDays?: number;
  isTemplate?: boolean;
  templateName?: string;
  metadata?: string;
  signers?: SignatureApprovalRequest[];
}

// ---- Response types ----

export interface SignatureApprovalResponse {
  id: string;
  tenantId: string;
  signatureRequestId: string;
  signerId?: string;
  signerName?: string;
  signerEmail: string;
  signerRole: SignerRole;
  signingOrder?: number;
  status: ApprovalStatus;
  isRequired?: boolean;
  signedAt?: string;
  signatureIp?: string;
  signatureDevice?: string;
  signatureMethod?: SignatureMethod;
  declinedAt?: string;
  declineReason?: string;
  sentAt?: string;
  viewedAt?: string;
  reminderCount?: number;
  lastRemindedAt?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureRequestResponse {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  documentUrl?: string;
  documentName?: string;
  documentSize?: number;
  mimeType?: string;
  createdBy: string;
  createdByName?: string;
  status: SignatureStatus;
  requiredSignatures?: number;
  receivedSignatures?: number;
  signatureOrder?: boolean;
  expiresAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  reminderFrequencyDays?: number;
  lastReminderSentAt?: string;
  isTemplate?: boolean;
  templateName?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
  approvals?: SignatureApprovalResponse[];
}
