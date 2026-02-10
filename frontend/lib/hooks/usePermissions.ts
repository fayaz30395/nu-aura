'use client';

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Permission constants matching backend Permission.java
 * Format: MODULE:ACTION (e.g., EMPLOYEE:READ, PAYROLL:APPROVE)
 */
export const Permissions = {
  // Employee Management
  EMPLOYEE_READ: 'EMPLOYEE:READ',
  EMPLOYEE_CREATE: 'EMPLOYEE:CREATE',
  EMPLOYEE_UPDATE: 'EMPLOYEE:UPDATE',
  EMPLOYEE_DELETE: 'EMPLOYEE:DELETE',
  EMPLOYEE_VIEW_ALL: 'EMPLOYEE:VIEW_ALL',
  EMPLOYEE_VIEW_DEPARTMENT: 'EMPLOYEE:VIEW_DEPARTMENT',
  EMPLOYEE_VIEW_TEAM: 'EMPLOYEE:VIEW_TEAM',
  EMPLOYEE_VIEW_SELF: 'EMPLOYEE:VIEW_SELF',

  // Leave Management
  LEAVE_REQUEST: 'LEAVE:REQUEST',
  LEAVE_APPROVE: 'LEAVE:APPROVE',
  LEAVE_REJECT: 'LEAVE:REJECT',
  LEAVE_CANCEL: 'LEAVE:CANCEL',
  LEAVE_VIEW_ALL: 'LEAVE:VIEW_ALL',
  LEAVE_VIEW_TEAM: 'LEAVE:VIEW_TEAM',
  LEAVE_VIEW_SELF: 'LEAVE:VIEW_SELF',
  LEAVE_MANAGE: 'LEAVE:MANAGE',

  // Attendance Management
  ATTENDANCE_MARK: 'ATTENDANCE:MARK',
  ATTENDANCE_APPROVE: 'ATTENDANCE:APPROVE',
  ATTENDANCE_VIEW_ALL: 'ATTENDANCE:VIEW_ALL',
  ATTENDANCE_VIEW_TEAM: 'ATTENDANCE:VIEW_TEAM',
  ATTENDANCE_VIEW_SELF: 'ATTENDANCE:VIEW_SELF',
  ATTENDANCE_REGULARIZE: 'ATTENDANCE:REGULARIZE',
  ATTENDANCE_MANAGE: 'ATTENDANCE:MANAGE',

  // Payroll Management
  PAYROLL_VIEW: 'PAYROLL:VIEW',
  PAYROLL_VIEW_ALL: 'PAYROLL:VIEW_ALL',
  PAYROLL_PROCESS: 'PAYROLL:PROCESS',
  PAYROLL_APPROVE: 'PAYROLL:APPROVE',
  PAYROLL_VIEW_SELF: 'PAYROLL:VIEW_SELF',

  // Recognition & Engagement
  RECOGNITION_VIEW: 'RECOGNITION:VIEW',
  RECOGNITION_CREATE: 'RECOGNITION:CREATE',
  RECOGNITION_MANAGE: 'RECOGNITION:MANAGE',
  BADGE_MANAGE: 'BADGE:MANAGE',
  POINTS_MANAGE: 'POINTS:MANAGE',
  MILESTONE_VIEW: 'MILESTONE:VIEW',
  MILESTONE_MANAGE: 'MILESTONE:MANAGE',

  // Wall / Social
  WALL_VIEW: 'WALL:VIEW',
  WALL_POST: 'WALL:POST',
  WALL_COMMENT: 'WALL:COMMENT',
  WALL_REACT: 'WALL:REACT',
  WALL_MANAGE: 'WALL:MANAGE',
  WALL_PIN: 'WALL:PIN',

  // Reports & Analytics
  REPORT_VIEW: 'REPORT:VIEW',
  REPORT_CREATE: 'REPORT:CREATE',
  ANALYTICS_VIEW: 'ANALYTICS:VIEW',
  ANALYTICS_EXPORT: 'ANALYTICS:EXPORT',

  // Dashboard
  DASHBOARD_VIEW: 'DASHBOARD:VIEW',
  DASHBOARD_EXECUTIVE: 'DASHBOARD:EXECUTIVE',
  DASHBOARD_HR_OPS: 'DASHBOARD:HR_OPS',
  DASHBOARD_MANAGER: 'DASHBOARD:MANAGER',
  DASHBOARD_EMPLOYEE: 'DASHBOARD:EMPLOYEE',

  // System Administration
  SYSTEM_ADMIN: 'SYSTEM:ADMIN',
  ROLE_MANAGE: 'ROLE:MANAGE',
  PERMISSION_MANAGE: 'PERMISSION:MANAGE',
  USER_VIEW: 'USER:VIEW',
  USER_MANAGE: 'USER:MANAGE',
  TENANT_MANAGE: 'TENANT:MANAGE',
  AUDIT_VIEW: 'AUDIT:VIEW',

  // Department/Organization
  DEPARTMENT_MANAGE: 'DEPARTMENT:MANAGE',
  DEPARTMENT_VIEW: 'DEPARTMENT:VIEW',

  // Document Management
  DOCUMENT_VIEW: 'DOCUMENT:VIEW',
  DOCUMENT_UPLOAD: 'DOCUMENT:UPLOAD',
  DOCUMENT_APPROVE: 'DOCUMENT:APPROVE',
  DOCUMENT_DELETE: 'DOCUMENT:DELETE',

  // Recruitment
  RECRUITMENT_VIEW: 'RECRUITMENT:VIEW',
  RECRUITMENT_VIEW_ALL: 'RECRUITMENT:VIEW_ALL',
  RECRUITMENT_CREATE: 'RECRUITMENT:CREATE',
  RECRUITMENT_MANAGE: 'RECRUITMENT:MANAGE',

  // Training & LMS
  TRAINING_VIEW: 'TRAINING:VIEW',
  TRAINING_CREATE: 'TRAINING:CREATE',
  TRAINING_MANAGE: 'TRAINING:MANAGE',
  LMS_COURSE_VIEW: 'LMS:COURSE_VIEW',
  LMS_COURSE_CREATE: 'LMS:COURSE_CREATE',
  LMS_COURSE_MANAGE: 'LMS:COURSE_MANAGE',

  // Performance
  REVIEW_CREATE: 'REVIEW:CREATE',
  REVIEW_VIEW: 'REVIEW:VIEW',
  REVIEW_SUBMIT: 'REVIEW:SUBMIT',
  REVIEW_APPROVE: 'REVIEW:APPROVE',
  GOAL_CREATE: 'GOAL:CREATE',
  GOAL_APPROVE: 'GOAL:APPROVE',

  // Expense Management
  EXPENSE_VIEW: 'EXPENSE:VIEW',
  EXPENSE_CREATE: 'EXPENSE:CREATE',
  EXPENSE_APPROVE: 'EXPENSE:APPROVE',
  EXPENSE_MANAGE: 'EXPENSE:MANAGE',
  EXPENSE_VIEW_ALL: 'EXPENSE:VIEW_ALL',

  // Helpdesk
  HELPDESK_TICKET_CREATE: 'HELPDESK:TICKET_CREATE',
  HELPDESK_TICKET_VIEW: 'HELPDESK:TICKET_VIEW',
  HELPDESK_TICKET_ASSIGN: 'HELPDESK:TICKET_ASSIGN',
  HELPDESK_TICKET_RESOLVE: 'HELPDESK:TICKET_RESOLVE',

  // Settings
  SETTINGS_VIEW: 'SETTINGS:VIEW',
  SETTINGS_UPDATE: 'SETTINGS:UPDATE',

  // Office Location & Geofencing
  OFFICE_LOCATION_VIEW: 'OFFICE_LOCATION:VIEW',
  OFFICE_LOCATION_CREATE: 'OFFICE_LOCATION:CREATE',
  OFFICE_LOCATION_UPDATE: 'OFFICE_LOCATION:UPDATE',
  OFFICE_LOCATION_DELETE: 'OFFICE_LOCATION:DELETE',
  GEOFENCE_MANAGE: 'GEOFENCE:MANAGE',

  // Shift Management
  SHIFT_VIEW: 'SHIFT:VIEW',
  SHIFT_CREATE: 'SHIFT:CREATE',
  SHIFT_ASSIGN: 'SHIFT:ASSIGN',
  SHIFT_MANAGE: 'SHIFT:MANAGE',

  // Custom Fields
  CUSTOM_FIELD_VIEW: 'CUSTOM_FIELD:VIEW',
  CUSTOM_FIELD_CREATE: 'CUSTOM_FIELD:CREATE',
  CUSTOM_FIELD_UPDATE: 'CUSTOM_FIELD:UPDATE',
  CUSTOM_FIELD_DELETE: 'CUSTOM_FIELD:DELETE',
  CUSTOM_FIELD_MANAGE: 'CUSTOM_FIELD:MANAGE',

  // Projects & Timesheets
  PROJECT_VIEW: 'PROJECT:VIEW',
  PROJECT_CREATE: 'PROJECT:CREATE',
  PROJECT_MANAGE: 'PROJECT:MANAGE',
  TIMESHEET_SUBMIT: 'TIMESHEET:SUBMIT',
  TIMESHEET_APPROVE: 'TIMESHEET:APPROVE',
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

/**
 * Role constants matching backend roles
 */
export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  PAYROLL_ADMIN: 'PAYROLL_ADMIN',
  RECRUITER: 'RECRUITER',
  TRAINER: 'TRAINER',
} as const;

