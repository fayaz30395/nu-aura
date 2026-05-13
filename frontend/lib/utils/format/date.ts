import {format, formatDistanceToNow} from 'date-fns';

export type DateInput = Date | string | number;

function toDate(d: DateInput): Date {
  return d instanceof Date ? d : new Date(d);
}

/** "May 15, 2026" — default for record dates, transactions, audit logs. */
export function formatDate(d: DateInput): string {
  return format(toDate(d), 'MMM d, yyyy');
}

/** "May 15" — compact, for same-year contexts (timelines, lists). */
export function formatDateShort(d: DateInput): string {
  return format(toDate(d), 'MMM d');
}

/** "3:45 PM" — 12-hour, canonical across NU-AURA. */
export function formatTime(d: DateInput): string {
  return format(toDate(d), 'h:mm a');
}

/** "May 15, 2026, 3:45 PM" — full date + time. */
export function formatDateTime(d: DateInput): string {
  return format(toDate(d), 'MMM d, yyyy, h:mm a');
}

/** "2h ago" / "3 days ago" — relative; falls back to formatDate for >30d. */
export function formatRelative(d: DateInput): string {
  const date = toDate(d);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays > 30) return formatDate(date);
  return formatDistanceToNow(date, {addSuffix: true});
}

/** "May 15 – May 22, 2026" or "May 15, 2026 – Jun 3, 2026" — date range. */
export function formatDateRange(start: DateInput, end: DateInput): string {
  const a = toDate(start), b = toDate(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  return sameYear
    ? `${format(a, 'MMM d')} – ${format(b, 'MMM d, yyyy')}`
    : `${formatDate(a)} – ${formatDate(b)}`;
}
