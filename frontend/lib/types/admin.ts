export interface AdminStats {
  totalTenants: number;
  totalEmployees: number;
  pendingApprovals: number;
}

export interface RoleInfo {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface AdminUserSummary {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  tenantName: string;
  departmentName?: string;
  userStatus: string;
  roles: RoleInfo[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface HealthComponent {
  status: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  components?: Record<string, HealthComponent>;
}

