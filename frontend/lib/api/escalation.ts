import { apiClient } from './client';
import { EscalationConfig, EscalationConfigRequest } from '../types/escalation';

export const escalationApi = {
  getConfig: async (workflowId: string): Promise<EscalationConfig> => {
    const response = await apiClient.get<EscalationConfig>(
      `/escalation/workflows/${workflowId}/config`
    );
    return response.data;
  },

  upsertConfig: async (workflowId: string, data: EscalationConfigRequest): Promise<EscalationConfig> => {
    const response = await apiClient.put<EscalationConfig>(
      `/escalation/workflows/${workflowId}/config`,
      data
    );
    return response.data;
  },

  deleteConfig: async (workflowId: string): Promise<void> => {
    await apiClient.delete(`/escalation/workflows/${workflowId}/config`);
  },
};
