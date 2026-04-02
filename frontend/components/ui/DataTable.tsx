'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTableColumn<T> {
  /** Unique key — also used to resolve the value from the row unless `render` is provided. */
  key: string;
  /** Display label shown in the header. */
  label: string;
  /** Whether this column is sortable. */
  sortable?: boolean;
  /** Default visibility. Defaults to `true`. */
  visible?: boolean;
  /** Custom cell renderer. */
  render?: (row: T) => React.ReactNode;
  /** CSS width value (e.g. `"200px"`, `"20%"`). */
  width?: string;
  /** Text alignment. */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  /** Column definitions. */
  columns: DataTableColumn<T>[];
  /** Row data. */
  data: T[];
  /** Total count of records (for server-side pagination). Defaults to `data.length`. */
  totalCount?: number;
  /** Current 0-indexed page. */
  page?: number;
  /** Page size. */
  pageSize?: number;
  /** Callback when page changes. */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes. */
  onPageSizeChange?: (size: number) => void;
  /** Callback when a sortable column header is clicked. */
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** Currently active sort key. */
  sortKey?: string;
  /** Currently active sort direction. */
  sortDirection?: 'asc' | 'desc';
  /** Show loading skeleton. */
  isLoading?: boolean;
  /** Message shown when data is empty. */
  emptyMessage?: string;
  /** Unique id for localStorage column-visibility persistence. */
  tableId?: string;
  /** Enable row selection checkboxes. */
  selectable?: boolean;
  /** Controlled set of selected row keys. */
  selectedRows?: Set<string>;
  /** Callback for selection changes. */
  onSelectionChange?: (selected: Set<string>) => void;
  /** Derive a unique string key from each row. */
  rowKey?: (row: T) => string;
  /** Render an actions cell for each row. */
  actions?: (row: T) => React.ReactNode;
  /** Extra class name on the wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// BulkActionBar
// ---------------------------------------------------------------------------

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
}

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
}

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
        'bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800'
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="text-sm font-medium text-accent-800 dark:text-accent-300">
        {selectedCount} of {totalCount} selected
      </span>

      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
              'min-h-[36px] min-w-[36px]',
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
            'inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors',
            'min-h-[36px] min-w-[36px]',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
          )}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColumnVisibilityToggle (internal)
// ---------------------------------------------------------------------------

interface ColumnVisibilityToggleProps<T> {
  columns: DataTableColumn<T>[];
  visibilityMap: Record<string, boolean>;
  onToggle: (key: string) => void;
}

function ColumnVisibilityToggle<T>({
  columns,
  visibilityMap,
  onToggle,
}: ColumnVisibilityToggleProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
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
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          'min-h-[44px] min-w-[44px]',
          'border border-[var(--border-main)] bg-[var(--bg-surface)]',
          'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Toggle column visibility"
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
                    'flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors',
                    'text-[var(--text-primary)] hover:bg-accent-50 dark:hover:bg-accent-900/20',
                    'min-h-[40px]'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isVisible
                        ? 'border-accent-700 bg-accent-700 text-white'
                        : 'border-[var(--border-main)]'
                    )}
                  >
                    {isVisible && <Check className="h-3 w-3" />}
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

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

function DataTable<T>({
  columns,
  data,
  totalCount,
  page = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortKey,
  sortDirection,
  isLoading = false,
  emptyMessage = 'No data found',
  tableId,
  selectable = false,
  selectedRows,
  onSelectionChange,
  rowKey,
  actions,
  className,
}: DataTableProps<T>) {
  // -----------------------------------------------------------------------
  // Column visibility with localStorage persistence
  // -----------------------------------------------------------------------

  const storageKey = tableId ? `datatable-columns-${tableId}` : null;

  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => {
    // Try to load from localStorage
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored) as Record<string, boolean>;
      } catch {
        // ignore parse errors
      }
    }
    // Default: use column.visible (default true)
    const map: Record<string, boolean> = {};
    columns.forEach((col) => {
      map[col.key] = col.visible !== false;
    });
    return map;
  });

  const toggleColumnVisibility = useCallback(
    (key: string) => {
      setVisibilityMap((prev) => {
        const next = { ...prev, [key]: prev[key] === false };
        if (storageKey && typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // quota exceeded — ignore
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  const visibleColumns = useMemo(
    () => columns.filter((col) => visibilityMap[col.key] !== false),
    [columns, visibilityMap]
  );

  // -----------------------------------------------------------------------
  // Selection helpers
  // -----------------------------------------------------------------------

  const getRowKey = useCallback(
    (row: T, index: number): string => {
      if (rowKey) return rowKey(row);
      // Fallback: use index (not ideal but safe)
      return String(index);
    },
    [rowKey]
  );

  const allVisibleKeys = useMemo(
    () => new Set(data.map((row, i) => getRowKey(row, i))),
    [data, getRowKey]
  );

  const allSelected = allVisibleKeys.size > 0 && selectedRows
    ? [...allVisibleKeys].every((k) => selectedRows.has(k))
    : false;

  const someSelected = selectedRows ? selectedRows.size > 0 && !allSelected : false;

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      // Deselect all visible
      const next = new Set(selectedRows);
      allVisibleKeys.forEach((k) => next.delete(k));
      onSelectionChange(next);
    } else {
      // Select all visible
      const next = new Set(selectedRows);
      allVisibleKeys.forEach((k) => next.add(k));
      onSelectionChange(next);
    }
  }, [allSelected, allVisibleKeys, onSelectionChange, selectedRows]);

  const handleSelectRow = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedRows);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [onSelectionChange, selectedRows]
  );

  // -----------------------------------------------------------------------
  // Sort handler
  // -----------------------------------------------------------------------

  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;
      const nextDir: 'asc' | 'desc' =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, nextDir);
    },
    [onSort, sortKey, sortDirection]
  );

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------

  const total = totalCount ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, total);

  // -----------------------------------------------------------------------
  // Resolve cell value
  // -----------------------------------------------------------------------

  const resolveCellValue = (row: T, col: DataTableColumn<T>): React.ReactNode => {
    if (col.render) return col.render(row);
    // Resolve nested key
    const parts = col.key.split('.');
    let value: unknown = row;
    for (const part of parts) {
      if (value == null || typeof value !== 'object') return '';
      value = (value as Record<string, unknown>)[part];
    }
    if (value == null) return '';
    return String(value);
  };

  // -----------------------------------------------------------------------
  // Render sort icon
  // -----------------------------------------------------------------------

  const renderSortIcon = (col: DataTableColumn<T>) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 text-accent-700" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-accent-700" />
    );
  };

  // -----------------------------------------------------------------------
  // Alignment class helper
  // -----------------------------------------------------------------------
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Column toggle placeholder */}
        <div className="flex justify-end">
          <Skeleton width={120} height={40} className="rounded-lg" />
        </div>
        {/* Table skeleton */}
        <div className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-4 py-2">
                    <Skeleton height={14} width={80} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-main)]">
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-4">
                      <Skeleton height={14} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  if (data.length === 0 && !isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex justify-end">
          <ColumnVisibilityToggle
            columns={columns}
            visibilityMap={visibilityMap}
            onToggle={toggleColumnVisibility}
          />
        </div>
        <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
          <EmptyState title={emptyMessage} />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className={cn('space-y-2', className)}>
      {/* Toolbar: column toggle */}
      <div className="flex justify-end">
        <ColumnVisibilityToggle
          columns={columns}
          visibilityMap={visibilityMap}
          onToggle={toggleColumnVisibility}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
              {/* Selection checkbox header */}
              {selectable && (
                <th className="w-12 px-4 py-2 text-left sticky left-0 z-10 bg-[var(--bg-secondary)]">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-surface-300 text-accent-700 focus-visible:ring-accent-700"
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
                    // Sticky first column
                    colIdx === 0 && !selectable && 'sticky left-0 z-10 bg-[var(--bg-secondary)]',
                    colIdx === 0 && selectable && ''
                  )}
                  style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
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
                    {renderSortIcon(col)}
                  </div>
                </th>
              ))}

              {/* Actions header */}
              {actions && (
                <th className="w-16 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {data.map((row, rowIdx) => {
              const key = getRowKey(row, rowIdx);
              const isSelected = selectedRows?.has(key) ?? false;

              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-[var(--border-main)] transition-colors',
                    'hover:bg-[var(--bg-secondary)]',
                    isSelected && 'bg-accent-50 dark:bg-accent-900/10'
                  )}
                >
                  {/* Selection checkbox */}
                  {selectable && (
                    <td className="w-12 px-4 py-2.5 h-11 sticky left-0 z-10 bg-inherit">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="h-4 w-4 rounded border-surface-300 text-accent-700 focus-visible:ring-accent-700"
                          aria-label={`Select row ${key}`}
                        />
                      </div>
                    </td>
                  )}

                  {visibleColumns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-2.5 h-11 text-sm text-[var(--text-primary)]',
                        alignClass(col.align),
                        colIdx === 0 && !selectable && 'sticky left-0 z-10 bg-inherit'
                      )}
                      style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    >
                      {resolveCellValue(row, col)}
                    </td>
                  ))}

                  {/* Actions */}
                  {actions && (
                    <td className="px-4 py-2.5 h-11 text-right whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(onPageChange || onPageSizeChange) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          {/* Info */}
          <div className="text-body-muted">
            {total > 0 ? (
              <>
                Showing <span className="font-medium text-[var(--text-primary)]">{startItem}</span>
                {' '}to{' '}
                <span className="font-medium text-[var(--text-primary)]">{endItem}</span>
                {' '}of{' '}
                <span className="font-medium text-[var(--text-primary)]">{total}</span> results
              </>
            ) : (
              'No results'
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Page size */}
            {onPageSizeChange && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-body-muted">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className={cn(
                    'text-sm rounded-md px-2 py-1.5',
                    'border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700'
                  )}
                  aria-label="Rows per page"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Page navigation */}
            {onPageChange && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPageChange(0)}
                  disabled={page === 0}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    'min-h-[44px] min-w-[44px] flex items-center justify-center',
                    'hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
                  )}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 0}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    'min-h-[44px] min-w-[44px] flex items-center justify-center',
                    'hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
                  )}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-2 py-1 text-sm text-[var(--text-primary)] select-none">
                  {page + 1} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    'min-h-[44px] min-w-[44px] flex items-center justify-center',
                    'hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
                  )}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    'min-h-[44px] min-w-[44px] flex items-center justify-center',
                    'hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
                  )}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
export default DataTable;
