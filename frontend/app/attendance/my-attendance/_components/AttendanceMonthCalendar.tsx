'use client';

import {useMemo} from 'react';
import {format as formatDateFns} from 'date-fns';
import {ActionIcon} from '@mantine/core';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';

const LEGEND = [
  {label: 'Full day', className: 'border-status-ok-bd bg-status-ok-bg'},
  {label: 'Partial', className: 'border-status-warn-bd bg-status-warn-bg'},
  {label: 'Absent', className: 'border-status-err-bd bg-status-err-bg'},
  {label: 'Leave', className: 'border-status-info-bd bg-status-info-bg'},
  {label: 'Off / Holiday', className: 'border-border-subtle bg-surface-aura-sunken'},
];

function cellClass(record: AttendanceRecord | undefined, isWeekend: boolean): string {
  if (!record) return isWeekend ? 'bg-surface-aura-sunken' : 'bg-card';
  if (record.status === 'WEEKLY_OFF' || record.status === 'HOLIDAY') return 'bg-surface-aura-sunken';
  if (record.status === 'ABSENT') return 'bg-status-err-bg';
  if (record.status === 'ON_LEAVE' || record.status === 'LEAVE') return 'bg-status-info-bg';
  const hours = record.totalWorkHours || (record.workDurationMinutes ? record.workDurationMinutes / 60 : 0);
  return hours >= 8 ? 'bg-status-ok-bg' : 'bg-status-warn-bg';
}

interface Props {
  month: number;
  year: number;
  records: AttendanceRecord[];
  onPrev: () => void;
  onNext: () => void;
}

export function AttendanceMonthCalendar({month, year, records, onPrev, onNext}: Props) {
  const days = useMemo(() => {
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const today = new Date();
    const out: Array<{key: string; date: number; inMonth: boolean; isToday: boolean; isWeekend: boolean; record?: AttendanceRecord}> = [];

    for (let i = startDay - 1; i >= 0; i--) {
      out.push({key: `p${i}`, date: prevMonthLastDay - i, inMonth: false, isToday: false, isWeekend: false});
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(year, month, d).getDay();
      out.push({
        key: dateStr,
        date: d,
        inMonth: true,
        isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
        isWeekend: dow === 0 || dow === 6,
        record: records.find((r) => r.attendanceDate === dateStr),
      });
    }
    for (let i = 1; out.length < 42; i++) {
      out.push({key: `n${i}`, date: i, inMonth: false, isToday: false, isWeekend: false});
    }
    return out;
  }, [month, year, records]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onPrev} aria-label="Previous month">
          <ChevronLeft size={16}/>
        </ActionIcon>
        <h3 className="text-sm font-semibold text-text-1" aria-live="polite">
          {formatDateFns(new Date(year, month), 'MMMM yyyy')}
        </h3>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onNext} aria-label="Next month">
          <ChevronRight size={16}/>
        </ActionIcon>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Attendance calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} role="columnheader" className="py-2 text-center text-xs font-semibold text-text-3">{d}</div>
        ))}
        {days.map((day) => (
          <div
            key={day.key}
            role="gridcell"
            aria-current={day.isToday ? 'date' : undefined}
            className={`flex h-12 flex-col items-center justify-center rounded-md text-xs ${
              day.inMonth ? cellClass(day.record, day.isWeekend) : 'bg-surface-aura-sunken opacity-40'
            } ${day.isToday ? 'ring-2 ring-accent' : ''}`}
          >
            <span className={day.isToday ? 'font-semibold text-accent' : 'text-text-1'}>{day.date}</span>
            {day.inMonth && day.record?.totalWorkHours ? (
              <span className="tabular-nums text-text-3">{day.record.totalWorkHours.toFixed(1)}h</span>
            ) : null}
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4" aria-label="Legend">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1 text-xs text-text-3">
            <span aria-hidden="true" className={`h-3 w-3 rounded-sm border ${l.className}`}/>
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
