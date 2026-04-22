'use client';

import {useCallback, useState} from 'react';
import type {DataTableColumn} from './types';

export function useColumnVisibility<T>(
  columns: DataTableColumn<T>[],
  tableId?: string
) {
  const storageKey = tableId ? `datatable-columns-${tableId}` : null;

  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored) as Record<string, boolean>;
      } catch {
        // ignore parse errors
      }
    }
    const map: Record<string, boolean> = {};
    columns.forEach((col) => {
      map[col.key] = col.visible !== false;
    });
    return map;
  });

  const toggleColumnVisibility = useCallback(
    (key: string) => {
      setVisibilityMap((prev) => {
        const next = {...prev, [key]: prev[key] === false};
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

  return {visibilityMap, toggleColumnVisibility};
}
