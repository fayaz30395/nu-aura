import type {EmployeeLevel, EmployeeStatus} from '@/lib/types/hrms/employee';

/** Mirrors backend `Employee.EmployeeLevel`. */
export const EMPLOYEE_LEVEL_OPTIONS: {value: EmployeeLevel; label: string}[] = [
  {value: 'ENTRY', label: 'Entry (Junior/Associate)'},
  {value: 'MID', label: 'Mid-Level'},
  {value: 'SENIOR', label: 'Senior'},
  {value: 'LEAD', label: 'Lead/Principal'},
  {value: 'MANAGER', label: 'Manager'},
  {value: 'SENIOR_MANAGER', label: 'Senior Manager'},
  {value: 'DIRECTOR', label: 'Director'},
  {value: 'VP', label: 'Vice President'},
  {value: 'SVP', label: 'Senior Vice President'},
  {value: 'CXO', label: 'C-Level Executive'},
];

/** Mirrors backend `Employee.EmployeeStatus`. */
export const EMPLOYEE_STATUS_OPTIONS: {value: EmployeeStatus; label: string}[] = [
  {value: 'ACTIVE', label: 'Active'},
  {value: 'INACTIVE', label: 'Inactive'},
  {value: 'ON_LEAVE', label: 'On Leave'},
  {value: 'ON_NOTICE', label: 'On Notice'},
  {value: 'TERMINATED', label: 'Terminated'},
  {value: 'RESIGNED', label: 'Resigned'},
];
