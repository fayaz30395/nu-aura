export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  resource: string;
  action: string;
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

export interface RoleWithDetails extends Role {
  expanded?: boolean;
  permissionCount?: number;
}
