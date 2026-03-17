import { describe, it, expect } from 'vitest';
import {
  leaveTypeSchema,
  leaveRequestSchema,
  leaveApprovalSchema,
  leaveRejectionSchema,
  leaveCancellationSchema,
} from '../leave';

describe('Leave Validation Schemas', () => {
  describe('leaveTypeSchema', () => {
    it('validates a valid leave type', () => {
      const valid = {
        name: 'Casual Leave',
        code: 'CASUAL',
        defaultDays: 12,
      };
      const result = leaveTypeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('requires name', () => {
      const invalid = { code: 'CASUAL', defaultDays: 12 };
      const result = leaveTypeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires code in uppercase with underscores', () => {
      const invalidLowercase = { name: 'Casual', code: 'casual', defaultDays: 12 };
      const result = leaveTypeSchema.safeParse(invalidLowercase);
      expect(result.success).toBe(false);

      const validCode = { name: 'Casual', code: 'CASUAL_LEAVE', defaultDays: 12 };
      const result2 = leaveTypeSchema.safeParse(validCode);
      expect(result2.success).toBe(true);
    });

    it('requires default days', () => {
      const invalid = { name: 'Casual', code: 'CASUAL' };
      const result = leaveTypeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates default days range', () => {
      const negative = { name: 'Casual', code: 'CASUAL', defaultDays: -5 };
      const result = leaveTypeSchema.safeParse(negative);
      expect(result.success).toBe(false);

      const tooHigh = { name: 'Casual', code: 'CASUAL', defaultDays: 400 };
      const result2 = leaveTypeSchema.safeParse(tooHigh);
      expect(result2.success).toBe(false);
    });

    it('allows optional description', () => {
      const valid = {
        name: 'Casual Leave',
        code: 'CASUAL',
        defaultDays: 12,
        description: 'For casual absences',
      };
      const result = leaveTypeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('allows optional max carry forward', () => {
      const valid = {
        name: 'Casual Leave',
        code: 'CASUAL',
        defaultDays: 12,
        maxCarryForward: 5,
      };
      const result = leaveTypeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('has isPaid default as true', () => {
      const valid = {
        name: 'Casual Leave',
        code: 'CASUAL',
        defaultDays: 12,
      };
      const result = leaveTypeSchema.safeParse(valid);
      if (result.success) {
        expect(result.data.isPaid).toBe(true);
      }
    });

    it('allows accrual configuration', () => {
      const valid = {
        name: 'Earned Leave',
        code: 'EARNED',
        defaultDays: 20,
        isAccrual: true,
        accrualFrequency: 'MONTHLY',
      };
      const result = leaveTypeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('allows min and max days per request', () => {
      const valid = {
        name: 'Casual Leave',
        code: 'CASUAL',
        defaultDays: 12,
        minDaysPerRequest: 0.5,
        maxDaysPerRequest: 3,
      };
      const result = leaveTypeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates applicable gender', () => {
      const validGenders: Array<'ALL' | 'MALE' | 'FEMALE'> = ['ALL', 'MALE', 'FEMALE'];
      validGenders.forEach((gender) => {
        const valid = {
          name: 'Leave',
          code: 'LEAVE',
          defaultDays: 10,
          applicableGender: gender,
        };
        const result = leaveTypeSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('leaveRequestSchema', () => {
    it('validates a valid leave request', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const valid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: tomorrow.toISOString().split('T')[0],
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('requires valid UUID for leaveTypeId', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const invalid = {
        leaveTypeId: 'not-a-uuid',
        startDate: dateStr,
        endDate: dateStr,
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('requires reason with minimum length', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const invalid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: dateStr,
        endDate: dateStr,
        reason: 'short',
      };
      const result = leaveRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates end date is after start date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const today = new Date();
      today.setDate(today.getDate());
      const invalid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('does not allow past start date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      const invalid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: dateStr,
        endDate: dateStr,
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows end date equal to start date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const valid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: dateStr,
        endDate: dateStr,
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('allows multi-day leave', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5);
      const valid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('requires half day type for half day leave', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const invalid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: dateStr,
        endDate: dateStr,
        isHalfDay: true,
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates half day must be single day', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      const invalid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        isHalfDay: true,
        halfDayType: 'FIRST_HALF',
        reason: 'Taking leave for personal reasons',
      };
      const result = leaveRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('allows optional contact during leave', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const valid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: dateStr,
        endDate: dateStr,
        reason: 'Taking leave for personal reasons',
        contactDuringLeave: '+1-555-1234',
      };
      const result = leaveRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('allows optional handover notes', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const valid = {
        leaveTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: dateStr,
        endDate: dateStr,
        reason: 'Taking leave for personal reasons',
        handoverNotes: 'All tasks are assigned to John',
      };
      const result = leaveRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('leaveApprovalSchema', () => {
    it('validates approval with optional comments', () => {
      const valid = {
        comments: 'Approved as per policy',
      };
      const result = leaveApprovalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('allows empty approval', () => {
      const valid = {};
      const result = leaveApprovalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates comment max length', () => {
      const invalid = {
        comments: 'a'.repeat(501),
      };
      const result = leaveApprovalSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('leaveRejectionSchema', () => {
    it('validates rejection with reason', () => {
      const valid = {
        reason: 'Cannot approve due to project deadline',
      };
      const result = leaveRejectionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('requires reason with minimum length', () => {
      const invalid = {
        reason: 'short',
      };
      const result = leaveRejectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates reason max length', () => {
      const invalid = {
        reason: 'a'.repeat(501),
      };
      const result = leaveRejectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('leaveCancellationSchema', () => {
    it('validates cancellation with reason', () => {
      const valid = {
        reason: 'Plan cancelled due to emergency',
      };
      const result = leaveCancellationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('requires reason with minimum length', () => {
      const invalid = {
        reason: 'late',
      };
      const result = leaveCancellationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates reason max length', () => {
      const invalid = {
        reason: 'a'.repeat(501),
      };
      const result = leaveCancellationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
