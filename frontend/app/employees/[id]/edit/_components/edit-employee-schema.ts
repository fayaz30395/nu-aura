import {z} from 'zod';
import type {Employee, JobRole, UpdateEmployeeRequest} from '@/lib/types/hrms/employee';
import type {CreateEmploymentChangeRequest} from '@/lib/types/hrms/employment-change-request';
import {EMPLOYEE_LEVEL_OPTIONS, EMPLOYEE_STATUS_OPTIONS} from '../../../_constants/employee-enums';
import {JOB_ROLE_GROUPS, JOB_ROLE_VALUES} from '../../../_constants/job-roles';

export const updateEmployeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Please enter the employee code (e.g., EMP-001)'),
  firstName: z.string().min(1, 'Please enter the employee’s first name'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().min(1, 'Please enter the employee’s last name'),
  personalEmail: z.string().email('Please enter a valid email address (e.g., name@example.com)').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional().nullable(),
  // Records can hold backend roles the picker doesn't offer (e.g. CEO); buildUpdateEmployeeFormSchema
  // validates against the offered roles plus the record's current one so saving never rewrites it.
  jobRole: z.custom<JobRole>((v) => typeof v === 'string').optional().nullable(),
  departmentId: z.string().optional().or(z.literal('')),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT']).optional().nullable(),
  managerId: z.string().optional().or(z.literal('')),
  dottedLineManager1Id: z.string().optional().or(z.literal('')),
  dottedLineManager2Id: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED']).optional().nullable(),
  confirmationDate: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  changeRequestReason: z.string().optional().or(z.literal('')),
});

export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeFormSchema>;

export type EditEmployeeTab = 'basic' | 'personal' | 'employment' | 'bank' | 'custom';

export const EDIT_TABS: {key: EditEmployeeTab; label: string}[] = [
  {key: 'basic', label: 'Basic Info'},
  {key: 'personal', label: 'Personal Details'},
  {key: 'employment', label: 'Employment'},
  {key: 'bank', label: 'Banking & Tax'},
  {key: 'custom', label: 'Additional Info'},
];

const FIELD_TAB: Partial<Record<keyof UpdateEmployeeFormData, EditEmployeeTab>> = {
  employeeCode: 'basic', firstName: 'basic', middleName: 'basic', lastName: 'basic', status: 'basic',
  personalEmail: 'personal', phoneNumber: 'personal', emergencyContactNumber: 'personal', dateOfBirth: 'personal',
  gender: 'personal', address: 'personal', city: 'personal', state: 'personal', postalCode: 'personal', country: 'personal',
  bankAccountNumber: 'bank', bankName: 'bank', bankIfscCode: 'bank', taxId: 'bank',
};

export function firstEditTabWithError(fields: string[]): EditEmployeeTab | undefined {
  const tabs = fields.map((f) => FIELD_TAB[f as keyof UpdateEmployeeFormData] ?? 'employment');
  return EDIT_TABS.find((t) => tabs.includes(t.key))?.key;
}

export function toEditFormValues(employee: Employee): UpdateEmployeeFormData {
  return {
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    middleName: employee.middleName || '',
    lastName: employee.lastName || '',
    personalEmail: employee.personalEmail || '',
    phoneNumber: employee.phoneNumber || '',
    emergencyContactNumber: employee.emergencyContactNumber || '',
    dateOfBirth: employee.dateOfBirth || '',
    gender: employee.gender,
    address: employee.address || '',
    city: employee.city || '',
    state: employee.state || '',
    postalCode: employee.postalCode || '',
    country: employee.country || '',
    designation: employee.designation || '',
    level: employee.level,
    jobRole: employee.jobRole,
    departmentId: employee.departmentId,
    employmentType: employee.employmentType,
    confirmationDate: employee.confirmationDate || '',
    managerId: employee.managerId || '',
    dottedLineManager1Id: employee.dottedLineManager1Id || '',
    dottedLineManager2Id: employee.dottedLineManager2Id || '',
    status: employee.status,
    // The API returns a masked account number (e.g. *****1234); pre-populating it would
    // fail validation, so the field stays blank and shows the masked value as a hint.
    bankAccountNumber: '',
    bankName: employee.bankName || '',
    bankIfscCode: employee.bankIfscCode || '',
    taxId: employee.taxId || '',
    changeRequestReason: '',
  };
}

/** Employment fields require HR approval, so changes go through a change request. */
export function hasEmploymentFieldChanges(formData: UpdateEmployeeFormData, employee: Employee): boolean {
  return (
    formData.designation !== employee.designation ||
    formData.level !== employee.level ||
    formData.jobRole !== employee.jobRole ||
    formData.departmentId !== employee.departmentId ||
    formData.managerId !== (employee.managerId || '') ||
    formData.employmentType !== employee.employmentType ||
    formData.status !== employee.status ||
    formData.confirmationDate !== (employee.confirmationDate || '')
  );
}

