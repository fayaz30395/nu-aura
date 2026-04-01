/**
 * Type Guards and Type Utilities for Type-Safe Operations
 * Prevents usage of 'as any' throughout the codebase
 */

import type { BadgeVariant } from '@/components/ui/types';
import type { Gender, EmploymentType, EmployeeLevel, JobRole, EmployeeStatus } from '@/lib/types/hrms/employee';

// ============================================
// BADGE VARIANT MAPPING
// ============================================

/**
 * Maps a status string to a valid BadgeVariant
 * Use this instead of `as any` when setting badge variants
 */
export function toBadgeVariant(status: string | undefined | null): BadgeVariant {
  if (!status) return 'default';

  const normalizedStatus = status.toUpperCase().replace(/[_-]/g, '');

  // Success states
  if (['COMPLETED', 'APPROVED', 'ACTIVE', 'SUCCESS', 'ENROLLED', 'CERTIFIED', 'PUBLISHED'].includes(normalizedStatus)) {
    return 'success';
  }

  // Warning states
  if (['PENDING', 'INPROGRESS', 'IN_PROGRESS', 'DRAFT', 'REVIEW', 'SCHEDULED'].includes(normalizedStatus)) {
    return 'warning';
  }

  // Destructive states
  if (['REJECTED', 'CANCELLED', 'FAILED', 'ERROR', 'TERMINATED', 'EXPIRED', 'BLOCKED'].includes(normalizedStatus)) {
    return 'destructive';
  }

  // Secondary states
  if (['INACTIVE', 'ARCHIVED', 'CLOSED', 'PAUSED'].includes(normalizedStatus)) {
    return 'secondary';
  }

  // Primary states
  if (['NEW', 'OPEN', 'UPCOMING'].includes(normalizedStatus)) {
    return 'primary';
  }

  return 'default';
}

// ============================================
// EMPLOYEE TYPE GUARDS
// ============================================

const VALID_GENDERS: readonly Gender[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
const VALID_EMPLOYMENT_TYPES: readonly EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'] as const;
const VALID_EMPLOYEE_LEVELS: readonly EmployeeLevel[] = ['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO'] as const;
const VALID_EMPLOYEE_STATUSES: readonly EmployeeStatus[] = ['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED'] as const;
const VALID_JOB_ROLES: readonly JobRole[] = [
  'SOFTWARE_ENGINEER', 'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_DEVELOPER',
  'DEVOPS_ENGINEER', 'QA_ENGINEER', 'DATA_ENGINEER', 'MOBILE_DEVELOPER', 'SYSTEM_ARCHITECT',
  'TECH_LEAD', 'ENGINEERING_MANAGER', 'PRODUCT_MANAGER', 'PRODUCT_OWNER', 'PRODUCT_ANALYST',
  'UI_DESIGNER', 'UX_DESIGNER', 'GRAPHIC_DESIGNER', 'PRODUCT_DESIGNER', 'DATA_ANALYST',
  'DATA_SCIENTIST', 'BUSINESS_ANALYST', 'MARKETING_MANAGER', 'CONTENT_WRITER', 'SEO_SPECIALIST',
  'SOCIAL_MEDIA_MANAGER', 'DIGITAL_MARKETER', 'SALES_REPRESENTATIVE', 'SALES_MANAGER',
  'ACCOUNT_MANAGER', 'BUSINESS_DEVELOPMENT', 'OPERATIONS_MANAGER', 'PROJECT_MANAGER',
  'SCRUM_MASTER', 'PROGRAM_MANAGER', 'HR_MANAGER', 'HR_GENERALIST', 'RECRUITER',
  'TALENT_ACQUISITION', 'ACCOUNTANT', 'FINANCIAL_ANALYST', 'FINANCE_MANAGER',
  'ADMIN_ASSISTANT', 'OFFICE_MANAGER', 'CUSTOMER_SUPPORT', 'TECH_SUPPORT',
  'LEGAL_COUNSEL', 'COMPLIANCE_OFFICER', 'CONSULTANT', 'INTERN', 'OTHER'
] as const;

export function isValidGender(value: string): value is Gender {
  return VALID_GENDERS.includes(value as Gender);
}

export function isValidEmploymentType(value: string): value is EmploymentType {
  return VALID_EMPLOYMENT_TYPES.includes(value as EmploymentType);
}

export function isValidEmployeeLevel(value: string): value is EmployeeLevel {
  return VALID_EMPLOYEE_LEVELS.includes(value as EmployeeLevel);
}

export function isValidEmployeeStatus(value: string): value is EmployeeStatus {
  return VALID_EMPLOYEE_STATUSES.includes(value as EmployeeStatus);
}

export function isValidJobRole(value: string): value is JobRole {
  return VALID_JOB_ROLES.includes(value as JobRole);
}

/**
 * Safely cast a string to Gender or return undefined
 */
export function toGender(value: string | undefined | null): Gender | undefined {
  if (!value) return undefined;
  return isValidGender(value) ? value : undefined;
}

/**
 * Safely cast a string to EmploymentType or return the default
 */
export function toEmploymentType(value: string | undefined | null, defaultValue: EmploymentType = 'FULL_TIME'): EmploymentType {
  if (!value) return defaultValue;
  return isValidEmploymentType(value) ? value : defaultValue;
}

/**
 * Safely cast a string to EmployeeLevel or return undefined
 */
export function toEmployeeLevel(value: string | undefined | null): EmployeeLevel | undefined {
  if (!value) return undefined;
  return isValidEmployeeLevel(value) ? value : undefined;
}

/**
 * Safely cast a string to EmployeeStatus or return the default
 */
export function toEmployeeStatus(value: string | undefined | null, defaultValue: EmployeeStatus = 'ACTIVE'): EmployeeStatus {
  if (!value) return defaultValue;
  return isValidEmployeeStatus(value) ? value : defaultValue;
}

/**
 * Safely cast a string to JobRole or return undefined
 */
export function toJobRole(value: string | undefined | null): JobRole | undefined {
  if (!value) return undefined;
  return isValidJobRole(value) ? value : undefined;
}

// ============================================
// PAGINATION RESPONSE TYPE GUARD
// ============================================

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * Type guard to check if a response is a paginated response
 */
export function isPageResponse<T>(response: unknown): response is PageResponse<T> {
  if (!response || typeof response !== 'object') return false;
  const obj = response as Record<string, unknown>;
  return (
    Array.isArray(obj.content) &&
    typeof obj.totalElements === 'number' &&
    typeof obj.totalPages === 'number'
  );
}

/**
 * Safely extract content from a response that may or may not be paginated
 */
export function extractContent<T>(response: unknown): T[] {
  if (isPageResponse<T>(response)) {
    return response.content;
  }
  if (Array.isArray(response)) {
    return response as T[];
  }
  return [];
}

/**
 * Safely extract pagination metadata from a response
 */
export function extractPaginationMeta(response: unknown): { totalElements: number; totalPages: number } {
  if (isPageResponse<unknown>(response)) {
    return {
      totalElements: response.totalElements,
      totalPages: response.totalPages,
    };
  }
  if (Array.isArray(response)) {
    return {
      totalElements: response.length,
      totalPages: 1,
    };
  }
  return {
    totalElements: 0,
    totalPages: 1,
  };
}

// ============================================
// PRIORITY TYPE GUARDS
// ============================================

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

const VALID_PRIORITIES: readonly Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] as const;

