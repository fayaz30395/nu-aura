'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Filter,
  X,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

export interface FilterField {
  /** Unique key for this filter field */
  key: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Input type to render */
  type: 'text' | 'number' | 'date' | 'select';
  /** Options for 'select' type fields */
  options?: Array<{ value: string; label: string }>;
}

export interface FilterCondition {
  /** Unique ID for this condition row */
  id: string;
  /** Field key from FilterField */
  field: string;
  /** Operator: equals, contains, starts with, greater than, less than, between, is empty, is not empty */
  operator: string;
  /** Value entered by the user */
  value: string | number | null;
}

export interface SavedFilterPreset {
  /** Unique ID for the preset */
  id: string;
  /** Name of the preset (user-friendly) */
  name: string;
  /** Array of filter conditions */
  conditions: FilterCondition[];
  /** AND or OR logic */
  logic: 'AND' | 'OR';
}

export interface AdvancedFilterPanelProps {
  /** Array of available filter field definitions */
  fields: FilterField[];
  /** Callback when filters are applied with conditions and logic */
  onApply: (conditions: FilterCondition[], logic: 'AND' | 'OR') => void;
  /** Callback to clear all filters */
  onClear: () => void;
  /** Unique table ID for localStorage persistence */
  tableId: string;
}

// ─── Operator Definitions ────────────────────────────────────────────────

const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'between', label: 'Between' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
  ],
  date: [
    { value: 'equals', label: 'Equals' },
    { value: 'greaterThan', label: 'After' },
    { value: 'lessThan', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
  ],
};

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Generate a unique ID (simple UUID-like string)
 */
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get localStorage key for saved presets
 */
const getPresetStorageKey = (tableId: string): string => `filter-presets-${tableId}`;

/**
 * Load saved presets from localStorage
 */
