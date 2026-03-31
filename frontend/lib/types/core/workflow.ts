// Workflow Types

export type WorkflowEntityType =
  | 'LEAVE_REQUEST'
  | 'EXPENSE_CLAIM'
  | 'TRAVEL_REQUEST'
  | 'LOAN_REQUEST'
  | 'ASSET_REQUEST'
  | 'TIMESHEET'
  | 'RESIGNATION'
  | 'SALARY_REVISION'
  | 'PROMOTION'
  | 'TRANSFER'
  | 'ONBOARDING'
  | 'OFFBOARDING'
  | 'DOCUMENT_REQUEST'
  | 'POLICY_ACKNOWLEDGMENT'
  | 'TRAINING_REQUEST'
  | 'REIMBURSEMENT'
  | 'OVERTIME'
  | 'SHIFT_CHANGE'
  | 'WORK_FROM_HOME'
  | 'RECRUITMENT_OFFER'
  | 'CUSTOM';

export type WorkflowType =
  | 'SEQUENTIAL'
  | 'PARALLEL'
  | 'CONDITIONAL'
  | 'HIERARCHICAL'
  | 'HYBRID';

export type ApproverType =
  | 'SPECIFIC_USER'
  | 'ROLE'
  | 'REPORTING_MANAGER'
  | 'SKIP_LEVEL_MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'CEO'
  | 'CUSTOM_HIERARCHY'
  | 'DYNAMIC'
  | 'COMMITTEE'
  | 'ANY_OF_ROLE';

export type WorkflowExecutionStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ESCALATED'
  | 'ON_HOLD'
  | 'RETURNED'
  | 'EXPIRED';

export type WorkflowPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type StepStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SKIPPED'
  | 'ESCALATED'
  | 'DELEGATED'
  | 'EXPIRED'
  | 'RETURNED';

export type ApprovalAction =
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN_FOR_MODIFICATION'
  | 'DELEGATE'
  | 'ESCALATE'
  | 'SKIP'
  | 'HOLD';

export interface ApprovalStepRequest {
  stepOrder: number;
  stepName: string;
  description?: string;
  approverType: ApproverType;
  specificUserId?: string;
  roleId?: string;
  roleName?: string;
  departmentId?: string;
  hierarchyLevel?: number;
  approverExpression?: string;
  minApprovals?: number;
  isOptional?: boolean;
  condition?: string;
  slaHours?: number;
  escalationEnabled?: boolean;
  escalateAfterHours?: number;
  escalateToUserId?: string;
  escalateToRoleId?: string;
  autoApproveOnTimeout?: boolean;
  autoRejectOnTimeout?: boolean;
  notificationTemplate?: string;
  reminderTemplate?: string;
  escalationTemplate?: string;
  delegationAllowed?: boolean;
  commentsRequired?: boolean;
  attachmentsAllowed?: boolean;
}

export interface WorkflowDefinitionRequest {
  name: string;
  description?: string;
  entityType: WorkflowEntityType;
  workflowType: WorkflowType;
  departmentId?: string;
  locationId?: string;
  applicableGrades?: string;
  minAmount?: number;
  maxAmount?: number;
  defaultSlaHours?: number;
  escalationEnabled?: boolean;
  escalationAfterHours?: number;
  notifyOnSubmission?: boolean;
  notifyOnApproval?: boolean;
  notifyOnRejection?: boolean;
  notifyOnEscalation?: boolean;
  allowParallelApproval?: boolean;
  autoApproveEnabled?: boolean;
  autoApproveCondition?: string;
  skipLevelAllowed?: boolean;
  isDefault?: boolean;
  steps?: ApprovalStepRequest[];
}

