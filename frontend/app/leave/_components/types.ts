export interface LeaveTypeLite {
  id: string;
  leaveName: string;
  leaveCode: string;
}

export interface LeaveBalanceLite {
  id: string | number;
  leaveTypeId: string;
  openingBalance: number;
  accrued: number;
  used: number;
  available: number;
}

export interface LeaveRequestLite {
  id: string | number;
  requestNumber: string;
  leaveTypeId: string;
  totalDays: number;
  status: string;
  startDate: string;
  endDate: string;
}
