import {z} from 'zod';

// Leave Type Schema
export const leaveTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Leave type name is required')
    .max(100, 'Name must be 100 characters or less'),
  code: z
    .string()
    .min(1, 'Leave type code is required')
    .max(20, 'Code must be 20 characters or less')
    .regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
  description: z.string().max(500).optional(),
  defaultDays: z
    .number()
    .min(0, 'Default days cannot be negative')
    .max(365, 'Default days cannot exceed 365'),
  maxCarryForward: z
    .number()
    .min(0, 'Carry forward cannot be negative')
    .max(365, 'Carry forward cannot exceed 365')
    .optional(),
  isPaid: z.boolean().default(true),
  isAccrual: z.boolean().default(false),
  accrualFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  minDaysPerRequest: z
    .number()
    .min(0.5, 'Minimum days must be at least 0.5')
    .optional(),
  maxDaysPerRequest: z
    .number()
    .min(1, 'Maximum days must be at least 1')
    .optional(),
  requiresApproval: z.boolean().default(true),
  applicableGender: z.enum(['ALL', 'MALE', 'FEMALE']).optional(),
  isActive: z.boolean().default(true),
});

export type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;

// Leave Request Schema
export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid('Please select a leave type'),
    startDate: z
      .string()
      .min(1, 'Start date is required')
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
    endDate: z
      .string()
      .min(1, 'End date is required')
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
    isHalfDay: z.boolean().default(false),
    halfDayType: z.enum(['FIRST_HALF', 'SECOND_HALF']).optional(),
    reason: z
      .string()
      .min(10, 'Reason must be at least 10 characters')
      .max(1000, 'Reason must be 1000 characters or less'),
    contactDuringLeave: z.string().max(200).optional(),
    handoverNotes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return start >= today;
    },
    {
      message: 'Start date cannot be in the past',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      if (data.isHalfDay) {
        return data.startDate === data.endDate;
      }
      return true;
    },
    {
      message: 'Half day leave must be for a single day',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data.isHalfDay && !data.halfDayType) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select first half or second half',
      path: ['halfDayType'],
    }
  );

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

// Leave Approval/Rejection Schema
export const leaveApprovalSchema = z.object({
  comments: z.string().max(500).optional(),
});

export type LeaveApprovalFormData = z.infer<typeof leaveApprovalSchema>;

export const leaveRejectionSchema = z.object({
  reason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
});

export type LeaveRejectionFormData = z.infer<typeof leaveRejectionSchema>;

// Leave Cancellation Schema
export const leaveCancellationSchema = z.object({
  reason: z
    .string()
    .min(5, 'Cancellation reason must be at least 5 characters')
    .max(500, 'Reason must be 500 characters or less'),
});

export type LeaveCancellationFormData = z.infer<typeof leaveCancellationSchema>;
