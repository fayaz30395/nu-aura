export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectManagerId?: string;
  projectManagerName?: string;
  clientName?: string;
  budget?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  teamMembers?: ProjectEmployee[];
}

export interface ProjectEmployee {
  id: string;
  projectId: string;
  projectName?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  role?: string;
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  projectCode: string;
  name: string;
  description?: string;
  startDate: string;
  expectedEndDate?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectManagerId?: string;
  clientName?: string;
  budget?: number;
  currency?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  expectedEndDate?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectManagerId?: string;
  clientName?: string;
  budget?: number;
  currency?: string;
}

export interface AssignEmployeeRequest {
  employeeId: string;
  role?: string;
  allocationPercentage?: number;
  startDate: string;
  endDate?: string;
}

export interface ProjectsResponse {
  content: Project[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
