import {EmployeeLevel, EmployeeStatus, EmploymentType, JobRole} from './employee';

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ChangeType =
  | 'PROMOTION'
  | 'DEMOTION'
  | 'TRANSFER'
  | 'ROLE_CHANGE'
  | 'MANAGER_CHANGE'
  | 'STATUS_CHANGE'
  | 'CONFIRMATION'
  | 'MULTIPLE';

export interface EmploymentChangeRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  requesterId: string;
  requesterName?: string;
  approverId?: string;
  approverName?: string;
  status: ChangeRequestStatus;
  changeType: ChangeType;

  // Current values
  currentDesignation?: string;
  currentLevel?: EmployeeLevel;
  currentJobRole?: JobRole;
  currentDepartmentId?: string;
  currentDepartmentName?: string;
  currentManagerId?: string;
  currentManagerName?: string;
  currentEmploymentType?: EmploymentType;
  currentConfirmationDate?: string;
  currentEmployeeStatus?: EmployeeStatus;

  // New values
  newDesignation?: string;
  newLevel?: EmployeeLevel;
  newJobRole?: JobRole;
  newDepartmentId?: string;
  newDepartmentName?: string;
  newManagerId?: string;
  newManagerName?: string;
  newEmploymentType?: EmploymentType;
  newConfirmationDate?: string;
  newEmployeeStatus?: EmployeeStatus;

  // Metadata
  reason?: string;
  rejectionReason?: string;
  effectiveDate?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}

export interface CreateEmploymentChangeRequest {
  employeeId: string;
  newDesignation?: string;
  newLevel?: EmployeeLevel;
  newJobRole?: JobRole;
  newDepartmentId?: string;
  newManagerId?: string;
  newEmploymentType?: EmploymentType;
  newConfirmationDate?: string;
  newEmployeeStatus?: EmployeeStatus;
  reason?: string;
  effectiveDate?: string;
}

export interface ApproveRejectChangeRequest {
  comments?: string;
  rejectionReason?: string;
}
