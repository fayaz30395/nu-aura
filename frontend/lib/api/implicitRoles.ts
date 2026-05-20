import {
  bulkActivate as bulkActivateGenerated,
  bulkDeactivate as bulkDeactivateGenerated,
  createRule as createRuleGenerated,
  deleteRule as deleteRuleGenerated,
  getUserImplicitRoles as getUserImplicitRolesGenerated,
  listRules as listRulesGenerated,
  recomputeAll as recomputeAllGenerated,
  updateRule as updateRuleGenerated,
} from '@/lib/generated/api/implicit-role-rules/implicit-role-rules';
import type {ListRulesParams} from '@/lib/generated/api/model';
import {apiClient} from './client';
import {
  BulkRuleIdsRequest,
  ImplicitRoleRule,
  ImplicitRoleRuleRequest,
  ImplicitUserRole,
} from '../types/core/implicitRoles';

/**
 * T3-12 migration (wave 3): thin facade over the orval-generated
 * `implicit-role-rules` client. The public `implicitRolesApi` surface,
 * including `PaginatedResponse<T>` and `ListParams` type exports, is
 * preserved so existing callers (`useImplicitRoles` hooks) need no edits.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, so cookie
 * auth, CSRF double-submit, the 401 refresh mutex, and tenant headers all
 * continue to apply.
 *
 * One method (`getAffectedUsers`) stays on `apiClient` directly — the
 * generated function neither accepts `page`/`size` query params nor returns
 * a `Page<…>` shape, so we cannot satisfy the existing public contract
 * through the generated client. See inline note.
 */

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ListParams {
  page?: number;
  size?: number;
  search?: string;
  isActive?: boolean;
}

export const implicitRolesApi = {
  // Rules Management
  listRules: async (params?: ListParams): Promise<PaginatedResponse<ImplicitRoleRule>> => {
    // Map hand-rolled `isActive` to the generated `active` query param.
    // `search` is not in the OpenAPI spec but the original facade forwarded
    // it verbatim, so keep doing so via a cast — backend ignores unknown
    // params and a future spec update will type it properly.
    const mapped = {
      active: params?.isActive,
      page: params?.page,
      size: params?.size,
      ...(params?.search !== undefined ? {search: params.search} : {}),
    } as ListRulesParams;
    const response = await listRulesGenerated(mapped);
    return response as unknown as PaginatedResponse<ImplicitRoleRule>;
  },

  createRule: async (data: ImplicitRoleRuleRequest): Promise<ImplicitRoleRule> => {
    const response = await createRuleGenerated(
      data as unknown as Parameters<typeof createRuleGenerated>[0]
    );
    return response as unknown as ImplicitRoleRule;
  },

  updateRule: async (id: string, data: ImplicitRoleRuleRequest): Promise<ImplicitRoleRule> => {
    const response = await updateRuleGenerated(
      id,
      data as unknown as Parameters<typeof updateRuleGenerated>[1]
    );
    return response as unknown as ImplicitRoleRule;
  },

  deleteRule: async (id: string): Promise<void> => {
    await deleteRuleGenerated(id);
  },

  // Affected Users
  //
  // KEPT ON apiClient: the generated `getAffectedUsers` takes only `id`
  // (no `page`/`size`) and returns `AffectedUsersResponse` (a wrapper with
  // `affectedUsers: ImplicitUserRoleResponse[]`), not a Spring `Page<…>`.
  // Migrating would change the public return shape and drop pagination.
  // Revisit once the OpenAPI spec adds Pageable support for this endpoint.
  getAffectedUsers: async (
    ruleId: string,
    page: number = 0,
    size: number = 20
  ): Promise<PaginatedResponse<ImplicitUserRole>> => {
    const response = await apiClient.get<PaginatedResponse<ImplicitUserRole>>(
      `/implicit-role-rules/${ruleId}/affected-users`,
      {params: {page, size}}
    );
    return response.data;
  },

  // Recomputation
  recomputeAll: async (): Promise<{ status: string; message: string; tenantId: string }> => {
    const response = await recomputeAllGenerated();
    return response as unknown as { status: string; message: string; tenantId: string };
  },

  // Bulk Operations
  bulkActivate: async (data: BulkRuleIdsRequest): Promise<{
    operationType: string;
    totalRequested: number;
    totalProcessed: number
  }> => {
    const response = await bulkActivateGenerated(
      data as unknown as Parameters<typeof bulkActivateGenerated>[0]
    );
    return response as unknown as {
      operationType: string;
      totalRequested: number;
      totalProcessed: number;
    };
  },

  bulkDeactivate: async (data: BulkRuleIdsRequest): Promise<{
    operationType: string;
    totalRequested: number;
    totalProcessed: number
  }> => {
    const response = await bulkDeactivateGenerated(
      data as unknown as Parameters<typeof bulkDeactivateGenerated>[0]
    );
    return response as unknown as {
      operationType: string;
      totalRequested: number;
      totalProcessed: number;
    };
  },

  // User Implicit Roles
  getUserImplicitRoles: async (userId: string): Promise<ImplicitUserRole[]> => {
    const response = await getUserImplicitRolesGenerated(userId);
    return response as unknown as ImplicitUserRole[];
  },
};