export function buildChangeRequest(
  employeeId: string,
  formData: UpdateEmployeeFormData,
  employee: Employee,
): CreateEmploymentChangeRequest {
  const changeRequest: CreateEmploymentChangeRequest = {
    employeeId,
    reason: formData.changeRequestReason || 'Employment details update',
  };
  if (formData.designation !== employee.designation) {
    changeRequest.newDesignation = formData.designation || undefined;
  }
  if (formData.level && formData.level !== employee.level) {
    changeRequest.newLevel = formData.level || undefined;
  }
  if (formData.jobRole && formData.jobRole !== employee.jobRole) {
    changeRequest.newJobRole = formData.jobRole || undefined;
  }
  if (formData.departmentId !== employee.departmentId) {
    changeRequest.newDepartmentId = formData.departmentId;
  }
  if (formData.managerId !== (employee.managerId || '')) {
    changeRequest.newManagerId = formData.managerId || undefined;
  }
  if (formData.employmentType !== employee.employmentType) {
    changeRequest.newEmploymentType = formData.employmentType || undefined;
  }
  if (formData.status !== employee.status) {
    changeRequest.newEmployeeStatus = formData.status || undefined;
  }
  if (formData.confirmationDate !== (employee.confirmationDate || '')) {
    changeRequest.newConfirmationDate = formData.confirmationDate || undefined;
  }
  return changeRequest;
}

export function buildUpdateRequest(formData: UpdateEmployeeFormData, employmentChanges: boolean): UpdateEmployeeRequest {
  return {
    employeeCode: formData.employeeCode || undefined,
    firstName: formData.firstName,
    middleName: formData.middleName || undefined,
    lastName: formData.lastName || undefined,
    personalEmail: formData.personalEmail || undefined,
    phoneNumber: formData.phoneNumber || undefined,
    emergencyContactNumber: formData.emergencyContactNumber || undefined,
    dateOfBirth: formData.dateOfBirth || undefined,
    gender: formData.gender || undefined,
    address: formData.address || undefined,
    city: formData.city || undefined,
    state: formData.state || undefined,
    postalCode: formData.postalCode || undefined,
    country: formData.country || undefined,
    bankAccountNumber: formData.bankAccountNumber || undefined,
    bankName: formData.bankName || undefined,
    bankIfscCode: formData.bankIfscCode || undefined,
    taxId: formData.taxId || undefined,
    // Dotted-line managers are informational only, so they never need approval.
    dottedLineManager1Id: formData.dottedLineManager1Id || undefined,
    dottedLineManager2Id: formData.dottedLineManager2Id || undefined,
    // Employment fields are sent directly only when unchanged; changes go via the change request.
    ...(employmentChanges ? {} : {
      designation: formData.designation || undefined,
      level: formData.level || undefined,
      jobRole: formData.jobRole || undefined,
      departmentId: formData.departmentId,
      managerId: formData.managerId || undefined,
      employmentType: formData.employmentType || undefined,
      status: formData.status || undefined,
      confirmationDate: formData.confirmationDate || undefined,
    }),
  };
}

export const STATUS_OPTIONS = [{value: '', label: 'Select Status'}, ...EMPLOYEE_STATUS_OPTIONS];

export const GENDER_OPTIONS = [
  {value: '', label: 'Select Gender'},
  {value: 'MALE', label: 'Male'},
  {value: 'FEMALE', label: 'Female'},
  {value: 'OTHER', label: 'Other'},
  {value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say'},
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  {value: '', label: 'Select Type'},
  {value: 'FULL_TIME', label: 'Full Time'},
  {value: 'PART_TIME', label: 'Part Time'},
  {value: 'CONTRACT', label: 'Contract'},
  {value: 'INTERN', label: 'Intern'},
  {value: 'CONSULTANT', label: 'Consultant'},
];

export const LEVEL_OPTIONS = [{value: '', label: 'Select Level'}, ...EMPLOYEE_LEVEL_OPTIONS];

export const JOB_ROLE_OPTIONS = [{value: '', label: 'Select Role'}, ...JOB_ROLE_GROUPS];

const LEGACY_JOB_ROLE_LABELS: Record<string, string> = {
  EXECUTIVE: 'Executive', CEO: 'CEO', CTO: 'CTO', CFO: 'CFO', COO: 'COO',
  ENGINEERING: 'Engineering', HUMAN_RESOURCES: 'Human Resources', FINANCE: 'Finance', ADMIN: 'Admin',
};

const titleCase = (value: string) =>
  value.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** True when the role is not one the picker offers, so it must be kept as the record's current value. */
export function isUnofferedJobRole(role: string | null | undefined): role is string {
  return !!role && !(JOB_ROLE_VALUES as string[]).includes(role);
}

/** Edit-page role options, with the record's current role added when the picker doesn't offer it. */
export function jobRoleOptionsFor(currentJobRole: string | null | undefined) {
  if (!isUnofferedJobRole(currentJobRole)) return JOB_ROLE_OPTIONS;
  const label = LEGACY_JOB_ROLE_LABELS[currentJobRole] ?? titleCase(currentJobRole);
  return [JOB_ROLE_OPTIONS[0], {value: currentJobRole, label: `${label} (current)`}, ...JOB_ROLE_OPTIONS.slice(1)];
}

export function isAllowedJobRole(role: string | null | undefined, currentJobRole: string | null | undefined): boolean {
  return !role || (JOB_ROLE_VALUES as string[]).includes(role) || role === currentJobRole;
}

export function buildUpdateEmployeeFormSchema(currentJobRole: string | null | undefined) {
  return updateEmployeeFormSchema.refine((data) => isAllowedJobRole(data.jobRole, currentJobRole), {
    path: ['jobRole'],
    message: 'Select a valid job role',
  });
}
