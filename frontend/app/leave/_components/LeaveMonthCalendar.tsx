'use client';

import {useMemo, useState} from 'react';
import {ActionIcon} from '@mantine/core';
import {format as formatDateFns} from 'date-fns';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {LeaveRequestLite, LeaveTypeLite} from './types';

const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Month grid that places the employee's non-rejected leave requests as day chips. */
export function LeaveMonthCalendar({requests, leaveTypes}: {requests: LeaveRequestLite[]; leaveTypes: LeaveTypeLite[]}) {
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const viewMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset],
  );

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first offset for the 1st of the month.
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const eventsByDay = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const r of requests) {
      if (r.status === 'REJECTED' || r.status === 'CANCELLED') continue;
      const start = new Date(r.startDate + 'T00:00:00');
      const end = new Date(r.endDate + 'T00:00:00');
      const type = leaveTypes.find((t) => t.id === r.leaveTypeId);
      const label = type?.leaveCode || type?.leaveName?.split(' ')[0] || 'Leave';
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          map.set(day, [...(map.get(day) ?? []), label]);
        }
      }
    }
    return map;
  }, [requests, leaveTypes, year, month]);

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="leave-calendar-title">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 id="leave-calendar-title" className="text-base font-semibold text-text-1">
            {formatDateFns(viewMonth, 'MMMM yyyy')}
          </h2>
          <p className="mt-1 text-xs text-text-3">Your time off this month</p>
        </div>
        <div className="flex items-center gap-1">
          <ActionIcon variant="subtle" color="gray" size={32} aria-label="Previous month" onClick={() => setMonthOffset((m) => m - 1)}>
            <ChevronLeft size={16} aria-hidden="true"/>
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size={32} aria-label="Next month" onClick={() => setMonthOffset((m) => m + 1)}>
            <ChevronRight size={16} aria-hidden="true"/>
          </ActionIcon>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOWS.map((d) => (
          <div key={d} className="pb-1 text-2xs font-medium text-text-3">{d}</div>
        ))}
        {cells.map((day, i) => {
          const isWeekend = i % 7 >= 5;
          const events = day != null ? eventsByDay.get(day) : undefined;
          const isToday = day != null && monthOffset === 0 && day === today.getDate();
          return (
            <div
              key={i}
              className={cn(
                'min-h-12 rounded-sm border p-1 sm:min-h-20',
                day == null ? 'border-transparent' : 'border-border-subtle',
                day != null && (isWeekend ? 'bg-surface-aura-sunken' : 'bg-surface-aura'),
              )}
            >
              {day != null && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    isToday ? 'inline-grid h-5 w-5 place-items-center rounded-full bg-accent font-semibold text-white' : 'text-text-2',
                  )}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {day}
                </span>
              )}
              {events && (
                <div className="mt-1 flex flex-col gap-1">
                  {events.slice(0, 3).map((label, j) => (
                    <span
                      key={j}
                      className="truncate rounded-sm bg-status-info-bg px-1 text-2xs font-medium text-status-info-fg"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
