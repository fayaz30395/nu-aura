import {
  deleteConfig as deleteConfigGenerated,
  getConfig as getConfigGenerated,
  upsertConfig as upsertConfigGenerated,
} from '@/lib/generated/api/escalation-configuration/escalation-configuration';
import {EscalationConfig, EscalationConfigRequest} from '../types/core/escalation';

/**
 * T3-12 migration (wave 1): this file is now a thin facade over the orval-
 * generated `escalation-configuration` client. The public `escalationApi`
 * surface and return shapes are preserved so existing callers
 * (`useEscalation` hooks, etc.) do not change.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, so cookie
 * auth, CSRF double-submit, the 401 refresh mutex, and tenant headers all
 * continue to apply.
 */
export const escalationApi = {
  getConfig: async (workflowId: string): Promise<EscalationConfig> => {
    const response = await getConfigGenerated(workflowId);
    return response as unknown as EscalationConfig;
  },

  upsertConfig: async (
    workflowId: string,
    data: EscalationConfigRequest
  ): Promise<EscalationConfig> => {
    const response = await upsertConfigGenerated(
      workflowId,
      data as unknown as Parameters<typeof upsertConfigGenerated>[1]
    );
    return response as unknown as EscalationConfig;
  },

  deleteConfig: async (workflowId: string): Promise<void> => {
    await deleteConfigGenerated(workflowId);
  },
};
