process.env.TZ = 'America/Sao_Paulo';

import {describe, expect, it} from 'vitest';
import {formatDate} from './types';

describe('payroll formatDate', () => {
  it('keeps a date-only string on its own calendar day', () => {
    expect(formatDate('2026-04-01')).toBe('Apr 1, 2026');
    expect(formatDate('2026-04-30')).toBe('Apr 30, 2026');
  });

  it('returns empty string for missing dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});
