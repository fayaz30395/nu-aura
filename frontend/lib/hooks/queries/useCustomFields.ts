'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { customFieldsApi } from '@/lib/api/custom-fields';
import {
  CustomFieldDefinition,
  CustomFieldDefinitionRequest,
  EntityType,
  Page,
} from '@/lib/types/custom-fields';

// Query key factory
const customFieldKeys = {
  all: ['customFields'] as const,
  definitions: () => [...customFieldKeys.all, 'definitions'] as const,
  definitionsList: (page: number, size: number) =>
    [...customFieldKeys.definitions(), 'list', { page, size }] as const,
  definitionDetail: (id: string) =>
    [...customFieldKeys.definitions(), 'detail', id] as const,
  definitionByCode: (code: string) =>
    [...customFieldKeys.definitions(), 'code', code] as const,
  byEntityType: (entityType: EntityType, activeOnly: boolean) =>
    [...customFieldKeys.definitions(), 'entityType', entityType, { activeOnly }] as const,
  grouped: (entityType: EntityType) =>
    [...customFieldKeys.definitions(), 'grouped', entityType] as const,
  listView: (entityType: EntityType) =>
    [...customFieldKeys.definitions(), 'listView', entityType] as const,
  fieldGroups: (entityType: EntityType) =>
    [...customFieldKeys.definitions(), 'groups', entityType] as const,
  search: (query: string, page: number, size: number) =>
    [...customFieldKeys.definitions(), 'search', query, { page, size }] as const,
};

// ========== Queries ==========

/**
 * Fetch all custom field definitions (paginated)
 */
export function useCustomFieldDefinitions(
  page: number = 0,
  size: number = 20
) {
  return useQuery({
    queryKey: customFieldKeys.definitionsList(page, size),
    queryFn: () => customFieldsApi.getAllDefinitions(page, size),
  });
}

/**
 * Fetch a single custom field definition by ID
 */
export function useCustomFieldDefinition(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: customFieldKeys.definitionDetail(id),
    queryFn: () => customFieldsApi.getDefinition(id),
    enabled: enabled && !!id,
  });
}

/**
 * Fetch a custom field definition by field code
 */
export function useCustomFieldDefinitionByCode(
  fieldCode: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customFieldKeys.definitionByCode(fieldCode),
    queryFn: () => customFieldsApi.getDefinitionByCode(fieldCode),
    enabled: enabled && !!fieldCode,
  });
}

/**
 * Fetch custom field definitions by entity type
 */
export function useCustomFieldDefinitionsByEntityType(
  entityType: EntityType,
  activeOnly: boolean = true,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customFieldKeys.byEntityType(entityType, activeOnly),
    queryFn: () =>
      customFieldsApi.getDefinitionsByEntityType(entityType, activeOnly),
    enabled: enabled && !!entityType,
  });
}

/**
 * Fetch custom field definitions grouped by field group
 */
export function useCustomFieldDefinitionsGrouped(
  entityType: EntityType,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customFieldKeys.grouped(entityType),
    queryFn: () => customFieldsApi.getDefinitionsGrouped(entityType),
    enabled: enabled && !!entityType,
  });
}

/**
 * Fetch custom field definitions for list view
 */
export function useCustomFieldDefinitionsForListView(
  entityType: EntityType,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customFieldKeys.listView(entityType),
    queryFn: () => customFieldsApi.getDefinitionsForListView(entityType),
    enabled: enabled && !!entityType,
  });
}

/**
 * Fetch field groups for an entity type
 */
export function useFieldGroups(
  entityType: EntityType,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customFieldKeys.fieldGroups(entityType),
    queryFn: () => customFieldsApi.getFieldGroups(entityType),
    enabled: enabled && !!entityType,
  });
}

/**
 * Search custom field definitions
 */
export function useSearchCustomFieldDefinitions(
  query: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: customFieldKeys.search(query, page, size),
    queryFn: () =>
      customFieldsApi.searchDefinitions(query, page, size),
    enabled: enabled && !!query,
  });
}

// ========== Mutations ==========

/**
 * Create a new custom field definition
 */
export function useCreateCustomFieldDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomFieldDefinitionRequest) =>
      customFieldsApi.createDefinition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.definitions() });
      notifications.show({
        title: 'Success',
        message: 'Custom field created successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to create custom field:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create custom field',
        color: 'red',
      });
    },
  });
}

/**
 * Update a custom field definition
 */
export function useUpdateCustomFieldDefinition(definitionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomFieldDefinitionRequest) =>
      customFieldsApi.updateDefinition(definitionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.definitions() });
      queryClient.invalidateQueries({
        queryKey: customFieldKeys.definitionDetail(definitionId),
      });
      notifications.show({
        title: 'Success',
        message: 'Custom field updated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to update custom field:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update custom field',
        color: 'red',
      });
    },
  });
}

/**
 * Delete a custom field definition
 */
export function useDeleteCustomFieldDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (definitionId: string) =>
      customFieldsApi.deleteDefinition(definitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.definitions() });
      notifications.show({
        title: 'Success',
        message: 'Custom field deleted successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to delete custom field:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete custom field',
        color: 'red',
      });
    },
  });
}

/**
 * Activate a custom field definition
 */
export function useActivateCustomFieldDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (definitionId: string) =>
      customFieldsApi.activateDefinition(definitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.definitions() });
      notifications.show({
        title: 'Success',
        message: 'Custom field activated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to activate custom field:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to activate custom field',
        color: 'red',
      });
    },
  });
}

/**
 * Deactivate a custom field definition
 */
export function useDeactivateCustomFieldDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (definitionId: string) =>
      customFieldsApi.deactivateDefinition(definitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.definitions() });
      notifications.show({
        title: 'Success',
        message: 'Custom field deactivated successfully',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('Failed to deactivate custom field:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to deactivate custom field',
        color: 'red',
      });
    },
  });
}
