import {format as formatDateFns} from 'date-fns';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {formatTime as canonicalFormatTime} from '@/lib/utils/format/date';

/** Minutes → "Xh Ym" (drops zero parts), or "--". */
export function formatDuration(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Minutes → "Xh Ym" (always both parts), or "--". */
export function formatHoursFromMinutes(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '--';
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}

/** Canonical 12-hour time, or "--:--". */
export function formatTime(isoString: string | undefined): string {
  if (!isoString) return '--:--';
  try {
    return canonicalFormatTime(isoString);
  } catch {
    return '--:--';
  }
}

export function formatDateLabel(dateStr: string): string {
  try {
    return formatDateFns(new Date(dateStr + 'T00:00:00'), 'EEE, MMM d');
  } catch {
    return dateStr;
  }
}

export function isNonWorkingDay(record: AttendanceRecord): boolean {
  return record.status === 'WEEKLY_OFF' || record.status === 'HOLIDAY' || record.status === 'ON_LEAVE' || record.status === 'LEAVE';
}

export function nonWorkLabel(record: AttendanceRecord): string {
  switch (record.status) {
    case 'WEEKLY_OFF':
      return 'Full day Weekly-off';
    case 'HOLIDAY':
      return 'Holiday';
    case 'ON_LEAVE':
    case 'LEAVE':
      return 'On Leave';
    case 'ABSENT':
      return 'No Time Entries Logged';
    default:
      return '';
  }
}

/** 6am–midnight window position of a record's worked span, as percentages. */
export function timelineSegment(record: AttendanceRecord): {left: number; width: number} | null {
  if (!record.checkInTime) return null;
  const parseHour = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() + d.getMinutes() / 60;
  };
  const checkIn = parseHour(record.checkInTime);
  const checkOut = record.checkOutTime ? parseHour(record.checkOutTime) : checkIn + 1;
  const windowStart = 6;
  const windowSize = 24 - windowStart;
  const left = Math.max(0, ((checkIn - windowStart) / windowSize) * 100);
  const width = Math.max(2, ((checkOut - checkIn) / windowSize) * 100);
  return {left, width: Math.min(width, 100 - left)};
}
