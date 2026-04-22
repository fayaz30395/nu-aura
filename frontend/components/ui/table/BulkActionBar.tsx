'use client';

import React from 'react';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {BulkActionBarProps} from './types';

const variantStyles: Record<string, string> = {
  primary:
    'bg-accent-700 hover:bg-accent-800 text-white focus-visible:ring-accent-700',
  danger:
    'bg-danger-600 hover:bg-danger-700 text-white focus-visible:ring-danger-600',
  secondary:
    'border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus-visible:ring-accent-700',
};

export function BulkActionBar({
                                selectedCount,
                                totalCount,
                                actions,
                                onClearSelection,
                              }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg px-4 py-2',
        'bg-accent-subtle border border-[var(--accent-primary)]'
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className='text-sm font-medium text-accent'>
        {selectedCount} of {totalCount} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              variantStyles[action.variant || 'secondary']
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}

        <button
          type="button"
          onClick={onClearSelection}
          className={cn(
            'inline-flex items-center gap-1 h-9 px-3 rounded-md text-sm transition-colors cursor-pointer',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
          )}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4"/>
          Clear
        </button>
      </div>
    </div>
  );
}
