/**
 * Date utility functions for consistent timezone handling across the application.
 *
 * IMPORTANT: These functions use LOCAL timezone to avoid issues where UTC dates
 * differ from local dates (e.g., at 4 AM IST, UTC is still the previous day).
 */

/**
 * Get local date string in YYYY-MM-DD format.
 * Use this instead of `new Date().toISOString().split('T')[0]` to avoid timezone issues.
 *
 * @param date - Optional date object (defaults to current date)
 * @returns Date string in YYYY-MM-DD format using local timezone
 *
 * @example
 * // At 4:00 AM IST on Dec 23rd:
 * // Wrong (UTC): new Date().toISOString().split('T')[0] returns "2025-12-22"
 * // Correct (Local): getLocalDateString() returns "2025-12-23"
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get local date-time string in ISO-like format but using local timezone.
 *
 * @param date - Optional date object (defaults to current date)
 * @returns Date-time string in YYYY-MM-DDTHH:mm:ss format using local timezone
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const dateStr = getLocalDateString(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr}T${hours}:${minutes}:${seconds}`;
}

/**
 * Get the start of day for a given date in local timezone.
 *
 * @param date - Optional date object (defaults to current date)
 * @returns Date string for start of day (midnight) in YYYY-MM-DD format
 */
export function getStartOfDayString(date: Date = new Date()): string {
  return getLocalDateString(date);
}

/**
 * Get date string for N days ago/ahead from a given date.
 *
 * @param daysOffset - Number of days to add (positive) or subtract (negative)
 * @param fromDate - Starting date (defaults to current date)
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getDateOffsetString(-7) // 7 days ago
 * getDateOffsetString(1) // tomorrow
 */
export function getDateOffsetString(daysOffset: number, fromDate: Date = new Date()): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + daysOffset);
  return getLocalDateString(date);
}

/**
 * Get the first day of a month in YYYY-MM-DD format.
 *
 * @param year - The year
 * @param month - The month (0-indexed, 0 = January)
 * @returns Date string for first day of month
 */
export function getMonthStartString(year: number, month: number): string {
  return getLocalDateString(new Date(year, month, 1));
}

/**
 * Get the last day of a month in YYYY-MM-DD format.
 *
 * @param year - The year
 * @param month - The month (0-indexed, 0 = January)
 * @returns Date string for last day of month
 */
export function getMonthEndString(year: number, month: number): string {
  return getLocalDateString(new Date(year, month + 1, 0));
}

/**
 * Parse a date string and return a Date object.
 * Handles both YYYY-MM-DD and ISO formats.
 *
 * @param dateString - Date string to parse
 * @returns Date object
 */
export function parseLocalDate(dateString: string): Date {
  // Handle YYYY-MM-DD format (treat as local date, not UTC)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
}

/**
 * Check if two dates are the same day (ignoring time).
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return getLocalDateString(date1) === getLocalDateString(date2);
}

/**
 * Check if a date is today.
 *
 * @param date - Date to check
 * @returns True if the date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}
