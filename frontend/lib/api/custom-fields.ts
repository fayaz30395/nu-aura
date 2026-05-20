import {
  activateFieldDefinition as activateFieldDefinitionGenerated,
  createFieldDefinition as createFieldDefinitionGenerated,
  deactivateFieldDefinition as deactivateFieldDefinitionGenerated,
  deleteAllFieldValues as deleteAllFieldValuesGenerated,
  deleteFieldDefinition as deleteFieldDefinitionGenerated,
  deleteFieldValue as deleteFieldValueGenerated,
  getAllFieldDefinitions as getAllFieldDefinitionsGenerated,
  getEntityTypes as getEntityTypesGenerated,
  getFieldDefinition as getFieldDefinitionGenerated,
  getFieldDefinitionByCode as getFieldDefinitionByCodeGenerated,
  getFieldDefinitionsByEntityType as getFieldDefinitionsByEntityTypeGenerated,
  getFieldDefinitionsForListView as getFieldDefinitionsForListViewGenerated,
  getFieldDefinitionsGrouped as getFieldDefinitionsGroupedGenerated,
  getFieldGroups as getFieldGroupsGenerated,
  getFieldValueByCode as getFieldValueByCodeGenerated,
  getFieldValues as getFieldValuesGenerated,
  getFieldValuesGrouped as getFieldValuesGroupedGenerated,
  isFieldCodeAvailable as isFieldCodeAvailableGenerated,
  searchFieldDefinitions as searchFieldDefinitionsGenerated,
  setFieldValue as setFieldValueGenerated,
  setFieldValues as setFieldValuesGenerated,
  updateFieldDefinition as updateFieldDefinitionGenerated,
} from '@/lib/generated/api/custom-field-controller/custom-field-controller';
import {
  BulkCustomFieldValueRequest,
  CustomFieldDefinition,
  CustomFieldDefinitionRequest,
  CustomFieldValue,
  CustomFieldValueRequest,
  EntityType,
  Page,
} from '../types/core/custom-fields';

/**
 * T3-12 migration (wave 3): this file is now a thin facade over the orval-
 * generated `custom-field-controller` client. The public `customFieldsApi`
 * surface and return shapes are preserved so existing callers (custom-field
 * pages and admin components) do not change.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, so cookie
 * auth, CSRF double-submit, the 401 refresh mutex, and tenant headers all
 * continue to apply. The mutator unwraps to `.data`, so generated functions
 * return the response body directly.
 *
 * Hand-rolled domain types in `../types/core/custom-fields` remain the public
 * contract; generated response shapes are cast through `unknown` to match.
 */
