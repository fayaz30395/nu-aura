export enum ExitType {
  RESIGNATION = 'RESIGNATION',
  TERMINATION = 'TERMINATION',
  RETIREMENT = 'RETIREMENT',
  END_OF_CONTRACT = 'END_OF_CONTRACT',
  ABSCONDING = 'ABSCONDING',
}

export enum ExitStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  CLEARANCE_PENDING = 'CLEARANCE_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ExitProcess {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  exitType: ExitType;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status: ExitStatus;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  exitInterviewFeedback?: string;
  finalSettlementAmount?: number;
  settlementDate?: string;
  managerId?: string;
  managerName?: string;
  hrSpocId?: string;
  hrSpocName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExitProcessRequest {
  employeeId: string;
  exitType: ExitType;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status?: ExitStatus;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  managerId?: string;
  hrSpocId?: string;
  notes?: string;
}

export interface UpdateExitProcessRequest {
  exitType?: ExitType;
  resignationDate?: string;
  lastWorkingDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: number;
  buyoutAmount?: number;
  reasonForLeaving?: string;
  newCompany?: string;
  newDesignation?: string;
  status?: ExitStatus;
  rehireEligible?: boolean;
  exitInterviewScheduled?: boolean;
  exitInterviewDate?: string;
  exitInterviewFeedback?: string;
  finalSettlementAmount?: number;
  settlementDate?: string;
  managerId?: string;
  hrSpocId?: string;
  notes?: string;
}

export interface ExitProcessesResponse {
  content: ExitProcess[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ExitDashboard {
  totalExits: number;
  initiated: number;
  inProgress: number;
  clearancePending: number;
  completed: number;
  monthlyTrend?: { month: string; count: number }[];
  exitTypeBreakdown?: { type: string; count: number }[];
}
