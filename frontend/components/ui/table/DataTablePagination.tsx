'use client';

import React from 'react';
import {ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const navBtn = cn(
  'h-9 w-9 flex items-center justify-center rounded-md transition-colors cursor-pointer',
  'hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2'
);

export function DataTablePagination({
                                      page,
                                      pageSize,
                                      total,
                                      onPageChange,
                                      onPageSizeChange,
                                    }: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, total);

  if (!onPageChange && !onPageSizeChange) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
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

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-body-muted">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'text-sm rounded-md px-2 py-1.5 cursor-pointer',
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

        {onPageChange && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(0)}
              disabled={page === 0}
              className={navBtn}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4"/>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className={navBtn}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4"/>
            </button>

            <span className="px-2 py-1 text-sm text-[var(--text-primary)] select-none">
              {page + 1} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className={navBtn}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4"/>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={navBtn}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
