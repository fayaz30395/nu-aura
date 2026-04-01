/**
 * Mobile API Types - Optimized for mobile clients
 */

// ==================== DASHBOARD ====================
export interface MobileDashboardResponse {
  // Employee summary
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  avatarUrl?: string;

  // Attendance status
  attendanceStatus: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT';
  lastCheckInTime?: string;
  lastCheckOutTime?: string;
  todayWorkMinutes?: number;
  todayIsLate?: boolean;
  todayLateByMinutes?: number;

  // Leave balance summary
  leaveBalance: LeaveBalanceSummary;

  // Pending approvals
  pendingApprovalsCount: number;
  recentPendingApprovals?: PendingApprovalSummary[];

  // Upcoming items
  upcomingHolidays?: UpcomingHoliday[];
  recentAnnouncements?: Announcement[];
  reminders?: EmployeeReminder[];
}

export interface LeaveBalanceSummary {
  casualLeaveBalance: number;
  sickLeaveBalance: number;
  earnedLeaveBalance: number;
  totalLeavesTaken: number;
  totalLeavesPlanned: number;
}

export interface PendingApprovalSummary {
  approvalId: string;
  type: 'LEAVE' | 'EXPENSE' | 'EMPLOYMENT_CHANGE' | 'OVERTIME' | 'ASSET';
  requesterName: string;
  submittedAt: string;
  status: string;
}

export interface UpcomingHoliday {
  holidayName: string;
  date: string;
  daysFromToday: number;
}

export interface Announcement {
  announcementId: string;
  title: string;
  content: string;
  publishedAt: string;
}

export interface EmployeeReminder {
  type: 'BIRTHDAY' | 'ANNIVERSARY';
  employeeName: string;
  date: string;
}

// ==================== LEAVE ====================
export interface MobileQuickLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDayPeriod?: 'FIRST_HALF' | 'SECOND_HALF';
  reason: string;
  notes?: string;
}

export interface LeaveBalanceResponse {
  employeeId: string;
  employeeName: string;
  casualLeave: LeaveTypeBalance;
  sickLeave: LeaveTypeBalance;
  earnedLeave: LeaveTypeBalance;
  maternityLeave?: LeaveTypeBalance;
  paternityleave?: LeaveTypeBalance;
  unpaidLeave?: LeaveTypeBalance;
}

export interface LeaveTypeBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  totalBalance: number;
  usedBalance: number;
  pendingBalance: number;
  availableBalance: number;
  maxConsecutiveDays: number;
}

export interface RecentLeaveRequest {
  leaveRequestId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  submittedAt: string;
  approvedAt?: string;
  approverName?: string;
  approverComments?: string;
}

export interface MobileCancelLeaveRequest {
  reason: string;
}

// ==================== APPROVALS ====================
export interface PendingApprovalsResponse {
  totalPendingCount: number;
  counts: ApprovalCounts;
  approvals: ApprovalItem[];
}

export interface ApprovalCounts {
  leaveRequestsCount: number;
  expenseClaimsCount: number;
  employmentChangesCount: number;
  overtimeRequestsCount: number;
  assetRequestsCount: number;
}

export interface ApprovalItem {
  approvalId: string;
  approvalType: 'LEAVE_REQUEST' | 'EXPENSE_CLAIM' | 'EMPLOYMENT_CHANGE' | 'OVERTIME' | 'ASSET';
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  requesterAvatar?: string;
  details: string;
  amount?: string;
  submittedAt: string;
  daysAwaitingApproval: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MobileApprovalActionRequest {
  approvalId: string;
  action: 'APPROVE' | 'REJECT';
  notes?: string;
  rejectionReason?: string;
}

export interface MobileBulkApprovalRequest {
  approvalIds: string[];
  action: 'APPROVE' | 'REJECT';
  notes?: string;
}

export interface ApprovalActionResponse {
  approvalId?: string;
  status: 'APPROVED' | 'REJECTED';
  actionedAt: string;
  message: string;
}

// ==================== NOTIFICATIONS ====================
export interface MobileDeviceRegistrationRequest {
  deviceToken: string;
  deviceType: 'IOS' | 'ANDROID' | 'WEB';
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
}

export interface UnreadNotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface NotificationItem {
  notificationId: string;
  type: 'APPROVAL' | 'LEAVE' | 'ATTENDANCE' | 'ANNOUNCEMENT' | 'SYSTEM' | string;
  title: string;
  message: string;
  category: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  relatedEntityId?: string;
  icon?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MobileMarkReadRequest {
  notificationIds?: string[];
  markAllAsRead?: boolean;
}

export interface MarkReadResponse {
  updatedCount: number;
  message: string;
}

// ==================== SYNC ====================
export interface MobileSyncRequest {
  lastSyncAt: string;
  limit?: number;
}

export interface SyncResponse {
  syncTimestamp: string;
  totalChanges: number;
  hasMoreChanges: boolean;
  employeeDataChanges: EmployeeDataChange[];
  leaveBalanceChanges: LeaveBalanceChange[];
  attendanceRecordChanges: AttendanceRecordChange[];
  approvalChanges: ApprovalChange[];
  notificationChanges: NotificationChange[];
}

export interface EmployeeDataChange {
  employeeId: string;
  changeType: 'CREATED' | 'UPDATED' | 'DELETED';
  changedAt: string;
  designation?: string;
  department?: string;
  name?: string;
}

export interface LeaveBalanceChange {
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  availableBalance: number;
  pendingBalance: number;
  changedAt: string;
}

export interface AttendanceRecordChange {
  recordId: string;
  employeeId: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  workDurationMinutes?: number;
  isLate?: boolean;
  changedAt: string;
}

export interface ApprovalChange {
  approvalId: string;
  type: string;
  status: string;
  changedAt: string;
}

export interface NotificationChange {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
