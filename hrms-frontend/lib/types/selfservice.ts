// Document Types
export type DocumentType =
  | 'EMPLOYMENT_CERTIFICATE'
  | 'SALARY_CERTIFICATE'
  | 'EXPERIENCE_LETTER'
  | 'RELIEVING_LETTER'
  | 'BONAFIDE_CERTIFICATE'
  | 'ADDRESS_PROOF_LETTER'
  | 'VISA_LETTER'
  | 'BANK_LETTER'
  | 'SALARY_SLIP'
  | 'FORM_16'
  | 'APPOINTMENT_LETTER_COPY'
  | 'CUSTOM';

export type DocumentRequestStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'GENERATED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export type DeliveryMode = 'DIGITAL' | 'PHYSICAL' | 'BOTH';

export type ProfileUpdateCategory =
  | 'PERSONAL_INFO'
  | 'CONTACT_INFO'
  | 'ADDRESS'
  | 'EMERGENCY_CONTACT'
  | 'BANK_DETAILS'
  | 'EDUCATION'
  | 'CERTIFICATION'
  | 'SKILLS';

export type ProfileUpdateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// Request DTOs
export interface DocumentRequestDto {
  documentType: DocumentType;
  purpose: string;
  addressedTo?: string;
  requiredByDate: string;
  deliveryMode: DeliveryMode;
  deliveryAddress?: string;
  priority?: number;
}

export interface ProfileUpdateRequestDto {
  category: ProfileUpdateCategory;
  fieldName: string;
  currentValue: string;
  requestedValue: string;
  reason?: string;
  supportingDocumentUrl?: string;
}

// Response DTOs
export interface DocumentRequestResponse {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  documentType: DocumentType;
  documentTypeDisplayName: string;
  purpose: string;
  addressedTo?: string;
  requiredByDate: string;
  status: DocumentRequestStatus;
  statusDisplayName: string;
  deliveryMode: DeliveryMode;
  deliveryAddress?: string;
  processedBy?: string;
  processedByName?: string;
  processedAt?: string;
  processingNotes?: string;
  generatedDocumentUrl?: string;
  documentGeneratedAt?: string;
  rejectionReason?: string;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateResponse {
  id: string;
  employeeId: string;
  employeeName?: string;
  category: ProfileUpdateCategory;
  categoryDisplayName: string;
  fieldName: string;
  fieldDisplayName: string;
  currentValue: string;
  requestedValue: string;
  reason?: string;
  supportingDocumentUrl?: string;
  status: ProfileUpdateStatus;
  statusDisplayName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewComments?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipSummary {
  month: string;
  year: number;
  netPay: number;
  downloadUrl?: string;
}

export interface UpcomingEvent {
  title: string;
  date: string;
  eventType: string;
}

export interface AnnouncementSummary {
  title: string;
  excerpt: string;
  postedOn: string;
}

export interface SelfServiceDashboard {
  // Employee Quick Info
  employeeName: string;
  employeeId: string;
  designation?: string;
  department?: string;
  reportingManager?: string;
  dateOfJoining?: string;
  profilePhotoUrl?: string;

  // Leave Balance Summary
  leaveBalances: Record<string, number>;
  pendingLeaveRequests: number;

  // Attendance Summary
  presentDaysThisMonth: number;
  absentDaysThisMonth: number;
  lateDaysThisMonth: number;
  attendancePercentage: number;
  todayAttendanceStatus?: string;

  // Pending Actions
  pendingProfileUpdates: number;
  pendingDocumentRequests: number;
  pendingApprovals: number;
  pendingTimesheets: number;

  // Recent Data
  recentPayslips: PayslipSummary[];
  upcomingEvents: UpcomingEvent[];
  recentAnnouncements: AnnouncementSummary[];

  // Team Info
  teamSize: number;
  teamMembersOnLeave: number;
}
