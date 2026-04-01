export type NotificationType =
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_PENDING'
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_ALERT'
  | 'PAYROLL_GENERATED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_REQUIRED'
  | 'ANNOUNCEMENT'
  | 'BIRTHDAY'
  | 'ANNIVERSARY'
  | 'PERFORMANCE_REVIEW_DUE'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'SHIFT_ASSIGNED'
  | 'SHIFT_CHANGED'
  | 'ROLE_UPDATED'
  | 'SYSTEM_ALERT'
  | 'GENERAL';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  priority: NotificationPriority;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  metadata?: string;
}

export interface PagedNotificationResponse {
  content: Notification[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  emailNotifications?: boolean; // alias for emailEnabled
  pushEnabled: boolean;
  pushNotifications?: boolean; // alias for pushEnabled
  smsEnabled: boolean;
  smsNotifications?: boolean; // alias for smsEnabled
  leaveNotifications: boolean;
  attendanceNotifications: boolean;
  payrollNotifications: boolean;
  performanceNotifications: boolean;
  announcementNotifications: boolean;
  birthdayNotifications: boolean;
  anniversaryNotifications: boolean;
  systemAlertNotifications: boolean;
  createdAt?: string;
  updatedAt?: string;
}
