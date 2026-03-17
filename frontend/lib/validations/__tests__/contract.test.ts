import { describe, it, expect } from 'vitest';
import { contractSchema } from '../contract';

describe('Contract Validation Schema', () => {
  it('validates a valid contract', () => {
    const validContract = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      probationPeriodMonths: 3,
      ctc: 1000000,
      noticePeriodDays: 30,
      documentUrl: 'https://example.com/contract.pdf',
    };
    const result = contractSchema.safeParse(validContract);
    expect(result.success).toBe(true);
  });

  it('requires contract type', () => {
    const invalid = {
      startDate: '2024-01-01',
      endDate: '2025-01-01',
    };
    const result = contractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates contract type enum', () => {
    const validTypes = ['PERMANENT', 'CONTRACT', 'INTERNSHIP', 'PROBATION'];
    validTypes.forEach((type) => {
      const valid = {
        contractType: type,
        startDate: '2024-01-01',
        endDate: '2025-01-01',
      };
      const result = contractSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  it('requires valid start date format', () => {
    const invalid = {
      contractType: 'PERMANENT',
      startDate: 'not-a-date',
      endDate: '2025-01-01',
    };
    const result = contractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires valid end date format', () => {
    const invalid = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: 'invalid',
    };
    const result = contractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates end date is after start date', () => {
    const invalid = {
      contractType: 'PERMANENT',
      startDate: '2025-01-01',
      endDate: '2024-01-01',
    };
    const result = contractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('allows optional probation period', () => {
    const valid = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      probationPeriodMonths: 6,
    };
    const result = contractSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('validates probation period range', () => {
    const tooHigh = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      probationPeriodMonths: 37,
    };
    const result = contractSchema.safeParse(tooHigh);
    expect(result.success).toBe(false);

    const negative = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      probationPeriodMonths: -1,
    };
    const result2 = contractSchema.safeParse(negative);
    expect(result2.success).toBe(false);
  });

  it('allows optional CTC', () => {
    const valid = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      ctc: 500000,
    };
    const result = contractSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('validates CTC is positive', () => {
    const invalid = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      ctc: -100,
    };
    const result = contractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('allows optional notice period', () => {
    const valid = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      noticePeriodDays: 60,
    };
    const result = contractSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('validates notice period range', () => {
    const negative = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      noticePeriodDays: -10,
    };
    const result = contractSchema.safeParse(negative);
    expect(result.success).toBe(false);
  });

  it('allows optional document URL', () => {
    const valid = {
      contractType: 'PERMANENT',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      documentUrl: 'https://example.com/document.pdf',
    };
    const result = contractSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
