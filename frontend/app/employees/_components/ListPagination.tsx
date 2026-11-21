'use client';

import {Button, Group} from '@mantine/core';
import {ChevronLeft, ChevronRight} from 'lucide-react';

interface ListPaginationProps {
  /** Zero-based page index. */
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
}

/** Page numbers to show: first, last, and a window around the current page (null = ellipsis). */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const last = Math.max(totalPages, 1) - 1;
  const keep = new Set([0, last, page - 1, page, page + 1].filter((n) => n >= 0 && n <= last));
  const out: (number | null)[] = [];
  let prev = -1;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push(null);
    out.push(n);
    prev = n;
  }
  return out;
}

/** Range text ("1–20 of 134") plus numbered pages and previous/next controls, per the DataTable contract. */
export function ListPagination({page, pageSize, totalElements, totalPages, onPageChange, label = 'Pagination'}: ListPaginationProps) {
  if (totalElements === 0) return null;
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalElements);

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs tabular-nums text-text-2">
        {start}–{end} of {totalElements}
      </p>
      <Group gap="xs">
        <Button
          variant="default"
          size="xs"
          leftSection={<ChevronLeft className="h-4 w-4"/>}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          Prev
        </Button>
        {pageWindow(page, totalPages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-text-3" aria-hidden="true">…</span>
          ) : (
            <Button
              key={n}
              variant={n === page ? 'filled' : 'default'}
              size="xs"
              onClick={() => onPageChange(n)}
              aria-label={`Page ${n + 1}`}
              aria-current={n === page ? 'page' : undefined}
            >
              {n + 1}
            </Button>
          )
        )}
        <Button
          variant="default"
          size="xs"
          rightSection={<ChevronRight className="h-4 w-4"/>}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
        >
          Next
        </Button>
      </Group>
    </nav>
  );
}
