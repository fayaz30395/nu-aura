'use client';

import React from 'react';
import {ChevronDown, ChevronsUpDown, ChevronUp} from 'lucide-react';
import {cn} from '@/lib/utils';
import {alignClass, type DataTableColumn} from './types';

export interface DataTableHeaderProps<T> {
  visibleColumns: DataTableColumn<T>[];
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  hasActions: boolean;
}

function renderSortIcon<T>(
  col: DataTableColumn<T>,
  sortKey?: string,
  sortDirection?: 'asc' | 'desc'
) {
  if (!col.sortable) return null;
  if (sortKey !== col.key) {
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40"/>;
  }
  return sortDirection === 'asc' ? (
    <ChevronUp className='h-3.5 w-3.5 text-accent'/>
  ) : (
    <ChevronDown className='h-3.5 w-3.5 text-accent'/>
  );
}

export function DataTableHeader<T>({
                                     visibleColumns,
                                     selectable,
                                     allSelected,
                                     someSelected,
                                     onSelectAll,
                                     sortKey,
                                     sortDirection,
                                     onSort,
                                     hasActions,
                                   }: DataTableHeaderProps<T>) {
  return (
    <thead>
    <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
      {selectable && (
        <th className="w-12 px-4 py-2 text-left sticky left-0 z-10 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={onSelectAll}
              className='h-4 w-4 rounded border-subtle text-accent focus-visible:ring-accent-700'
              aria-label="Select all rows"
            />
          </div>
        </th>
      )}

      {visibleColumns.map((col, colIdx) => (
        <th
          key={col.key}
          className={cn(
            'px-4 py-2 text-xs font-semibold uppercase tracking-wider',
            'text-[var(--text-muted)]',
            alignClass(col.align),
            col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]',
            colIdx === 0 && !selectable && 'sticky left-0 z-10 bg-[var(--bg-secondary)]'
          )}
          style={col.width ? {width: col.width, minWidth: col.width} : undefined}
          onClick={() => col.sortable && onSort?.(col.key)}
          aria-sort={
            sortKey === col.key
              ? sortDirection === 'asc'
                ? 'ascending'
                : 'descending'
              : undefined
          }
        >
          <div className={cn('inline-flex items-center gap-1.5', alignClass(col.align))}>
            {col.label}
            {renderSortIcon(col, sortKey, sortDirection)}
          </div>
        </th>
      ))}

      {hasActions && (
        <th
          className="w-16 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Actions
        </th>
      )}
    </tr>
    </thead>
  );
}
