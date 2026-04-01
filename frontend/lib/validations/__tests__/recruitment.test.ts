import { describe, it, expect } from 'vitest';
import { createJobOpeningSchema, createCandidateSchema } from '../recruitment';

describe('Recruitment Validation Schemas', () => {
  // ─── createJobOpeningSchema ─────────────────────────────────────────────────
  describe('createJobOpeningSchema', () => {
    const valid = {
      jobCode: 'JOB-001',
      jobTitle: 'Senior Engineer',
    };

    it('accepts valid minimal job opening', () => {
      expect(createJobOpeningSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty job code', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, jobCode: '' });
      expect(r.success).toBe(false);
    });

    it('rejects empty job title', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, jobTitle: '' });
      expect(r.success).toBe(false);
    });

    it('rejects job code exceeding 50 chars', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, jobCode: 'J'.repeat(51) });
      expect(r.success).toBe(false);
    });

    it('rejects job title exceeding 200 chars', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, jobTitle: 'T'.repeat(201) });
      expect(r.success).toBe(false);
    });

    it('accepts valid employment type', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, employmentType: 'FULL_TIME' });
      expect(r.success).toBe(true);
    });

    it('rejects invalid employment type', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, employmentType: 'INVALID' });
      expect(r.success).toBe(false);
    });

    it('accepts valid status enum', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, status: 'OPEN' });
      expect(r.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, status: 'UNKNOWN' });
      expect(r.success).toBe(false);
    });

    it('accepts valid priority', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, priority: 'URGENT' });
      expect(r.success).toBe(true);
    });

    it('rejects invalid priority', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, priority: 'EXTREME' });
      expect(r.success).toBe(false);
    });

    it('accepts optional numeric fields', () => {
      const r = createJobOpeningSchema.safeParse({
        ...valid,
        minSalary: 50000,
        maxSalary: 100000,
        numberOfOpenings: 3,
      });
      expect(r.success).toBe(true);
    });

    it('rejects numberOfOpenings less than 1', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, numberOfOpenings: 0 });
      expect(r.success).toBe(false);
    });

    it('accepts valid UUID for departmentId', () => {
      const r = createJobOpeningSchema.safeParse({
        ...valid,
        departmentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(r.success).toBe(true);
    });

    it('rejects invalid UUID for departmentId', () => {
      const r = createJobOpeningSchema.safeParse({ ...valid, departmentId: 'not-a-uuid' });
      expect(r.success).toBe(false);
    });
  });

  // ─── createCandidateSchema ──────────────────────────────────────────────────
  describe('createCandidateSchema', () => {
    const valid = {
      candidateCode: 'CAND-001',
      jobOpeningId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    it('accepts valid minimal candidate', () => {
      expect(createCandidateSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty candidate code', () => {
      const r = createCandidateSchema.safeParse({ ...valid, candidateCode: '' });
      expect(r.success).toBe(false);
    });

    it('rejects invalid job opening UUID', () => {
      const r = createCandidateSchema.safeParse({ ...valid, jobOpeningId: 'bad-id' });
      expect(r.success).toBe(false);
    });

    it('rejects empty first name', () => {
      const r = createCandidateSchema.safeParse({ ...valid, firstName: '' });
      expect(r.success).toBe(false);
    });

    it('rejects empty last name', () => {
      const r = createCandidateSchema.safeParse({ ...valid, lastName: '' });
      expect(r.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const r = createCandidateSchema.safeParse({ ...valid, email: 'not-email' });
      expect(r.success).toBe(false);
    });

    it('accepts valid phone number', () => {
      const r = createCandidateSchema.safeParse({ ...valid, phone: '+1-555-1234' });
      expect(r.success).toBe(true);
    });

    it('rejects invalid phone number', () => {
      const r = createCandidateSchema.safeParse({ ...valid, phone: 'abc' });
      expect(r.success).toBe(false);
    });

    it('accepts valid source enum', () => {
      const r = createCandidateSchema.safeParse({ ...valid, source: 'REFERRAL' });
      expect(r.success).toBe(true);
    });

    it('rejects invalid source', () => {
      const r = createCandidateSchema.safeParse({ ...valid, source: 'TWITTER' });
      expect(r.success).toBe(false);
    });

    it('accepts valid status enum', () => {
      const r = createCandidateSchema.safeParse({ ...valid, status: 'INTERVIEW' });
      expect(r.success).toBe(true);
    });

    it('validates notice period range', () => {
      const neg = createCandidateSchema.safeParse({ ...valid, noticePeriodDays: -1 });
      expect(neg.success).toBe(false);
      const high = createCandidateSchema.safeParse({ ...valid, noticePeriodDays: 400 });
      expect(high.success).toBe(false);
      const ok = createCandidateSchema.safeParse({ ...valid, noticePeriodDays: 30 });
      expect(ok.success).toBe(true);
    });

    it('accepts valid resume URL', () => {
      const r = createCandidateSchema.safeParse({ ...valid, resumeUrl: 'https://cdn.example.com/resume.pdf' });
      expect(r.success).toBe(true);
    });

    it('rejects invalid resume URL', () => {
      const r = createCandidateSchema.safeParse({ ...valid, resumeUrl: 'not-a-url' });
      expect(r.success).toBe(false);
    });
  });
});
