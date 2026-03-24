'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  EmployeeAvailability,
  ResourceAvailabilityDay,
  AvailabilityStatus,
  getAvailabilityStatusColor,
  getAvailabilityStatusLabel,
  AVAILABILITY_COLORS,
} from '@/lib/types/resource-management';
import { format, parseISO, isWeekend, isSameDay } from 'date-fns';
import { User } from 'lucide-react';

interface ResourceAvailabilityCalendarProps {
  employees: EmployeeAvailability[];
  startDate: string;
  endDate: string;
  onDayClick?: (employeeId: string, date: string) => void;
  onEmployeeClick?: (employeeId: string) => void;
  className?: string;
}

/**
 * Calendar grid showing employee availability across days
 * Rows = employees, Columns = days
 */
export function ResourceAvailabilityCalendar({
  employees,
  startDate,
  endDate,
  onDayClick,
  onEmployeeClick,
  className,
}: ResourceAvailabilityCalendarProps) {
  // Generate array of dates between start and end
  const dates = useMemo(() => {
    const result: Date[] = [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    let current = start;
    while (current <= end) {
      result.push(new Date(current));
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return result;
  }, [startDate, endDate]);

  if (employees.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-surface-300 dark:border-surface-600">
        <p className="text-surface-500 dark:text-surface-400">No employees to display</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="inline-block min-w-full">
        <table className="min-w-full border-separate border-spacing-0">
          {/* Header with dates */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[200px] bg-white px-4 py-3 text-left text-sm font-medium text-surface-700 dark:bg-surface-900 dark:text-surface-300">
                Employee
              </th>
              {dates.map((date) => {
                const isToday = isSameDay(date, new Date());
                const weekend = isWeekend(date);
                return (
                  <th
                    key={date.toISOString()}
                    className={cn(
                      'min-w-[40px] px-1 py-2 text-center text-xs',
                      weekend
                        ? 'bg-surface-50 text-surface-400 dark:bg-surface-800/50'
                        : 'text-surface-600 dark:text-surface-400',
                      isToday && 'bg-sky-50 dark:bg-sky-900/20'
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs uppercase">
                        {format(date, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                          isToday && 'bg-sky-700 text-white'
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body with employees */}
          <tbody>
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.employeeId}
                employee={employee}
                dates={dates}
                onDayClick={onDayClick}
                onEmployeeClick={onEmployeeClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
        {Object.entries(AVAILABILITY_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-surface-600 dark:text-surface-400">
              {getAvailabilityStatusLabel(status as AvailabilityStatus)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Single employee row in the calendar
 */
function EmployeeRow({
  employee,
  dates,
  onDayClick,
  onEmployeeClick,
}: {
  employee: EmployeeAvailability;
  dates: Date[];
  onDayClick?: (employeeId: string, date: string) => void;
  onEmployeeClick?: (employeeId: string) => void;
}) {
  // Create a map of date -> availability for quick lookup
  const availabilityMap = useMemo(() => {
    const map = new Map<string, ResourceAvailabilityDay>();
    employee.availability.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [employee.availability]);

  return (
    <tr className="group">
      {/* Employee info */}
      <td
        className={cn(
          'sticky left-0 z-10 bg-white px-4 py-2 dark:bg-surface-900',
          'border-b border-surface-100 dark:border-surface-800',
          onEmployeeClick && 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800'
        )}
        onClick={() => onEmployeeClick?.(employee.employeeId)}
      >
        <div className="flex items-center gap-2">
          {employee.avatarUrl ? (
            <Image
              src={employee.avatarUrl}
              alt={employee.employeeName}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-400">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-50">
              {employee.employeeName}
            </p>
            <p className="truncate text-xs text-surface-500 dark:text-surface-400">
              {employee.departmentName || employee.employeeCode}
            </p>
          </div>
        </div>
      </td>

      {/* Day cells */}
      {dates.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const availability = availabilityMap.get(dateStr);
        const weekend = isWeekend(date);

        return (
          <AvailabilityCell
            key={dateStr}
            date={dateStr}
            availability={availability}
            isWeekend={weekend}
            onClick={() => onDayClick?.(employee.employeeId, dateStr)}
          />
        );
      })}
    </tr>
  );
}

/**
 * Single day cell showing availability status
 */
function AvailabilityCell({
  date: _date,
  availability,
  isWeekend,
  onClick,
}: {
  date: string;
  availability?: ResourceAvailabilityDay;
  isWeekend: boolean;
  onClick?: () => void;
}) {
  const status = availability?.status || (isWeekend ? 'HOLIDAY' : 'AVAILABLE');
  const color = getAvailabilityStatusColor(status);
  const capacity = availability?.availableCapacity ?? (isWeekend ? 0 : 100);

  // Build tooltip
  const tooltip = useMemo(() => {
    if (!availability) {
      return isWeekend ? 'Weekend' : 'Available';
    }

    const parts = [getAvailabilityStatusLabel(status)];

    if (availability.holidayName) {
      parts.push(`Holiday: ${availability.holidayName}`);
    }

    availability.events.forEach((event) => {
      if (event.type === 'LEAVE_APPROVED' || event.type === 'LEAVE_PENDING') {
        parts.push(`${event.leaveStatus === 'PENDING' ? '(Pending) ' : ''}${event.leaveType || 'Leave'}`);
      } else if (event.type === 'PROJECT_ASSIGNMENT') {
        parts.push(`${event.projectName}: ${event.allocationPercentage}%`);
      }
    });

    return parts.join('\n');
  }, [availability, status, isWeekend]);

  return (
    <td
      className={cn(
        'border-b border-surface-100 px-0.5 py-1 dark:border-surface-800',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'mx-auto flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-all',
          'hover:ring-2 hover:ring-sky-500 hover:ring-offset-1',
          isWeekend && !availability?.isHoliday && 'opacity-50'
        )}
        style={{
          backgroundColor: status === 'AVAILABLE' ? 'transparent' : `${color}30`,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: status === 'AVAILABLE' ? 'transparent' : color,
        }}
        title={tooltip}
      >
        {/* Show capacity % if partially available */}
        {status === 'PARTIAL' && (
          <span className="text-xs" style={{ color }}>
            {Math.round(capacity)}
          </span>
        )}

        {/* Show indicator for leave */}
        {(status === 'ON_LEAVE') && (
          <span style={{ color }}>L</span>
        )}

        {/* Show indicator for holiday */}
        {status === 'HOLIDAY' && (
          <span className="text-surface-400">H</span>
        )}
      </div>
    </td>
  );
}

export default ResourceAvailabilityCalendar;
