'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { implicitRolesApi } from '@/lib/api/implicitRoles';
import {
  ImplicitRoleRule,
  ImplicitRoleRuleRequest,
  ImplicitUserRole,
  BulkRuleIdsRequest,
} from '@/lib/types/implicitRoles';

interface ListParams {
  page?: number;
  size?: number;
  search?: string;
  isActive?: boolean;
}

// Query key factory
const implicitRoleKeys = {
  all: ['implicit-roles'] as const,
  rules: () => [...implicitRoleKeys.all, 'rules'] as const,
  rule: (id: string) => [...implicitRoleKeys.all, 'rule', id] as const,
  rulesList: (params?: ListParams) => [...implicitRoleKeys.rules(), params || {}] as const,
  affectedUsers: (ruleId: string) => [...implicitRoleKeys.rule(ruleId), 'affected-users'] as const,
  userRoles: (userId: string) => [...implicitRoleKeys.all, 'user-roles', userId] as const,
};

// ========== Queries ==========

/**
 * Fetch paginated implicit role rules
 */
export function useImplicitRoleRules(params?: ListParams) {
  return useQuery({
    queryKey: implicitRoleKeys.rulesList(params),
    queryFn: () => implicitRolesApi.listRules(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch implicit roles for a user
 */
export function useUserImplicitRoles(userId: string) {
  return useQuery({
    queryKey: implicitRoleKeys.userRoles(userId),
    queryFn: () => implicitRolesApi.getUserImplicitRoles(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch users affected by a rule
 */
export function useAffectedUsers(ruleId: string, page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: [
      ...implicitRoleKeys.affectedUsers(ruleId),
      { page, size },
    ] as const,
    queryFn: () => implicitRolesApi.getAffectedUsers(ruleId, page, size),
    enabled: !!ruleId,
    staleTime: 30 * 1000,
  });
}

// ========== Mutations ==========

/**
 * Create a new implicit role rule
 */
export function useCreateImplicitRoleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImplicitRoleRuleRequest) =>
      implicitRolesApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rules() });
      notifications.show({
        title: 'Success',
        message: 'Implicit role rule created successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to create implicit role rule:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create implicit role rule',
        color: 'red',
      });
    },
  });
}

/**
 * Update an implicit role rule
 */
export function useUpdateImplicitRoleRule(ruleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImplicitRoleRuleRequest) =>
      implicitRolesApi.updateRule(ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rules() });
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rule(ruleId) });
      notifications.show({
        title: 'Success',
        message: 'Implicit role rule updated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to update implicit role rule:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update implicit role rule',
        color: 'red',
      });
    },
  });
}

/**
 * Delete an implicit role rule
 */
export function useDeleteImplicitRoleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => implicitRolesApi.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rules() });
      notifications.show({
        title: 'Success',
        message: 'Implicit role rule deleted successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to delete implicit role rule:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete implicit role rule',
        color: 'red',
      });
    },
  });
}

/**
 * Recompute implicit roles (all or for a specific rule)
 */
export function useRecomputeAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => implicitRolesApi.recomputeAll(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rules() });
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.all });
      notifications.show({
        title: 'Recomputation Triggered',
        message: data.message || 'Implicit role recomputation has been triggered',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to recompute implicit roles:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to recompute implicit roles',
        color: 'red',
      });
    },
  });
}

/**
 * Bulk activate implicit role rules
 */
export function useBulkActivateRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkRuleIdsRequest) =>
      implicitRolesApi.bulkActivate(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rules() });
      notifications.show({
        title: 'Success',
        message: `Activated ${data.totalProcessed} of ${data.totalRequested} rule(s)`,
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to activate rules:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to activate rules',
        color: 'red',
      });
    },
  });
}

/**
 * Bulk deactivate implicit role rules
 */
export function useBulkDeactivateRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkRuleIdsRequest) =>
      implicitRolesApi.bulkDeactivate(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: implicitRoleKeys.rules() });
      notifications.show({
        title: 'Success',
        message: `Deactivated ${data.totalProcessed} of ${data.totalRequested} rule(s)`,
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to deactivate rules:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to deactivate rules',
        color: 'red',
      });
    },
  });
}
