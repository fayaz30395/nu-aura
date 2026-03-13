import { z } from 'zod';

// ─── Shared Field Schemas ───────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Invalid ID format');

const optionalUuidSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    'Invalid ID format'
  );

const isoDateSchema = z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format');

const jsonContentSchema = z.record(z.any()).describe('JSON content for contract terms');

// ─── Enum Schemas ───────────────────────────────────────────────────────────

export const contractTypeSchema = z.enum(
  ['EMPLOYMENT', 'VENDOR', 'NDA', 'SLA', 'FREELANCER', 'OTHER'],
  { errorMap: () => ({ message: 'Please select a valid contract type' }) }
);

export const contractStatusSchema = z.enum(
  ['DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURES', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED'],
  { errorMap: () => ({ message: 'Please select a valid contract status' }) }
);

export const signatureStatusSchema = z.enum(
  ['PENDING', 'SIGNED', 'DECLINED'],
  { errorMap: () => ({ message: 'Please select a valid signature status' }) }
);

export const signerRoleSchema = z.enum(
  ['EMPLOYEE', 'MANAGER', 'HR', 'LEGAL', 'VENDOR'],
  { errorMap: () => ({ message: 'Please select a valid signer role' }) }
);

export const reminderTypeSchema = z.enum(
  ['EXPIRY', 'RENEWAL', 'REVIEW'],
  { errorMap: () => ({ message: 'Please select a valid reminder type' }) }
);

// ─── Contract Schemas ────────────────────────────────────────────────────────

export const createContractSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  type: contractTypeSchema,
  employeeId: optionalUuidSchema,
  vendorName: z
    .string()
    .max(255, 'Vendor name must not exceed 255 characters')
    .optional(),
  startDate: isoDateSchema.refine(
    (date) => new Date(date) <= new Date(),
    'Start date must be in the past or today'
  ),
  endDate: isoDateSchema.optional(),
  autoRenew: z.boolean().optional(),
  renewalPeriodDays: z
    .number()
    .int()
    .min(1, 'Renewal period must be at least 1 day')
    .optional(),
  value: z
    .number()
    .min(0, 'Contract value must be positive')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .optional()
    .default('USD'),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  terms: jsonContentSchema.optional(),
  documentUrl: z
    .string()
    .url('Invalid document URL')
    .optional(),
});

export const updateContractSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  type: contractTypeSchema.optional(),
  status: contractStatusSchema.optional(),
  employeeId: optionalUuidSchema,
  vendorName: z
    .string()
    .max(255, 'Vendor name must not exceed 255 characters')
    .optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  autoRenew: z.boolean().optional(),
  renewalPeriodDays: z
    .number()
    .int()
    .min(1, 'Renewal period must be at least 1 day')
    .optional(),
  value: z
    .number()
    .min(0, 'Contract value must be positive')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  terms: jsonContentSchema.optional(),
  documentUrl: z
    .string()
    .url('Invalid document URL')
    .optional(),
});

// ─── Signature Schemas ───────────────────────────────────────────────────────

export const sendForSigningSchema = z.object({
  signerName: z
    .string()
    .min(1, 'Signer name is required')
    .min(2, 'Signer name must be at least 2 characters')
    .max(255, 'Signer name must not exceed 255 characters'),
  signerEmail: z
    .string()
    .email('Invalid email address'),
  signerRole: signerRoleSchema.optional(),
});

// ─── Template Schemas ────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must not exceed 255 characters'),
  type: contractTypeSchema,
  content: jsonContentSchema,
});

export const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  type: contractTypeSchema.optional(),
  content: jsonContentSchema.optional(),
});

// ─── Type exports for convenience ────────────────────────────────────────────

export type CreateContractSchema = z.infer<typeof createContractSchema>;
export type UpdateContractSchema = z.infer<typeof updateContractSchema>;
export type SendForSigningSchema = z.infer<typeof sendForSigningSchema>;
export type CreateTemplateSchema = z.infer<typeof createTemplateSchema>;
