import {format, formatDistanceToNow} from 'date-fns';

/** Accepted shapes for date inputs: Date instance, ISO string, or epoch ms. */
export type DateInput = Date | string | number;

/** Matches a bare calendar date with no time or offset component. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize any {@link DateInput} into a Date.
 *
 * Date-only strings ('2026-05-15') are parsed as LOCAL midnight. Per the
 * ECMAScript spec `new Date('2026-05-15')` is UTC midnight, which renders as the
 * previous day for any viewer west of UTC — a stored calendar date must display
 * as itself regardless of the viewer's timezone. Strings carrying a time or an
 * offset keep native parsing, where the instant is genuinely meaningful.
 */
function toDate(d: DateInput): Date {
  if (d instanceof Date) return d;
  if (typeof d === 'string' && DATE_ONLY.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

/**
 * "May 15, 2026" — default for record dates, transactions, audit logs.
 *
 * @example
 *   formatDate('2026-05-15') // → 'May 15, 2026'
 */
export function formatDate(d: DateInput): string {
  return format(toDate(d), 'MMM d, yyyy');
}

/** "May 15" — compact, for same-year contexts (timelines, lists). */
export function formatDateShort(d: DateInput): string {
  return format(toDate(d), 'MMM d');
}

/** "May 2026" — month + year for calendar headers, monthly groupings. */
export function formatMonthYear(d: DateInput): string {
  return format(toDate(d), 'MMMM yyyy');
}

/** "MON" — three-letter weekday for date badges, day-of-week headers. */
export function formatWeekday(d: DateInput): string {
  return format(toDate(d), 'EEE').toUpperCase();
}

/** "Monday" — full weekday for greetings, calendar legends. */
export function formatWeekdayLong(d: DateInput): string {
  return format(toDate(d), 'EEEE');
}

/** "May 15" — month + day (same as formatDateShort; aliased for naming clarity). */
export function formatDayMonth(d: DateInput): string {
  return format(toDate(d), 'MMM d');
}

/** "Monday, May 15, 2026" — long form with weekday for page titles, headers. */
export function formatLongDate(d: DateInput): string {
  return format(toDate(d), 'EEEE, MMMM d, yyyy');
}

/** "Mon, May 15" — short weekday + month + day for compact lists, tables. */
export function formatWeekdayDate(d: DateInput): string {
  return format(toDate(d), 'EEE, MMM d');
}

/** "3:45 PM" — 12-hour, canonical across NU-AURA. */
export function formatTime(d: DateInput): string {
  return format(toDate(d), 'h:mm a');
}

/** "May 15, 2026, 3:45 PM" — full date + time. */
export function formatDateTime(d: DateInput): string {
  return format(toDate(d), 'MMM d, yyyy, h:mm a');
}

/**
 * "2h ago" / "3 days ago" — relative; falls back to formatDate for >30d.
 *
 * @example
 *   formatRelative(Date.now() - 7200_000) // → 'about 2 hours ago'
 */
export function formatRelative(d: DateInput): string {
  const date = toDate(d);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays > 30) return formatDate(date);
  return formatDistanceToNow(date, {addSuffix: true});
}

/**
 * Date range. Collapses the start year when both ends share it.
 *
 * @example
 *   formatDateRange('2026-05-15', '2026-05-22') // → 'May 15 – May 22, 2026'
 *   formatDateRange('2025-12-30', '2026-01-03') // → 'Dec 30, 2025 – Jan 3, 2026'
 */
export function formatDateRange(start: DateInput, end: DateInput): string {
  const a = toDate(start), b = toDate(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  return sameYear
    ? `${format(a, 'MMM d')} – ${format(b, 'MMM d, yyyy')}`
    : `${formatDate(a)} – ${formatDate(b)}`;
}
