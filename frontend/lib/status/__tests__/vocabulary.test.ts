import {describe, expect, it} from 'vitest';
import {
  AGENCY_STATUS,
  ATTENDANCE_STATUS,
  EXPENSE_STATUS,
  LEAVE_STATUS,
  resolveStatus,
} from '../vocabulary';

describe('status/vocabulary', () => {
  describe('domain maps', () => {
    it('LEAVE_STATUS exposes the canonical four enum keys', () => {
      expect(Object.keys(LEAVE_STATUS).sort()).toEqual([
        'APPROVED',
        'CANCELLED',
        'PENDING',
        'REJECTED',
      ]);
    });

    it('EXPENSE_STATUS includes DRAFT/SUBMITTED/APPROVED/REJECTED/PAID', () => {
      expect(Object.keys(EXPENSE_STATUS).sort()).toEqual(
        ['APPROVED', 'DRAFT', 'PAID', 'REJECTED', 'SUBMITTED'].sort()
      );
    });

    it('ATTENDANCE_STATUS includes PRESENT/ABSENT/LATE plus weekly-off + leave variants', () => {
      const keys = Object.keys(ATTENDANCE_STATUS);
      expect(keys).toEqual(
        expect.arrayContaining([
          'PRESENT',
          'ABSENT',
          'LATE',
          'HALF_DAY',
          'WEEKLY_OFF',
          'HOLIDAY',
          'ON_LEAVE',
          'LEAVE',
        ])
      );
    });

    it('AGENCY_STATUS includes both BLACKLISTED and SUSPENDED', () => {
      expect(AGENCY_STATUS.BLACKLISTED.tone).toBe('danger');
      expect(AGENCY_STATUS.SUSPENDED.tone).toBe('warning');
    });
  });

  describe('resolveStatus', () => {
    it('returns the canonical meta for a known enum key', () => {
      const meta = resolveStatus('APPROVED', LEAVE_STATUS);
      expect(meta.label).toBe('Approved');
      expect(meta.tone).toBe('success');
      expect(meta.icon).toBeDefined();
    });

    it('returns the neutral Unknown for null', () => {
      const meta = resolveStatus(null, LEAVE_STATUS);
      expect(meta.label).toBe('Unknown');
      expect(meta.tone).toBe('neutral');
    });

    it('returns the neutral Unknown for undefined', () => {
      const meta = resolveStatus(undefined, LEAVE_STATUS);
      expect(meta.label).toBe('Unknown');
      expect(meta.tone).toBe('neutral');
    });

    it('returns a title-cased label + neutral tone for unknown enum keys', () => {
      const meta = resolveStatus('MYSTERY_STATE', LEAVE_STATUS);
      expect(meta.label).toBe('Mystery State');
      expect(meta.tone).toBe('neutral');
    });

    it('title-cases hyphenated and space-separated unknown values', () => {
      expect(resolveStatus('on-hold', LEAVE_STATUS).label).toBe('On Hold');
      expect(resolveStatus('foo bar', LEAVE_STATUS).label).toBe('Foo Bar');
    });
  });
});
