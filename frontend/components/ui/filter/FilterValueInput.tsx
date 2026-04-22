'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import type {FilterCondition, FilterField} from './types';

export interface FilterValueInputProps {
  condition: FilterCondition;
  selectedField?: FilterField;
  onChange: (value: string | number | null) => void;
}

const inputClass = cn(
  'h-9 w-full rounded-md border px-3 text-sm',
  'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  'border-[var(--border-main)]',
  'placeholder:text-[var(--text-muted)]',
  'focus:outline-none focus:ring-2 focus:ring-accent-700',
  'transition-colors duration-150'
);

function splitBy(value: string | number | null, delimiter: string): [string, string] {
  if (typeof value !== 'string' || !value.includes(delimiter)) return ['', ''];
  const parts = value.split(delimiter);
  return [parts[0] ?? '', parts[1] ?? ''];
}

export const FilterValueInput: React.FC<FilterValueInputProps> = ({
                                                                    condition,
                                                                    selectedField,
                                                                    onChange,
                                                                  }) => {
  if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
    return null;
  }

  const fieldType = selectedField?.type ?? 'text';

  if (fieldType === 'text') {
    return (
      <input
        type="text"
        value={condition.value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value..."
        className={inputClass}
      />
    );
  }

  if (fieldType === 'number') {
    if (condition.operator === 'between') {
      const [start, end] = splitBy(condition.value, '-');
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={start}
            onChange={(e) => onChange(`${e.target.value}-${end}`)}
            placeholder="From"
            className={cn(inputClass, 'flex-1')}
          />
          <span className="text-xs shrink-0">to</span>
          <input
            type="number"
            value={end}
            onChange={(e) => onChange(`${start}-${e.target.value}`)}
            placeholder="To"
            className={cn(inputClass, 'flex-1')}
          />
        </div>
      );
    }
    return (
      <input
        type="number"
        value={condition.value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder="Enter number..."
        className={inputClass}
      />
    );
  }

  if (fieldType === 'date') {
    if (condition.operator === 'between') {
      const [start, end] = splitBy(condition.value, '|');
      return (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={start}
            onChange={(e) => onChange(`${e.target.value}|${end}`)}
            className={cn(inputClass, 'flex-1')}
          />
          <span className="text-xs shrink-0">to</span>
          <input
            type="date"
            value={end}
            onChange={(e) => onChange(`${start}|${e.target.value}`)}
            className={cn(inputClass, 'flex-1')}
          />
        </div>
      );
    }
    return (
      <input
        type="date"
        value={condition.value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }

  if (fieldType === 'select') {
    return (
      <select
        value={condition.value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'pr-9 appearance-none cursor-pointer')}
      >
        <option value="">Select...</option>
        {selectedField?.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return null;
};
