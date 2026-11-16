import type {Priority} from '@/lib/types/hire/recruitment';
import type {StatusTone} from '@/lib/status/vocabulary';
import type {CreateJobOpeningFormData} from '@/lib/validations/recruitment';
import {getLocalDateString} from '@/lib/utils/dateUtils';

/** Mirrors backend `JobOpening.EmploymentType`. */
export const EMPLOYMENT_TYPE_OPTIONS = [
  {value: 'FULL_TIME', label: 'Full Time'},
  {value: 'PART_TIME', label: 'Part Time'},
  {value: 'CONTRACT', label: 'Contract'},
  {value: 'TEMPORARY', label: 'Temporary'},
  {value: 'INTERNSHIP', label: 'Internship'},
];

/** Mirrors backend `JobOpening.JobStatus`. */
export const JOB_STATUS_OPTIONS = [
  {value: 'DRAFT', label: 'Draft'},
  {value: 'OPEN', label: 'Open'},
  {value: 'ON_HOLD', label: 'On Hold'},
  {value: 'CLOSED', label: 'Closed'},
  {value: 'CANCELLED', label: 'Cancelled'},
];

/** Mirrors backend `JobOpening.Priority`. */
export const PRIORITY_OPTIONS = [
  {value: 'LOW', label: 'Low'},
  {value: 'MEDIUM', label: 'Medium'},
  {value: 'HIGH', label: 'High'},
  {value: 'URGENT', label: 'Urgent'},
];

export const PRIORITY_TONE: Record<Priority, StatusTone> = {
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',
};

export function emptyJobForm(): CreateJobOpeningFormData {
  return {
    jobCode: '',
    jobTitle: '',
    departmentId: '',
    location: '',
    employmentType: 'FULL_TIME',
    experienceRequired: '',
    minSalary: undefined,
    maxSalary: undefined,
    numberOfOpenings: 1,
    jobDescription: '',
    requirements: '',
    skillsRequired: '',
    hiringManagerId: '',
    status: 'DRAFT',
    postedDate: getLocalDateString(new Date()),
    closingDate: '',
    priority: 'MEDIUM',
    isActive: true,
  };
}
