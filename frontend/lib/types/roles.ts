/**
 * Role scope types for Keka-style RBAC.
 * Hierarchy: ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM
 */
export type RoleScope = 'ALL' | 'LOCATION' | 'DEPARTMENT' | 'TEAM' | 'SELF' | 'CUSTOM';

/**
 * Target type for CUSTOM scope
 */
export type TargetType = 'EMPLOYEE' | 'DEPARTMENT' | 'LOCATION';

/**
 * Custom scope target for CUSTOM scope permissions
 */
export interface CustomTarget {
  id?: string;
  targetType: TargetType;
  targetId: string;
  targetName?: string; // Resolved name for display
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  scope?: RoleScope;
  customTargets?: CustomTarget[];
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  tenantId: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}

export interface UpdateRoleRequest {
  name: string;
  description?: string;
}

export interface AssignPermissionsRequest {
  permissionCodes: string[];
}

/**
 * Request to assign a permission with a specific scope
 */
export interface PermissionScopeRequest {
  permissionCode: string;
  scope: RoleScope;
  customTargets?: CustomTarget[];
}

/**
 * Request to assign multiple permissions with scopes
 */
export interface AssignPermissionsWithScopeRequest {
  permissions: PermissionScopeRequest[];
  replaceAll?: boolean;
}

/**
 * Request to update scope for a single permission
 */
export interface UpdatePermissionScopeRequest {
  scope: RoleScope;
  customTargets?: CustomTarget[];
}

export interface RoleWithDetails extends Role {
  expanded?: boolean;
  permissionCount?: number;
}

/**
 * Scope display labels for UI
 */
export const SCOPE_LABELS: Record<RoleScope, string> = {
  ALL: 'All (Organization-wide)',
  LOCATION: 'Location',
  DEPARTMENT: 'Department',
  TEAM: 'Team (Direct + Indirect Reports)',
  SELF: 'Self Only',
  CUSTOM: 'Custom Selection',
};

/**
 * Scope descriptions for UI tooltips
 */
export const SCOPE_DESCRIPTIONS: Record<RoleScope, string> = {
  ALL: 'Access to all records across the organization',
  LOCATION: 'Access to records within the user\'s office location(s)',
  DEPARTMENT: 'Access to records within the user\'s department',
  TEAM: 'Access to the user\'s direct and indirect reports',
  SELF: 'Access to only the user\'s own records',
  CUSTOM: 'Access to specifically selected employees, departments, or locations',
};
