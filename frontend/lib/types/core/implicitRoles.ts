import { RoleScope } from './roles';

export type ImplicitRoleCondition =
  | 'IS_REPORTING_MANAGER'
  | 'IS_DEPARTMENT_HEAD'
  | 'IS_SKIP_LEVEL_MANAGER'
  | 'HAS_DIRECT_REPORTS';

export interface ImplicitRoleRule {
  id: string;
  ruleName: string;
  description: string;
  conditionType: ImplicitRoleCondition;
  targetRoleId: string;
  targetRoleName: string;
  scope: RoleScope;
  priority: number;
  isActive: boolean;
  affectedUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImplicitRoleRuleRequest {
  ruleName: string;
  description?: string;
  conditionType: ImplicitRoleCondition;
  targetRoleId: string;
  scope?: RoleScope;
  priority?: number;
}

export interface ImplicitUserRole {
  id: string;
  userId: string;
  userName: string;
  roleId: string;
  roleName: string;
  scope: RoleScope;
  derivedFromContext: string;
  computedAt: string;
  isActive: boolean;
}

export interface BulkRuleIdsRequest {
  ruleIds: string[];
}

export const CONDITION_LABELS: Record<ImplicitRoleCondition, string> = {
  IS_REPORTING_MANAGER: 'Is Reporting Manager',
  IS_DEPARTMENT_HEAD: 'Is Department Head',
  IS_SKIP_LEVEL_MANAGER: 'Is Skip-Level Manager',
  HAS_DIRECT_REPORTS: 'Has Direct Reports',
};
