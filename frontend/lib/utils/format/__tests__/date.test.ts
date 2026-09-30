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
      // Date-only strings are parsed as LOCAL midnight, not UTC midnight.
      expect(formatDate('2026-05-15')).toBe('May 15, 2026');
    });

    it('formats a Date instance', () => {
      expect(formatDate(anchor(5, 15, 2026))).toBe('May 15, 2026');
    });

    // Regression: `new Date('2026-05-15')` is UTC midnight per spec, which renders
    // as the previous day for any viewer west of UTC. A stored calendar date must
    // display as itself in every timezone. Run under TZ=UTC and TZ=America/Sao_Paulo
    // (and anything east, e.g. Asia/Tokyo) — all must agree.
    it('renders a date-only string as the same calendar day in any timezone', () => {
      expect(formatDate('2026-05-15')).toBe('May 15, 2026');
      expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
      expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
    });

    it('does not shift a date-only string across a year boundary', () => {
      // The failure mode this guards: '2026-01-01' becoming 'Dec 31, 2025'.
      expect(formatDate('2026-01-01')).not.toBe('Dec 31, 2025');
    });

    it('still honours the instant for strings that carry a time or offset', () => {
      // These describe a real instant, so native parsing is correct and preserved.
      const withZ = formatDate('2026-05-15T12:00:00Z');
      expect(withZ).toMatch(/^May 1[456], 2026$/);
      expect(formatDate(new Date(2026, 4, 15, 12, 0, 0))).toBe('May 15, 2026');
    });
  });

  describe('date-only handling across helpers', () => {
    it('formatDateShort keeps the calendar day', () => {
      expect(formatDateShort('2026-05-15')).toBe('May 15');
    });

    it('formatDateRange keeps both endpoints on their calendar days', () => {
      expect(formatDateRange('2026-05-15', '2026-05-22')).toBe(
        'May 15 – May 22, 2026'
      );
    });

    it('formatDateRange keeps the year split correct across a boundary', () => {
      expect(formatDateRange('2025-12-30', '2026-01-03')).toBe(
        'Dec 30, 2025 – Jan 3, 2026'
      );
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
