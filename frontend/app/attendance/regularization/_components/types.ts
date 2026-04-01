export interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  attendanceDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  remarks?: string;
}

export interface RegularizationStats {
  pending: number;
  approved: number;
  rejected: number;
  avgResolutionTime: number;
}
