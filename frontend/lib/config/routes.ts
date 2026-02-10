import { Permissions, Roles } from '../hooks/usePermissions';

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
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
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
    anyPermission: [Permissions.SYSTEM_ADMIN, Permissions.LEAVE_MANAGE],
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
    path: '/performance',
    permission: Permissions.REVIEW_VIEW,
  },

  // Recruitment
  {
    path: '/recruitment',
    anyPermission: [
      Permissions.RECRUITMENT_VIEW,
      Permissions.RECRUITMENT_CREATE,
      Permissions.RECRUITMENT_MANAGE,
    ],
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

  // Dashboard - different views based on role
  {
    path: '/dashboard/executive',
    permission: Permissions.DASHBOARD_EXECUTIVE,
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

  // Home - accessible to all authenticated users
  {
    path: '/home',
    requiresAuth: true,
  },

  // Profile - accessible to all authenticated users
  {
    path: '/profile',
    requiresAuth: true,
  },

  // Settings - user settings, accessible to all authenticated users
  {
    path: '/settings',
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