export type RoleCode = (typeof Roles)[keyof typeof Roles];

interface UsePermissionsReturn {
  /** All permission codes the user has */
  permissions: string[];
  /** All role codes the user has */
  roles: string[];
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has ANY of the specified permissions (OR logic) */
  hasAnyPermission: (...permissions: string[]) => boolean;
  /** Check if user has ALL of the specified permissions (AND logic) */
  hasAllPermissions: (...permissions: string[]) => boolean;
  /** Check if user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if user has ANY of the specified roles (OR logic) */
  hasAnyRole: (...roles: string[]) => boolean;
  /** Check if user has ALL of the specified roles (AND logic) */
  hasAllRoles: (...roles: string[]) => boolean;
  /** Check if user is a system admin (SUPER_ADMIN or TENANT_ADMIN) */
  isAdmin: boolean;
  /** Check if user has HR privileges */
  isHR: boolean;
  /** Check if user has manager privileges */
  isManager: boolean;
  /** Check if the auth state has been hydrated */
  isReady: boolean;
}

/**
 * Hook for checking user permissions and roles
 *
 * @example
 * const { hasPermission, hasAnyRole, isAdmin } = usePermissions();
 *
 * // Check single permission
 * if (hasPermission(Permissions.EMPLOYEE_CREATE)) { ... }
 *
 * // Check any of multiple permissions
 * if (hasAnyPermission(Permissions.LEAVE_APPROVE, Permissions.LEAVE_MANAGE)) { ... }
 *
 * // Check role
 * if (hasAnyRole(Roles.HR_ADMIN, Roles.HR_MANAGER)) { ... }
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, hasHydrated } = useAuth();

  // Extract all permission codes from user's roles
  const permissions = useMemo(() => {
    if (!user?.roles) return [];
    const permSet = new Set<string>();
    for (const role of user.roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          permSet.add(perm.code);
        }
      }
    }
    return Array.from(permSet);
  }, [user?.roles]);

  // Extract all role codes
  const roles = useMemo(() => {
    if (!user?.roles) return [];
    return user.roles.map((r) => r.code);
  }, [user?.roles]);

  // Permission check functions
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (...perms: string[]): boolean => {
      return perms.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (...perms: string[]): boolean => {
      return perms.every((p) => permissions.includes(p));
    },
    [permissions]
  );

  // Role check functions
  const hasRole = useCallback(
    (role: string): boolean => {
      return roles.includes(role);
    },
    [roles]
  );

  const hasAnyRole = useCallback(
    (...roleList: string[]): boolean => {
      return roleList.some((r) => roles.includes(r));
    },
    [roles]
  );

  const hasAllRoles = useCallback(
    (...roleList: string[]): boolean => {
      return roleList.every((r) => roles.includes(r));
    },
    [roles]
  );

  // Convenience checks
  const isAdmin = useMemo(
    () => hasAnyRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN),
    [hasAnyRole]
  );

  const isHR = useMemo(
    () => hasAnyRole(Roles.HR_ADMIN, Roles.HR_MANAGER, Roles.SUPER_ADMIN, Roles.TENANT_ADMIN),
    [hasAnyRole]
  );

  const isManager = useMemo(
    () =>
      hasAnyRole(
        Roles.MANAGER,
        Roles.TEAM_LEAD,
        Roles.DEPARTMENT_HEAD,
        Roles.HR_MANAGER,
        Roles.HR_ADMIN,
        Roles.SUPER_ADMIN,
        Roles.TENANT_ADMIN
      ),
    [hasAnyRole]
  );

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isHR,
    isManager,
    isReady: hasHydrated,
  };
}

export default usePermissions;
