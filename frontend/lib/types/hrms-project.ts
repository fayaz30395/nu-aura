export type ProjectStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectType = 'CLIENT' | 'INTERNAL';

export interface HrmsProject {
  id: string;
  projectCode: string;
  name: string;
  type?: ProjectType; // Keep for frontend UI logic
  status: ProjectStatus;
  priority: ProjectPriority;
  projectManagerId?: string | null;
  projectManagerName?: string | null;
  startDate: string;
  endDate?: string | null;
  expectedEndDate?: string | null;
  clientName?: string | null;
  description?: string | null;
  budget?: number | null;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  projectCode: string;
  name: string;
  description?: string;
  startDate: string;
  expectedEndDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  projectManagerId?: string;
  clientName?: string;
  budget?: number;
  currency?: string;
}

export interface ProjectUpdateRequest extends Partial<ProjectCreateRequest> {
  endDate?: string;
}

export interface ProjectPage {
  content: HrmsProject[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
