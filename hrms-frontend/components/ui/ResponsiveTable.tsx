'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

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
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  // Empty state
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  // Loading state
  isLoading?: boolean;
  // Row actions
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
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
  isLoading = false,
  onRowClick,
  renderRowActions,
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
      return <ChevronDown className="h-4 w-4 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Skeleton loading
  if (isLoading) {
    return (
      <div className={cn('w-full', className)}>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-surface-200 dark:bg-surface-700 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-100 dark:bg-surface-800 rounded" />
            ))}
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {emptyIcon && <div className="mb-4 text-surface-400">{emptyIcon}</div>}
          <p className="text-surface-500 dark:text-surface-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const primaryColumns = columns.filter((c) => c.mobilePriority !== 'hidden');
  const mobileVisibleColumns = columns.filter(
    (c) => c.mobilePriority === 'primary' || c.mobilePriority === 'secondary'
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
              {selectable && (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-surface-700 dark:text-surface-300',
                    column.sortable && 'cursor-pointer select-none hover:bg-surface-100 dark:hover:bg-surface-700/50',
                    column.width
                  )}
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
              {renderRowActions && (
                <th className="w-16 px-4 py-3 text-right text-sm font-semibold text-surface-700 dark:text-surface-300">
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
                    'border-b border-surface-100 dark:border-surface-800 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50',
                    isSelected && 'bg-primary-50 dark:bg-primary-900/20',
                    computedRowClassName
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                        className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-4 text-sm text-surface-900 dark:text-surface-100', column.width)}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {renderRowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((row) => {
          const key = keyExtractor(row);
          const isSelected = selectedKeys.has(key);

          // Custom mobile card renderer
          if (renderMobileCard) {
            return (
              <div key={key} onClick={() => onRowClick?.(row)}>
                {renderMobileCard(row, columns)}
              </div>
            );
          }

          // Default mobile card
          return (
            <div
              key={key}
              className={cn(
                'bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4',
                'transition-all duration-200',
                onRowClick && 'cursor-pointer active:scale-[0.98]',
                isSelected && 'ring-2 ring-primary-500 border-primary-500'
              )}
              onClick={() => onRowClick?.(row)}
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
                <div className="flex items-start gap-2 ml-3">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRow(key);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 mt-1"
                    />
                  )}
                  {renderRowActions && (
                    <div onClick={(e) => e.stopPropagation()}>{renderRowActions(row)}</div>
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
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-t border-surface-200 dark:border-surface-700">
      {/* Info */}
      <div className="text-sm text-surface-500 dark:text-surface-400 order-2 sm:order-1">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 order-1 sm:order-2">
        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-surface-500 dark:text-surface-400">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-sm border border-surface-300 dark:border-surface-600 rounded px-2 py-1 bg-white dark:bg-surface-800"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0}
            className="p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            <span className="text-sm">First</span>
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <span className="text-sm">Prev</span>
          </button>

          <span className="px-3 py-1 text-sm text-surface-700 dark:text-surface-300">
            {currentPage + 1} / {totalPages || 1}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <span className="text-sm">Next</span>
          </button>
          <button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className="p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Last page"
          >
            <span className="text-sm">Last</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export { ResponsiveTable };
export default ResponsiveTable;
