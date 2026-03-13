import { z } from 'zod';

/**
 * Validation schema for file upload
 */
export const KekaFileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      return validTypes.includes(file.type);
    }, 'File must be CSV or Excel format')
    .refine((file) => {
      const validExtensions = ['.csv', '.xls', '.xlsx'];
      return validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    }, 'File must have .csv, .xls, or .xlsx extension')
    .refine((file) => file.size > 0, 'File cannot be empty')
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File size must be less than 50MB'),
});

/**
 * Validation schema for column mapping
 */
export const KekaImportMappingSchema = z.object({
  sourceColumn: z.string().min(1, 'Source column is required'),
  targetField: z.string().min(1, 'Target field is required'),
  transform: z
    .enum(['NONE', 'DATE_FORMAT', 'UPPERCASE', 'LOWERCASE', 'TRIM', 'PHONE_FORMAT'])
    .optional()
    .default('NONE'),
  isRequired: z.boolean().optional().default(false),
  description: z.string().optional(),
});

export type KekaImportMappingInput = z.infer<typeof KekaImportMappingSchema>;

/**
 * Validation schema for import configuration
 */
export const KekaImportConfigSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  mappings: z.array(KekaImportMappingSchema).min(1, 'At least one mapping is required'),
  skipInvalidRows: z.boolean().default(true),
  updateExistingEmployees: z.boolean().default(false),
  sendWelcomeEmail: z.boolean().default(false),
  autoApproveEmployees: z.boolean().default(false),
});

export type KekaImportConfig = z.infer<typeof KekaImportConfigSchema>;

/**
 * Validation schema for individual KEKA employee data
 */
export const KekaEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format').min(1, 'Work email is required'),
  personalEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .min(1, 'Joining date is required'),
  reportingManager: z.string().optional(),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'])
    .optional()
    .default('FULL_TIME'),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'RESIGNED', 'ON_LEAVE'])
    .optional()
    .default('ACTIVE'),
  location: z.string().optional(),
  ctc: z.number().positive('CTC must be a positive number').optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .optional()
    .or(z.literal('')),
  aadharNumber: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional()
    .or(z.literal('')),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format')
    .optional()
    .or(z.literal('')),
  pfAccountNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z
    .string()
    .regex(/^\d{6}$/, 'Postal code must be 6 digits')
    .optional()
    .or(z.literal('')),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
});

export type KekaEmployeeInput = z.infer<typeof KekaEmployeeSchema>;

/**
 * Validate and return errors for a KEKA employee record
 */
export function validateKekaEmployee(data: unknown): {
  valid: boolean;
  errors: Record<string, string>;
  data?: KekaEmployeeInput;
} {
  try {
    const result = KekaEmployeeSchema.safeParse(data);
    if (result.success) {
      return {
        valid: true,
        errors: {},
        data: result.data,
      };
    }
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const field = err.path.join('.');
      errors[field] = err.message;
    });
    return {
      valid: false,
      errors,
    };
  } catch {
    return {
      valid: false,
      errors: { _general: 'Validation failed' },
    };
  }
}
