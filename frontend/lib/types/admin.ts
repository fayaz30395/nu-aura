export interface AdminStats {
  totalTenants: number;
  totalEmployees: number;
  pendingApprovals: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  tenantName: string;
  departmentName?: string;
  status: string;
  roles: string[];
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
  status: 'UP' | 'DOWN';
  components?: Record<string, HealthComponent>;
}

