'use client';

import React, {useCallback, useMemo} from 'react';
import {cn} from '@/lib/utils';
import {Skeleton} from './Skeleton';
import {EmptyState} from './EmptyState';
import {ColumnVisibilityToggle} from './table/ColumnVisibilityToggle';
import {DataTableHeader} from './table/DataTableHeader';
import {DataTableBody} from './table/DataTableBody';
import {DataTablePagination} from './table/DataTablePagination';
import {BulkActionBar as BulkActionBarImpl} from './table/BulkActionBar';
import {useColumnVisibility} from './table/useColumnVisibility';
import type {DataTableProps, BulkActionBarProps, BulkAction, DataTableColumn} from './table/types';

export type {DataTableColumn, DataTableProps, BulkAction, BulkActionBarProps};
export const BulkActionBar = BulkActionBarImpl;

function DataTableInner<T>({
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
  const {visibilityMap, toggleColumnVisibility} = useColumnVisibility(columns, tableId);

  const visibleColumns = useMemo(
    () => columns.filter((col) => visibilityMap[col.key] !== false),
    [columns, visibilityMap]
  );

  const getRowKey = useCallback(
    (row: T, index: number): string => (rowKey ? rowKey(row) : String(index)),
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
    const next = new Set(selectedRows);
    if (allSelected) {
      allVisibleKeys.forEach((k) => next.delete(k));
    } else {
      allVisibleKeys.forEach((k) => next.add(k));
    }
    onSelectionChange(next);
  }, [allSelected, allVisibleKeys, onSelectionChange, selectedRows]);

  const handleSelectRow = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedRows);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelectionChange(next);
    },
    [onSelectionChange, selectedRows]
  );

  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;
      const nextDir: 'asc' | 'desc' =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, nextDir);
    },
    [onSort, sortKey, sortDirection]
  );

  const total = totalCount ?? data.length;

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex justify-end">
          <Skeleton width={120} height={36} className="rounded-lg"/>
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
          <table className="w-full">
            <thead>
            <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
              {visibleColumns.map((col) => (
                <th key={col.key} className="px-4 py-2">
                  <Skeleton height={14} width={80}/>
                </th>
              ))}
            </tr>
            </thead>
            <tbody>
            {Array.from({length: 5}).map((_, i) => (
              <tr key={i} className="border-b border-[var(--border-main)]">
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-4 py-4">
                    <Skeleton height={14}/>
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

  if (data.length === 0) {
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
          <EmptyState title={emptyMessage}/>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-end">
        <ColumnVisibilityToggle
          columns={columns}
          visibilityMap={visibilityMap}
          onToggle={toggleColumnVisibility}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <DataTableHeader
            visibleColumns={visibleColumns}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={handleSelectAll}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            hasActions={!!actions}
          />
          <DataTableBody
            data={data}
            visibleColumns={visibleColumns}
            selectable={selectable}
            selectedRows={selectedRows}
            onSelectRow={handleSelectRow}
            getRowKey={getRowKey}
            actions={actions}
          />
        </table>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export function DataTable<T>(props: DataTableProps<T>) {
  return <DataTableInner {...props}/>;
}

export default DataTable;
