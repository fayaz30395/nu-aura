'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {ChevronDown, Filter, Plus, Save, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {FilterRow} from './filter/FilterRow';
import {SavedPresetsMenu} from './filter/SavedPresetsMenu';
import {
  generateId,
  loadSavedPresets,
  saveSavedPresets,
  type AdvancedFilterPanelProps,
  type FilterCondition,
  type FilterField,
  type SavedFilterPreset,
} from './filter/types';

export type {AdvancedFilterPanelProps, FilterCondition, FilterField, SavedFilterPreset};

function isConditionComplete(c: FilterCondition): boolean {
  if (!c.field) return false;
  if (c.operator === 'isEmpty' || c.operator === 'isNotEmpty') return true;
  return c.value !== null && c.value !== '';
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
                                                                          fields,
                                                                          onApply,
                                                                          onClear,
                                                                          tableId,
                                                                        }) => {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    {id: generateId(), field: '', operator: 'equals', value: null},
  ]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>(() =>
    loadSavedPresets(tableId)
  );
  const [presetName, setPresetName] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const hasValidConditions = useMemo(
    () => conditions.some(isConditionComplete),
    [conditions]
  );

  const activeFilterCount = useMemo(
    () => conditions.filter((c) => c.field && c.value !== null && c.value !== '').length,
    [conditions]
  );

  const handleAddCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      {id: generateId(), field: '', operator: 'equals', value: null},
    ]);
  }, []);

  const handleRemoveCondition = useCallback((id: string) => {
    setConditions((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next.length === 0
        ? [{id: generateId(), field: '', operator: 'equals', value: null}]
        : next;
    });
  }, []);

  const handleConditionChange = useCallback((updated: FilterCondition) => {
    setConditions((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const handleApply = useCallback(() => {
    const valid = conditions.filter(isConditionComplete);
    onApply(valid, logic);
  }, [conditions, logic, onApply]);

  const handleClearAll = useCallback(() => {
    setConditions([{id: generateId(), field: '', operator: 'equals', value: null}]);
    setLogic('AND');
    setPresetName('');
    onClear();
  }, [onClear]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const valid = conditions.filter(isConditionComplete);
    if (valid.length === 0) return;

    const newPreset: SavedFilterPreset = {
      id: generateId(),
      name: presetName,
      conditions: valid,
      logic,
    };
    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    saveSavedPresets(tableId, updated);
    setPresetName('');
  }, [presetName, conditions, logic, savedPresets, tableId]);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = savedPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setConditions(preset.conditions.map((c) => ({...c, id: generateId()})));
    setLogic(preset.logic);
    setShowPresetMenu(false);
  }, [savedPresets]);

  const handleDeletePreset = useCallback((presetId: string) => {
    const updated = savedPresets.filter((p) => p.id !== presetId);
    setSavedPresets(updated);
    saveSavedPresets(tableId, updated);
  }, [savedPresets, tableId]);

  return (
    <div
      className="rounded-lg border bg-[var(--bg-surface)] border-[var(--border-main)]"
      role="search"
      aria-label="Advanced filters"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={cn(
            'flex items-center gap-2 h-9 text-sm font-medium cursor-pointer',
            'text-[var(--text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 rounded-md px-1'
          )}
          aria-expanded={!isCollapsed}
          aria-controls="advanced-filter-fields"
        >
          <Filter className="h-4 w-4 text-[var(--text-muted)]"/>
          Advanced Filters
          {activeFilterCount > 0 && (
            <span
              className='inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-accent-subtle text-accent'>
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

        <div className="flex items-center gap-2">
          <SavedPresetsMenu
            isOpen={showPresetMenu}
            onToggle={() => setShowPresetMenu((prev) => !prev)}
            savedPresets={savedPresets}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
          />

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className={cn(
                'flex items-center gap-1.5 h-9 px-3 text-sm rounded-md cursor-pointer',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-secondary)]',
                'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                'transition-colors duration-150'
              )}
            >
              <X className="h-3.5 w-3.5"/>
              Clear All
            </button>
          )}

          <button
            type="button"
            onClick={handleApply}
            disabled={!hasValidConditions}
            className={cn(
              'h-9 px-4 text-sm font-medium rounded-md cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
              'transition-colors duration-150',
              hasValidConditions
                ? 'bg-accent text-inverse hover:bg-accent-hover'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
            )}
          >
            Apply
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div
          id="advanced-filter-fields"
          className="px-4 pb-4 space-y-4 border-t border-[var(--border-main)]"
        >
          <div className="flex items-center gap-2 pt-4">
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
                      ? 'bg-accent text-inverse'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-xs text-[var(--text-muted)]">of the following:</span>
          </div>

          <div className="space-y-4">
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

          <button
            type="button"
            onClick={handleAddCondition}
            className={cn(
              'flex items-center gap-2 h-9 px-3 text-sm rounded-md cursor-pointer',
              'text-accent hover:bg-accent-subtle',
              'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
              'transition-colors duration-150'
            )}
          >
            <Plus className="h-4 w-4"/>
            Add Condition
          </button>

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
                    'h-9 w-full rounded-md border px-3 text-sm',
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
                  'h-9 px-4 text-sm font-medium rounded-md cursor-pointer',
                  'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                  'transition-colors duration-150',
                  presetName.trim()
                    ? 'bg-status-success-bg text-inverse hover:bg-status-success-bg'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                )}
              >
                <Save className="h-4 w-4 inline-block mr-1.5"/>
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
