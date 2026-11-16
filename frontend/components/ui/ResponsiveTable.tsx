'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight} from 'lucide-react';
import {EmptyState} from './EmptyState';
import {QueryErrorCard} from './QueryState';
import {ResponsiveTableRowActions, type RowActionItem} from './ResponsiveTableRowActions';

export type {RowActionItem};

const ALIGN_CLASS = {left: 'text-left', right: 'text-right', center: 'text-center'} as const;
const JUSTIFY_CLASS = {left: undefined, right: 'justify-end', center: 'justify-center'} as const;

function resolveAlign<T>(column: Column<T>): 'left' | 'right' | 'center' {
  return column.align ?? (column.numeric ? 'right' : 'left');
}

// Column definition for the table
export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  // For mobile card view - which columns to show as primary/secondary
  mobileLabel?: string;
  mobilePriority?: 'primary' | 'secondary' | 'hidden';
  // Sorting
  sortable?: boolean;
  // Width class for desktop
  width?: string;
  // Horizontal alignment (default left)
  align?: 'left' | 'right' | 'center';
  // Shorthand: right-aligned with tabular-nums (explicit `align` wins)
  numeric?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  // Empty state
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  // Rendered instead of the plain emptyMessage when provided
  emptyState?: React.ReactNode;
  // Loading state
  isLoading?: boolean;
  // Error state: with no rows, renders QueryErrorCard instead of the empty state
  error?: boolean;
  onRetry?: () => void;
  // Sticky thead within the table's scroll container
  stickyHeader?: boolean;
  // Row height: 'comfortable' (48px, default) or 'compact' (36px)
  density?: 'comfortable' | 'compact';
  // Slot above the table for search + filters
  toolbar?: React.ReactNode;
  // Row actions
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  // Menu-based row actions; ignored when renderRowActions is also provided
  rowActionsMenu?: (row: T) => RowActionItem[];
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  // Selection
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  // Styling
  className?: string;
  rowClassName?: string | ((row: T) => string);
  // Mobile card customization
  renderMobileCard?: (row: T, columns: Column<T>[]) => React.ReactNode;
}

