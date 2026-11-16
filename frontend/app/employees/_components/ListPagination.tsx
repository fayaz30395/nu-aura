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

/** Range text ("1–20 of 134") plus previous/next controls, per the DataTable contract. */
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
        <span className="text-xs tabular-nums text-text-2">
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
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