export const customFieldsApi = {
  // ============================================
  // Field Definition APIs
  // ============================================

  /**
   * Create a new custom field definition
   */
  createDefinition: async (
    request: CustomFieldDefinitionRequest
  ): Promise<CustomFieldDefinition> => {
    const response = await createFieldDefinitionGenerated(
      request as unknown as Parameters<typeof createFieldDefinitionGenerated>[0]
    );
    return response as unknown as CustomFieldDefinition;
  },

  /**
   * Update a custom field definition
   */
  updateDefinition: async (
    id: string,
    request: CustomFieldDefinitionRequest
  ): Promise<CustomFieldDefinition> => {
    const response = await updateFieldDefinitionGenerated(
      id,
      request as unknown as Parameters<typeof updateFieldDefinitionGenerated>[1]
    );
    return response as unknown as CustomFieldDefinition;
  },

  /**
   * Get a custom field definition by ID
   */
  getDefinition: async (id: string): Promise<CustomFieldDefinition> => {
    const response = await getFieldDefinitionGenerated(id);
    return response as unknown as CustomFieldDefinition;
  },

  /**
   * Get a custom field definition by field code
   */
  getDefinitionByCode: async (fieldCode: string): Promise<CustomFieldDefinition> => {
    const response = await getFieldDefinitionByCodeGenerated(fieldCode);
    return response as unknown as CustomFieldDefinition;
  },

  /**
   * Get all custom field definitions (paginated)
   */
  getAllDefinitions: async (
    page = 0,
    size = 20
  ): Promise<Page<CustomFieldDefinition>> => {
    const response = await getAllFieldDefinitionsGenerated({
      pageable: {page, size},
    });
    return response as unknown as Page<CustomFieldDefinition>;
  },

  /**
   * Get custom field definitions by entity type
   */
  getDefinitionsByEntityType: async (
    entityType: EntityType,
    activeOnly = true
  ): Promise<CustomFieldDefinition[]> => {
    const response = await getFieldDefinitionsByEntityTypeGenerated(entityType, {
      activeOnly,
    });
    return response as unknown as CustomFieldDefinition[];
  },

  /**
   * Get custom field definitions grouped by field group
   */
  getDefinitionsGrouped: async (
    entityType: EntityType
  ): Promise<Record<string, CustomFieldDefinition[]>> => {
    const response = await getFieldDefinitionsGroupedGenerated(entityType);
    return response as unknown as Record<string, CustomFieldDefinition[]>;
  },

  /**
   * Get custom field definitions for list view
   */
  getDefinitionsForListView: async (
    entityType: EntityType
  ): Promise<CustomFieldDefinition[]> => {
    const response = await getFieldDefinitionsForListViewGenerated(entityType);
    return response as unknown as CustomFieldDefinition[];
  },

  /**
   * Search custom field definitions
   */
  searchDefinitions: async (
    query: string,
    page = 0,
    size = 20
  ): Promise<Page<CustomFieldDefinition>> => {
    const response = await searchFieldDefinitionsGenerated({
      query,
      pageable: {page, size},
    });
    return response as unknown as Page<CustomFieldDefinition>;
  },

  /**
   * Get field groups for an entity type
   */
  getFieldGroups: async (entityType: EntityType): Promise<string[]> => {
    const response = await getFieldGroupsGenerated(entityType);
    return response as unknown as string[];
  },

  /**
   * Deactivate a custom field definition
   */
  deactivateDefinition: async (id: string): Promise<void> => {
    await deactivateFieldDefinitionGenerated(id);
  },

  /**
   * Activate a custom field definition
   */
  activateDefinition: async (id: string): Promise<void> => {
    await activateFieldDefinitionGenerated(id);
  },

  /**
   * Delete a custom field definition
   */
  deleteDefinition: async (id: string): Promise<void> => {
    await deleteFieldDefinitionGenerated(id);
  },

  /**
   * Check if a field code is available
   */
  isFieldCodeAvailable: async (
    fieldCode: string,
    excludeId?: string
  ): Promise<boolean> => {
    const response = await isFieldCodeAvailableGenerated({fieldCode, excludeId});
    return response as unknown as boolean;
  },

  /**
   * Get all entity types
   */
  getEntityTypes: async (): Promise<EntityType[]> => {
    const response = await getEntityTypesGenerated();
    return response as unknown as EntityType[];
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
    const response = await setFieldValueGenerated(
      entityType,
      entityId,
      request as unknown as Parameters<typeof setFieldValueGenerated>[2]
    );
    return response as unknown as CustomFieldValue;
  },

  /**
   * Set multiple custom field values for an entity
   */
  setFieldValues: async (
    request: BulkCustomFieldValueRequest
  ): Promise<CustomFieldValue[]> => {
    const response = await setFieldValuesGenerated(
      request as unknown as Parameters<typeof setFieldValuesGenerated>[0]
    );
    return response as unknown as CustomFieldValue[];
  },

  /**
   * Get all custom field values for an entity
   */
  getFieldValues: async (
    entityType: EntityType,
    entityId: string
  ): Promise<CustomFieldValue[]> => {
    const response = await getFieldValuesGenerated(entityType, entityId);
    return response as unknown as CustomFieldValue[];
  },

  /**
   * Get custom field values grouped by field group
   */
  getFieldValuesGrouped: async (
    entityType: EntityType,
    entityId: string
  ): Promise<Record<string, CustomFieldValue[]>> => {
    const response = await getFieldValuesGroupedGenerated(entityType, entityId);
    return response as unknown as Record<string, CustomFieldValue[]>;
  },

  /**
   * Get a specific field value by field code
   */
  getFieldValueByCode: async (
    entityType: EntityType,
    entityId: string,
    fieldCode: string
  ): Promise<CustomFieldValue> => {
    const response = await getFieldValueByCodeGenerated(
      entityType,
      entityId,
      fieldCode
    );
    return response as unknown as CustomFieldValue;
  },

  /**
   * Delete a custom field value
   */
  deleteFieldValue: async (
    entityType: EntityType,
    entityId: string,
    fieldDefinitionId: string
  ): Promise<void> => {
    await deleteFieldValueGenerated(entityType, entityId, fieldDefinitionId);
  },

  /**
   * Delete all custom field values for an entity
   */
  deleteAllFieldValues: async (
    entityType: EntityType,
    entityId: string
  ): Promise<void> => {
    await deleteAllFieldValuesGenerated(entityType, entityId);
  },
};
