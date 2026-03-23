'use client';

import React from 'react';
import {
  RoleScope,
  CustomTarget,
  SCOPE_LABELS,
  SCOPE_DESCRIPTIONS,
} from '@/lib/types/roles';
import { CustomTargetPicker } from './CustomTargetPicker';

interface ScopeSelectorProps {
  value: RoleScope;
  onChange: (scope: RoleScope) => void;
  customTargets?: CustomTarget[];
  onCustomTargetsChange?: (targets: CustomTarget[]) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

const SCOPE_ORDER: RoleScope[] = ['ALL', 'LOCATION', 'DEPARTMENT', 'TEAM', 'SELF', 'CUSTOM'];

// Scope icons for visual clarity
const SCOPE_ICONS: Record<RoleScope, React.ReactNode> = {
  ALL: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  LOCATION: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  DEPARTMENT: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  TEAM: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  SELF: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  CUSTOM: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
};

export function ScopeSelector({
  value,
  onChange,
  customTargets = [],
  onCustomTargetsChange,
  disabled = false,
  showDescription = true,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SCOPE_ORDER.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => onChange(scope)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
              value === scope
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-main)] hover:bg-[var(--bg-card-hover)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={SCOPE_DESCRIPTIONS[scope]}
          >
            {SCOPE_ICONS[scope]}
            <span>{SCOPE_LABELS[scope]}</span>
          </button>
        ))}
      </div>

      {showDescription && (
        <p className="text-sm text-[var(--text-muted)]">
          {SCOPE_DESCRIPTIONS[value]}
        </p>
      )}

      {value === 'CUSTOM' && onCustomTargetsChange && (
        <CustomTargetPicker
          targets={customTargets}
          onChange={onCustomTargetsChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export default ScopeSelector;
