/**
 * Notification routing configuration and utilities
 * Maps notification types to their corresponding application routes
 */

// Notification type to route mapping configuration
export const notificationRouteConfig: Record<string, string | ((id?: string) => string)> = {
  // Leave notifications
  'LEAVE_APPROVED': (id) => id ? `/leave/requests/${id}` : '/leave/requests',
  'LEAVE_REJECTED': (id) => id ? `/leave/requests/${id}` : '/leave/requests',
  'LEAVE_PENDING': (id) => id ? `/leave/requests/${id}` : '/leave/requests',
  'LEAVE_REQUEST': (id) => id ? `/leave/requests/${id}` : '/leave/requests',
  'LEAVE_CANCELLED': (id) => id ? `/leave/requests/${id}` : '/leave/requests',

  // Attendance notifications
  'ATTENDANCE_MARKED': '/me/attendance',
  'ATTENDANCE_ALERT': '/me/attendance',
  'ATTENDANCE_MISSED': '/me/attendance',
  'CHECK_IN_REMINDER': '/me/attendance',
  'CHECK_OUT_REMINDER': '/me/attendance',
  'LATE_ARRIVAL': '/me/attendance',
  'EARLY_DEPARTURE': '/me/attendance',
  'OVERTIME_ALERT': '/me/attendance',
  'REGULARIZATION_REQUESTED': '/attendance/regularizations',
  'REGULARIZATION_APPROVED': '/me/attendance',
  'REGULARIZATION_REJECTED': '/me/attendance',

  // Payroll notifications
  'PAYROLL_GENERATED': (id) => id ? `/payroll/${id}` : '/me/payroll',
  'PAYROLL_PROCESSED': '/me/payroll',
  'SALARY_CREDITED': '/me/payroll',
  'PAYSLIP_AVAILABLE': '/me/payroll',
  'TAX_DOCUMENT_READY': '/me/documents',

  // Document notifications
  'DOCUMENT_UPLOADED': '/me/documents',
  'DOCUMENT_REQUIRED': '/me/documents',
  'DOCUMENT_EXPIRING': '/me/documents',
  'DOCUMENT_EXPIRED': '/me/documents',
  'DOCUMENT_APPROVED': '/me/documents',
  'DOCUMENT_REJECTED': '/me/documents',

  // Performance notifications
  'PERFORMANCE_REVIEW_DUE': '/performance/reviews',
  'PERFORMANCE_REVIEW_SUBMITTED': '/performance/reviews',
  'PERFORMANCE_GOAL_ASSIGNED': '/performance/goals',
  'PERFORMANCE_FEEDBACK_RECEIVED': '/performance/feedback',
  'APPRAISAL_CYCLE_STARTED': '/performance/appraisals',

  // Expense notifications
  'EXPENSE_APPROVED': '/expenses',
  'EXPENSE_REJECTED': '/expenses',
  'EXPENSE_SUBMITTED': '/expenses',
  'EXPENSE_PENDING_APPROVAL': '/expenses/approvals',
  'REIMBURSEMENT_PROCESSED': '/expenses',

  // Shift and schedule notifications
  'SHIFT_ASSIGNED': '/me/attendance',
  'SHIFT_CHANGED': '/me/attendance',
  'SHIFT_SWAP_REQUESTED': '/shifts/swaps',
  'SHIFT_SWAP_APPROVED': '/me/attendance',
  'ROSTER_PUBLISHED': '/me/attendance',

  // Role and access notifications
  'ROLE_UPDATED': '/me/profile',
  'PERMISSION_CHANGED': '/me/profile',
  'ACCESS_GRANTED': '/me/profile',
  'ACCESS_REVOKED': '/me/profile',

  // Team and organizational notifications
  'TEAM_MEMBER_JOINED': '/team',
  'TEAM_MEMBER_LEFT': '/team',
  'REPORTING_MANAGER_CHANGED': '/me/profile',
  'DEPARTMENT_CHANGED': '/me/profile',

  // Recruitment notifications
  'APPLICATION_RECEIVED': (id) => id ? `/recruitment/applications/${id}` : '/recruitment/applications',
  'INTERVIEW_SCHEDULED': (id) => id ? `/recruitment/interviews/${id}` : '/recruitment/interviews',
  'CANDIDATE_HIRED': '/recruitment/applications',
  'OFFER_LETTER_SENT': '/recruitment/offers',

  // Training notifications
  'TRAINING_ASSIGNED': '/training',
  'TRAINING_COMPLETED': '/training',
  'TRAINING_REMINDER': '/training',
  'CERTIFICATION_EXPIRING': '/training/certifications',

  // Celebration notifications
  'BIRTHDAY': '/dashboard',
  'ANNIVERSARY': '/dashboard',
  'WORK_ANNIVERSARY': '/dashboard',
  'ACHIEVEMENT_UNLOCKED': '/dashboard',

  // Approval and task notifications
  'TASK_ASSIGNED': '/approvals/inbox',
  'APPROVAL_REQUIRED': '/approvals/inbox',
  'APPROVAL_UPDATE': '/approvals/inbox',
  'APPROVAL_ESCALATED': '/approvals/inbox',
  'APPROVAL_APPROVED': '/approvals/inbox',
  'APPROVAL_REJECTED': '/approvals/inbox',
  'REMINDER': '/dashboard',
  'SYSTEM': '/dashboard',

  // System notifications
  'ANNOUNCEMENT': '/announcements',
  'POLICY_UPDATE': '/policies',
  'SYSTEM_MAINTENANCE': '/dashboard',
  'WELCOME': '/dashboard',
  'ONBOARDING_TASK': '/onboarding',
};

