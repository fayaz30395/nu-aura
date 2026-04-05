import {z} from 'zod';

// ============ SHARED FIELD SCHEMAS ============

const dateSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((val) => !isNaN(Date.parse(val)), 'Please enter a valid date');

const _optionalDateSchema = z
  .string()
  .optional()
  .refine((val) => !val || !isNaN(Date.parse(val)), 'Please enter a valid date');

const uuidSchema = z.string().uuid('Invalid ID format');

const optionalUuidSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    'Invalid ID format'
  );

const positiveNumberSchema = z
  .number()
  .min(0, 'Amount must be zero or positive');

const currencySchema = positiveNumberSchema.refine(
  (val) => !isNaN(val),
  'Please enter a valid amount'
);

// ============ PAYROLL RUN SCHEMAS ============

export const payrollRunStatusSchema = z.enum(
  ['DRAFT', 'PROCESSING', 'PROCESSED', 'APPROVED', 'LOCKED'],
  {errorMap: () => ({message: 'Please select a valid status'})}
);

export const payrollRunSchema = z.object({
  runName: z
    .string()
    .min(1, 'Run name is required')
    .min(3, 'Run name must be at least 3 characters')
    .max(255, 'Run name must not exceed 255 characters'),
  payrollPeriodStart: dateSchema,
  payrollPeriodEnd: dateSchema,
  paymentDate: dateSchema,
  notes: z.string().optional(),
  status: payrollRunStatusSchema.optional(),
}).refine(
  (data) => new Date(data.payrollPeriodStart) <= new Date(data.payrollPeriodEnd),
  {
    message: 'Payroll period start date must be before or equal to end date',
    path: ['payrollPeriodEnd'],
  }
).refine(
  (data) => new Date(data.payrollPeriodEnd) <= new Date(data.paymentDate),
  {
    message: 'Payment date must be after or equal to payroll period end date',
    path: ['paymentDate'],
  }
);

export type PayrollRunFormData = z.infer<typeof payrollRunSchema>;

// ============ PAYSLIP SCHEMAS ============

export const payslipStatusSchema = z.enum(
  ['DRAFT', 'FINALIZED', 'PAID', 'PENDING'],
  {errorMap: () => ({message: 'Please select a valid status'})}
);

export const payslipSchema = z.object({
  employeeId: uuidSchema.or(z.string().min(1, 'Employee is required')),
  payrollRunId: uuidSchema.or(z.string().min(1, 'Payroll run is required')),
  paymentDate: dateSchema,
  payrollPeriodStart: dateSchema,
  payrollPeriodEnd: dateSchema,
  baseSalary: currencySchema,
  allowances: currencySchema.optional().default(0),
  deductions: currencySchema.optional().default(0),
  status: payslipStatusSchema.optional(),
}).refine(
  (data) => new Date(data.payrollPeriodStart) <= new Date(data.payrollPeriodEnd),
  {
    message: 'Period start date must be before or equal to end date',
    path: ['payrollPeriodEnd'],
  }
).refine(
  (data) => new Date(data.payrollPeriodEnd) <= new Date(data.paymentDate),
  {
    message: 'Payment date must be after or equal to period end date',
    path: ['paymentDate'],
  }
).refine(
  (data) => data.baseSalary > 0,
  {
    message: 'Base salary must be greater than zero',
    path: ['baseSalary'],
  }
);

export type PayslipFormData = z.infer<typeof payslipSchema>;

// ============ SALARY COMPONENT SCHEMAS ============

export const salaryComponentTypeSchema = z.enum(['FIXED', 'VARIABLE']);

export const salaryComponentSchema = z.object({
  id: optionalUuidSchema,
  name: z
    .string()
    .min(1, 'Component name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters'),
  amount: currencySchema,
  percentage: z.number().min(0).max(100).optional(),
  type: salaryComponentTypeSchema,
  description: z.string().optional(),
});

export type SalaryComponent = z.infer<typeof salaryComponentSchema>;

// ============ SALARY STRUCTURE SCHEMAS ============

export const salaryStructureStatusSchema = z.enum(
  ['ACTIVE', 'INACTIVE', 'PENDING'],
  {errorMap: () => ({message: 'Please select a valid status'})}
);

export const salaryStructureSchema = z.object({
  employeeId: uuidSchema.or(z.string().min(1, 'Employee is required')),
  effectiveDate: dateSchema,
  baseSalary: currencySchema.refine(
    (val) => val > 0,
    'Base salary must be greater than zero'
  ),
  allowances: z.array(salaryComponentSchema).optional().default([]),
  deductions: z.array(salaryComponentSchema).optional().default([]),
  status: salaryStructureStatusSchema.optional(),
});

export type SalaryStructureFormData = z.infer<typeof salaryStructureSchema>;

// ============ BULK PROCESSING SCHEMAS ============

export const bulkProcessPayrollSchema = z.object({
  employeeIds: z
    .array(uuidSchema.or(z.string().min(1)))
    .min(1, 'At least one employee must be selected'),
  payrollPeriodStart: dateSchema,
  payrollPeriodEnd: dateSchema,
  paymentDate: dateSchema,
  runName: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 3,
      'Run name must be at least 3 characters if provided'
    ),
}).refine(
  (data) => new Date(data.payrollPeriodStart) <= new Date(data.payrollPeriodEnd),
  {
    message: 'Payroll period start date must be before or equal to end date',
    path: ['payrollPeriodEnd'],
  }
).refine(
  (data) => new Date(data.payrollPeriodEnd) <= new Date(data.paymentDate),
  {
    message: 'Payment date must be after or equal to payroll period end date',
    path: ['paymentDate'],
  }
);

export type BulkProcessPayrollData = z.infer<typeof bulkProcessPayrollSchema>;

export const previewBulkProcessingSchema = z.object({
  employeeIds: z
    .array(uuidSchema.or(z.string().min(1)))
    .min(1, 'At least one employee must be selected'),
  payrollPeriodStart: dateSchema,
  payrollPeriodEnd: dateSchema,
}).refine(
  (data) => new Date(data.payrollPeriodStart) <= new Date(data.payrollPeriodEnd),
  {
    message: 'Payroll period start date must be before or equal to end date',
    path: ['payrollPeriodEnd'],
  }
);

export type PreviewBulkProcessingData = z.infer<typeof previewBulkProcessingSchema>;
