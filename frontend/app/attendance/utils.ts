/**
 * Attendance page utility functions — extracted from page.tsx (Loop 3 FE-016).
 * Pure functions with no React dependencies.
 */

export const STANDARD_WORK_HOURS = 8;
export const GRACE_PERIOD_MINS = 15;

/** Calculate hours between two ISO timestamps (uses Date.now() if no checkout). */
export function calculateHours(checkInStr?: string, checkOutStr?: string): number {
  if (!checkInStr) return 0;
  const start = new Date(checkInStr).getTime();
  const end = checkOutStr ? new Date(checkOutStr).getTime() : Date.now();
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

/** Format hours into "Xh Ym" display. */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
}

/** Format ISO string to "HH:MM AM/PM". */
export function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Compute the attendance streak (consecutive present weekdays counting back from today). */
export function computeStreak(
  records: Array<{ attendanceDate: string; status: string; checkInTime?: string | null }>
): number {
  if (!records.length) return 0;
  const sorted = [...records]
    .filter(r => r.status === 'PRESENT' || r.status === 'HALF_DAY' || r.checkInTime)
    .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  let count = 0;
  const today = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const recDate = new Date(sorted[i].attendanceDate + 'T00:00:00');
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    while (expected.getDay() === 0 || expected.getDay() === 6) {
      expected.setDate(expected.getDate() - 1);
    }
    if (recDate.toDateString() === expected.toDateString()) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/** Compute monthly attendance statistics. */
export interface MonthStats {
  present: number;
  absent: number;
  late: number;
  totalHours: number;
  overtimeTotal: number;
  avgHours: number;
  businessDays: number;
  attendanceRate: number;
}

export function computeMonthStats(
  records: Array<{ status: string; checkInTime?: string | null; checkOutTime?: string | null; isLate?: boolean }>,
  now: Date
): MonthStats {
  const present = records.filter(r => r.status === 'PRESENT' || r.checkInTime).length;
  const late = records.filter(r => r.isLate).length;
  const totalHours = records.reduce((acc, r) =>
    acc + calculateHours(r.checkInTime ?? undefined, r.checkOutTime ?? undefined), 0);
  const overtimeTotal = records.reduce((acc, r) => {
    const h = calculateHours(r.checkInTime ?? undefined, r.checkOutTime ?? undefined);
    return acc + Math.max(0, h - STANDARD_WORK_HOURS);
  }, 0);
  const avgHours = present > 0 ? totalHours / present : 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let businessDays = 0;
  const d = new Date(monthStart);
  while (d <= now) {
    if (d.getDay() !== 0 && d.getDay() !== 6) businessDays++;
    d.setDate(d.getDate() + 1);
  }
  const absent = Math.max(0, businessDays - present);
  const attendanceRate = businessDays > 0 ? Math.round((present / businessDays) * 100) : 0;

  return { present, absent, late, totalHours, overtimeTotal, avgHours, businessDays, attendanceRate };
}

/** Compute weekly averages. */
export interface WeekStats {
  avgHours: string;
  avgCheckIn: string;
  presentDays: number;
}

export function computeWeekStats(
  records: Array<{ checkInTime?: string | null; checkOutTime?: string | null }>
): WeekStats {
  const totalHours = records.reduce((acc, r) =>
    acc + calculateHours(r.checkInTime ?? undefined, r.checkOutTime ?? undefined), 0);
  const avgHours = records.length ? totalHours / records.length : 0;
  const checkInTimes = records
    .filter((r): r is typeof r & { checkInTime: string } => !!r.checkInTime)
    .map(r => new Date(r.checkInTime).getHours() * 60 + new Date(r.checkInTime).getMinutes());
  let avgCheckInStr = '--:--';
  if (checkInTimes.length) {
    const avgMins = checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length;
    const h = Math.floor(avgMins / 60);
    const m = Math.floor(avgMins % 60);
    avgCheckInStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  return {
    avgHours: avgHours.toFixed(1),
    avgCheckIn: avgCheckInStr,
    presentDays: records.filter(r => r.checkInTime).length,
  };
}
