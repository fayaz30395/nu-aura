export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type ProjectType = 'CLIENT' | 'INTERNAL';

export interface HrmsProject {
  id: string;
  projectCode: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  ownerId: string;
  ownerName?: string | null;
  ownerEmployeeCode?: string | null;
  ownerEmail?: string | null;
  startDate: string;
  endDate?: string | null;
  clientName?: string | null;
  description?: string | null;
  activatedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  name: string;
  type: ProjectType;
  ownerId: string;
  startDate: string;
  endDate?: string;
  clientName?: string;
  description?: string;
}

export interface ProjectUpdateRequest extends ProjectCreateRequest {}

export interface ProjectPage {
  content: HrmsProject[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
