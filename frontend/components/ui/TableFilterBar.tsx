'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ─── Types ──────────────────────────────────────────────────────────────
export interface FilterField {
  /** Unique key for this filter, used as the key in the values record */
  key: string;
  /** Human-readable label shown above the field */
  label: string;
  /** Input type to render */
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number';
  /** Options for 'select' type fields */
  options?: Array<{ label: string; value: string }>;
  /** Placeholder text */
  placeholder?: string;
}

export interface TableFilterBarProps {
  /** Array of filter field definitions */
  filters: FilterField[];
  /** Current filter values keyed by FilterField.key */
  values: Record<string, string>;
  /** Called when a single filter value changes */
  onChange: (key: string, value: string) => void;
  /** Clears all filter values */
  onClear: () => void;
  /** Applies the current filter values (e.g., triggers a refetch) */
  onApply: () => void;
  /** Additional class names for the root element */
  className?: string;
}

// ─── Debounced Text Input ───────────────────────────────────────────────
interface DebouncedTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id: string;
  type?: 'text' | 'number';
}

const DebouncedTextInput: React.FC<DebouncedTextInputProps> = ({
  value,
  onChange,
  placeholder,
  id,
  type = 'text',
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 300);

  // Sync debounced value upstream
  React.useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
    // Only fire when the debounced value settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  // Sync external value changes (e.g., clear all)
  React.useEffect(() => {
    if (value !== localValue && value === '') {
      setLocalValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      id={id}
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-10 w-full rounded-md border px-3 text-sm',
        'bg-[var(--bg-surface)] text-[var(--text-primary)]',
        'border-[var(--border-main)]',
        'placeholder:text-[var(--text-muted)]',
        'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
        'transition-colors duration-150'
      )}
    />
  );
};

// ─── TableFilterBar ─────────────────────────────────────────────────────
export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  filters,
  values,
  onChange,
  onClear,
  onApply,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeFilterCount = useMemo(
    () => Object.values(values).filter((v) => v !== '' && v !== undefined).length,
    [values]
  );

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const renderField = useCallback(
    (filter: FilterField) => {
      const fieldId = `filter-${filter.key}`;
      const fieldValue = values[filter.key] ?? '';

      switch (filter.type) {
        case 'text':
          return (
            <DebouncedTextInput
              id={fieldId}
              value={fieldValue}
              onChange={(v) => onChange(filter.key, v)}
              placeholder={filter.placeholder ?? `Filter by ${filter.label.toLowerCase()}...`}
            />
          );

        case 'number':
          return (
            <DebouncedTextInput
              id={fieldId}
              type="number"
              value={fieldValue}
              onChange={(v) => onChange(filter.key, v)}
              placeholder={filter.placeholder ?? '0'}
            />
          );

        case 'select':
          return (
            <select
              id={fieldId}
              value={fieldValue}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className={cn(
                'h-10 w-full rounded-md border px-3 pr-9 text-sm appearance-none',
                'bg-[var(--bg-surface)] text-[var(--text-primary)]',
                'border-[var(--border-main)]',
                'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                'transition-colors duration-150'
              )}
            >
              <option value="">{filter.placeholder ?? `All ${filter.label}`}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );

        case 'date':
          return (
            <input
              id={fieldId}
              type="date"
              value={fieldValue}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className={cn(
                'h-10 w-full rounded-md border px-3 text-sm',
                'bg-[var(--bg-surface)] text-[var(--text-primary)]',
                'border-[var(--border-main)]',
                'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                'transition-colors duration-150'
              )}
            />
          );

        case 'dateRange': {
          const [start = '', end = ''] = fieldValue.split('|');
          return (
            <div className="flex items-center gap-2">
              <input
                id={`${fieldId}-start`}
                type="date"
                value={start}
                onChange={(e) => onChange(filter.key, `${e.target.value}|${end}`)}
                aria-label={`${filter.label} start date`}
                className={cn(
                  'h-10 w-full rounded-md border px-3 text-sm',
                  'bg-[var(--bg-surface)] text-[var(--text-primary)]',
                  'border-[var(--border-main)]',
                  'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                  'transition-colors duration-150'
                )}
              />
              <span className="text-caption shrink-0">to</span>
              <input
                id={`${fieldId}-end`}
                type="date"
                value={end}
                onChange={(e) => onChange(filter.key, `${start}|${e.target.value}`)}
                aria-label={`${filter.label} end date`}
                className={cn(
                  'h-10 w-full rounded-md border px-3 text-sm',
                  'bg-[var(--bg-surface)] text-[var(--text-primary)]',
                  'border-[var(--border-main)]',
                  'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                  'transition-colors duration-150'
                )}
              />
            </div>
          );
        }

        default:
          return null;
      }
    },
    [values, onChange]
  );

  return (
    <div
      className={cn(
        'rounded-lg border bg-[var(--bg-surface)] border-[var(--border-main)]',
        className
      )}
      role="search"
      aria-label="Table filters"
    >
      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="row-between px-4 py-3">
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex items-center gap-2 text-sm font-medium min-h-[44px]',
            'text-[var(--text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 rounded-md px-1'
          )}
          aria-expanded={!isCollapsed}
          aria-controls="table-filter-fields"
        >
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300">
              {activeFilterCount}
            </span>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
          )}
        </button>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className={cn(
                'flex items-center gap-1.5 px-3 min-h-[44px] text-sm rounded-md',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-secondary)]',
                'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
                'transition-colors duration-150'
              )}
            >
              <X className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={onApply}
            className={cn(
              'px-4 min-h-[44px] text-sm font-medium rounded-md',
              'bg-accent-700 text-white hover:bg-accent-800',
              'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
              'transition-colors duration-150'
            )}
          >
            Apply
          </button>
        </div>
      </div>

      {/* ── Filter fields (collapsible) ───────────────────────────── */}
      {!isCollapsed && (
        <div
          id="table-filter-fields"
          className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filters.map((filter) => (
            <div key={filter.key}>
              <label
                htmlFor={`filter-${filter.key}`}
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
              >
                {filter.label}
              </label>
              {renderField(filter)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableFilterBar;
