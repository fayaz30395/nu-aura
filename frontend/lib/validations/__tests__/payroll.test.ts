import { describe, it, expect } from 'vitest';
import { payrollRunSchema, payrollRunStatusSchema } from '../payroll';

describe('Payroll Validation Schemas', () => {
  // ─── payrollRunStatusSchema ────────────────────────────────────────────────
  describe('payrollRunStatusSchema', () => {
    it.each(['DRAFT', 'PROCESSING', 'PROCESSED', 'APPROVED', 'LOCKED'])(
      'accepts valid status: %s',
      (status) => {
        expect(payrollRunStatusSchema.safeParse(status).success).toBe(true);
      }
    );

    it('rejects invalid status', () => {
      expect(payrollRunStatusSchema.safeParse('INVALID').success).toBe(false);
    });
  });

  // ─── payrollRunSchema ──────────────────────────────────────────────────────
  describe('payrollRunSchema', () => {
    const valid = {
      runName: 'January 2024 Payroll',
      payrollPeriodStart: '2024-01-01',
      payrollPeriodEnd: '2024-01-31',
      paymentDate: '2024-02-05',
    };

    it('accepts valid payroll run', () => {
      expect(payrollRunSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty run name', () => {
      const r = payrollRunSchema.safeParse({ ...valid, runName: '' });
      expect(r.success).toBe(false);
    });

    it('rejects run name shorter than 3 chars', () => {
      const r = payrollRunSchema.safeParse({ ...valid, runName: 'ab' });
      expect(r.success).toBe(false);
    });

    it('rejects run name exceeding 255 chars', () => {
      const r = payrollRunSchema.safeParse({ ...valid, runName: 'a'.repeat(256) });
      expect(r.success).toBe(false);
    });

    it('rejects when period start is after period end', () => {
      const r = payrollRunSchema.safeParse({
        ...valid,
        payrollPeriodStart: '2024-02-01',
        payrollPeriodEnd: '2024-01-01',
      });
      expect(r.success).toBe(false);
    });

    it('accepts when period start equals period end', () => {
      const r = payrollRunSchema.safeParse({
        ...valid,
        payrollPeriodStart: '2024-01-15',
        payrollPeriodEnd: '2024-01-15',
        paymentDate: '2024-01-15',
      });
      expect(r.success).toBe(true);
    });

    it('rejects when payment date is before period end', () => {
      const r = payrollRunSchema.safeParse({
        ...valid,
        paymentDate: '2024-01-15', // before end of Jan 31
      });
      expect(r.success).toBe(false);
    });

    it('accepts when payment date equals period end', () => {
      const r = payrollRunSchema.safeParse({
        ...valid,
        paymentDate: '2024-01-31',
      });
      expect(r.success).toBe(true);
    });

    it('accepts optional notes', () => {
      const r = payrollRunSchema.safeParse({ ...valid, notes: 'Regular monthly run' });
      expect(r.success).toBe(true);
    });

    it('accepts optional status', () => {
      const r = payrollRunSchema.safeParse({ ...valid, status: 'DRAFT' });
      expect(r.success).toBe(true);
    });

    it('rejects missing payrollPeriodStart', () => {
      const { payrollPeriodStart: _, ...incomplete } = valid;
      const r = payrollRunSchema.safeParse(incomplete);
      expect(r.success).toBe(false);
    });

    it('rejects missing payrollPeriodEnd', () => {
      const { payrollPeriodEnd: _, ...incomplete } = valid;
      const r = payrollRunSchema.safeParse(incomplete);
      expect(r.success).toBe(false);
    });

    it('rejects missing paymentDate', () => {
      const { paymentDate: _, ...incomplete } = valid;
      const r = payrollRunSchema.safeParse(incomplete);
      expect(r.success).toBe(false);
    });
  });
});
