'use client';

import {useEffect, useMemo, useState} from 'react';
import {format as formatDateFns} from 'date-fns';
import {Stat} from '@/components/ui/Stat';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {AttendanceTimelineBar} from './AttendanceTimelineBar';
import {formatDuration} from './format';

const CARD = 'rounded-lg border border-border bg-card p-4';
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Stats {
  avgMinutes: number;
  totalMinutes: number;
  onTimePct: number;
  totalDays: number;
}

export function computeStats(records: AttendanceRecord[]): Stats {
  const work = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY');
  const totalMinutes = work.reduce((sum, r) => sum + (r.workDurationMinutes || 0), 0);
  const onTime = work.filter((r) => !r.isLate).length;
  return {
    totalMinutes,
    avgMinutes: work.length > 0 ? totalMinutes / work.length : 0,
    onTimePct: work.length > 0 ? Math.round((onTime / work.length) * 100) : 0,
    totalDays: work.length,
  };
}

export function MyAttendanceStats({stats, periodLabel}: {stats: Stats; periodLabel: string}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className={CARD}>
        <Stat label="Present days" value={<span className="tabular-nums">{stats.totalDays}</span>} caption={periodLabel}/>
      </div>
      <div className={CARD}>
        <Stat label="Total hours" value={<span className="tabular-nums">{formatDuration(stats.totalMinutes)}</span>} caption={periodLabel}/>
      </div>
      <div className={CARD}>
        <Stat label="Avg hours / day" value={<span className="tabular-nums">{formatDuration(stats.avgMinutes)}</span>} caption={periodLabel}/>
      </div>
      <div className={CARD}>
        <Stat label="On-time arrival" value={<span className="tabular-nums">{stats.onTimePct}%</span>} caption={periodLabel}/>
      </div>
    </div>
  );
}

/** This week's day strip, today's worked span, and the live clock. */
export function TodayTimingsCard({todayRecord}: {todayRecord: AttendanceRecord | undefined}) {
  const [liveTime, setLiveTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return WEEK_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {label, date: d, isToday: d.toDateString() === today.toDateString()};
    });
  }, []);

  return (
    <section aria-labelledby="my-attendance-today" className={`${CARD} flex flex-col gap-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="my-attendance-today" className="text-base font-semibold text-text-1">Today</h2>
          <p className="mt-1 text-xs text-text-3">{formatDateFns(liveTime, 'EEE, MMM d, yyyy')}</p>
        </div>
        <p data-testid="live-time" className="text-xl font-semibold tabular-nums text-text-1">
          {liveTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true})}
        </p>
      </div>

      <ol className="flex items-center gap-2" aria-label="This week">
        {weekDays.map((day) => (
          <li
            key={day.date.toISOString()}
            aria-current={day.isToday ? 'date' : undefined}
            aria-label={formatDateFns(day.date, 'EEEE')}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
              day.isToday ? 'bg-accent text-white' : 'bg-surface-aura-sunken text-text-3'
            }`}
          >
            {day.label}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-text-3">Today (flexible timings)</p>
        {todayRecord?.checkInTime ? (
          <>
            <AttendanceTimelineBar record={todayRecord}/>
            <p className="text-xs text-text-2">Duration: {formatDuration(todayRecord.workDurationMinutes)}</p>
          </>
        ) : (
          <p className="text-xs text-text-3">Not clocked in yet</p>
        )}
      </div>
    </section>
  );
}
