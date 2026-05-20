import {
  generateImpersonationToken as generateImpersonationTokenGenerated,
  getGrowthMetrics as getGrowthMetricsGenerated,
  getSystemOverview as getSystemOverviewGenerated,
  getTenantList as getTenantListGenerated,
  getTenantMetrics as getTenantMetricsGenerated,
} from '@/lib/generated/api/system-admin/system-admin';
import {
  GrowthMetrics,
  ImpersonationToken,
  PaginatedTenantList,
  SystemOverview,
  TenantMetrics,
} from '../types/core/admin-system';

/**
 * T3-12 migration (wave 3): thin facade over the orval-generated
 * `system-admin` client. The public `systemAdminApi` surface and return shapes
 * are preserved so existing callers (admin dashboards, SuperAdmin tooling)
 * need no edits.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, so cookie
 * auth, CSRF double-submit, the 401 refresh mutex, and tenant headers all
 * continue to apply.
 *
 * All endpoints require SYSTEM_ADMIN permission.
 */
export const systemAdminApi = {
  /**
   * Get comprehensive system overview
   */
  getSystemOverview: async (): Promise<SystemOverview> => {
    const response = await getSystemOverviewGenerated();
    return response as unknown as SystemOverview;
  },

  /**
   * Get paginated list of all tenants
   */
  getTenantList: async (
    page: number = 0,
    size: number = 20,
    sort?: string
  ): Promise<PaginatedTenantList> => {
    const response = await getTenantListGenerated({
      pageable: {page, size, ...(sort && {sort: [sort]})},
    });
    return response as unknown as PaginatedTenantList;
  },

  /**
   * Get deep-dive metrics for a specific tenant
   */
  getTenantMetrics: async (tenantId: string): Promise<TenantMetrics> => {
    const response = await getTenantMetricsGenerated(tenantId);
    return response as unknown as TenantMetrics;
  },

  /**
   * Get platform growth metrics over the last N months
   */
  getGrowthMetrics: async (months: number = 6): Promise<GrowthMetrics> => {
    const response = await getGrowthMetricsGenerated({months});
    return response as unknown as GrowthMetrics;
  },

  /**
   * Generate an impersonation token for a specific tenant
   */
  generateImpersonationToken: async (tenantId: string): Promise<ImpersonationToken> => {
    const response = await generateImpersonationTokenGenerated(tenantId);
    return response as unknown as ImpersonationToken;
  },
};