export interface ApprovalStepResponse {
  id: string;
  stepOrder: number;
  stepName: string;
  description?: string;
  approverType: ApproverType;
  specificUserId?: string;
  roleId?: string;
  roleName?: string;
  departmentId?: string;
  hierarchyLevel?: number;
  minApprovals?: number;
  isOptional?: boolean;
  condition?: string;
  slaHours?: number;
  escalationEnabled?: boolean;
  escalateAfterHours?: number;
  delegationAllowed?: boolean;
  commentsRequired?: boolean;
  attachmentsAllowed?: boolean;
}

export interface WorkflowDefinitionResponse {
  id: string;
  name: string;
  description?: string;
  entityType: WorkflowEntityType;
  workflowType: WorkflowType;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  departmentId?: string;
  locationId?: string;
  applicableGrades?: string;
  minAmount?: number;
  maxAmount?: number;
  defaultSlaHours: number;
  escalationEnabled: boolean;
  escalationAfterHours: number;
  notifyOnSubmission: boolean;
  notifyOnApproval: boolean;
  notifyOnRejection: boolean;
  notifyOnEscalation: boolean;
  allowParallelApproval: boolean;
  autoApproveEnabled: boolean;
  autoApproveCondition?: string;
  skipLevelAllowed: boolean;
  totalSteps: number;
  steps?: ApprovalStepResponse[];
  createdAt?: string; // ISO 8601 DateTime
  updatedAt?: string; // ISO 8601 DateTime
}

export interface WorkflowExecutionRequest {
  entityType: WorkflowEntityType;
  entityId: string;
  title?: string;
  contextJson?: string;
  amount?: number;
  departmentId?: string;
  locationId?: string;
  priority?: WorkflowPriority;
  workflowDefinitionId?: string;
}

export interface StepExecutionResponse {
  id: string;
  stepOrder: number;
  stepName: string;
  status: StepStatus;
  assignedToUserId?: string;
  assignedToUserName?: string;
  actionByUserId?: string;
  actionByUserName?: string;
  action?: ApprovalAction;
  comments?: string;
  assignedAt?: string; // ISO 8601 DateTime
  executedAt?: string; // ISO 8601 DateTime
  timeTakenHours?: number;
  escalated?: boolean;
  delegated?: boolean;
}

export interface WorkflowExecutionResponse {
  id: string;
  workflowDefinitionId?: string;
  workflowName?: string;
  entityType: WorkflowEntityType;
  entityId: string;
  referenceNumber?: string;
  requesterId?: string;
  requesterName?: string;
  status: WorkflowExecutionStatus;
  currentStepOrder?: number;
  currentStepName?: string;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  priority?: WorkflowPriority;
  title?: string;
  amount?: number;
  deadline?: string; // ISO 8601 DateTime
  submittedAt?: string; // ISO 8601 DateTime
  completedAt?: string; // ISO 8601 DateTime
  totalSteps?: number;
  completedSteps?: number;
  stepExecutions?: StepExecutionResponse[];
}

export interface ApprovalActionRequest {
  action: ApprovalAction;
  comments?: string;
  delegateToUserId?: string;
  attachments?: string;
}

export interface ApprovalDelegateRequest {
  delegateId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
  entityType?: WorkflowEntityType;
  workflowDefinitionId?: string;
  departmentId?: string;
  maxApprovalAmount?: number;
  canSubDelegate?: boolean;
  notifyDelegatorOnAction?: boolean;
  notifyDelegateOnAssignment?: boolean;
  expiryNotificationDays?: number;
}

export interface ApprovalDelegateResponse {
  id: string;
  delegatorId?: string;
  delegatorName?: string;
  delegateId: string;
  delegateName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
  isActive: boolean;
  entityType?: WorkflowEntityType;
  workflowDefinitionId?: string;
  departmentId?: string;
  maxApprovalAmount?: number;
  canSubDelegate: boolean;
  revoked: boolean;
  revokedAt?: string; // ISO 8601 DateTime
  revocationReason?: string;
  createdAt?: string; // ISO 8601 DateTime
  isCurrentlyValid?: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
