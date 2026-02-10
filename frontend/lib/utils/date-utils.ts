/**
 * Date Conversion Utilities for Type-Safe Date Handling
 * Ensures consistent date handling between frontend and backend
 */

// ============================================
// ISO DATE STRING TYPES
// ============================================

/**
 * Represents an ISO 8601 date string (YYYY-MM-DD)
 * Use this for dates without time (e.g., joiningDate, birthDate)
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * Represents an ISO 8601 datetime string (YYYY-MM-DDTHH:mm:ss.sssZ)
 * Use this for timestamps (e.g., createdAt, updatedAt)
 */
export type ISODateTimeString = string & { readonly __brand: 'ISODateTimeString' };

// ============================================
// VALIDATION FUNCTIONS
// ============================================

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Validates if a string is a valid ISO date (YYYY-MM-DD)
 */
export function isValidISODate(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!ISO_DATE_REGEX.test(value)) return false;

  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validates if a string is a valid ISO datetime
 */
export function isValidISODateTime(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!ISO_DATETIME_REGEX.test(value)) return false;

  const date = new Date(value);
  return !isNaN(date.getTime());
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Converts a Date object to an ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date | null | undefined): ISODateString | null {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0] as ISODateString;
}

/**
 * Converts a Date object to an ISO datetime string
 */
export function toISODateTimeString(date: Date | null | undefined): ISODateTimeString | null {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString() as ISODateTimeString;
}

/**
 * Parses an ISO date string to a Date object
 * Returns null for invalid dates instead of throwing
 */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Safely converts any date-like value to an ISO date string
 */
export function safeToISODateString(value: Date | string | number | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return toISODateString(value);
  }

  if (typeof value === 'number') {
    return toISODateString(new Date(value));
  }

  // Already a string - validate and return
  if (isValidISODate(value) || isValidISODateTime(value)) {
    const date = new Date(value);
    return toISODateString(date);
  }

  return null;
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

const DEFAULT_LOCALE = 'en-US';

export interface DateFormatOptions {
  locale?: string;
  includeTime?: boolean;
  includeYear?: boolean;
  shortMonth?: boolean;
  timeFormat?: '12h' | '24h';
}

/**
 * Formats a date string for display
 */
export function formatDate(
  value: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!value) return 'N/A';

  const date = value instanceof Date ? value : parseISODate(value);
  if (!date) return 'Invalid Date';

  const {
    locale = DEFAULT_LOCALE,
    includeTime = false,
    includeYear = true,
    shortMonth = false,
    timeFormat = '12h',
  } = options;

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: shortMonth ? 'short' : 'long',
    day: 'numeric',
    ...(includeYear && { year: 'numeric' }),
    ...(includeTime && {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }),
  };

  return date.toLocaleDateString(locale, dateOptions);
}

/**
 * Formats a date to relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  locale: string = DEFAULT_LOCALE
): string {
  if (!value) return 'N/A';

  const date = value instanceof Date ? value : parseISODate(value);
  if (!date) return 'Invalid Date';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(diffSeconds, 'second');
  } else if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffDays) < 365) {
    return rtf.format(Math.round(diffDays / 30), 'month');
  } else {
    return rtf.format(Math.round(diffDays / 365), 'year');
  }
}

/**
 * Formats a date range
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  const startFormatted = formatDate(start, options);
  const endFormatted = formatDate(end, options);

  if (startFormatted === 'N/A' && endFormatted === 'N/A') {
    return 'N/A';
  }

  if (endFormatted === 'N/A') {
    return `${startFormatted} - Present`;
  }

  if (startFormatted === 'N/A') {
    return `Until ${endFormatted}`;
  }

  return `${startFormatted} - ${endFormatted}`;
}

// ============================================
// DATE COMPARISON UTILITIES
// ============================================

/**
 * Checks if a date is in the past
 */
export function isPastDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : parseISODate(value);
  if (!date) return false;
  return date.getTime() < Date.now();
}

/**
 * Checks if a date is in the future
 */
export function isFutureDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : parseISODate(value);
  if (!date) return false;
  return date.getTime() > Date.now();
}

/**
 * Checks if a date is today
 */
export function isToday(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : parseISODate(value);
  if (!date) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): number | null {
  const startDate = start instanceof Date ? start : parseISODate(start);
  const endDate = end instanceof Date ? end : parseISODate(end);

  if (!startDate || !endDate) return null;

  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================
// DATE RANGE UTILITIES
// ============================================

/**
 * Get the start of today (midnight)
 */
export function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the end of today (23:59:59.999)
 */
export function getEndOfToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

/**
 * Get the start of the current month
 */
export function getStartOfMonth(date?: Date): Date {
  const d = date || new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get the end of the current month
 */
export function getEndOfMonth(date?: Date): Date {
  const d = date || new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get the start of the current week (Sunday)
 */
export function getStartOfWeek(date?: Date): Date {
  const d = date || new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

/**
 * Get the end of the current week (Saturday)
 */
export function getEndOfWeek(date?: Date): Date {
  const d = date || new Date();
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  const endOfWeek = new Date(d.setDate(diff));
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}
