'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { workflowService } from '@/lib/services/workflow.service';
import type {
  WorkflowDefinitionRequest,
  WorkflowEntityType,
} from '@/lib/types/workflow';

// ── Query Key Factory ────────────────────────────────────────────────────────

export const workflowKeys = {
  all: ['workflows'] as const,
  definitions: () => [...workflowKeys.all, 'definitions'] as const,
  definitionList: (params?: WorkflowListParams) =>
    [...workflowKeys.definitions(), 'list', params ?? {}] as const,
  definition: (id: string) => [...workflowKeys.definitions(), id] as const,
  definitionsByType: (entityType: WorkflowEntityType) =>
    [...workflowKeys.definitions(), 'entity-type', entityType] as const,
  executions: () => [...workflowKeys.all, 'executions'] as const,
  myRequests: () => [...workflowKeys.executions(), 'my-requests'] as const,
  myPending: () => [...workflowKeys.executions(), 'my-pending'] as const,
  overdue: () => [...workflowKeys.executions(), 'overdue'] as const,
  dashboard: () => [...workflowKeys.all, 'dashboard'] as const,
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowListParams {
  page?: number;
  size?: number;
}

// ── Definition Queries ───────────────────────────────────────────────────────

/**
 * Paginated list of workflow definitions.
 */
export function useWorkflowDefinitions(params: WorkflowListParams = {}) {
  return useQuery({
    queryKey: workflowKeys.definitionList(params),
    queryFn: () => workflowService.getAllWorkflowDefinitions(params.page ?? 0, params.size ?? 20),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Single workflow definition by ID (includes steps).
 */
export function useWorkflowDefinition(id: string) {
  return useQuery({
    queryKey: workflowKeys.definition(id),
    queryFn: () => workflowService.getWorkflowDefinition(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Workflow definitions filtered by entity type.
 */
export function useWorkflowsByEntityType(entityType: WorkflowEntityType) {
  return useQuery({
    queryKey: workflowKeys.definitionsByType(entityType),
    queryFn: () => workflowService.getWorkflowsByEntityType(entityType),
    enabled: !!entityType,
    staleTime: 30 * 1000,
  });
}

// ── Definition Mutations ─────────────────────────────────────────────────────

/**
 * Create a new workflow definition.
 */
export function useCreateWorkflowDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WorkflowDefinitionRequest) =>
      workflowService.createWorkflowDefinition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.definitions() });
      notifications.show({
        title: 'Workflow created',
        message: 'The workflow definition has been created successfully.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create workflow definition.',
        color: 'red',
      });
    },
  });
}

/**
 * Update an existing workflow definition.
 */
export function useUpdateWorkflowDefinition(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WorkflowDefinitionRequest) =>
      workflowService.updateWorkflowDefinition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.definition(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.definitions() });
      notifications.show({
        title: 'Workflow updated',
        message: 'The workflow definition has been updated successfully.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update workflow definition.',
        color: 'red',
      });
    },
  });
}

/**
 * Deactivate (soft-delete) a workflow definition.
 */
export function useDeactivateWorkflowDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowService.deactivateWorkflowDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.definitions() });
      notifications.show({
        title: 'Workflow deactivated',
        message: 'The workflow definition has been deactivated.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to deactivate workflow definition.',
        color: 'red',
      });
    },
  });
}

// ── Execution Queries ────────────────────────────────────────────────────────

/**
 * Current user's submitted workflow requests.
 */
export function useMyWorkflowRequests() {
  return useQuery({
    queryKey: workflowKeys.myRequests(),
    queryFn: () => workflowService.getMyRequests(),
    staleTime: 30 * 1000,
  });
}

/**
 * Overdue workflow executions (admin view).
 */
export function useOverdueExecutions() {
  return useQuery({
    queryKey: workflowKeys.overdue(),
    queryFn: () => workflowService.getOverdueExecutions(),
    staleTime: 60 * 1000,
  });
}

/**
 * Workflow dashboard analytics.
 */
export function useWorkflowDashboard() {
  return useQuery({
    queryKey: workflowKeys.dashboard(),
    queryFn: () => workflowService.getWorkflowDashboard(),
    staleTime: 60 * 1000,
  });
}
