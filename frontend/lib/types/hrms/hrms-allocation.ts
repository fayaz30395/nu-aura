import { ProjectStatus } from './hrms-project';

export interface ProjectAllocation {
  id: string;
  projectId: string;
  projectCode?: string | null;
  projectName?: string | null;
  projectStatus?: ProjectStatus | null;
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  startDate: string;
  endDate: string;
  allocationPercent: number;
}

export interface AllocationPage {
  content: ProjectAllocation[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AllocationSummaryItem {
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  employeeEmail?: string | null;
  allocationPercent?: number | null;
  activeProjectCount?: number | null;
  overAllocated?: boolean | null;
}

export interface AllocationSummaryPage {
  content: AllocationSummaryItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
