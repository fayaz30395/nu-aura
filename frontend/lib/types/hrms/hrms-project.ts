export type ProjectStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectType = 'CLIENT' | 'INTERNAL';
export type ProjectBillingType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'RETAINER';

export type ProjectMemberRole =
  | 'PROJECT_MANAGER'
  | 'TEAM_LEAD'
  | 'TECHNOLOGY_LEAD'
  | 'DEVELOPER'
  | 'SENIOR_DEVELOPER'
  | 'QA_ENGINEER'
  | 'DESIGNER'
  | 'BUSINESS_ANALYST'
  | 'ARCHITECT'
  | 'CONSULTANT'
  | 'MEMBER';

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  employeeId: string;
  employeeName?: string;
  role: ProjectMemberRole;
  allocationPercentage?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

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
  teamMembers?: ProjectTeamMember[] | null;
  // Billing fields (optional — enabled when isBillable is true)
  isBillable?: boolean;
  billingType?: ProjectBillingType | null;
  billingRate?: number | null;
  clientId?: string | null;
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
  isBillable?: boolean;
  billingType?: ProjectBillingType;
  billingRate?: number;
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
