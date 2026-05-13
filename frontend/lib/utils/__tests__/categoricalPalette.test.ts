import {describe, expect, it} from 'vitest';
import {
  CATEGORICAL_DEFAULT,
  CATEGORICAL_PALETTE,
  pickCategoricalColor,
  statusColor,
} from '../categoricalPalette';

describe('categoricalPalette', () => {
  describe('pickCategoricalColor', () => {
    it('returns the palette entry at the given index', () => {
      expect(pickCategoricalColor(0)).toBe(CATEGORICAL_PALETTE[0]);
      expect(pickCategoricalColor(2)).toBe(CATEGORICAL_PALETTE[2]);
    });

    it('wraps around the palette length when index exceeds it', () => {
      const len = CATEGORICAL_PALETTE.length;
      expect(pickCategoricalColor(len)).toBe(CATEGORICAL_PALETTE[0]);
      expect(pickCategoricalColor(len + 3)).toBe(CATEGORICAL_PALETTE[3]);
    });

    it('returns the default for NaN input', () => {
      expect(pickCategoricalColor(Number.NaN)).toBe(CATEGORICAL_DEFAULT);
    });

    it('returns the default for negative indices', () => {
      expect(pickCategoricalColor(-1)).toBe(CATEGORICAL_DEFAULT);
    });
  });

  describe('statusColor', () => {
    it('returns the configured hex for a known status', () => {
      expect(statusColor('IN_PROGRESS')).toBe('#2563EB');
      expect(statusColor('COMPLETED')).toBe('#16A34A');
      expect(statusColor('BLOCKED')).toBe('#DC2626');
    });

    it('returns the categorical default for an unknown status', () => {
      expect(statusColor('NOT_A_REAL_STATUS')).toBe(CATEGORICAL_DEFAULT);
    });

    it('returns the categorical default for undefined input', () => {
      expect(statusColor(undefined)).toBe(CATEGORICAL_DEFAULT);
    });
  });
});