export function isValidPriority(value: string): value is Priority {
  return VALID_PRIORITIES.includes(value.toUpperCase() as Priority);
}

export function toPriority(value: string | undefined | null, defaultValue: Priority = 'MEDIUM'): Priority {
  if (!value) return defaultValue;
  const upper = value.toUpperCase();
  return isValidPriority(upper) ? (upper as Priority) : defaultValue;
}

// ============================================
// TASK STATUS TYPE GUARDS
// ============================================

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'CANCELLED';

const VALID_TASK_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED'] as const;

export function isValidTaskStatus(value: string): value is TaskStatus {
  return VALID_TASK_STATUSES.includes(value.toUpperCase().replace(/ /g, '_') as TaskStatus);
}

export function toTaskStatus(value: string | undefined | null, defaultValue: TaskStatus = 'TODO'): TaskStatus {
  if (!value) return defaultValue;
  const normalized = value.toUpperCase().replace(/ /g, '_');
  return isValidTaskStatus(normalized) ? (normalized as TaskStatus) : defaultValue;
}

// ============================================
// GENERIC TYPE UTILITIES
// ============================================

/**
 * Creates a type-safe select value handler
 * Use this when handling select onChange events to avoid `as any`
 */
export function createSelectHandler<T extends string>(
  validValues: readonly T[],
  setter: (value: T | undefined) => void,
  defaultValue?: T
) {
  return (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value && defaultValue === undefined) {
      setter(undefined);
      return;
    }
    if (validValues.includes(value as T)) {
      setter(value as T);
    } else if (defaultValue !== undefined) {
      setter(defaultValue);
    }
  };
}

/**
 * Type-safe assertion that a value is not null or undefined
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
  return value;
}

/**
 * Narrow an unknown API response to a specific type with validation
 */
export function narrowResponse<T>(
  response: unknown,
  validator: (value: unknown) => value is T
): T | null {
  return validator(response) ? response : null;
}

// ============================================
// AUTH ERROR TYPE GUARDS
// ============================================

/**
 * Axios error response structure with status code.
 * Used for type-safe error handling in auth flows.
 */
export interface AxiosErrorResponse {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

/**
 * Type guard to safely check if an error is an Axios error with response
 */
export function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return (
    error !== null &&
    typeof error === 'object' &&
    ('response' in error || 'message' in error)
  );
}

/**
 * Type guard to check if error is a 401 Unauthorized error
 */
export function is401Error(error: unknown): error is AxiosErrorResponse {
  return isAxiosError(error) && error.response?.status === 401;
}

/**
 * Type guard to check if error is a 403 Forbidden error
 */
export function is403Error(error: unknown): error is AxiosErrorResponse {
  return isAxiosError(error) && error.response?.status === 403;
}

/**
 * Type guard to check if error is a network/connection error
 */
export function isNetworkError(error: unknown): error is AxiosErrorResponse {
  return isAxiosError(error) && !error.response;
}