function ResponsiveTable<T>({
                              columns,
                              data,
                              keyExtractor,
                              emptyMessage = 'No data available',
                              emptyIcon,
                              emptyState,
                              isLoading = false,
                              error = false,
                              onRetry,
                              stickyHeader = false,
                              density = 'comfortable',
                              toolbar,
                              onRowClick,
                              renderRowActions,
                              rowActionsMenu,
                              sortColumn,
                              sortDirection,
                              onSort,
                              selectable = false,
                              selectedKeys = new Set(),
                              onSelectionChange,
                              className,
                              rowClassName,
                              renderMobileCard,
                            }: ResponsiveTableProps<T>) {
  const hasRowActions = Boolean(renderRowActions || rowActionsMenu);
  const cellPad = density === 'compact' ? 'px-4 py-1.5' : 'px-4 py-3';
  const rowHeight = density === 'compact' ? 'h-9' : 'h-12';
  const wrap = (body: React.ReactNode) => (
    <div className={cn('w-full', className)}>
      {toolbar && <div className="mb-3">{toolbar}</div>}
      {body}
    </div>
  );
  const renderActions = (row: T): React.ReactNode =>
    renderRowActions
      ? renderRowActions(row)
      : rowActionsMenu && <ResponsiveTableRowActions items={rowActionsMenu(row)}/>;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedKeys.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(keyExtractor)));
    }
  };

  const handleSelectRow = (key: string) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    onSelectionChange(newSelection);
  };

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    if (sortColumn !== column.key) {
      return <ChevronDown className="h-4 w-4 opacity-30 transition-opacity duration-[var(--motion-fast)]"/>;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp key="asc" className="h-4 w-4 motion-scale-in"/>
    ) : (
      <ChevronDown key="desc" className="h-4 w-4 motion-scale-in"/>
    );
  };

  // Skeleton loading
  if (isLoading) {
    return wrap(
      <div role="status" aria-busy="true" aria-label="Loading table">
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="skeleton-aura h-10 rounded-md mb-1"/>
          {[...Array(6)].map((_, i) => (
            <div key={i}
                 className={cn('flex items-center gap-4 border-b border-[var(--border-subtle)]', rowHeight, cellPad)}>
              <div className="skeleton-aura h-3 w-1/4 rounded"/>
              <div className="skeleton-aura h-3 w-1/5 rounded"/>
              <div className="skeleton-aura h-3 w-1/6 rounded"/>
              <div className="skeleton-aura h-3 w-1/12 rounded ml-auto"/>
            </div>
          ))}
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-aura h-28 rounded-xl"/>
          ))}
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // Error state — never rendered as an empty state
  if (error && data.length === 0) {
    return wrap(<QueryErrorCard onRetry={onRetry}/>);
  }

  // Empty state — delegates to canonical EmptyState component
  if (data.length === 0) {
    return wrap(
      emptyState ?? (
        <EmptyState
          icon={emptyIcon}
          title={emptyMessage}
        />
      )
    );
  }

  const mobileVisibleColumns = columns.filter(
    (c) => c.mobilePriority === 'primary' || c.mobilePriority === 'secondary'
  );

  return (
    <div className={cn('w-full', className)}>
      {toolbar && <div className="mb-3">{toolbar}</div>}
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-[var(--bg-surface)]' : undefined}>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {selectable && (
              <th scope="col" className="w-12 px-4 py-2.5 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={selectedKeys.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-surface-300 text-accent-700 focus:ring-accent-500"
                />
              </th>
            )}
            {columns.map((column) => {
              const align = resolveAlign(column);
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5',
                    ALIGN_CLASS[align],
                    'text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap transition-colors',
                    column.sortable && 'cursor-pointer select-none hover:bg-[var(--surface-hover)]',
                    column.width
                  )}
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  <div className={cn('flex items-center gap-1', JUSTIFY_CLASS[align])}>
                    {column.header}
                    {renderSortIcon(column)}
                  </div>
                </th>
              );
            })}
            {hasRowActions && (
              <th scope="col" className="w-16 px-4 py-2.5 text-right text-xs font-medium text-[var(--text-secondary)]">
                Actions
              </th>
            )}
          </tr>
          </thead>
          <tbody>
          {data.map((row) => {
            const key = keyExtractor(row);
            const isSelected = selectedKeys.has(key);
            const computedRowClassName = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;

            return (
              <tr
                key={key}
                className={cn(
                  'border-b border-[var(--border-subtle)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]',
                  rowHeight,
                  onRowClick && 'cursor-pointer',
                  isSelected && 'bg-[var(--accent-subtle)] hover:bg-[var(--accent-subtle)]',
                  computedRowClassName
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(key)}
                      aria-label={`Select row ${key}`}
                      className="rounded border-surface-300 text-accent-700 focus:ring-accent-500"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      cellPad,
                      'text-sm text-[var(--text-primary)]',
                      column.width,
                      resolveAlign(column) !== 'left' && ALIGN_CLASS[resolveAlign(column)],
                      column.numeric && 'tabular-nums'
                    )}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
                {hasRowActions && (
                  <td className={cn(cellPad, 'text-right')} onClick={(e) => e.stopPropagation()}>
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((row) => {
          const key = keyExtractor(row);
          const isSelected = selectedKeys.has(key);

          // Custom mobile card renderer
          if (renderMobileCard) {
            return (
              <div
                key={key}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick?.(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={onRowClick ? 'View row details' : undefined}
              >
                {renderMobileCard(row, columns)}
              </div>
            );
          }

          // Default mobile card
          return (
            <div
              key={key}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick ? 'View row details' : undefined}
              className={cn(
                'bg-[var(--bg-input)] rounded-lg border border-surface-200 dark:border-surface-700 p-4',
                'transition-colors duration-[var(--motion-base)]',
                onRowClick && 'cursor-pointer hover-lift press-scale',
                isSelected && 'ring-2 ring-accent-500 border-accent-500'
              )}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Primary column - shown prominently */}
                  {mobileVisibleColumns
                    .filter((c) => c.mobilePriority === 'primary')
                    .map((column) => (
                      <div key={column.key} className="mb-2">
                        <div className="font-medium text-surface-900 dark:text-surface-100">
                          {column.accessor(row)}
                        </div>
                      </div>
                    ))}

                  {/* Secondary columns - shown as label:value pairs */}
                  <div className="space-y-1.5">
                    {mobileVisibleColumns
                      .filter((c) => c.mobilePriority === 'secondary')
                      .map((column) => (
                        <div key={column.key} className="flex items-center gap-2 text-sm">
                          <span className="text-surface-500 dark:text-surface-400 shrink-0">
                            {column.mobileLabel || column.header}:
                          </span>
                          <span className="text-surface-700 dark:text-surface-300 truncate">
                            {column.accessor(row)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Actions and checkbox */}
                <div className="flex items-start gap-2 ml-4">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRow(key);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select row ${key}`}
                      className="rounded border-surface-300 text-accent-700 focus:ring-accent-500 mt-1"
                    />
                  )}
                  {hasRowActions && (
                    <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>{renderActions(row)}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Pagination component for the table
export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
                                  currentPage,
                                  totalPages,
                                  totalItems,
                                  pageSize,
                                  onPageChange,
                                  onPageSizeChange,
                                  pageSizeOptions = [10, 20, 50, 100],
                                }: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);
  const isFirst = currentPage === 0;
  const isLast = currentPage >= totalPages - 1;
  const navBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]';

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-t border-[var(--border-subtle)]"
    >
      <div className="text-[13px] text-[var(--text-secondary)] tabular-nums order-2 sm:order-1" aria-live="polite">
        {startItem}-{endItem} of {totalItems}
      </div>

      <div className="flex items-center gap-4 order-1 sm:order-2">
        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <label htmlFor="table-page-size" className="text-[13px] text-[var(--text-secondary)]">Rows per page</label>
            <select
              id="table-page-size"
              aria-label="Page size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-[13px] border border-[var(--border-main)] rounded-lg px-2 h-8 bg-[var(--bg-input)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPageChange(0)} disabled={isFirst} className={navBtn}
                  aria-label="First page">
            <ChevronsLeft className="h-4 w-4" aria-hidden="true"/>
          </button>
          <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={isFirst} className={navBtn}
                  aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden="true"/>
          </button>

          <span className="px-2 text-[13px] text-[var(--text-secondary)] tabular-nums">
            {currentPage + 1} / {totalPages || 1}
          </span>

          <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={isLast} className={navBtn}
                  aria-label="Next page">
            <ChevronRight className="h-4 w-4" aria-hidden="true"/>
          </button>
          <button type="button" onClick={() => onPageChange(totalPages - 1)} disabled={isLast} className={navBtn}
                  aria-label="Last page">
            <ChevronsRight className="h-4 w-4" aria-hidden="true"/>
          </button>
        </div>
      </div>
    </nav>
  );
}

export {ResponsiveTable};
export default ResponsiveTable;
