// NU-AURA Contract Management Types

// ─── Enums ──────────────────────────────────────────────────────────────────

export type ContractType = 'EMPLOYMENT' | 'VENDOR' | 'NDA' | 'SLA' | 'FREELANCER' | 'OTHER';

export type ContractStatus =
  'DRAFT'
  | 'PENDING_REVIEW'
  | 'PENDING_SIGNATURES'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'RENEWED';

export type SignatureStatus = 'PENDING' | 'SIGNED' | 'DECLINED';

export type SignerRole = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'LEGAL' | 'VENDOR';

export type ReminderType = 'EXPIRY' | 'RENEWAL' | 'REVIEW';

// ─── Contract Types ─────────────────────────────────────────────────────────

export interface Contract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  employeeId?: string;
  employeeName?: string;
  vendorName?: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  autoRenew: boolean;
  renewalPeriodDays?: number;
  value?: number;
  currency: string;
  description?: string;
  terms?: Record<string, unknown>;
  documentUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  signatureCount?: number;
  pendingSignatureCount?: number;
  signatures?: ContractSignature[];
}

export interface ContractListItem {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  employeeName?: string;
  vendorName?: string;
  startDate: string;
  endDate?: string;
  value?: number;
  currency: string;
  pendingSignatureCount: number;
  createdAt: string;
  isExpiring: boolean;
  isExpired: boolean;
}

export interface CreateContractRequest {
  title: string;
  type: ContractType;
  employeeId?: string;
  vendorName?: string;
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  renewalPeriodDays?: number;
  value?: number;
  currency?: string;
  description?: string;
  terms?: Record<string, unknown>;
  documentUrl?: string;
}

export interface UpdateContractRequest {
  title?: string;
  type?: ContractType;
  status?: ContractStatus;
  employeeId?: string;
  vendorName?: string;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  renewalPeriodDays?: number;
  value?: number;
  currency?: string;
  description?: string;
  terms?: Record<string, unknown>;
  documentUrl?: string;
}

// ─── Signature Types ────────────────────────────────────────────────────────

export interface ContractSignature {
  id: string;
  contractId: string;
  signerId?: string;
  signerName: string;
  signerEmail: string;
  signerRole: SignerRole;
  status: SignatureStatus;
  signedAt?: string;
  signatureImageUrl?: string;
  createdAt: string;
}

export interface SendForSigningRequest {
  signerName: string;
  signerEmail: string;
  signerRole?: SignerRole;
}

export interface SignatureSummary {
  total: number;
  signed: number;
  pending: number;
}

// ─── Template Types ────────────────────────────────────────────────────────

export interface ContractTemplate {
  id: string;
  name: string;
  type: ContractType;
  content: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractTemplateRequest {
  name: string;
  type: ContractType;
  content: Record<string, unknown>;
}

// ─── Pagination & Lists ─────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface ContractStats {
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  pendingSignatureCount: number;
  draftCount: number;
}