const loadSavedPresets = (tableId: string): SavedFilterPreset[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getPresetStorageKey(tableId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Save presets to localStorage
 */
const saveSavedPresets = (tableId: string, presets: SavedFilterPreset[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getPresetStorageKey(tableId), JSON.stringify(presets));
  } catch {
    // localStorage quota exceeded or disabled
  }
};

// ─── FilterRow Component ────────────────────────────────────────────────

interface FilterRowProps {
  condition: FilterCondition;
  fields: FilterField[];
  onConditionChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}

const FilterRow: React.FC<FilterRowProps> = ({
  condition,
  fields,
  onConditionChange,
  onRemove,
}) => {
  const selectedField = fields.find((f) => f.key === condition.field);
  const fieldType = selectedField?.type ?? 'text';
  const operators = OPERATORS[fieldType] ?? OPERATORS.text;
  const operatorObj = operators.find((op) => op.value === condition.operator);

  const handleFieldChange = (newField: string) => {
    const field = fields.find((f) => f.key === newField);
    const newType = field?.type ?? 'text';
    const newOperators = OPERATORS[newType] ?? OPERATORS.text;
    onConditionChange({
      ...condition,
      field: newField,
      operator: newOperators[0].value,
      value: null,
    });
  };

  const handleOperatorChange = (newOperator: string) => {
    onConditionChange({
      ...condition,
      operator: newOperator,
      value: null,
    });
  };

  const handleValueChange = (newValue: string | number | null) => {
    onConditionChange({
      ...condition,
      value: newValue,
    });
  };

  // Render value input based on field type and operator
  const renderValueInput = () => {
    if (
      condition.operator === 'isEmpty' ||
      condition.operator === 'isNotEmpty'
    ) {
      return null;
    }

    const inputClass = cn(
      'h-10 w-full rounded-md border px-3 text-sm',
      'bg-[var(--bg-surface)] text-[var(--text-primary)]',
      'border-[var(--border-main)]',
      'placeholder:text-[var(--text-muted)]',
      'focus:outline-none focus:ring-2 focus:ring-accent-700',
      'transition-colors duration-150'
    );

    switch (fieldType) {
      case 'text':
        return (
          <input
            type="text"
            value={condition.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value..."
            className={inputClass}
          />
        );

      case 'number':
        return condition.operator === 'between' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={
                typeof condition.value === 'string' && condition.value.includes('-')
                  ? condition.value.split('-')[0]
                  : ''
              }
              onChange={(e) => {
                const end =
                  typeof condition.value === 'string' && condition.value.includes('-')
                    ? condition.value.split('-')[1]
                    : '';
                handleValueChange(`${e.target.value}-${end}`);
              }}
              placeholder="From"
              className={cn(inputClass, 'flex-1')}
            />
            <span className="text-xs shrink-0">to</span>
            <input
              type="number"
              value={
                typeof condition.value === 'string' && condition.value.includes('-')
                  ? condition.value.split('-')[1]
                  : ''
              }
              onChange={(e) => {
                const start =
                  typeof condition.value === 'string' && condition.value.includes('-')
                    ? condition.value.split('-')[0]
                    : '';
                handleValueChange(`${start}-${e.target.value}`);
              }}
              placeholder="To"
              className={cn(inputClass, 'flex-1')}
            />
          </div>
        ) : (
          <input
            type="number"
            value={condition.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="Enter number..."
            className={inputClass}
          />
        );

      case 'date':
        return condition.operator === 'between' ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={
                typeof condition.value === 'string' && condition.value.includes('|')
                  ? condition.value.split('|')[0]
                  : ''
              }
              onChange={(e) => {
                const end =
                  typeof condition.value === 'string' && condition.value.includes('|')
                    ? condition.value.split('|')[1]
                    : '';
                handleValueChange(`${e.target.value}|${end}`);
              }}
              className={cn(inputClass, 'flex-1')}
            />
            <span className="text-xs shrink-0">to</span>
            <input
              type="date"
              value={
                typeof condition.value === 'string' && condition.value.includes('|')
                  ? condition.value.split('|')[1]
                  : ''
              }
              onChange={(e) => {
                const start =
                  typeof condition.value === 'string' && condition.value.includes('|')
                    ? condition.value.split('|')[0]
                    : '';
                handleValueChange(`${start}|${e.target.value}`);
              }}
              className={cn(inputClass, 'flex-1')}
            />
          </div>
        ) : (
          <input
            type="date"
            value={condition.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className={inputClass}
          />
        );

      case 'select':
        return (
          <select
            value={condition.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className={cn(
              inputClass,
              'pr-9 appearance-none'
            )}
          >
            <option value="">Select...</option>
            {selectedField?.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-end gap-2">
      {/* Field Select */}
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Field
        </label>
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className={cn(
            'h-10 w-full rounded-md border px-3 text-sm appearance-none',
            'bg-[var(--bg-surface)] text-[var(--text-primary)]',
            'border-[var(--border-main)]',
            'focus:outline-none focus:ring-2 focus:ring-accent-700',
            'transition-colors duration-150',
            'pr-9'
          )}
        >
          <option value="">Select field...</option>
          {fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator Select */}
      {condition.field && (
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            Operator
          </label>
          <select
            value={condition.operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className={cn(
              'h-10 w-full rounded-md border px-3 text-sm appearance-none',
              'bg-[var(--bg-surface)] text-[var(--text-primary)]',
              'border-[var(--border-main)]',
              'focus:outline-none focus:ring-2 focus:ring-accent-700',
              'transition-colors duration-150',
              'pr-9'
            )}
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Value Input */}
      {condition.field && condition.operator && (
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            Value
          </label>
          {renderValueInput()}
        </div>
      )}

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'p-2 rounded-md cursor-pointer transition-colors',
          'text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20',
          'focus:outline-none focus:ring-2 focus:ring-danger-600 focus:ring-offset-2',
          'min-h-[40px] min-w-[40px] flex items-center justify-center'
        )}
        aria-label="Remove filter"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

// ─── AdvancedFilterPanel Component ──────────────────────────────────────

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  fields,
  onApply,
  onClear,
  tableId,
}) => {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    {
      id: generateId(),
      field: '',
      operator: 'equals',
      value: null,
    },
  ]);

  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>(() =>
    loadSavedPresets(tableId)
  );
  const [presetName, setPresetName] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Check if we have valid conditions to apply
  const hasValidConditions = useMemo(
    () =>
      conditions.some((c) => {
        if (!c.field) return false;
        if (c.operator === 'isEmpty' || c.operator === 'isNotEmpty') return true;
        return c.value !== null && c.value !== '';
      }),
    [conditions]
  );

  const activeFilterCount = useMemo(
    () => conditions.filter((c) => c.field && c.value !== null && c.value !== '').length,
    [conditions]
  );

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleAddCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      {
        id: generateId(),
        field: '',
        operator: 'equals',
        value: null,
      },
    ]);
  }, []);

  const handleRemoveCondition = useCallback((id: string) => {
    setConditions((prev) => {
      const newConditions = prev.filter((c) => c.id !== id);
      return newConditions.length === 0
        ? [
            {
              id: generateId(),
              field: '',
              operator: 'equals',
              value: null,
            },
          ]
        : newConditions;
    });
  }, []);

  const handleConditionChange = useCallback((updatedCondition: FilterCondition) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === updatedCondition.id ? updatedCondition : c))
    );
  }, []);

  const handleApply = useCallback(() => {
    const validConditions = conditions.filter(
      (c) => c.field && (c.operator === 'isEmpty' || c.operator === 'isNotEmpty' || c.value !== null)
    );
    onApply(validConditions, logic);
  }, [conditions, logic, onApply]);

  const handleClearAll = useCallback(() => {
    setConditions([
      {
        id: generateId(),
        field: '',
        operator: 'equals',
        value: null,
      },
    ]);
    setLogic('AND');
    setPresetName('');
    onClear();
  }, [onClear]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;

    const validConditions = conditions.filter(
      (c) => c.field && (c.operator === 'isEmpty' || c.operator === 'isNotEmpty' || c.value !== null)
    );

    if (validConditions.length === 0) return;

    const newPreset: SavedFilterPreset = {
      id: generateId(),
      name: presetName,
      conditions: validConditions,
      logic,
    };

    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    saveSavedPresets(tableId, updatedPresets);
    setPresetName('');
  }, [presetName, conditions, logic, savedPresets, tableId]);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = savedPresets.find((p) => p.id === presetId);
    if (!preset) return;

    setConditions(preset.conditions.map((c) => ({ ...c, id: generateId() })));
    setLogic(preset.logic);
    setShowPresetMenu(false);
  }, [savedPresets]);

  const handleDeletePreset = useCallback((presetId: string) => {
    const updatedPresets = savedPresets.filter((p) => p.id !== presetId);
    setSavedPresets(updatedPresets);
    saveSavedPresets(tableId, updatedPresets);
  }, [savedPresets, tableId]);

  return (
    <div
      className={cn(
        'rounded-lg border bg-[var(--bg-surface)] border-[var(--border-main)]'
      )}
      role="search"
      aria-label="Advanced filters"
    >
      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="row-between px-4 py-2">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={cn(
            'flex items-center gap-2 text-sm font-medium min-h-[44px]',
            'text-[var(--text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 rounded-md px-1',
            'cursor-pointer'
          )}
          aria-expanded={!isCollapsed}
          aria-controls="advanced-filter-fields"
        >
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--text-muted)] transition-transform',
              !isCollapsed && 'rotate-180'
            )}
          />
        </button>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-2">
          {/* Preset Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu((prev) => !prev)}
              className={cn(
                'flex items-center gap-1.5 px-4 min-h-[44px] text-sm rounded-md',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-secondary)]',
                'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                'transition-colors duration-150',
                'cursor-pointer'
              )}
              aria-haspopup="true"
              aria-expanded={showPresetMenu}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showPresetMenu && (
              <div
                className={cn(
                  'absolute right-0 z-50 mt-2 w-56 rounded-lg border shadow-[var(--shadow-dropdown)]',
                  'border-[var(--border-main)] bg-[var(--bg-surface)]',
                  'animate-in fade-in-0 zoom-in-95'
                )}
                role="menu"
              >
                {savedPresets.length > 0 && (
                  <>
                    <div className="px-4 py-2 border-b border-[var(--border-main)]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Saved Presets
                      </span>
                    </div>
                    <div className="py-1 max-h-64 overflow-y-auto">
                      {savedPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-secondary)] group"
                        >
                          <button
                            type="button"
                            onClick={() => handleLoadPreset(preset.id)}
                            className={cn(
                              'flex-1 text-left text-sm text-[var(--text-primary)]',
                              'focus:outline-none cursor-pointer'
                            )}
                          >
                            {preset.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(preset.id)}
                            className={cn(
                              'p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                              'text-[var(--text-muted)] hover:text-danger-600',
                              'cursor-pointer'
                            )}
                            aria-label={`Delete preset ${preset.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className={cn(
                'flex items-center gap-1.5 px-4 min-h-[44px] text-sm rounded-md',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-secondary)]',
                'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                'transition-colors duration-150',
                'cursor-pointer'
              )}
            >
              <X className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}

          <button
            type="button"
            onClick={handleApply}
            disabled={!hasValidConditions}
            className={cn(
              'px-4 min-h-[44px] text-sm font-medium rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
              'transition-colors duration-150',
              'cursor-pointer',
              hasValidConditions
                ? 'bg-accent-700 text-white hover:bg-accent-800'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
            )}
          >
            Apply
          </button>
        </div>
      </div>

      {/* ── Filter conditions (collapsible) ───────────────────────── */}
      {!isCollapsed && (
        <div
          id="advanced-filter-fields"
          className="px-4 pb-4 space-y-4 border-t border-[var(--border-main)]"
        >
          {/* Logic Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Match:</span>
            <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-secondary)]">
              {(['AND', 'OR'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLogic(l)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
                    logic === l
                      ? 'bg-accent-700 text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-xs text-[var(--text-muted)]">of the following:</span>
          </div>

          {/* Filter Rows */}
          <div className="space-y-3">
            {conditions.map((condition) => (
              <FilterRow
                key={condition.id}
                condition={condition}
                fields={fields}
                onConditionChange={handleConditionChange}
                onRemove={() => handleRemoveCondition(condition.id)}
              />
            ))}
          </div>

          {/* Add Condition Button */}
          <button
            type="button"
            onClick={handleAddCondition}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm rounded-md',
              'text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20',
              'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
              'transition-colors duration-150',
              'cursor-pointer'
            )}
          >
            <Plus className="h-4 w-4" />
            Add Condition
          </button>

          {/* Save Preset */}
          {hasValidConditions && (
            <div className="flex items-end gap-2 pt-2 border-t border-[var(--border-main)]">
              <div className="flex-1">
                <label htmlFor="preset-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Save as preset
                </label>
                <input
                  id="preset-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className={cn(
                    'h-10 w-full rounded-md border px-3 text-sm',
                    'bg-[var(--bg-surface)] text-[var(--text-primary)]',
                    'border-[var(--border-main)]',
                    'placeholder:text-[var(--text-muted)]',
                    'focus:outline-none focus:ring-2 focus:ring-accent-700',
                    'transition-colors duration-150'
                  )}
                />
              </div>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md min-h-[44px]',
                  'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                  'transition-colors duration-150',
                  'cursor-pointer',
                  presetName.trim()
                    ? 'bg-success-600 text-white hover:bg-success-700'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                )}
              >
                <Save className="h-4 w-4 inline-block mr-1.5" />
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
