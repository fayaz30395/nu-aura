import { apiClient } from './client';
import {
  CustomFieldDefinition,
  CustomFieldDefinitionRequest,
  CustomFieldValue,
  CustomFieldValueRequest,
  BulkCustomFieldValueRequest,
  EntityType,
  Page,
} from '../types/custom-fields';

const BASE_URL = '/custom-fields';

export const customFieldsApi = {
  // ============================================
  // Field Definition APIs
  // ============================================

  /**
   * Create a new custom field definition
   */
  createDefinition: async (request: CustomFieldDefinitionRequest): Promise<CustomFieldDefinition> => {
    const response = await apiClient.post<CustomFieldDefinition>(`${BASE_URL}/definitions`, request);
    return response.data;
  },

  /**
   * Update a custom field definition
   */
  updateDefinition: async (id: string, request: CustomFieldDefinitionRequest): Promise<CustomFieldDefinition> => {
    const response = await apiClient.put<CustomFieldDefinition>(`${BASE_URL}/definitions/${id}`, request);
    return response.data;
  },

  /**
   * Get a custom field definition by ID
   */
  getDefinition: async (id: string): Promise<CustomFieldDefinition> => {
    const response = await apiClient.get<CustomFieldDefinition>(`${BASE_URL}/definitions/${id}`);
    return response.data;
  },

  /**
   * Get a custom field definition by field code
   */
  getDefinitionByCode: async (fieldCode: string): Promise<CustomFieldDefinition> => {
    const response = await apiClient.get<CustomFieldDefinition>(`${BASE_URL}/definitions/code/${fieldCode}`);
    return response.data;
  },

  /**
   * Get all custom field definitions (paginated)
   */
  getAllDefinitions: async (page = 0, size = 20): Promise<Page<CustomFieldDefinition>> => {
    const response = await apiClient.get<Page<CustomFieldDefinition>>(
      `${BASE_URL}/definitions?page=${page}&size=${size}`
    );
    return response.data;
  },

  /**
   * Get custom field definitions by entity type
   */
  getDefinitionsByEntityType: async (
    entityType: EntityType,
    activeOnly = true
  ): Promise<CustomFieldDefinition[]> => {
    const response = await apiClient.get<CustomFieldDefinition[]>(
      `${BASE_URL}/definitions/entity-type/${entityType}?activeOnly=${activeOnly}`
    );
    return response.data;
  },

  /**
   * Get custom field definitions grouped by field group
   */
  getDefinitionsGrouped: async (entityType: EntityType): Promise<Record<string, CustomFieldDefinition[]>> => {
    const response = await apiClient.get<Record<string, CustomFieldDefinition[]>>(
      `${BASE_URL}/definitions/entity-type/${entityType}/grouped`
    );
    return response.data;
  },

  /**
   * Get custom field definitions for list view
   */
  getDefinitionsForListView: async (entityType: EntityType): Promise<CustomFieldDefinition[]> => {
    const response = await apiClient.get<CustomFieldDefinition[]>(
      `${BASE_URL}/definitions/entity-type/${entityType}/list-view`
    );
    return response.data;
  },

  /**
   * Search custom field definitions
   */
  searchDefinitions: async (query: string, page = 0, size = 20): Promise<Page<CustomFieldDefinition>> => {
    const response = await apiClient.get<Page<CustomFieldDefinition>>(
      `${BASE_URL}/definitions/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`
    );
    return response.data;
  },

  /**
   * Get field groups for an entity type
   */
  getFieldGroups: async (entityType: EntityType): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`${BASE_URL}/definitions/entity-type/${entityType}/groups`);
    return response.data;
  },

  /**
   * Deactivate a custom field definition
   */
  deactivateDefinition: async (id: string): Promise<void> => {
    await apiClient.post(`${BASE_URL}/definitions/${id}/deactivate`);
  },

  /**
   * Activate a custom field definition
   */
  activateDefinition: async (id: string): Promise<void> => {
    await apiClient.post(`${BASE_URL}/definitions/${id}/activate`);
  },

  /**
   * Delete a custom field definition
   */
  deleteDefinition: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/definitions/${id}`);
  },

  /**
   * Check if a field code is available
   */
  isFieldCodeAvailable: async (fieldCode: string, excludeId?: string): Promise<boolean> => {
    const params = excludeId ? `?fieldCode=${fieldCode}&excludeId=${excludeId}` : `?fieldCode=${fieldCode}`;
    const response = await apiClient.get<boolean>(`${BASE_URL}/definitions/check-code${params}`);
    return response.data;
  },

  /**
   * Get all entity types
   */
  getEntityTypes: async (): Promise<EntityType[]> => {
    const response = await apiClient.get<EntityType[]>(`${BASE_URL}/entity-types`);
    return response.data;
  },

  // ============================================
  // Field Value APIs
  // ============================================

  /**
   * Set a custom field value for an entity
   */
  setFieldValue: async (
    entityType: EntityType,
    entityId: string,
    request: CustomFieldValueRequest
  ): Promise<CustomFieldValue> => {
    const response = await apiClient.post<CustomFieldValue>(
      `${BASE_URL}/values/${entityType}/${entityId}`,
      request
    );
    return response.data;
  },

  /**
   * Set multiple custom field values for an entity
   */
  setFieldValues: async (request: BulkCustomFieldValueRequest): Promise<CustomFieldValue[]> => {
    const response = await apiClient.post<CustomFieldValue[]>(`${BASE_URL}/values/bulk`, request);
    return response.data;
  },

  /**
   * Get all custom field values for an entity
   */
  getFieldValues: async (entityType: EntityType, entityId: string): Promise<CustomFieldValue[]> => {
    const response = await apiClient.get<CustomFieldValue[]>(`${BASE_URL}/values/${entityType}/${entityId}`);
    return response.data;
  },

  /**
   * Get custom field values grouped by field group
   */
  getFieldValuesGrouped: async (
    entityType: EntityType,
    entityId: string
  ): Promise<Record<string, CustomFieldValue[]>> => {
    const response = await apiClient.get<Record<string, CustomFieldValue[]>>(
      `${BASE_URL}/values/${entityType}/${entityId}/grouped`
    );
    return response.data;
  },

  /**
   * Get a specific field value by field code
   */
  getFieldValueByCode: async (
    entityType: EntityType,
    entityId: string,
    fieldCode: string
  ): Promise<CustomFieldValue> => {
    const response = await apiClient.get<CustomFieldValue>(
      `${BASE_URL}/values/${entityType}/${entityId}/field/${fieldCode}`
    );
    return response.data;
  },

  /**
   * Delete a custom field value
   */
  deleteFieldValue: async (
    entityType: EntityType,
    entityId: string,
    fieldDefinitionId: string
  ): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/values/${entityType}/${entityId}/field/${fieldDefinitionId}`);
  },

  /**
   * Delete all custom field values for an entity
   */
  deleteAllFieldValues: async (entityType: EntityType, entityId: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/values/${entityType}/${entityId}`);
  },
};
