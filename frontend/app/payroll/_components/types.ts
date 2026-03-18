// Shared types for payroll _components

import { z } from 'zod';
import {
  PayrollRun,
  Payslip,
  SalaryStructure,
  PayrollRunStatus,
} from '@/lib/types/payroll';

export type { PayrollRun, Payslip, SalaryStructure, PayrollRunStatus };

export const payrollRunSchema = z.object({
  runName: z.string().min(1, 'Run name is required'),
  payrollPeriodStart: z.string().min(1, 'Period start is required'),
  payrollPeriodEnd: z.string().min(1, 'Period end is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional().or(z.literal('')),
});
export type PayrollRunFormData = z.infer<typeof payrollRunSchema>;

export const payslipFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  payrollRunId: z.string().min(1, 'Payroll run ID is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  payrollPeriodStart: z.string().min(1, 'Period start is required'),
  payrollPeriodEnd: z.string().min(1, 'Period end is required'),
  baseSalary: z.number({ coerce: true }).positive('Base salary must be positive'),
  allowances: z.number({ coerce: true }).min(0).optional(),
  deductions: z.number({ coerce: true }).min(0).optional(),
});
export type PayslipFormData = z.infer<typeof payslipFormSchema>;

export const salaryComponentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number({ coerce: true }).min(0),
  type: z.enum(['FIXED', 'VARIABLE'] as const) as z.ZodType<'FIXED' | 'VARIABLE'>,
  description: z.string().optional().or(z.literal('')),
});

export const salaryStructureSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  baseSalary: z.number({ coerce: true }).positive('Base salary must be positive'),
  allowances: z.array(salaryComponentSchema).default([]),
  deductions: z.array(salaryComponentSchema).default([]),
});
export type SalaryStructureFormData = z.infer<typeof salaryStructureSchema>;

export type TabType = 'runs' | 'payslips' | 'structures';

export interface FormModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  item?: PayrollRun | Payslip | SalaryStructure;
}

// Shared formatter helpers
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusColor(status: string) {
  const colors: { [key: string]: string } = {
    DRAFT: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
    PROCESSING: 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400',
    PROCESSED: 'bg-cyan-100 text-cyan-800',
    APPROVED: 'bg-green-100 text-green-800',
    LOCKED: 'bg-red-100 text-red-800',
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FINALIZED: 'bg-cyan-100 text-cyan-800',
    PAID: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
}
