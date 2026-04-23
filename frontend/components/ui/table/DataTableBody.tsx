'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {alignClass, type DataTableColumn, resolveCellValue} from './types';
import {useThemeVersion} from '@/lib/theme/ThemeVersionProvider';

export interface DataTableBodyProps<T> {
  data: T[];
  visibleColumns: DataTableColumn<T>[];
  selectable: boolean;
  selectedRows?: Set<string>;
  onSelectRow: (key: string) => void;
  getRowKey: (row: T, index: number) => string;
  actions?: (row: T) => React.ReactNode;
}

export function DataTableBody<T>({
                                   data,
                                   visibleColumns,
                                   selectable,
                                   selectedRows,
                                   onSelectRow,
                                   getRowKey,
                                   actions,
                                 }: DataTableBodyProps<T>) {
  const isV2 = useThemeVersion() === 'v2';
  const cellCls = isV2 ? 'px-4 py-1.5 h-9 text-sm text-[var(--text-primary)]' : 'px-4 py-2.5 h-11 text-sm text-[var(--text-primary)]';
  const chkCls = isV2 ? 'w-12 px-4 py-1.5 h-9 sticky left-0 z-10 bg-inherit' : 'w-12 px-4 py-2.5 h-11 sticky left-0 z-10 bg-inherit';
  const actCls = isV2 ? 'px-4 py-1.5 h-9 text-right whitespace-nowrap' : 'px-4 py-2.5 h-11 text-right whitespace-nowrap';
  return (
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
            isSelected && 'bg-accent-subtle'
          )}
        >
          {selectable && (
            <td className={chkCls}>
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectRow(key)}
                  className='h-4 w-4 rounded border-subtle text-accent focus-visible:ring-accent-700'
                  aria-label={`Select row ${key}`}
                />
              </div>
            </td>
          )}
          {visibleColumns.map((col, colIdx) => (
            <td
              key={col.key}
              className={cn(
                cellCls,
                alignClass(col.align),
                colIdx === 0 && !selectable && 'sticky left-0 z-10 bg-inherit'
              )}
              style={col.width ? {width: col.width, minWidth: col.width} : undefined}
            >
              {resolveCellValue(row, col)}
            </td>
          ))}
          {actions && (
            <td className={actCls}>
              {actions(row)}
            </td>
          )}
        </tr>
      );
    })}
    </tbody>
  );
}
