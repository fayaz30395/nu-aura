import type React from 'react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  visible?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyMessage?: string;
  tableId?: string;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  rowKey?: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  className?: string;
}

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

export function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

export function resolveCellValue<T>(row: T, col: DataTableColumn<T>): React.ReactNode {
  if (col.render) return col.render(row);
  const parts = col.key.split('.');
  let value: unknown = row;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return '';
    value = (value as Record<string, unknown>)[part];
  }
  if (value == null) return '';
  return String(value);
}
