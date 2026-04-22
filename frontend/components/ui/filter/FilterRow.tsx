'use client';

import React from 'react';
import {Trash2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {FilterValueInput} from './FilterValueInput';
import {OPERATORS, type FilterCondition, type FilterField} from './types';

export interface FilterRowProps {
  condition: FilterCondition;
  fields: FilterField[];
  onConditionChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}

const selectClass = cn(
  'h-9 w-full rounded-md border px-3 text-sm appearance-none cursor-pointer',
  'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  'border-[var(--border-main)]',
  'focus:outline-none focus:ring-2 focus:ring-accent-700',
  'transition-colors duration-150',
  'pr-9'
);

export const FilterRow: React.FC<FilterRowProps> = ({
                                                      condition,
                                                      fields,
                                                      onConditionChange,
                                                      onRemove,
                                                    }) => {
  const selectedField = fields.find((f) => f.key === condition.field);
  const fieldType = selectedField?.type ?? 'text';
  const operators = OPERATORS[fieldType] ?? OPERATORS.text;

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
    onConditionChange({...condition, operator: newOperator, value: null});
  };

  const handleValueChange = (newValue: string | number | null) => {
    onConditionChange({...condition, value: newValue});
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Field
        </label>
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className={selectClass}
        >
          <option value="">Select field...</option>
          {fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      {condition.field && (
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            Operator
          </label>
          <select
            value={condition.operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className={selectClass}
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {condition.field && condition.operator && (
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            Value
          </label>
          <FilterValueInput
            condition={condition}
            selectedField={selectedField}
            onChange={handleValueChange}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'h-9 w-9 rounded-md cursor-pointer transition-colors flex items-center justify-center',
          'text-[var(--text-muted)] hover:text-status-danger-text hover:bg-status-danger-bg',
          'focus:outline-none focus:ring-2 focus:ring-danger-600 focus:ring-offset-2'
        )}
        aria-label="Remove filter"
      >
        <Trash2 className="h-4 w-4"/>
      </button>
    </div>
  );
};
