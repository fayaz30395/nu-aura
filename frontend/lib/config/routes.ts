import { Permissions } from '../hooks/usePermissions';

/**
 * Route protection configuration
 * Defines which permissions/roles are required for each route
 */

export interface RouteConfig {
  /** Route path pattern (supports wildcards) */
  path: string;
  /** If true, route requires authentication but no specific permission */
  requiresAuth?: boolean;
  /** Single permission required */
  permission?: string;
  /** Any of these permissions grants access (OR logic) */
  anyPermission?: string[];
  /** All of these permissions required (AND logic) */
  allPermissions?: string[];
  /** Any of these roles grants access (OR logic) */
  anyRole?: string[];
  /** All of these roles required (AND logic) */
  allRoles?: string[];
  /** If true, only admins can access */
  adminOnly?: boolean;
  /** If true, only HR can access */
  hrOnly?: boolean;
  /** If true, only managers can access */
  managerOnly?: boolean;
}

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES: string[] = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/careers',
  '/careers/',
  '/offer-portal',
  '/preboarding',
  '/preboarding/portal/[token]',
  '/sign/[token]',
  '/exit-interview/[token]',
  '/',
];

/**
 * Protected route configurations
 * Order matters - more specific routes should come first
 */
export const PROTECTED_ROUTES: RouteConfig[] = [
  // Admin routes - specific pages first (more specific before general)
  {
    path: '/admin/roles',
    anyPermission: [Permissions.ROLE_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/admin/permissions',
    anyPermission: [Permissions.PERMISSION_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/admin/users',
    anyPermission: [Permissions.USER_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/admin/settings',
    anyPermission: [Permissions.SETTINGS_UPDATE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/admin/holidays',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.LEAVE_MANAGE],
  },
  {
    path: '/admin/leave-types',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.LEAVE_MANAGE, Permissions.LEAVE_TYPE_MANAGE],
  },
  {
    path: '/admin/leave-requests',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.LEAVE_MANAGE, Permissions.LEAVE_APPROVE],
  },
  {
    path: '/admin/office-locations',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.OFFICE_LOCATION_CREATE],
  },
  {
    path: '/admin/shifts',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.SHIFT_MANAGE],
  },
  {
    path: '/admin/custom-fields',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.CUSTOM_FIELD_MANAGE],
  },
  {
    path: '/admin/integrations',
    anyPermission: [Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/admin/org-hierarchy',
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.DEPARTMENT_MANAGE],
  },
  {
    path: '/admin',
    adminOnly: true,
  },

  // Import / Export Hub
  {
    path: '/import-export',
    anyPermission: [Permissions.MIGRATION_IMPORT, Permissions.MIGRATION_EXPORT, Permissions.SYSTEM_ADMIN],
  },

  // Employee Management
  {
    path: '/employees/new',
    permission: Permissions.EMPLOYEE_CREATE,
  },
  {
    path: '/employees/[id]/edit',
    permission: Permissions.EMPLOYEE_UPDATE,
  },
  {
    path: '/employees',
    anyPermission: [
      Permissions.EMPLOYEE_READ,
      Permissions.EMPLOYEE_VIEW_ALL,
      Permissions.EMPLOYEE_VIEW_DEPARTMENT,
      Permissions.EMPLOYEE_VIEW_TEAM,
    ],
  },

  // Leave Management
  {
    path: '/leave/approvals',
    anyPermission: [Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE],
  },
  {
    path: '/leave/requests',
    permission: Permissions.LEAVE_REQUEST,
  },
  {
    path: '/leave/balances',
    anyPermission: [Permissions.LEAVE_VIEW_SELF, Permissions.LEAVE_VIEW_ALL],
  },
  {
    path: '/leave',
    anyPermission: [
      Permissions.LEAVE_VIEW_SELF,
      Permissions.LEAVE_VIEW_TEAM,
      Permissions.LEAVE_VIEW_ALL,
    ],
  },

  // Attendance
  {
    path: '/attendance/approvals',
    anyPermission: [Permissions.ATTENDANCE_APPROVE, Permissions.ATTENDANCE_MANAGE],
  },
  {
    path: '/attendance/regularization',
    permission: Permissions.ATTENDANCE_REGULARIZE,
  },
  {
    path: '/attendance/comp-off',
    anyPermission: [Permissions.ATTENDANCE_REGULARIZE, Permissions.ATTENDANCE_APPROVE],
  },
  {
    path: '/attendance/shift-swap',
    anyPermission: [Permissions.ATTENDANCE_REGULARIZE, Permissions.ATTENDANCE_APPROVE],
  },
  {
    path: '/attendance',
    anyPermission: [
      Permissions.ATTENDANCE_VIEW_SELF,
      Permissions.ATTENDANCE_VIEW_TEAM,
      Permissions.ATTENDANCE_VIEW_ALL,
    ],
  },

  // Payroll
  {
    path: '/payroll/process',
    anyPermission: [Permissions.PAYROLL_PROCESS, Permissions.PAYROLL_APPROVE],
  },
  {
    path: '/payroll',
    anyPermission: [Permissions.PAYROLL_VIEW, Permissions.PAYROLL_VIEW_SELF],
  },

  // Performance
  {
    path: '/performance/reviews/approve',
    permission: Permissions.REVIEW_APPROVE,
  },
  {
    path: '/performance/reviews',
    anyPermission: [Permissions.REVIEW_VIEW, Permissions.REVIEW_CREATE],
  },
  {
    path: '/performance/goals',
    anyPermission: [Permissions.GOAL_CREATE, Permissions.GOAL_APPROVE],
  },
  {
    path: '/performance/pip',
    anyPermission: [Permissions.PIP_VIEW, Permissions.PIP_CREATE, Permissions.PIP_MANAGE],
  },
  {
    path: '/performance/calibration',
    anyPermission: [Permissions.CALIBRATION_VIEW, Permissions.CALIBRATION_MANAGE],
  },
  {
    path: '/performance/9box',
    anyPermission: [Permissions.CALIBRATION_VIEW, Permissions.REVIEW_APPROVE],
  },
  {
    path: '/performance/cycles/[id]/calibration',
    anyPermission: [Permissions.CALIBRATION_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/performance/cycles/[id]/nine-box',
    anyPermission: [Permissions.CALIBRATION_VIEW, Permissions.REVIEW_APPROVE],
  },
  {
    path: '/performance',
    permission: Permissions.REVIEW_VIEW,
    // P0-002 fix: EMPLOYEE has REVIEW:VIEW for self-service but must not access admin hub
    anyRole: ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'MANAGER', 'TEAM_LEAD', 'SKIP_LEVEL_MANAGER', 'REPORTING_MANAGER'],
  },

  // Recruitment
  {
    path: '/recruitment',
    anyPermission: [
      Permissions.RECRUITMENT_VIEW,
      Permissions.RECRUITMENT_CREATE,
      Permissions.RECRUITMENT_MANAGE,
    ],
    // P0-001 fix: EMPLOYEE has RECRUITMENT:VIEW for referrals but must not access admin hub
    anyRole: ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'RECRUITMENT_ADMIN'],
  },

  // Training & LMS
  {
    path: '/training/manage',
    anyPermission: [Permissions.TRAINING_CREATE, Permissions.TRAINING_MANAGE],
  },
  {
    path: '/training',
    permission: Permissions.TRAINING_VIEW,
  },
  {
    path: '/learning/paths',
    anyPermission: [Permissions.LMS_COURSE_VIEW],
  },
  {
    path: '/learning/certificates',
    requiresAuth: true,
  },
  {
    path: '/learning',
    anyPermission: [Permissions.LMS_COURSE_VIEW, Permissions.TRAINING_VIEW],
  },
  {
    path: '/lms/manage',
    anyPermission: [Permissions.LMS_COURSE_CREATE, Permissions.LMS_COURSE_MANAGE],
  },
  {
    path: '/lms',
    permission: Permissions.LMS_COURSE_VIEW,
  },

  // Expenses
  {
    path: '/expenses/approvals',
    anyPermission: [Permissions.EXPENSE_APPROVE, Permissions.EXPENSE_MANAGE],
  },
  {
    path: '/expenses',
    anyPermission: [Permissions.EXPENSE_VIEW, Permissions.EXPENSE_CREATE],
  },

  // Reports & Analytics
  {
    path: '/reports',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.REPORT_CREATE],
  },
  {
    path: '/analytics',
    permission: Permissions.ANALYTICS_VIEW,
  },

  // Documents
  {
    path: '/documents/manage',
    anyPermission: [Permissions.DOCUMENT_APPROVE, Permissions.DOCUMENT_DELETE],
  },
  {
    path: '/documents',
    anyPermission: [Permissions.DOCUMENT_VIEW, Permissions.DOCUMENT_UPLOAD],
  },

  // Helpdesk
  {
    path: '/helpdesk/manage',
    anyPermission: [Permissions.HELPDESK_TICKET_ASSIGN, Permissions.HELPDESK_TICKET_RESOLVE],
  },
  {
    path: '/helpdesk',
    anyPermission: [Permissions.HELPDESK_TICKET_VIEW, Permissions.HELPDESK_TICKET_CREATE],
  },

  // Recognition
  {
    path: '/recognition/manage',
    permission: Permissions.RECOGNITION_MANAGE,
  },
  {
    path: '/recognition',
    anyPermission: [Permissions.RECOGNITION_VIEW, Permissions.RECOGNITION_CREATE],
  },

  // Wall / Social
  {
    path: '/wall',
    anyPermission: [Permissions.WALL_VIEW, Permissions.WALL_POST],
  },

  // Offboarding
  {
    path: '/offboarding/exit/fnf',
    anyPermission: [
      Permissions.EXIT_MANAGE,
      Permissions.SYSTEM_ADMIN,
    ],
  },
  {
    path: '/offboarding',
    anyPermission: [Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE],
  },

  // Assets
  {
    path: '/assets',
    anyPermission: [Permissions.ASSET_VIEW, Permissions.ASSET_CREATE, Permissions.ASSET_MANAGE],
  },

  // Benefits
  {
    path: '/benefits',
    anyPermission: [Permissions.BENEFIT_VIEW, Permissions.BENEFIT_VIEW_SELF, Permissions.BENEFIT_MANAGE],
  },

  // Surveys
  {
    path: '/surveys/manage',
    anyPermission: [Permissions.SURVEY_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/surveys',
    anyPermission: [Permissions.SURVEY_VIEW, Permissions.SURVEY_SUBMIT],
  },

  // Announcements
  {
    path: '/announcements/manage',
    anyPermission: [Permissions.ANNOUNCEMENT_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/announcements',
    anyPermission: [Permissions.ANNOUNCEMENT_VIEW, Permissions.ANNOUNCEMENT_CREATE],
  },

  // Travel
  {
    path: '/travel/approvals',
    anyPermission: [Permissions.TRAVEL_APPROVE, Permissions.TRAVEL_MANAGE],
  },
  {
    path: '/travel',
    anyPermission: [Permissions.TRAVEL_VIEW, Permissions.TRAVEL_CREATE],
  },

  // Loans
  {
    path: '/loans/manage',
    anyPermission: [Permissions.LOAN_APPROVE, Permissions.LOAN_MANAGE],
  },
  {
    path: '/loans',
    anyPermission: [Permissions.LOAN_VIEW, Permissions.LOAN_CREATE],
  },

  // Compensation
  {
    path: '/compensation/manage',
    anyPermission: [Permissions.COMPENSATION_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/compensation',
    anyPermission: [Permissions.COMPENSATION_VIEW, Permissions.COMPENSATION_VIEW_ALL],
  },

  // Statutory Compliance & Tax
  {
    path: '/tax/declarations',
    requiresAuth: true,
  },
  {
    path: '/tax',
    anyPermission: [Permissions.STATUTORY_VIEW, Permissions.STATUTORY_MANAGE],
  },
  {
    path: '/statutory',
    anyPermission: [Permissions.STATUTORY_VIEW, Permissions.STATUTORY_MANAGE],
  },

  // Wellness
  {
    path: '/wellness',
    anyPermission: [Permissions.WELLNESS_VIEW, Permissions.WELLNESS_CREATE, Permissions.WELLNESS_MANAGE],
  },

  // Resources & PSA
  {
    path: '/resources/capacity',
    anyPermission: [Permissions.PROJECT_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/resources/workload',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },
  {
    path: '/resources',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },

  // PSA routes removed — timesheets & invoices now accessed via /projects/[id] tabs

  // Allocations
  {
    path: '/allocations',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },

  // Departments
  {
    path: '/departments',
    anyPermission: [Permissions.DEPARTMENT_VIEW, Permissions.DEPARTMENT_MANAGE],
  },

  // Organization Chart
  {
    path: '/organization-chart',
    anyPermission: [Permissions.EMPLOYEE_VIEW_ALL, Permissions.EMPLOYEE_VIEW_DEPARTMENT],
  },
  {
    path: '/org-chart',
    anyPermission: [Permissions.EMPLOYEE_VIEW_ALL, Permissions.EMPLOYEE_VIEW_DEPARTMENT],
  },

  // Onboarding
  {
    path: '/onboarding',
    anyPermission: [Permissions.EMPLOYEE_CREATE, Permissions.EMPLOYEE_UPDATE, Permissions.SYSTEM_ADMIN],
  },

  // Feedback 360
  {
    path: '/feedback360',
    anyPermission: [Permissions.FEEDBACK_360_VIEW, Permissions.FEEDBACK_360_SUBMIT],
  },

  // Dashboard - different views based on role
  // QA6-002: Fixed path from /dashboard/executive to /dashboards/executive to match actual page location
  {
    path: '/dashboards/executive',
    anyPermission: [Permissions.ANALYTICS_VIEW, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/dashboard/hr',
    permission: Permissions.DASHBOARD_HR_OPS,
  },
  {
    path: '/dashboard/manager',
    permission: Permissions.DASHBOARD_MANAGER,
  },
  {
    path: '/dashboard',
    permission: Permissions.DASHBOARD_VIEW,
  },

  // Profile - accessible to all authenticated users
  {
    path: '/profile',
    requiresAuth: true,
  },

  // Self-service pages - always accessible to authenticated users
  {
    path: '/me',
    requiresAuth: true,
  },

  // Settings - user settings, accessible to all authenticated users
  {
    path: '/settings',
    requiresAuth: true,
  },

  // ==================== Additional Route Protections ====================

  // Employee sub-pages
  {
    path: '/employees/[id]',
    anyPermission: [Permissions.EMPLOYEE_VIEW_ALL, Permissions.EMPLOYEE_VIEW_DEPARTMENT, Permissions.EMPLOYEE_VIEW_TEAM],
  },
  {
    path: '/employees/directory',
    anyPermission: [Permissions.EMPLOYEE_VIEW_ALL, Permissions.EMPLOYEE_VIEW_DEPARTMENT],
  },
  {
    path: '/employees/import',
    anyPermission: [Permissions.MIGRATION_IMPORT, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/employees/change-requests',
    hrOnly: true,
  },

  // Redirect: /executive → /dashboards/executive
  {
    path: '/executive',
    anyPermission: [Permissions.ANALYTICS_VIEW, Permissions.SYSTEM_ADMIN],
  },

  // Dashboards (plural routes matching actual pages)
  {
    path: '/dashboards/manager',
    managerOnly: true,
  },
  {
    path: '/dashboards/employee',
    requiresAuth: true,
  },

  // Payroll sub-pages
  {
    path: '/payroll/bulk-processing',
    anyPermission: [Permissions.PAYROLL_PROCESS, Permissions.PAYROLL_APPROVE],
  },
  {
    path: '/payroll/payslips',
    anyPermission: [Permissions.PAYROLL_VIEW_SELF, Permissions.PAYROLL_VIEW_ALL],
  },
  {
    path: '/payroll/statutory',
    anyPermission: [Permissions.STATUTORY_VIEW, Permissions.STATUTORY_MANAGE],
  },

  // Redirect: /goals → /performance/goals
  {
    path: '/goals',
    anyPermission: [Permissions.REVIEW_VIEW, Permissions.OKR_VIEW],
  },

  // Performance sub-pages
  {
    path: '/performance/cycles',
    anyPermission: [Permissions.REVIEW_VIEW, Permissions.REVIEW_APPROVE],
  },
  {
    path: '/performance/feedback',
    anyPermission: [Permissions.REVIEW_VIEW, Permissions.FEEDBACK_360_VIEW],
  },
  {
    path: '/performance/revolution',
    anyPermission: [Permissions.REVIEW_VIEW, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/performance/okr',
    anyPermission: [Permissions.OKR_VIEW, Permissions.OKR_CREATE],
  },
  {
    path: '/performance/360-feedback',
    anyPermission: [Permissions.FEEDBACK_360_VIEW, Permissions.FEEDBACK_360_SUBMIT],
  },

  // OKR standalone
  {
    path: '/okr',
    anyPermission: [Permissions.OKR_VIEW, Permissions.OKR_CREATE],
  },

  // Projects
  {
    path: '/projects/resource-conflicts',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },
  {
    path: '/projects/calendar',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },
  {
    path: '/projects/gantt',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },
  {
    path: '/projects/[id]',
    permission: Permissions.PROJECT_VIEW,
  },
  {
    path: '/projects',
    permission: Permissions.PROJECT_VIEW,
  },

  // Timesheets & Time Tracking
  {
    path: '/timesheets',
    anyPermission: [Permissions.TIMESHEET_SUBMIT, Permissions.TIMESHEET_APPROVE],
  },
  {
    path: '/time-tracking',
    anyPermission: [Permissions.TIMESHEET_SUBMIT, Permissions.TIMESHEET_APPROVE],
  },

  // Reports sub-pages
  {
    path: '/reports/headcount',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.HEADCOUNT_VIEW],
  },
  {
    path: '/reports/attrition',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.ANALYTICS_VIEW],
  },
  {
    path: '/reports/builder',
    anyPermission: [Permissions.REPORT_CREATE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/reports/scheduled',
    anyPermission: [Permissions.REPORT_CREATE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/reports/utilization',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.PROJECT_VIEW],
  },
  {
    path: '/reports/leave',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.LEAVE_VIEW_ALL],
  },
  {
    path: '/reports/payroll',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.PAYROLL_VIEW_ALL],
  },
  {
    path: '/reports/performance',
    anyPermission: [Permissions.REPORT_VIEW, Permissions.REVIEW_VIEW],
  },
  {
    path: '/analytics/org-health',
    anyPermission: [Permissions.ANALYTICS_VIEW, Permissions.SYSTEM_ADMIN],
  },

  // Recruitment sub-pages
  {
    path: '/recruitment/[jobId]/kanban',
    anyPermission: [Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_MANAGE],
  },
  {
    path: '/recruitment/candidates',
    anyPermission: [Permissions.CANDIDATE_VIEW, Permissions.CANDIDATE_EVALUATE],
  },
  {
    path: '/recruitment/interviews',
    anyPermission: [Permissions.CANDIDATE_VIEW, Permissions.CANDIDATE_EVALUATE],
  },
  {
    path: '/recruitment/jobs',
    anyPermission: [Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_CREATE],
  },
  {
    path: '/recruitment/pipeline',
    anyPermission: [Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_MANAGE],
  },
  {
    path: '/recruitment/job-boards',
    anyPermission: [Permissions.RECRUITMENT_MANAGE, Permissions.SYSTEM_ADMIN],
  },

  // Onboarding sub-pages
  {
    path: '/onboarding/templates',
    anyPermission: [Permissions.ONBOARDING_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/onboarding/new',
    anyPermission: [Permissions.ONBOARDING_CREATE, Permissions.ONBOARDING_MANAGE],
  },
  {
    path: '/onboarding/[id]',
    anyPermission: [Permissions.ONBOARDING_VIEW, Permissions.ONBOARDING_MANAGE],
  },

  // Leave sub-pages
  {
    path: '/leave/apply',
    permission: Permissions.LEAVE_REQUEST,
  },
  {
    path: '/leave/my-leaves',
    permission: Permissions.LEAVE_VIEW_SELF,
  },
  {
    path: '/leave/calendar',
    anyPermission: [Permissions.LEAVE_VIEW_SELF, Permissions.LEAVE_VIEW_TEAM, Permissions.LEAVE_VIEW_ALL],
  },

  // Letters
  {
    path: '/letters',
    anyPermission: [Permissions.SELF_SERVICE_VIEW_LETTERS, Permissions.LETTER_GENERATE],
  },

  // Calendar
  {
    path: '/calendar',
    requiresAuth: true,
  },

  // Loans sub-pages
  {
    path: '/loans/new',
    permission: Permissions.LOAN_CREATE,
  },
  {
    path: '/loans/[id]',
    anyPermission: [Permissions.LOAN_VIEW, Permissions.LOAN_MANAGE],
  },

  // Travel sub-pages
  {
    path: '/travel/new',
    permission: Permissions.TRAVEL_CREATE,
  },
  {
    path: '/travel/[id]',
    anyPermission: [Permissions.TRAVEL_VIEW, Permissions.TRAVEL_MANAGE],
  },

  // Helpdesk sub-pages
  {
    path: '/helpdesk/tickets',
    anyPermission: [Permissions.HELPDESK_TICKET_VIEW, Permissions.HELPDESK_TICKET_CREATE],
  },
  {
    path: '/helpdesk/knowledge-base',
    requiresAuth: true,
  },
  {
    path: '/helpdesk/sla',
    anyPermission: [Permissions.HELPDESK_SLA_MANAGE, Permissions.SYSTEM_ADMIN],
  },

  // Resources sub-pages
  {
    path: '/resources/pool',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },
  {
    path: '/resources/availability',
    anyPermission: [Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE],
  },
  {
    path: '/resources/approvals',
    anyPermission: [Permissions.PROJECT_MANAGE, Permissions.SYSTEM_ADMIN],
  },

  // Learning sub-pages
  {
    path: '/learning/courses/[id]/quiz/[quizId]',
    requiresAuth: true,
  },
  {
    path: '/learning/courses/[id]',
    anyPermission: [Permissions.LMS_COURSE_VIEW, Permissions.TRAINING_VIEW],
  },

  // Attendance sub-pages
  {
    path: '/attendance/my-attendance',
    permission: Permissions.ATTENDANCE_VIEW_SELF,
  },
  {
    path: '/attendance/team',
    anyPermission: [Permissions.ATTENDANCE_VIEW_TEAM, Permissions.ATTENDANCE_VIEW_ALL],
  },

  // Self-service sub-pages (all require auth)
  {
    path: '/me/attendance',
    requiresAuth: true,
  },
  {
    path: '/me/dashboard',
    requiresAuth: true,
  },
  {
    path: '/me/documents',
    requiresAuth: true,
  },
  {
    path: '/me/leaves',
    requiresAuth: true,
  },
  {
    path: '/me/payslips',
    requiresAuth: true,
  },
  {
    path: '/me/profile',
    requiresAuth: true,
  },

  // ==================== QA6-001: Missing Route Protections ====================

  // Payroll admin sub-pages (CRITICAL — previously accessible to all authenticated users)
  {
    path: '/payroll/salary-structures',
    anyPermission: [Permissions.PAYROLL_VIEW, Permissions.PAYROLL_VIEW_ALL],
  },
  {
    path: '/payroll/components',
    anyPermission: [Permissions.PAYROLL_VIEW, Permissions.PAYROLL_VIEW_ALL],
  },
  {
    path: '/payroll/runs',
    anyPermission: [Permissions.PAYROLL_VIEW, Permissions.PAYROLL_PROCESS],
  },
  {
    path: '/payroll/structures',
    anyPermission: [Permissions.PAYROLL_VIEW, Permissions.PAYROLL_VIEW_ALL],
  },

  // FnF + Offboarding detail pages (CRITICAL)
  {
    path: '/offboarding/[id]/fnf',
    anyPermission: [Permissions.EXIT_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/offboarding/[id]/exit-interview',
    anyPermission: [Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE],
  },
  {
    path: '/offboarding/[id]',
    anyPermission: [Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE],
  },

  // Payments
  {
    path: '/payments/config',
    anyPermission: [Permissions.PAYMENT_CONFIG, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/payments',
    anyPermission: [Permissions.PAYMENT_VIEW, Permissions.PAYMENT_PROCESS],
  },

  // Biometric devices
  {
    path: '/biometric-devices',
    anyPermission: [Permissions.ATTENDANCE_MANAGE, Permissions.SYSTEM_ADMIN],
  },

  // Compliance
  {
    path: '/compliance',
    anyPermission: [Permissions.COMPLIANCE_VIEW, Permissions.COMPLIANCE_MANAGE],
  },

  // Letter templates
  {
    path: '/letter-templates',
    anyPermission: [Permissions.LETTER_TEMPLATE_VIEW, Permissions.LETTER_TEMPLATE_MANAGE],
  },

  // LWF (Labour Welfare Fund)
  {
    path: '/lwf',
    anyPermission: [Permissions.STATUTORY_VIEW, Permissions.STATUTORY_MANAGE],
  },

  // 1-on-1 meetings
  {
    path: '/one-on-one',
    anyPermission: [Permissions.MEETING_VIEW, Permissions.MEETING_CREATE],
  },

  // Overtime
  {
    path: '/overtime',
    anyPermission: [Permissions.OVERTIME_VIEW, Permissions.OVERTIME_MANAGE],
  },

  // Predictive analytics
  {
    path: '/predictive-analytics',
    anyPermission: [Permissions.PREDICTIVE_ANALYTICS_VIEW, Permissions.PREDICTIVE_ANALYTICS_MANAGE],
  },

  // Probation management
  {
    path: '/probation',
    anyPermission: [Permissions.PROBATION_VIEW, Permissions.PROBATION_MANAGE],
  },

  // Employee referrals
  {
    path: '/referrals',
    anyPermission: [Permissions.REFERRAL_VIEW, Permissions.REFERRAL_CREATE],
  },

  // Restricted holidays
  {
    path: '/restricted-holidays',
    anyPermission: [Permissions.LEAVE_VIEW_SELF, Permissions.LEAVE_MANAGE],
  },

  // Shift management
  {
    path: '/shifts/definitions',
    anyPermission: [Permissions.SHIFT_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/shifts/patterns',
    anyPermission: [Permissions.SHIFT_MANAGE, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/shifts',
    anyPermission: [Permissions.SHIFT_VIEW, Permissions.SHIFT_MANAGE],
  },

  // Statutory filings
  {
    path: '/statutory-filings',
    anyPermission: [Permissions.STATUTORY_MANAGE, Permissions.SYSTEM_ADMIN],
  },

  // Workflow management
  {
    path: '/workflows',
    anyPermission: [Permissions.WORKFLOW_VIEW, Permissions.WORKFLOW_MANAGE],
  },

  // Expense sub-routes
  {
    path: '/expenses/settings',
    anyPermission: [Permissions.EXPENSE_SETTINGS, Permissions.SYSTEM_ADMIN],
  },
  {
    path: '/expenses/reports',
    anyPermission: [Permissions.EXPENSE_REPORT, Permissions.EXPENSE_MANAGE],
  },

  // Contract sub-routes
  {
    path: '/contracts/templates',
    anyPermission: [Permissions.CONTRACT_TEMPLATE_MANAGE, Permissions.SYSTEM_ADMIN],
  },

  // Enterprise Tools
  {
    path: '/nu-calendar',
    requiresAuth: true,
  },
  {
    path: '/nu-drive',
    requiresAuth: true,
  },
  {
    path: '/nu-mail',
    requiresAuth: true,
  },
];

/**
 * Check if a path matches a route pattern
 * Supports [param] style dynamic segments
 */
export function matchRoute(path: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\[.*?\]/g, '[^/]+') // Replace [param] with regex
    .replace(/\*/g, '.*'); // Replace * with wildcard

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Find the route configuration for a given path
 */
export function findRouteConfig(path: string): RouteConfig | null {
  // Remove query strings and hash
  const cleanPath = path.split('?')[0].split('#')[0];

  for (const route of PROTECTED_ROUTES) {
    if (matchRoute(cleanPath, route.path)) {
      return route;
    }
  }

  return null;
}

/**
 * Check if a path is a public route
 */
export function isPublicRoute(path: string): boolean {
  const cleanPath = path.split('?')[0].split('#')[0];
  return PUBLIC_ROUTES.some((route) => matchRoute(cleanPath, route));
}
