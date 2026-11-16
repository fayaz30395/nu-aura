'use client';

import {Calendar as CalendarIcon, ChevronLeft, ChevronRight} from 'lucide-react';
import {Button, Card} from '@/components/ui';
import {cn} from '@/lib/utils';
import type {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {formatMonthYear} from '@/lib/utils/format/date';
import {getStatusClasses, StatusIcon} from './attendanceFormat';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = new Date(year, month, 1).getDay();

  const days: (Date | null)[] = Array.from({length: startingDayOfWeek}, () => null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

interface AttendanceCalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onSelect: (day: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  getAttendanceForDate: (date: Date) => AttendanceRecord | undefined;
}

export function AttendanceCalendar({
  currentDate,
  selectedDate,
  onSelect,
  onPrevious,
  onNext,
  getAttendanceForDate,
}: AttendanceCalendarProps) {
  const todayString = new Date().toDateString();

  return (
    <Card padding="sm" className="lg:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-text-1">
          <CalendarIcon className="h-4 w-4 text-text-3" aria-hidden="true"/>
          Attendance Calendar
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onPrevious} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" aria-hidden="true"/>
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold tabular-nums text-text-1" aria-live="polite">
            {formatMonthYear(currentDate)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label="Next month">
            <ChevronRight className="h-4 w-4" aria-hidden="true"/>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-center text-xs font-semibold text-text-3">
            {day}
          </div>
        ))}
        {getDaysInMonth(currentDate).map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square"/>;
          }

          const record = getAttendanceForDate(day);
          const isSelected = selectedDate?.toDateString() === day.toDateString();
          const isToday = todayString === day.toDateString();

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              className={cn(
                'aspect-square rounded-md border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isSelected ? 'border-accent bg-accent-subtle' : 'border-border hover:border-border-strong hover:bg-card-hover',
                isToday && 'ring-2 ring-accent'
              )}
            >
              <div className="flex h-full flex-col items-center justify-center gap-0.5">
                <span className={cn('text-xs font-medium tabular-nums', isToday ? 'text-accent' : 'text-text-2')}>
                  {day.getDate()}
                </span>
                {record && (
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full', getStatusClasses(record.status))}>
                    <StatusIcon status={record.status}/>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
