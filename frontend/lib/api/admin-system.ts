import {
  generateImpersonationExchangeToken as generateImpersonationTokenGenerated,
  getGrowthMetrics as getGrowthMetricsGenerated,
  getSystemOverview as getSystemOverviewGenerated,
  getTenantList as getTenantListGenerated,
  getTenantMetrics as getTenantMetricsGenerated,
} from '@/lib/generated/api/system-admin/system-admin';
import {apiClient} from './client';
import {
  GrowthMetrics,
  ImpersonationExchangeResponse,
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
   * Phase 1 (M-12): request a short-lived (60s) single-use opaque exchange token.
   * The impersonation JWT is never returned here — only the opaque exchange token.
   * Immediately pass the exchangeToken to consumeImpersonationToken() without storing it.
   */
  generateImpersonationToken: async (tenantId: string): Promise<ImpersonationExchangeResponse> => {
    const response = await generateImpersonationTokenGenerated(tenantId);
    return response as unknown as ImpersonationExchangeResponse;
  },

  /**
   * Phase 2 (M-12): consume the exchange token. The server atomically validates and
   * deletes it from Redis (single-use), then places the impersonation JWT in an httpOnly
   * cookie. The JWT never enters JS memory. Returns void on 204 success.
   *
   * The token must NOT be stored before calling this — use it immediately.
   */
  consumeImpersonationToken: async (exchangeToken: string): Promise<void> => {
    await apiClient.post(
      '/api/v1/admin/system/impersonate/consume',
      {exchangeToken},
      // withCredentials ensures the Set-Cookie header from the response is accepted
      // and stored by the browser cookie jar.
      {withCredentials: true}
    );
  },
};
