import {z} from 'zod';
import type {CreateEmployeeRequest} from '@/lib/types/hrms/employee';
import {getLocalDateString} from '@/lib/utils/dateUtils';
import {JOB_ROLE_VALUES} from '../_constants/job-roles';

export const createEmployeeFormSchema = z.object({
  employeeCode: z.string().optional(),
  firstName: z.string().min(1, 'First Name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  workEmail: z.string().email('Invalid work email').min(1, 'Work Email is required'),
  personalEmail: z.string().email('Invalid personal email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  designation: z.string().min(1, 'Designation is required'),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional(),
  jobRole: z.string()
    .refine((v) => (JOB_ROLE_VALUES as string[]).includes(v), 'Select a valid job role')
    .optional()
    .or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED']).default('ACTIVE'),
  joiningDate: z.string().min(1, 'Joining Date is required'),
  confirmationDate: z.string().optional().or(z.literal('')),
  managerId: z.string().optional().or(z.literal('')),
  dottedLineManager1Id: z.string().optional().or(z.literal('')),
  dottedLineManager2Id: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeFormSchema>;

export type AddEmployeeTab = 'basic' | 'personal' | 'employment' | 'bank';

/** Which form tab owns each field, so an invalid submit can jump to the first tab with an error. */
const FIELD_TAB: Partial<Record<keyof CreateEmployeeFormData, AddEmployeeTab>> = {
  employeeCode: 'basic',
  workEmail: 'basic',
  firstName: 'basic',
  middleName: 'basic',
  lastName: 'basic',
  password: 'basic',
  personalEmail: 'personal',
  phoneNumber: 'personal',
  emergencyContactNumber: 'personal',
  dateOfBirth: 'personal',
  gender: 'personal',
  address: 'personal',
  city: 'personal',
  state: 'personal',
  postalCode: 'personal',
  country: 'personal',
  designation: 'employment',
  employmentType: 'employment',
  departmentId: 'employment',
  level: 'employment',
  jobRole: 'employment',
  joiningDate: 'employment',
  confirmationDate: 'employment',
  managerId: 'employment',
  bankAccountNumber: 'bank',
  bankName: 'bank',
  bankIfscCode: 'bank',
  taxId: 'bank',
};

const TAB_ORDER: AddEmployeeTab[] = ['basic', 'personal', 'employment', 'bank'];

export function firstTabWithError(fields: string[]): AddEmployeeTab | undefined {
  const tabs = new Set(fields.map((f) => FIELD_TAB[f as keyof CreateEmployeeFormData]));
  return TAB_ORDER.find((tab) => tabs.has(tab));
}

export function createEmployeeDefaults(): CreateEmployeeFormData {
  return {
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    workEmail: '',
    personalEmail: '',
    phoneNumber: '',
    emergencyContactNumber: '',
    dateOfBirth: '',
    gender: undefined,
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    designation: '',
    level: undefined,
    jobRole: undefined,
    departmentId: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: getLocalDateString(new Date()),
    confirmationDate: '',
    managerId: '',
    dottedLineManager1Id: '',
    dottedLineManager2Id: '',
    bankAccountNumber: '',
    bankName: '',
    bankIfscCode: '',
    taxId: '',
    password: '',
  };
}

/**
 * Convert form values to the create request: empty optional strings become undefined,
 * and the "SELF" manager option sets `selfManaged` so the backend uses the employee's own id.
 */
export function toCreateEmployeeRequest(data: CreateEmployeeFormData): CreateEmployeeRequest {
  const isSelfManaged = data.managerId === 'SELF';

  return {
    ...data,
    employeeCode: data.employeeCode || undefined,
    middleName: data.middleName || undefined,
    lastName: data.lastName || undefined,
    personalEmail: data.personalEmail || undefined,
    phoneNumber: data.phoneNumber || undefined,
    emergencyContactNumber: data.emergencyContactNumber || undefined,
    dateOfBirth: data.dateOfBirth || undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    postalCode: data.postalCode || undefined,
    country: data.country || undefined,
    confirmationDate: data.confirmationDate || undefined,
    managerId: isSelfManaged ? undefined : (data.managerId || undefined),
    dottedLineManager1Id: data.dottedLineManager1Id || undefined,
    dottedLineManager2Id: data.dottedLineManager2Id || undefined,
    selfManaged: isSelfManaged,
    bankAccountNumber: data.bankAccountNumber || undefined,
    bankName: data.bankName || undefined,
    bankIfscCode: data.bankIfscCode || undefined,
    taxId: data.taxId || undefined,
    gender: data.gender,
    level: data.level,
    jobRole: data.jobRole || undefined,
    departmentId: data.departmentId,
    employmentType: data.employmentType,
    status: data.status,
  } as CreateEmployeeRequest;
}
