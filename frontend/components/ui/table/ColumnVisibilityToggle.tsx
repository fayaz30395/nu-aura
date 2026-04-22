'use client';

import React, {useEffect, useRef, useState} from 'react';
import {Check, ChevronDown, Columns3} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {DataTableColumn} from './types';

interface ColumnVisibilityToggleProps<T> {
  columns: DataTableColumn<T>[];
  visibilityMap: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function ColumnVisibilityToggle<T>({
                                            columns,
                                            visibilityMap,
                                            onToggle,
                                          }: ColumnVisibilityToggleProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer',
          'border border-[var(--border-main)] bg-[var(--bg-surface)]',
          'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Toggle column visibility"
      >
        <Columns3 className="h-4 w-4"/>
        Columns
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}/>
      </button>
      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-56 rounded-lg border shadow-[var(--shadow-dropdown)]',
            'border-[var(--border-main)] bg-[var(--bg-surface)]',
            'animate-in fade-in-0 zoom-in-95'
          )}
          role="menu"
          aria-label="Column visibility options"
        >
          <div className="px-4 py-2 border-b border-[var(--border-main)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Toggle columns
            </span>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {columns.map((col) => {
              const isVisible = visibilityMap[col.key] !== false;
              return (
                <button
                  key={col.key}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isVisible}
                  onClick={() => onToggle(col.key)}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors cursor-pointer',
                    'text-[var(--text-primary)] hover:bg-accent-subtle'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isVisible
                        ? 'border-[var(--accent-primary)] bg-accent text-inverse'
                        : 'border-[var(--border-main)]'
                    )}
                  >
                    {isVisible && <Check className="h-3 w-3"/>}
                  </span>
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