// Fuzzy matching keywords for fallback routing
export const fuzzyMatches: Record<string, string> = {
  'LEAVE': '/leave/requests',
  'ATTENDANCE': '/me/attendance',
  'PAYROLL': '/me/payroll',
  'SALARY': '/me/payroll',
  'DOCUMENT': '/me/documents',
  'PERFORMANCE': '/performance/reviews',
  'EXPENSE': '/expenses',
  'SHIFT': '/me/attendance',
  'TRAINING': '/training',
  'APPROVAL': '/approvals/inbox',
  'RECRUITMENT': '/recruitment/applications',
  'TEAM': '/team',
};

export interface NotificationRouteInput {
  type?: string;
  relatedEntityId?: string;
  actionUrl?: string;
}

/**
 * Get the route for a given notification
 *
 * @param notification - The notification object
 * @returns The route to navigate to
 *
 * Priority order:
 * 1. Use actionUrl if provided
 * 2. Look up in route configuration
 * 3. Fuzzy match based on notification type keywords
 * 4. Default to dashboard
 */
export function getNotificationRoute(notification: NotificationRouteInput): string {
  // Priority 1: Use actionUrl if provided
  if (notification.actionUrl) {
    return notification.actionUrl;
  }

  const type = notification.type?.toUpperCase() || '';
  const id = notification.relatedEntityId;

  // Priority 2: Look up in route configuration
  const routeConfig = notificationRouteConfig[type];
  if (routeConfig) {
    return typeof routeConfig === 'function' ? routeConfig(id) : routeConfig;
  }

  // Priority 3: Fuzzy matching for similar notification types
  for (const [keyword, route] of Object.entries(fuzzyMatches)) {
    if (type.includes(keyword)) {
      return route;
    }
  }

  // Default fallback
  return '/dashboard';
}

/**
 * Check if a notification type is supported (has a specific route)
 */
export function isNotificationTypeSupported(type: string): boolean {
  const upperType = type.toUpperCase();
  if (notificationRouteConfig[upperType]) {
    return true;
  }

  for (const keyword of Object.keys(fuzzyMatches)) {
    if (upperType.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all supported notification types
 */
export function getSupportedNotificationTypes(): string[] {
  return Object.keys(notificationRouteConfig);
}
