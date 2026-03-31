export enum ApprovalWorkflowStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum ApprovalTaskStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELEGATED = 'DELEGATED',
  CANCELLED = 'CANCELLED'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED'
}

export enum DocumentAccessLevel {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  MANAGE = 'MANAGE',
  APPROVE = 'APPROVE'
}

export interface DocumentApprovalWorkflow {
  id: string;
  documentId: string;
  workflowDefId?: string;
  status: ApprovalWorkflowStatus;
  requestedBy: string;
  currentApproverId?: string;
  approvalLevel: number;
  totalApprovalLevels: number;
  rejectionReason?: string;
  initiatedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentApprovalTask {
  id: string;
  workflowId: string;
  approverId: string;
  status: ApprovalTaskStatus;
  approvalLevel: number;
  comments?: string;
  approvedAt?: string;
  delegatedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  filePath: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  uploadedBy: string;
  changeNotes?: string;
  createdAt: string;
}

export interface DocumentAccess {
  id: string;
  documentId: string;
  userId?: string;
  roleId?: string;
  departmentId?: string;
  accessLevel: DocumentAccessLevel;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface DocumentExpiryTracking {
  id: string;
  documentId: string;
  expiryDate: string;
  reminderDaysBefore: number;
  isNotified: boolean;
  notifiedAt?: string;
  expiryNotificationSent: boolean;
  daysUntilExpiry?: number;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface DocumentTag {
  id: string;
  documentId: string;
  tagName: string;
}

export interface DocumentWorkflowStats {
  totalDocuments: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  expiringSoon: number;
  expired: number;
}

export interface DocumentWithStatus {
  id: string;
  name: string;
  status: DocumentStatus;
  categoryId?: string;
  expiryDate?: string;
  approvalStatus?: ApprovalWorkflowStatus;
  uploadedBy: string;
  uploadedAt: string;
  currentVersion: number;
}
