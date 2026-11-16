import {EMPLOYEE_LEVEL_OPTIONS, EMPLOYEE_STATUS_OPTIONS} from '../../_constants/employee-enums';
import {JOB_ROLE_GROUPS} from '../../_constants/job-roles';

export interface DirectoryEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  personalEmail: string;
  workEmail: string;
  phoneNumber: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  jobRole: string;
  level: string;
  employmentType: string;
  managerId: string;
  managerName: string;
  joiningDate: string;
  exitDate: string;
  status: string;
  profileImageUrl: string;
}

export interface DirectorySearchFilters {
  searchTerm: string;
  departmentIds: string[];
  jobRoles: string[];
  levels: string[];
  employmentTypes: string[];
  statuses: string[];
  page: number;
  size: number;
  sortBy: string;
  sortDirection: string;
}

export interface DirectoryDepartment {
  id: string;
  name: string;
  code: string;
}

export interface DirectorySearchResult {
  content: DirectoryEmployee[];
  totalPages: number;
  totalElements: number;
}

export const JOB_ROLE_OPTIONS = JOB_ROLE_GROUPS;

export const LEVEL_OPTIONS = EMPLOYEE_LEVEL_OPTIONS;

export const STATUS_OPTIONS = EMPLOYEE_STATUS_OPTIONS;

export const SORT_OPTIONS = [
  {value: 'fullName', label: 'Name'},
  {value: 'joiningDate', label: 'Joining Date'},
  {value: 'departmentId', label: 'Department'},
];

export const DEFAULT_DIRECTORY_FILTERS: DirectorySearchFilters = {
  searchTerm: '',
  departmentIds: [],
  jobRoles: [],
  levels: [],
  employmentTypes: [],
  statuses: ['ACTIVE'],
  page: 0,
  size: 12,
  sortBy: 'fullName',
  sortDirection: 'ASC',
};
