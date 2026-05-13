import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  formatDate,
  formatDateRange,
  formatDateShort,
  formatDateTime,
  formatRelative,
  formatTime,
} from '../date';

describe('format/date', () => {
  // Pin a stable "now" — May 20, 2026 12:00:00 UTC — so relative output is deterministic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Build a stable wall-clock anchor regardless of host TZ
  const anchor = (mm: number, dd: number, yyyy: number, hh = 15, min = 45) =>
    new Date(yyyy, mm - 1, dd, hh, min, 0);

  describe('formatDate', () => {
    it('formats a date string as "MMM d, yyyy"', () => {
      // Date-only strings parse as local midnight in date-fns
      expect(formatDate('2026-05-15')).toBe('May 15, 2026');
    });

    it('formats a Date instance', () => {
      expect(formatDate(anchor(5, 15, 2026))).toBe('May 15, 2026');
    });
  });

  describe('formatDateShort', () => {
    it('formats as "MMM d" without year', () => {
      expect(formatDateShort(anchor(5, 15, 2026))).toBe('May 15');
    });
  });

  describe('formatTime', () => {
    it('formats in 12-hour h:mm a form', () => {
      expect(formatTime(anchor(5, 15, 2026, 15, 45))).toBe('3:45 PM');
    });

    it('formats AM times correctly', () => {
      expect(formatTime(anchor(5, 15, 2026, 9, 5))).toBe('9:05 AM');
    });
  });

  describe('formatDateTime', () => {
    it('combines date and time with comma separators', () => {
      expect(formatDateTime(anchor(5, 15, 2026, 15, 45))).toBe(
        'May 15, 2026, 3:45 PM'
      );
    });
  });

  describe('formatRelative', () => {
    it('renders "1 day ago" for yesterday', () => {
      // 1 day before pinned "now" of 2026-05-20T12:00:00Z
      const oneDayAgo = new Date('2026-05-19T12:00:00Z');
      expect(formatRelative(oneDayAgo)).toBe('1 day ago');
    });

    it('renders "5 days ago" for ~5 days back', () => {
      const fiveDaysAgo = new Date('2026-05-15T12:00:00Z');
      expect(formatRelative(fiveDaysAgo)).toBe('5 days ago');
    });

    it('falls back to absolute formatDate after 30 days', () => {
      // 60 days before pinned now
      const longAgo = new Date('2026-03-21T12:00:00Z');
      // Should not start with a digit (relative format) — should be absolute
      expect(formatRelative(longAgo)).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });
  });

  describe('formatDateRange', () => {
    it('uses compact form when both dates share a year', () => {
      expect(
        formatDateRange(anchor(5, 15, 2026), anchor(5, 22, 2026))
      ).toBe('May 15 – May 22, 2026');
    });

    it('uses full form when the years differ', () => {
      expect(
        formatDateRange(anchor(12, 28, 2025), anchor(1, 3, 2026))
      ).toBe('Dec 28, 2025 – Jan 3, 2026');
    });
  });
});
