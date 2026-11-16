'use client';

import {useMemo} from 'react';
import {format as formatDateFns} from 'date-fns';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {getLocalDateString} from '@/lib/utils/dateUtils';

type HeatCode = 'P' | 'R' | 'L' | 'A' | 'O';

const HEAT_META: Record<HeatCode, {cellClass: string; dotClass: string; label: string}> = {
  P: {cellClass: 'border-status-ok-bd bg-status-ok-bg text-status-ok-fg', dotClass: 'bg-status-ok-fg', label: 'Present'},
  R: {cellClass: 'border-status-info-bd bg-status-info-bg text-status-info-fg', dotClass: 'bg-status-info-fg', label: 'Remote'},
  L: {cellClass: 'border-status-warn-bd bg-status-warn-bg text-status-warn-fg', dotClass: 'bg-status-warn-fg', label: 'Leave'},
  A: {cellClass: 'border-status-err-bd bg-status-err-bg text-status-err-fg', dotClass: 'bg-status-err-fg', label: 'Absent'},
  O: {cellClass: 'border-border-subtle bg-surface-aura-sunken text-text-3', dotClass: 'bg-text-3', label: 'Off'},
};

const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

function statusToHeatCode(rec: AttendanceRecord | undefined): HeatCode {
  if (!rec) return 'A';
  switch (rec.status) {
    case 'PRESENT':
    case 'LATE':
    case 'HALF_DAY':
    case 'PENDING_REGULARIZATION':
      // WEB punches with no fixed location read as remote.
      return rec.checkInSource === 'REMOTE' || rec.checkInLocation === 'Remote' ? 'R' : 'P';
    case 'ON_LEAVE':
    case 'LEAVE':
      return 'L';
    case 'WEEKLY_OFF':
    case 'HOLIDAY':
      return 'O';
    case 'ABSENT':
    default:
      return 'A';
  }
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

interface WeeklyHeatmapProps {
  name: string;
  weeklyRecords: AttendanceRecord[];
  avgCheckIn: string;
  avgHours: string;
}

/** The signed-in employee's Mon–Fri attendance for the current week. */
export function WeeklyHeatmap({name, weeklyRecords, avgCheckIn, avgHours}: WeeklyHeatmapProps) {
  const {week, weekLabel} = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const byDate = new Map<string, AttendanceRecord>();
    for (const r of weeklyRecords) byDate.set(r.attendanceDate, r);

    const cells = HEAT_DAYS.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = getLocalDateString(d);
      return {day, date: key, code: d > now ? ('O' as HeatCode) : statusToHeatCode(byDate.get(key))};
    });
    return {
      week: cells,
      weekLabel: `This week · ${formatDateFns(monday, 'MMM d')} – ${formatDateFns(friday, 'MMM d')}`,
    };
  }, [weeklyRecords]);

  return (
    <section aria-labelledby="attendance-week-title" className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 id="attendance-week-title" className="text-base font-semibold text-text-1">My week</h2>
          <p className="mt-1 text-xs text-text-3">{weekLabel}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-4" aria-label="Legend">
          {(['P', 'R', 'L', 'A'] as HeatCode[]).map((k) => (
            <li key={k} className="inline-flex items-center gap-1 text-xs text-text-3">
              <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${HEAT_META[k].dotClass}`}/>
              {HEAT_META[k].label}
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto px-2 pb-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-xs text-text-3">
              <th scope="col" className="px-2 py-2 text-left font-semibold">Employee</th>
              {HEAT_DAYS.map((d) => (
                <th key={d} scope="col" className="px-2 py-2 text-center font-semibold">{d}</th>
              ))}
              <th scope="col" className="px-2 py-2 text-right font-semibold">Avg check-in</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Avg hrs</th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-14 border-t border-border-subtle">
              <td className="px-2">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                  >
                    {initials(name)}
                  </span>
                  <span className="text-sm font-medium text-text-1">{name}</span>
                </div>
              </td>
              {week.map((cell) => (
                <td key={cell.date} className="px-2 text-center">
                  <span
                    title={`${cell.date}: ${HEAT_META[cell.code].label}`}
                    aria-label={`${cell.day}: ${HEAT_META[cell.code].label}`}
                    className={`inline-grid h-7 w-9 place-items-center rounded-sm border text-xs font-semibold ${HEAT_META[cell.code].cellClass}`}
                  >
                    {cell.code}
                  </span>
                </td>
              ))}
              <td className="px-2 text-right text-xs tabular-nums text-text-2">{avgCheckIn}</td>
              <td className="px-2 text-right text-xs font-semibold tabular-nums text-text-1">{avgHours}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
