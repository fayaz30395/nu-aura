import { describe, it, expect } from 'vitest';
import { createContractSchema, updateContractSchema, contractTypeSchema } from '../contract';

describe('Contract Validation Schema', () => {
  describe('createContractSchema', () => {
    it('validates a valid contract', () => {
      const validContract = {
        title: 'Employment Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
      };
      const result = createContractSchema.safeParse(validContract);
      expect(result.success).toBe(true);
    });

    it('requires title', () => {
      const invalid = {
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates contract type enum', () => {
      const validTypes = ['EMPLOYMENT', 'VENDOR', 'NDA', 'SLA', 'FREELANCER', 'OTHER'];
      validTypes.forEach((type) => {
        const valid = {
          title: 'Test Contract',
          type,
          startDate: '2024-01-01',
        };
        const result = createContractSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid contract type', () => {
      const invalid = {
        title: 'Test Contract',
        type: 'INVALID_TYPE',
        startDate: '2024-01-01',
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires valid start date format', () => {
      const invalid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: 'not-a-date',
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows optional end date', () => {
      const valid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
        endDate: '2025-01-01',
      };
      const result = createContractSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates end date format', () => {
      const invalid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
        endDate: 'invalid',
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows optional value', () => {
      const valid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
        value: 500000,
      };
      const result = createContractSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates value is non-negative', () => {
      const invalid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
        value: -100,
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows optional document URL', () => {
      const valid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
        documentUrl: 'https://example.com/document.pdf',
      };
      const result = createContractSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates document URL format', () => {
      const invalid = {
        title: 'Test Contract',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
        documentUrl: 'not-a-url',
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates title minimum length', () => {
      const invalid = {
        title: 'Ab',
        type: 'EMPLOYMENT',
        startDate: '2024-01-01',
      };
      const result = createContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updateContractSchema', () => {
    it('allows partial updates', () => {
      const valid = {
        title: 'Updated Contract',
      };
      const result = updateContractSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates title min length when provided', () => {
      const invalid = {
        title: 'Ab',
      };
      const result = updateContractSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('contractTypeSchema', () => {
    it('accepts valid contract types', () => {
      const validTypes = ['EMPLOYMENT', 'VENDOR', 'NDA', 'SLA', 'FREELANCER', 'OTHER'];
      validTypes.forEach((type) => {
        const result = contractTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid contract types', () => {
      const result = contractTypeSchema.safeParse('PERMANENT');
      expect(result.success).toBe(false);
    });
  });
});
