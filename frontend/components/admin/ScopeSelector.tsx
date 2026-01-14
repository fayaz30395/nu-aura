'use client';

import React from 'react';
import {
  RoleScope,
  CustomTarget,
  TargetType,
  SCOPE_LABELS,
  SCOPE_DESCRIPTIONS,
} from '@/lib/types/roles';

interface ScopeSelectorProps {
  value: RoleScope;
  onChange: (scope: RoleScope) => void;
  customTargets?: CustomTarget[];
  onCustomTargetsChange?: (targets: CustomTarget[]) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

const SCOPE_ORDER: RoleScope[] = ['ALL', 'LOCATION', 'DEPARTMENT', 'TEAM', 'SELF', 'CUSTOM'];

export function ScopeSelector({
  value,
  onChange,
  customTargets = [],
  onCustomTargetsChange,
  disabled = false,
  showDescription = true,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SCOPE_ORDER.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => onChange(scope)}
            disabled={disabled}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              value === scope
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={SCOPE_DESCRIPTIONS[scope]}
          >
            {SCOPE_LABELS[scope]}
          </button>
        ))}
      </div>

      {showDescription && (
        <p className="text-sm text-gray-500">
          {SCOPE_DESCRIPTIONS[value]}
        </p>
      )}

      {value === 'CUSTOM' && onCustomTargetsChange && (
        <CustomTargetSelector
          targets={customTargets}
          onChange={onCustomTargetsChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

interface CustomTargetSelectorProps {
  targets: CustomTarget[];
  onChange: (targets: CustomTarget[]) => void;
  disabled?: boolean;
}

function CustomTargetSelector({ targets, onChange, disabled }: CustomTargetSelectorProps) {
  const [newTargetType, setNewTargetType] = React.useState<TargetType>('EMPLOYEE');
  const [newTargetId, setNewTargetId] = React.useState('');

  const addTarget = () => {
    if (!newTargetId.trim()) return;

    const newTarget: CustomTarget = {
      targetType: newTargetType,
      targetId: newTargetId.trim(),
    };

    // Avoid duplicates
    const exists = targets.some(
      t => t.targetType === newTarget.targetType && t.targetId === newTarget.targetId
    );

    if (!exists) {
      onChange([...targets, newTarget]);
    }

    setNewTargetId('');
  };

  const removeTarget = (index: number) => {
    onChange(targets.filter((_, i) => i !== index));
  };

  const getTargetTypeLabel = (type: TargetType) => {
    switch (type) {
      case 'EMPLOYEE': return 'Employee';
      case 'DEPARTMENT': return 'Department';
      case 'LOCATION': return 'Location';
    }
  };

  const getTargetTypeBadgeColor = (type: TargetType) => {
    switch (type) {
      case 'EMPLOYEE': return 'bg-blue-100 text-blue-800';
      case 'DEPARTMENT': return 'bg-green-100 text-green-800';
      case 'LOCATION': return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
      <p className="text-sm font-medium text-gray-700">Custom Targets</p>

      {/* Add new target */}
      <div className="flex gap-2">
        <select
          value={newTargetType}
          onChange={(e) => setNewTargetType(e.target.value as TargetType)}
          disabled={disabled}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="DEPARTMENT">Department</option>
          <option value="LOCATION">Location</option>
        </select>
        <input
          type="text"
          value={newTargetId}
          onChange={(e) => setNewTargetId(e.target.value)}
          placeholder="Enter ID..."
          disabled={disabled}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
        />
        <button
          type="button"
          onClick={addTarget}
          disabled={disabled || !newTargetId.trim()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Target list */}
      {targets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {targets.map((target, index) => (
            <span
              key={`${target.targetType}-${target.targetId}-${index}`}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getTargetTypeBadgeColor(target.targetType)}`}
            >
              <span className="font-medium">{getTargetTypeLabel(target.targetType)}:</span>
              <span>{target.targetName || target.targetId}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTarget(index)}
                  className="ml-1 hover:text-red-600"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No custom targets selected</p>
      )}
    </div>
  );
}

export default ScopeSelector;
