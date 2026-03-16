'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  WorkloadHeatmapRow,
  WorkloadHeatmapCell,
  formatAllocationPercentage,
  ALLOCATION_THRESHOLDS,
} from '@/lib/types/resource-management';
import { format, parseISO } from 'date-fns';
import { User, AlertTriangle } from 'lucide-react';

interface WorkloadHeatmapProps {
  data: WorkloadHeatmapRow[];
  onEmployeeClick?: (employeeId: string) => void;
  onCellClick?: (employeeId: string, weekStart: string) => void;
  className?: string;
}

/**
 * Visual heatmap showing employee workload across weeks
 * Rows = employees, Columns = weeks
 * Cell color intensity = allocation percentage
 */
export function WorkloadHeatmap({
  data,
  onEmployeeClick,
  onCellClick,
  className,
}: WorkloadHeatmapProps) {
  // Get unique weeks from the first row (all rows should have same weeks)
  const weeks = useMemo(() => {
    if (data.length === 0) return [];
    return data[0].cells.map((cell) => ({
      weekStart: cell.weekStart,
      weekEnd: cell.weekEnd,
      label: format(parseISO(cell.weekStart), 'MMM d'),
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-surface-300 dark:border-surface-600">
        <p className="text-surface-500 dark:text-surface-400">No workload data available</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="inline-block min-w-full">
        <table className="min-w-full border-separate border-spacing-0">
          {/* Header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[200px] bg-white px-4 py-3 text-left text-sm font-medium text-surface-700 dark:bg-surface-900 dark:text-surface-300">
                Employee
              </th>
              {weeks.map((week) => (
                <th
                  key={week.weekStart}
                  className="px-2 py-3 text-center text-xs font-medium text-surface-500 dark:text-surface-400"
                  style={{ minWidth: '60px' }}
                >
                  {week.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((row) => (
              <HeatmapRow
                key={row.employeeId}
                row={row}
                onEmployeeClick={onEmployeeClick}
                onCellClick={onCellClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-6">
        <div className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
          <span>Allocation:</span>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-surface-200 dark:bg-surface-700" />
            <span>0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-amber-300" />
            <span>50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-green-500" />
            <span>75-100%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-red-500" />
            <span>&gt;100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Single row in the heatmap
 */
function HeatmapRow({
  row,
  onEmployeeClick,
  onCellClick,
}: {
  row: WorkloadHeatmapRow;
  onEmployeeClick?: (employeeId: string) => void;
  onCellClick?: (employeeId: string, weekStart: string) => void;
}) {
  const hasOverAllocation = row.cells.some(
    (cell) => cell.allocation > ALLOCATION_THRESHOLDS.OVER_ALLOCATED
  );

  return (
    <tr className="group">
      {/* Employee info */}
      <td
        className={cn(
          'sticky left-0 z-10 bg-white px-4 py-2 dark:bg-surface-900',
          'border-b border-surface-100 dark:border-surface-800',
          onEmployeeClick && 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800'
        )}
        onClick={() => onEmployeeClick?.(row.employeeId)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-50">
                {row.employeeName}
              </p>
              {hasOverAllocation && (
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
              )}
            </div>
            <p className="truncate text-xs text-surface-500 dark:text-surface-400">
              {row.departmentName || row.employeeCode}
            </p>
          </div>
        </div>
      </td>

      {/* Week cells */}
      {row.cells.map((cell) => (
        <HeatmapCell
          key={cell.weekStart}
          cell={cell}
          onClick={() => onCellClick?.(row.employeeId, cell.weekStart)}
        />
      ))}
    </tr>
  );
}

/**
 * Single cell in the heatmap
 */
function HeatmapCell({
  cell,
  onClick,
}: {
  cell: WorkloadHeatmapCell;
  onClick?: () => void;
}) {
  const backgroundColor = getCellColor(cell.allocation);
  const textColor = cell.allocation > 60 ? 'text-white' : 'text-surface-700 dark:text-surface-300';

  return (
    <td
      className={cn(
        'border-b border-surface-100 px-1 py-2 dark:border-surface-800',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex h-10 items-center justify-center rounded transition-all',
          'hover:ring-2 hover:ring-primary-500 hover:ring-offset-1',
          textColor
        )}
        style={{ backgroundColor }}
        title={`${formatAllocationPercentage(cell.allocation)} - ${cell.projectCount} project(s)`}
      >
        <span className="text-xs font-medium">
          {cell.allocation > 0 ? Math.round(cell.allocation) : '-'}
        </span>
      </div>
    </td>
  );
}

/**
 * Get cell background color based on allocation percentage
 */
function getCellColor(allocation: number): string {
  if (allocation === 0) {
    return 'rgb(229, 231, 235)'; // surface-200
  }
  if (allocation <= 50) {
    // Blend from surface to amber
    const intensity = allocation / 50;
    return `rgba(251, 191, 36, ${0.3 + intensity * 0.4})`; // amber-400
  }
  if (allocation <= 75) {
    // Blend from amber to green
    const intensity = (allocation - 50) / 25;
    return `rgba(34, 197, 94, ${0.5 + intensity * 0.3})`; // green-500
  }
  if (allocation <= 100) {
    // Full green
    return `rgba(34, 197, 94, ${0.8 + ((allocation - 75) / 25) * 0.2})`; // green-500
  }
  // Over allocated - red
  const overIntensity = Math.min((allocation - 100) / 50, 1);
  return `rgba(239, 68, 68, ${0.7 + overIntensity * 0.3})`; // red-500
}

export default WorkloadHeatmap;
