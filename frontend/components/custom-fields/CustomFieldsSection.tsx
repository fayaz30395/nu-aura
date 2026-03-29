'use client';

import React, { useState, useEffect } from 'react';
import { customFieldsApi } from '@/lib/api/custom-fields';
import { logger } from '@/lib/utils/logger';
import {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValueRequest,
  EntityType,
} from '@/lib/types/custom-fields';
import CustomFieldRenderer from './CustomFieldRenderer';

interface CustomFieldsSectionProps {
  entityType: EntityType;
  entityId?: string;
  onChange?: (values: Record<string, CustomFieldValueRequest>) => void;
  disabled?: boolean;
  showGroupHeaders?: boolean;
  className?: string;
}

export default function CustomFieldsSection({
  entityType,
  entityId,
  onChange,
  disabled = false,
  showGroupHeaders = true,
  className = '',
}: CustomFieldsSectionProps) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, CustomFieldValueRequest>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomFields();
    // loadCustomFields is defined below and intentionally omitted: adding it would cause
    // an infinite loop since it re-creates on every render. Effect should only re-run
    // when the entity target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const loadCustomFields = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load field definitions
      const defs = await customFieldsApi.getDefinitionsByEntityType(entityType, true);
      setDefinitions(defs);

      // Load existing values if entityId is provided
      if (entityId) {
        const existingValues = await customFieldsApi.getFieldValues(entityType, entityId);
        setValues(existingValues);

        // Initialize field values from existing data
        const initialValues: Record<string, CustomFieldValueRequest> = {};
        existingValues.forEach((v) => {
          initialValues[v.fieldDefinitionId] = {
            fieldDefinitionId: v.fieldDefinitionId,
            value: v.value,
            currencyCode: v.currencyCode,
            fileValue: v.fileValue,
            fileName: v.fileName,
            fileSize: v.fileSize,
            fileMimeType: v.fileMimeType,
          };
        });
        setFieldValues(initialValues);
      }
    } catch (err) {
      logger.error('Failed to load custom fields:', err);
      setError('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    definitionId: string,
    value: string,
    additionalData?: {
      currencyCode?: string;
      fileValue?: string;
      fileName?: string;
      fileSize?: number;
      fileMimeType?: string;
    }
  ) => {
    const newFieldValues = {
      ...fieldValues,
      [definitionId]: {
        fieldDefinitionId: definitionId,
        value,
        ...additionalData,
      },
    };
    setFieldValues(newFieldValues);
    onChange?.(newFieldValues);
  };

  const getValueForDefinition = (definitionId: string): CustomFieldValue | null => {
    return values.find((v) => v.fieldDefinitionId === definitionId) || null;
  };

  // Group definitions by field group
  const groupedDefinitions = definitions.reduce((acc, def) => {
    const group = def.fieldGroup || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(def);
    return acc;
  }, {} as Record<string, CustomFieldDefinition[]>);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-[var(--bg-surface)] rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-[var(--bg-surface)] rounded w-1/3 mb-2"></div>
              <div className="h-10 bg-[var(--bg-surface)] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-danger-500 dark:text-danger-400 ${className}`}>
        {error}
      </div>
    );
  }

  if (definitions.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showGroupHeaders ? (
        Object.entries(groupedDefinitions).map(([group, defs]) => (
          <div key={group} className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border-main)] dark:border-surface-700">
              {group}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {defs
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((definition) => (
                  <CustomFieldRenderer
                    key={definition.id}
                    definition={definition}
                    value={getValueForDefinition(definition.id)}
                    onChange={(value, additionalData) =>
                      handleFieldChange(definition.id, value, additionalData)
                    }
                    disabled={disabled}
                  />
                ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {definitions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((definition) => (
              <CustomFieldRenderer
                key={definition.id}
                definition={definition}
                value={getValueForDefinition(definition.id)}
                onChange={(value, additionalData) =>
                  handleFieldChange(definition.id, value, additionalData)
                }
                disabled={disabled}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage custom field values
 */
export function useCustomFields(entityType: EntityType, entityId?: string) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // loadData is defined below; omitted to prevent infinite-loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const defs = await customFieldsApi.getDefinitionsByEntityType(entityType, true);
      setDefinitions(defs);

      if (entityId) {
        const existingValues = await customFieldsApi.getFieldValues(entityType, entityId);
        setValues(existingValues);
      }
    } catch (_err) {
      setError('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const saveValues = async (fieldValues: Record<string, CustomFieldValueRequest>) => {
    if (!entityId) return;

    try {
      setSaving(true);
      const valueRequests = Object.values(fieldValues).filter((v) => v.value || v.fileValue);

      if (valueRequests.length > 0) {
        await customFieldsApi.setFieldValues({
          entityType,
          entityId,
          values: valueRequests,
        });
      }

      await loadData();
    } catch (err) {
      setError('Failed to save custom fields');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    definitions,
    values,
    loading,
    saving,
    error,
    saveValues,
    refresh: loadData,
  };
}
