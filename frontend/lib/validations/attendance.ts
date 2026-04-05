import {z} from 'zod';

// Time format validation (HH:mm or HH:mm:ss)
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Please enter a valid time (HH:mm)');

// Shift Schema
export const shiftSchema = z
  .object({
    shiftCode: z
      .string()
      .min(1, 'Shift code is required')
      .max(20, 'Shift code must be 20 characters or less')
      .regex(/^[A-Z0-9_-]+$/, 'Only uppercase letters, numbers, hyphens, and underscores allowed'),
    shiftName: z
      .string()
      .min(1, 'Shift name is required')
      .max(100, 'Shift name must be 100 characters or less'),
    description: z.string().max(500).optional(),
    startTime: timeSchema,
    endTime: timeSchema,
    gracePeriodInMinutes: z
      .number()
      .min(0, 'Grace period cannot be negative')
      .max(60, 'Grace period cannot exceed 60 minutes')
      .default(15),
    lateMarkAfterMinutes: z
      .number()
      .min(0, 'Late mark time cannot be negative')
      .max(120, 'Late mark time cannot exceed 120 minutes')
      .default(30),
    halfDayAfterMinutes: z
      .number()
      .min(0, 'Half day threshold cannot be negative')
      .max(480, 'Half day threshold cannot exceed 480 minutes')
      .default(240),
    fullDayHours: z
      .number()
      .min(1, 'Full day hours must be at least 1')
      .max(24, 'Full day hours cannot exceed 24')
      .default(8),
    breakDurationMinutes: z
      .number()
      .min(0, 'Break duration cannot be negative')
      .max(120, 'Break duration cannot exceed 120 minutes')
      .default(60),
    isNightShift: z.boolean().default(false),
    workingDays: z.string().optional(),
    weeklyOffDays: z
      .number()
      .min(0, 'Weekly off days cannot be negative')
      .max(7, 'Weekly off days cannot exceed 7')
      .default(2),
    isRotational: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.isNightShift) return true;
      // For non-night shifts, start time should be before end time
      return data.startTime < data.endTime;
    },
    {
      message: 'End time must be after start time for day shifts',
      path: ['endTime'],
    }
  );

export type ShiftFormData = z.infer<typeof shiftSchema>;

// Holiday Schema
export const holidaySchema = z.object({
  holidayName: z
    .string()
    .min(1, 'Holiday name is required')
    .max(100, 'Holiday name must be 100 characters or less'),
  holidayDate: z
    .string()
    .min(1, 'Holiday date is required')
    .refine((val) => !isNaN(Date.parse(val)), 'Please enter a valid date'),
  holidayType: z.enum(
    ['NATIONAL', 'REGIONAL', 'OPTIONAL', 'RESTRICTED', 'FESTIVAL', 'COMPANY_EVENT'],
    {errorMap: () => ({message: 'Please select a holiday type'})}
  ),
  description: z.string().max(500).optional(),
  isOptional: z.boolean().default(false),
  isRestricted: z.boolean().default(false),
  applicableLocations: z.string().max(500).optional(),
  applicableDepartments: z.string().max(500).optional(),
});

export type HolidayFormData = z.infer<typeof holidaySchema>;

// Check In Schema
export const checkInSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  checkInTime: z.string().optional(),
  source: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL']).optional(),
  location: z.string().max(200).optional(),
  attendanceDate: z.string().optional(),
});

export type CheckInFormData = z.infer<typeof checkInSchema>;

// Check Out Schema
export const checkOutSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  checkOutTime: z.string().optional(),
  source: z.enum(['WEB', 'MOBILE', 'BIOMETRIC', 'MANUAL']).optional(),
  location: z.string().max(200).optional(),
  attendanceDate: z.string().optional(),
});

export type CheckOutFormData = z.infer<typeof checkOutSchema>;

// Regularization Request Schema
export const regularizationSchema = z.object({
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
  proposedCheckInTime: timeSchema.optional(),
  proposedCheckOutTime: timeSchema.optional(),
});

export type RegularizationFormData = z.infer<typeof regularizationSchema>;

// Manual Attendance Entry Schema (for HR/Admin)
export const manualAttendanceSchema = z
  .object({
    employeeId: z.string().uuid('Please select an employee'),
    attendanceDate: z
      .string()
      .min(1, 'Date is required')
      .refine((val) => !isNaN(Date.parse(val)), 'Please enter a valid date'),
    checkInTime: timeSchema,
    checkOutTime: timeSchema.optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WEEKLY_OFF', 'HOLIDAY']),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.checkOutTime && data.checkInTime >= data.checkOutTime) {
        return false;
      }
      return true;
    },
    {
      message: 'Check out time must be after check in time',
      path: ['checkOutTime'],
    }
  );

export type ManualAttendanceFormData = z.infer<typeof manualAttendanceSchema>;
