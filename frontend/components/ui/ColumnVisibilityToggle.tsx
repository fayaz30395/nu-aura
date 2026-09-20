'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ChevronDown, Columns3} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface ToggleableColumn {
  key: string;
  label: string;
  /** Columns the user cannot hide (e.g. the primary name column). */
  locked?: boolean;
}

interface ColumnVisibilityToggleProps {
  /** All columns that can be shown/hidden. */
  columns: ToggleableColumn[];
  /** Currently visible column keys. */
  visible: Set<string>;
  onChange: (visible: Set<string>) => void;
  /** localStorage key this table's preference is stored under. */
  storageKey: string;
  className?: string;
}

/** Reads a saved visible-column set for `storageKey`, falling back to all columns visible. */
export function loadColumnVisibility(storageKey: string, columns: ToggleableColumn[]): Set<string> {
  if (typeof window === 'undefined') return new Set(columns.map((c) => c.key));
  try {
    const raw = window.localStorage.getItem(`column-visibility:${storageKey}`);
    if (!raw) return new Set(columns.map((c) => c.key));
    const saved: string[] = JSON.parse(raw);
    // Guard against a stale saved list dropping a column that was added later.
    const savedSet = new Set(saved);
    return new Set(columns.filter((c) => c.locked || savedSet.has(c.key)).map((c) => c.key));
  } catch {
    return new Set(columns.map((c) => c.key));
  }
}

/**
 * Popover with a checkbox per column, letting the user hide/show table columns.
 * Preference persists to localStorage per `storageKey` (one entry per table per browser).
 */
export function ColumnVisibilityToggle({columns, visible, onChange, storageKey, className}: ColumnVisibilityToggleProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggleColumn = useCallback(
    (key: string) => {
      const next = new Set(visible);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onChange(next);
      try {
        window.localStorage.setItem(`column-visibility:${storageKey}`, JSON.stringify(Array.from(next)));
      } catch {
        // localStorage unavailable (private mode, quota) — preference just won't persist.
      }
    },
    [visible, onChange, storageKey]
  );

  return (
    <div ref={menuRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'press-scale inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
          'transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'min-h-[44px] min-w-[44px]',
          'border border-[var(--border-main)] bg-[var(--bg-surface)]',
          'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]',
          'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
          'motion-reduce:transition-none'
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Choose visible columns"
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-56 rounded-lg border shadow-[var(--shadow-dropdown)]',
            'border-[var(--border-main)] bg-[var(--bg-surface)]',
            'motion-scale-in origin-top-right'
          )}
          role="menu"
          aria-label="Column visibility"
        >
          <div className="py-1 max-h-72 overflow-y-auto">
            {columns.map((column) => {
              const isVisible = visible.has(column.key);
              return (
                <label
                  key={column.key}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                    'text-[var(--text-primary)] hover:bg-accent-50 dark:hover:bg-accent-900/20',
                    column.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                    'min-h-[44px]'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={column.locked}
                    onChange={() => !column.locked && toggleColumn(column.key)}
                    className="h-4 w-4 rounded border-[var(--border-strong)] accent-accent-700"
                  />
                  {column.label}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
