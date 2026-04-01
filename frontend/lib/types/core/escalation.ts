export type EscalationType =
  | 'SKIP_LEVEL_MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'SPECIFIC_ROLE'
  | 'SPECIFIC_USER';

export interface EscalationConfig {
  id: string;
  workflowDefinitionId: string;
  workflowName: string;
  timeoutHours: number;
  escalationType: EscalationType;
  fallbackRoleId?: string;
  fallbackRoleName?: string;
  fallbackUserId?: string;
  fallbackUserName?: string;
  maxEscalations: number;
  notifyOnEscalation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationConfigRequest {
  timeoutHours: number;
  escalationType: EscalationType;
  fallbackRoleId?: string;
  fallbackUserId?: string;
  maxEscalations?: number;
  notifyOnEscalation?: boolean;
  isActive?: boolean;
}

export const ESCALATION_TYPE_LABELS: Record<EscalationType, string> = {
  SKIP_LEVEL_MANAGER: 'Skip-Level Manager',
  DEPARTMENT_HEAD: 'Department Head',
  SPECIFIC_ROLE: 'Specific Role',
  SPECIFIC_USER: 'Specific User',
};
