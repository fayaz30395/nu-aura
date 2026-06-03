'use client';

import React, {useMemo} from 'react';
import {cn} from '@/lib/utils';
import {
  ALLOCATION_THRESHOLDS,
  formatAllocationPercentage,
  WorkloadHeatmapCell,
  WorkloadHeatmapRow,
} from '@/lib/types/hrms/resource-management';
import {format, parseISO} from 'date-fns';
import {AlertTriangle, User} from 'lucide-react';
import {EmptyState, EmptyStatePresets} from '@/components/ui';

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
      <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--border-soft)]">
        <EmptyState
          {...EmptyStatePresets.noChartData}
          description="No workload data available."
          size="compact"
        />
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
            <th
              className="sticky left-0 z-10 min-w-[200px] bg-[var(--surface)] px-4 py-2 text-left text-aura-micro uppercase text-[var(--text-1)]">
              Employee
            </th>
            {weeks.map((week) => (
              <th
                key={week.weekStart}
                className="min-w-[60px] px-2 py-4 text-center text-aura-micro uppercase text-[var(--text-3)]"
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
      <div className="mt-6 flex items-center justify-end gap-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
          <span className="font-semibold">Allocation:</span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-[var(--r-xs)] bg-[var(--surface-sunken)]"/>
            <span>0%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-[var(--r-xs)] bg-[var(--warn-bg)]"/>
            <span>50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-[var(--r-xs)] bg-[var(--ok-bg)]"/>
            <span>75-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-[var(--r-xs)] bg-[var(--err-bg)]"/>
            <span>≥100%</span>
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
          'sticky left-0 z-10 bg-[var(--surface)] px-4 py-3',
          'border-b border-[var(--border-soft)]',
          onEmployeeClick && 'cursor-pointer hover:bg-[var(--surface-hover)] hover-lift transition-all'
        )}
        onClick={() => onEmployeeClick?.(row.employeeId)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <User className="h-4 w-4"/>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--text-1)]">
                {row.employeeName}
              </p>
              {hasOverAllocation && (
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--err-fg)]" aria-label="Over-allocated"/>
              )}
            </div>
            <p className="truncate text-xs text-[var(--text-3)]">
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
  const colorClass = getCellColorClass(cell.allocation);
  const textColor = cell.allocation > 60 ? 'text-white' : 'text-[var(--text-1)]';

  return (
    <td
      className={cn(
        'border-b border-[var(--border-soft)] px-1 py-2',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex h-10 items-center justify-center rounded-[var(--r-sm)] transition-all',
          'hover:ring-2 hover:ring-[var(--accent)] hover:ring-offset-1 focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          colorClass,
          textColor
        )}
        title={`${formatAllocationPercentage(cell.allocation)} - ${cell.projectCount} project(s)`}
        tabIndex={onClick ? 0 : -1}
        role={onClick ? 'button' : undefined}
        aria-label={`Workload ${Math.round(cell.allocation)}%: ${cell.projectCount} project(s)`}
      >
        <span className="text-xs font-semibold num">
          {cell.allocation > 0 ? Math.round(cell.allocation) : '-'}
        </span>
      </div>
    </td>
  );
}

/**
 * Get cell background color based on allocation percentage
 */
function getCellColorClass(allocation: number): string {
  if (allocation === 0) {
    return 'bg-[var(--surface-sunken)]';
  }
  if (allocation <= 50) {
    return 'bg-[var(--warn-bg)]';
  }
  if (allocation <= 75) {
    return 'bg-[var(--ok-bg)]';
  }
  if (allocation <= 100) {
    return 'bg-[var(--ok-fg)]';
  }
  return 'bg-[var(--err-fg)]';
}

export default WorkloadHeatmap;
