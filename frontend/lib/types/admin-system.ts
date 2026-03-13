/**
 * Types for SuperAdmin System Dashboard
 */

export interface SystemOverview {
  totalTenants: number;
  activeTenants: number;
  totalEmployees: number;
  totalActiveUsers: number;
  storageUsageBytes: number;
  aiCreditsUsed: number;
  pendingApprovals: number;
}

export interface TenantListItem {
  tenantId: string;
  name: string;
  plan: string;
  status: string;
  employeeCount: number;
  userCount: number;
  storageUsageBytes: number;
  createdAt: string;
  lastActivityAt: string | null;
}

export interface TenantMetrics {
  tenantId: string;
  tenantName: string;
  activeUsers: number;
  totalUsers: number;
  employeeCount: number;
  storageUsageBytes: number;
  pendingApprovals: number;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface ImpersonationToken {
  token: string;
  tokenType: string;
  expiresIn: number;
  tenantId: string;
  tenantName: string;
}

export interface PaginatedTenantList {
  content: TenantListItem[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface TenantGrowthData {
  month: string;
  tenants: number;
  activeUsers: number;
  employees: number;
}

export interface MonthlyGrowth {
  month: string;
  year: number;
  tenants: number;
  activeUsers: number;
  employees: number;
}

export interface GrowthMetrics {
  months: MonthlyGrowth[];
}
