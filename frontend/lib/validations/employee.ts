import {z} from 'zod';

// Shared field schemas
const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[\d\s\-+()]+$/.test(val),
    'Please enter a valid phone number'
  );

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

const optionalEmailSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Please enter a valid email address'
  );

const dateSchema = z
  .string()
  .min(1, 'Date is required')
  .refine(
    (val) => !isNaN(Date.parse(val)),
    'Please enter a valid date'
  );

const optionalDateSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || !isNaN(Date.parse(val)),
    'Please enter a valid date'
  );

const _uuidSchema = z
  .string()
  .uuid('Invalid ID format');

const optionalUuidSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    'Invalid ID format'
  );

// Enum schemas
export const genderSchema = z.enum(
  ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
  {errorMap: () => ({message: 'Please select a gender'})}
);

export const employmentTypeSchema = z.enum(
  ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'],
  {errorMap: () => ({message: 'Please select an employment type'})}
);

export const employeeStatusSchema = z.enum(
  ['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED'],
  {errorMap: () => ({message: 'Please select a status'})}
);

export const employeeLevelSchema = z.enum([
  'ENTRY',
  'MID',
  'SENIOR',
  'LEAD',
  'MANAGER',
  'SENIOR_MANAGER',
  'DIRECTOR',
  'VP',
  'SVP',
  'CXO',
]);

// Create Employee Schema
export const createEmployeeSchema = z.object({
  // Required fields
  employeeCode: z
    .string()
    .min(1, 'Employee code is required')
    .max(50, 'Employee code must be 50 characters or less')
    .regex(/^[A-Za-z0-9-_]+$/, 'Only letters, numbers, hyphens, and underscores allowed'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less'),
  lastName: z
    .string()
    .optional()
    .transform((val) => val || ''),
  workEmail: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, lowercase, and number'
    ),
  joiningDate: dateSchema,
  employmentType: employmentTypeSchema,

  // Optional fields
  middleName: z.string().max(100).optional(),
  personalEmail: optionalEmailSchema,
  phoneNumber: phoneSchema,
  emergencyContactNumber: phoneSchema,
  dateOfBirth: optionalDateSchema,
  gender: genderSchema.optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  confirmationDate: optionalDateSchema,
  departmentId: optionalUuidSchema,
  designation: z.string().max(100).optional(),
  level: employeeLevelSchema.optional(),
  managerId: optionalUuidSchema,
  officeLocationId: optionalUuidSchema,
  selfManaged: z.boolean().optional(),

  // Bank details
  bankAccountNumber: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankIfscCode: z.string().max(20).optional(),
  taxId: z.string().max(50).optional(),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

// Update Employee Schema (all fields optional except ID context)
export const updateEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .max(50, 'Employee code must be 50 characters or less')
    .regex(/^[A-Za-z0-9-_]+$/, 'Only letters, numbers, hyphens, and underscores allowed')
    .optional(),
  firstName: z
    .string()
    .min(1, 'First name cannot be empty')
    .max(100, 'First name must be 100 characters or less')
    .optional(),
  middleName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  personalEmail: optionalEmailSchema,
  phoneNumber: phoneSchema,
  emergencyContactNumber: phoneSchema,
  dateOfBirth: optionalDateSchema,
  gender: genderSchema.optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  confirmationDate: optionalDateSchema,
  departmentId: optionalUuidSchema,
  designation: z.string().max(100).optional(),
  level: employeeLevelSchema.optional(),
  jobRole: z.string().optional(),
  managerId: optionalUuidSchema,
  officeLocationId: optionalUuidSchema,
  employmentType: employmentTypeSchema.optional(),
  status: employeeStatusSchema.optional(),
  bankAccountNumber: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankIfscCode: z.string().max(20).optional(),
  taxId: z.string().max(50).optional(),
});

export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;

// Employee Search Schema
export const employeeSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
});

export type EmployeeSearchFormData = z.infer<typeof employeeSearchSchema>;
