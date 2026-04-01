'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { escalationApi } from '@/lib/api/escalation';
import { EscalationConfig as _EscalationConfig, EscalationConfigRequest } from '@/lib/types/core/escalation';

// Query key factory
const escalationKeys = {
  all: ['escalation'] as const,
  configs: () => [...escalationKeys.all, 'configs'] as const,
  config: (workflowId: string) => [...escalationKeys.configs(), workflowId] as const,
};

// ========== Queries ==========

/**
 * Fetch escalation config for a workflow
 */
export function useEscalationConfig(workflowId: string) {
  return useQuery({
    queryKey: escalationKeys.config(workflowId),
    queryFn: () => escalationApi.getConfig(workflowId),
    enabled: !!workflowId,
    staleTime: 30 * 1000,
  });
}

// ========== Mutations ==========

/**
 * Create or update escalation config for a workflow
 */
export function useUpsertEscalationConfig(workflowId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EscalationConfigRequest) =>
      escalationApi.upsertConfig(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.config(workflowId) });
      queryClient.invalidateQueries({ queryKey: escalationKeys.configs() });
      notifications.show({
        title: 'Success',
        message: 'Escalation config saved successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to save escalation config:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save escalation config',
        color: 'red',
      });
    },
  });
}

/**
 * Delete escalation config for a workflow
 */
export function useDeleteEscalationConfig(workflowId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => escalationApi.deleteConfig(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.config(workflowId) });
      queryClient.invalidateQueries({ queryKey: escalationKeys.configs() });
      notifications.show({
        title: 'Success',
        message: 'Escalation config deleted successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to delete escalation config:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete escalation config',
        color: 'red',
      });
    },
  });
}
