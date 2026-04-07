'use client';

import {useCallback, useMemo} from 'react';
import {useAuth} from './useAuth';

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
  EMPLOYEE_MANAGE: 'EMPLOYEE:MANAGE',
  EMPLOYEE_BANK_READ: 'EMPLOYEE_BANK:READ',

  // Employment Change Requests
  EMPLOYMENT_CHANGE_VIEW: 'EMPLOYMENT_CHANGE:VIEW',
  EMPLOYMENT_CHANGE_VIEW_ALL: 'EMPLOYMENT_CHANGE:VIEW_ALL',
  EMPLOYMENT_CHANGE_CREATE: 'EMPLOYMENT_CHANGE:CREATE',
  EMPLOYMENT_CHANGE_APPROVE: 'EMPLOYMENT_CHANGE:APPROVE',
  EMPLOYMENT_CHANGE_CANCEL: 'EMPLOYMENT_CHANGE:CANCEL',

  // Leave Management
  LEAVE_REQUEST: 'LEAVE:REQUEST',
  LEAVE_APPROVE: 'LEAVE:APPROVE',
  LEAVE_REJECT: 'LEAVE:REJECT',
  LEAVE_CANCEL: 'LEAVE:CANCEL',
  LEAVE_APPLY: 'LEAVE:REQUEST', // H-1: backend only has LEAVE:REQUEST (not LEAVE:APPLY)
  LEAVE_VIEW_ALL: 'LEAVE:VIEW_ALL',
  LEAVE_VIEW_TEAM: 'LEAVE:VIEW_TEAM',
  LEAVE_VIEW_SELF: 'LEAVE:VIEW_SELF',
  LEAVE_MANAGE: 'LEAVE:MANAGE',

  // Leave Type Management
  LEAVE_TYPE_VIEW: 'LEAVE_TYPE:VIEW',
  LEAVE_TYPE_MANAGE: 'LEAVE_TYPE:MANAGE',

  // Leave Balance Management
  LEAVE_BALANCE_VIEW: 'LEAVE_BALANCE:VIEW',
  LEAVE_BALANCE_VIEW_ALL: 'LEAVE_BALANCE:VIEW_ALL',
  LEAVE_BALANCE_MANAGE: 'LEAVE_BALANCE:MANAGE',

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
  REPORT_SCHEDULE: 'REPORT:SCHEDULE',
  ANALYTICS_VIEW: 'ANALYTICS:VIEW',
  ANALYTICS_EXPORT: 'ANALYTICS:EXPORT',

  // Dashboard
  DASHBOARD_VIEW: 'DASHBOARD:VIEW',
  DASHBOARD_EXECUTIVE: 'DASHBOARD:EXECUTIVE',
  DASHBOARD_HR_OPS: 'DASHBOARD:HR_OPS',
  DASHBOARD_MANAGER: 'DASHBOARD:MANAGER',
  DASHBOARD_EMPLOYEE: 'DASHBOARD:EMPLOYEE',
  DASHBOARD_WIDGETS: 'DASHBOARD:WIDGETS',

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

  // Organization Structure
  ORG_STRUCTURE_VIEW: 'ORG_STRUCTURE:VIEW',
  ORG_STRUCTURE_MANAGE: 'ORG_STRUCTURE:MANAGE',
  POSITION_VIEW: 'POSITION:VIEW',
  POSITION_MANAGE: 'POSITION:MANAGE',
  SUCCESSION_VIEW: 'SUCCESSION:VIEW',
  SUCCESSION_MANAGE: 'SUCCESSION:MANAGE',
  TALENT_POOL_VIEW: 'TALENT_POOL:VIEW',
  TALENT_POOL_MANAGE: 'TALENT_POOL:MANAGE',

  // Document Management
  DOCUMENT_VIEW: 'DOCUMENT:VIEW',
  DOCUMENT_UPLOAD: 'DOCUMENT:UPLOAD',
  DOCUMENT_APPROVE: 'DOCUMENT:APPROVE',
  DOCUMENT_DELETE: 'DOCUMENT:DELETE',

  // Recruitment
  RECRUITMENT_VIEW: 'RECRUITMENT:VIEW',
  RECRUITMENT_VIEW_ALL: 'RECRUITMENT:VIEW_ALL',
  RECRUITMENT_VIEW_TEAM: 'RECRUITMENT:VIEW_TEAM',
  RECRUITMENT_CREATE: 'RECRUITMENT:CREATE',
  RECRUITMENT_MANAGE: 'RECRUITMENT:MANAGE',
  CANDIDATE_VIEW: 'CANDIDATE:VIEW',
  CANDIDATE_EVALUATE: 'CANDIDATE:EVALUATE',

  // Training & LMS
  TRAINING_VIEW: 'TRAINING:VIEW',
  TRAINING_CREATE: 'TRAINING:CREATE',
  TRAINING_EDIT: 'TRAINING:EDIT',
  TRAINING_ENROLL: 'TRAINING:ENROLL',
  TRAINING_APPROVE: 'TRAINING:APPROVE',
  TRAINING_MANAGE: 'TRAINING:MANAGE',
  LMS_COURSE_VIEW: 'LMS:COURSE_VIEW',
  LMS_COURSE_CREATE: 'LMS:COURSE_CREATE',
  LMS_COURSE_MANAGE: 'LMS:COURSE_MANAGE',
  LMS_MODULE_CREATE: 'LMS:MODULE_CREATE',
  LMS_QUIZ_CREATE: 'LMS:QUIZ_CREATE',
  LMS_ENROLL: 'LMS:ENROLL',
  LMS_CERTIFICATE_VIEW: 'LMS:CERTIFICATE_VIEW',

  // Performance
  REVIEW_CREATE: 'REVIEW:CREATE',
  REVIEW_VIEW: 'REVIEW:VIEW',
  REVIEW_SUBMIT: 'REVIEW:SUBMIT',
  REVIEW_APPROVE: 'REVIEW:APPROVE',
  REVIEW_UPDATE: 'REVIEW:UPDATE',
  REVIEW_DELETE: 'REVIEW:DELETE',
  GOAL_CREATE: 'GOAL:CREATE',
  GOAL_UPDATE: 'GOAL:UPDATE',
  GOAL_DELETE: 'GOAL:DELETE',
  GOAL_APPROVE: 'GOAL:APPROVE',

  // OKR (Objectives & Key Results)
  OKR_VIEW: 'OKR:VIEW',
  OKR_CREATE: 'OKR:CREATE',
  OKR_UPDATE: 'OKR:UPDATE',
  OKR_DELETE: 'OKR:DELETE',
  OKR_APPROVE: 'OKR:APPROVE',
  OKR_VIEW_ALL: 'OKR:VIEW_ALL',

  // 360 Feedback
  FEEDBACK_360_VIEW: 'FEEDBACK_360:VIEW',
  FEEDBACK_360_CREATE: 'FEEDBACK_360:CREATE',
  FEEDBACK_360_SUBMIT: 'FEEDBACK_360:SUBMIT',
  FEEDBACK_360_MANAGE: 'FEEDBACK_360:MANAGE',

  // Feedback (general peer/upward feedback)
  FEEDBACK_CREATE: 'FEEDBACK:CREATE',
  FEEDBACK_UPDATE: 'FEEDBACK:UPDATE',
  FEEDBACK_DELETE: 'FEEDBACK:DELETE',

  // Performance Improvement Plans
  PIP_VIEW: 'PIP:VIEW',
  PIP_CREATE: 'PIP:CREATE',
  PIP_MANAGE: 'PIP:MANAGE',
  PIP_CLOSE: 'PIP:CLOSE',

  // Performance Calibration
  CALIBRATION_VIEW: 'CALIBRATION:VIEW',
  CALIBRATION_MANAGE: 'CALIBRATION:MANAGE',

  // Probation Management
  PROBATION_VIEW: 'PROBATION:VIEW',
  PROBATION_MANAGE: 'PROBATION:MANAGE',
  PROBATION_VIEW_ALL: 'PROBATION:VIEW_ALL',
  PROBATION_VIEW_TEAM: 'PROBATION:VIEW_TEAM',

  // Expense Management
  EXPENSE_VIEW: 'EXPENSE:VIEW',
  EXPENSE_CREATE: 'EXPENSE:CREATE',
  EXPENSE_APPROVE: 'EXPENSE:APPROVE',
  EXPENSE_MANAGE: 'EXPENSE:MANAGE',
  EXPENSE_VIEW_ALL: 'EXPENSE:VIEW_ALL',
  EXPENSE_VIEW_TEAM: 'EXPENSE:VIEW_TEAM',
  EXPENSE_SETTINGS: 'EXPENSE:SETTINGS',
  EXPENSE_ADVANCE_MANAGE: 'EXPENSE:ADVANCE_MANAGE',
  EXPENSE_REPORT: 'EXPENSE:REPORT',

  // Payment Gateway
  PAYMENT_VIEW: 'PAYMENT:VIEW',
  PAYMENT_PROCESS: 'PAYMENT:PROCESS', // kept for backward compat
  PAYMENT_INITIATE: 'PAYMENT:INITIATE', // H-2: backend uses PAYMENT:INITIATE
  PAYMENT_REFUND: 'PAYMENT:REFUND',
  PAYMENT_CONFIG: 'PAYMENT:CONFIG_MANAGE', // H-2: backend uses PAYMENT:CONFIG_MANAGE (not PAYMENT:CONFIG)

  // Helpdesk
  HELPDESK_TICKET_CREATE: 'HELPDESK:TICKET_CREATE',
  HELPDESK_TICKET_VIEW: 'HELPDESK:TICKET_VIEW',
  HELPDESK_TICKET_ASSIGN: 'HELPDESK:TICKET_ASSIGN',
  HELPDESK_TICKET_RESOLVE: 'HELPDESK:TICKET_RESOLVE',
  HELPDESK_CATEGORY_MANAGE: 'HELPDESK:CATEGORY_MANAGE',
  HELPDESK_SLA_MANAGE: 'HELPDESK:SLA_MANAGE',

  // Settings
  SETTINGS_VIEW: 'SETTINGS:VIEW',
  SETTINGS_UPDATE: 'SETTINGS:UPDATE',

  // Office Location & Geofencing
  OFFICE_LOCATION_VIEW: 'OFFICE_LOCATION:VIEW',
  OFFICE_LOCATION_CREATE: 'OFFICE_LOCATION:CREATE',
  OFFICE_LOCATION_UPDATE: 'OFFICE_LOCATION:UPDATE',
  OFFICE_LOCATION_DELETE: 'OFFICE_LOCATION:DELETE',
  GEOFENCE_MANAGE: 'GEOFENCE:MANAGE',
  GEOFENCE_BYPASS: 'GEOFENCE:BYPASS',

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

  // Resource Allocation Management
  ALLOCATION_VIEW: 'ALLOCATION:VIEW',
  ALLOCATION_CREATE: 'ALLOCATION:CREATE',
  ALLOCATION_APPROVE: 'ALLOCATION:APPROVE',
  ALLOCATION_MANAGE: 'ALLOCATION:MANAGE',

  // Statutory Compliance
  STATUTORY_VIEW: 'STATUTORY:VIEW',
  STATUTORY_MANAGE: 'STATUTORY:MANAGE',
  TDS_DECLARE: 'TDS:DECLARE',
  TDS_APPROVE: 'TDS:APPROVE',

  // Tax Management
  TAX_VIEW: 'TAX:VIEW',
  TAX_CREATE: 'TAX:CREATE',
  TAX_UPDATE: 'TAX:UPDATE',
  TAX_MANAGE: 'TAX:MANAGE',

  // Compensation Management
  COMPENSATION_VIEW: 'COMPENSATION:VIEW',
  COMPENSATION_MANAGE: 'COMPENSATION:MANAGE',
  COMPENSATION_APPROVE: 'COMPENSATION:APPROVE',
  COMPENSATION_VIEW_ALL: 'COMPENSATION:VIEW_ALL',

  // Benefits Management
  BENEFIT_VIEW: 'BENEFIT:VIEW',
  BENEFIT_VIEW_SELF: 'BENEFIT:VIEW_SELF',
  BENEFIT_ENROLL: 'BENEFIT:ENROLL',
  BENEFIT_MANAGE: 'BENEFIT:MANAGE',
  BENEFIT_APPROVE: 'BENEFIT:APPROVE',
  BENEFIT_CLAIM_SUBMIT: 'BENEFIT:CLAIM_SUBMIT',
  BENEFIT_CLAIM_PROCESS: 'BENEFIT:CLAIM_PROCESS',

  // Announcement Management
  ANNOUNCEMENT_VIEW: 'ANNOUNCEMENT:VIEW',
  ANNOUNCEMENT_CREATE: 'ANNOUNCEMENT:CREATE',
  ANNOUNCEMENT_MANAGE: 'ANNOUNCEMENT:MANAGE',

  // Asset Management
  ASSET_VIEW: 'ASSET:VIEW',
  ASSET_CREATE: 'ASSET:CREATE',
  ASSET_ASSIGN: 'ASSET:ASSIGN',
  ASSET_MANAGE: 'ASSET:MANAGE',

  // Contract Management
  CONTRACT_VIEW: 'CONTRACT:VIEW',
  CONTRACT_CREATE: 'CONTRACT:CREATE',
  CONTRACT_UPDATE: 'CONTRACT:UPDATE',
  CONTRACT_DELETE: 'CONTRACT:DELETE',
  CONTRACT_APPROVE: 'CONTRACT:APPROVE',
  CONTRACT_SIGN: 'CONTRACT:SIGN',
  CONTRACT_TEMPLATE_MANAGE: 'CONTRACT:TEMPLATE_MANAGE',

  // Travel Management
  TRAVEL_VIEW: 'TRAVEL:VIEW',
  TRAVEL_CREATE: 'TRAVEL:CREATE',
  TRAVEL_UPDATE: 'TRAVEL:UPDATE',
  TRAVEL_APPROVE: 'TRAVEL:APPROVE',
  TRAVEL_VIEW_ALL: 'TRAVEL:VIEW_ALL',
  TRAVEL_MANAGE: 'TRAVEL:MANAGE',

  // Employee Loans
  LOAN_VIEW: 'LOAN:VIEW',
  LOAN_CREATE: 'LOAN:CREATE',
  LOAN_UPDATE: 'LOAN:UPDATE',
  LOAN_APPROVE: 'LOAN:APPROVE',
  LOAN_VIEW_ALL: 'LOAN:VIEW_ALL',
  LOAN_MANAGE: 'LOAN:MANAGE',

  // Exit/Offboarding Management
  EXIT_VIEW: 'EXIT:VIEW',
  EXIT_INITIATE: 'EXIT:INITIATE',
  EXIT_MANAGE: 'EXIT:MANAGE',
  EXIT_APPROVE: 'EXIT:APPROVE',

  // Onboarding Management
  ONBOARDING_VIEW: 'ONBOARDING:VIEW',
  ONBOARDING_CREATE: 'ONBOARDING:CREATE',
  ONBOARDING_MANAGE: 'ONBOARDING:MANAGE',

  // Pre-boarding
  PREBOARDING_VIEW: 'PREBOARDING:VIEW',
  PREBOARDING_CREATE: 'PREBOARDING:CREATE',
  PREBOARDING_MANAGE: 'PREBOARDING:MANAGE',

  // Employee Wellness
  WELLNESS_VIEW: 'WELLNESS:VIEW',
  WELLNESS_CREATE: 'WELLNESS:CREATE',
  WELLNESS_MANAGE: 'WELLNESS:MANAGE',

  // Pulse Surveys / Engagement
  SURVEY_VIEW: 'SURVEY:VIEW',
  SURVEY_MANAGE: 'SURVEY:MANAGE',
  SURVEY_SUBMIT: 'SURVEY:SUBMIT',

  // 1-on-1 Meetings
  MEETING_VIEW: 'MEETING:VIEW',
  MEETING_CREATE: 'MEETING:CREATE',
  MEETING_MANAGE: 'MEETING:MANAGE',

  // Employee Referral Program
  REFERRAL_VIEW: 'REFERRAL:VIEW',
  REFERRAL_CREATE: 'REFERRAL:CREATE',
  REFERRAL_MANAGE: 'REFERRAL:MANAGE',

  // Compliance & Audit Management
  COMPLIANCE_VIEW: 'COMPLIANCE:VIEW',
  COMPLIANCE_MANAGE: 'COMPLIANCE:MANAGE',
  POLICY_MANAGE: 'POLICY:MANAGE',
  CHECKLIST_VIEW: 'CHECKLIST:VIEW',
  CHECKLIST_MANAGE: 'CHECKLIST:MANAGE',
  ALERT_VIEW: 'ALERT:VIEW',
  ALERT_MANAGE: 'ALERT:MANAGE',

  // Budget & Headcount Planning
  BUDGET_VIEW: 'BUDGET:VIEW',
  BUDGET_CREATE: 'BUDGET:CREATE',
  BUDGET_APPROVE: 'BUDGET:APPROVE',
  BUDGET_MANAGE: 'BUDGET:MANAGE',
  HEADCOUNT_VIEW: 'HEADCOUNT:VIEW',
  HEADCOUNT_MANAGE: 'HEADCOUNT:MANAGE',

  // Data Migration
  MIGRATION_IMPORT: 'MIGRATION:IMPORT',
  MIGRATION_EXPORT: 'MIGRATION:EXPORT',

  // Self-Service Portal
  SELF_SERVICE_PROFILE_UPDATE: 'SELF_SERVICE:PROFILE_UPDATE',
  SELF_SERVICE_DOCUMENT_REQUEST: 'SELF_SERVICE:DOCUMENT_REQUEST',
  SELF_SERVICE_VIEW_PAYSLIP: 'SELF_SERVICE:VIEW_PAYSLIP',
  SELF_SERVICE_VIEW_LETTERS: 'SELF_SERVICE:VIEW_LETTERS',

  // Letter Generation
  LETTER_TEMPLATE_VIEW: 'LETTER:TEMPLATE_VIEW',
  LETTER_TEMPLATE_CREATE: 'LETTER:TEMPLATE_CREATE',
  LETTER_TEMPLATE_MANAGE: 'LETTER:TEMPLATE_MANAGE',
  LETTER_GENERATE: 'LETTER:GENERATE',
  LETTER_APPROVE: 'LETTER:APPROVE',
  LETTER_ISSUE: 'LETTER:ISSUE',

  // Overtime Management
  OVERTIME_VIEW: 'OVERTIME:VIEW',
  OVERTIME_REQUEST: 'OVERTIME:REQUEST',
  OVERTIME_APPROVE: 'OVERTIME:APPROVE',
  OVERTIME_MANAGE: 'OVERTIME:MANAGE',

  // E-Signature Management
  ESIGNATURE_VIEW: 'ESIGNATURE:VIEW',
  ESIGNATURE_REQUEST: 'ESIGNATURE:REQUEST',
  ESIGNATURE_SIGN: 'ESIGNATURE:SIGN',
  ESIGNATURE_MANAGE: 'ESIGNATURE:MANAGE',

  // Workflow Management
  WORKFLOW_VIEW: 'WORKFLOW:VIEW',
  WORKFLOW_CREATE: 'WORKFLOW:CREATE',
  WORKFLOW_MANAGE: 'WORKFLOW:MANAGE',
  WORKFLOW_EXECUTE: 'WORKFLOW:EXECUTE',

  // Platform Administration
  PLATFORM_VIEW: 'PLATFORM:VIEW',
  PLATFORM_MANAGE: 'PLATFORM:MANAGE',

  // Time Tracking & Timesheets
  TIME_TRACKING_VIEW: 'TIME_TRACKING:VIEW',
  TIME_TRACKING_CREATE: 'TIME_TRACKING:CREATE',
  TIME_TRACKING_UPDATE: 'TIME_TRACKING:UPDATE',
  TIME_TRACKING_APPROVE: 'TIME_TRACKING:APPROVE',
  TIME_TRACKING_VIEW_ALL: 'TIME_TRACKING:VIEW_ALL',
  TIME_TRACKING_MANAGE: 'TIME_TRACKING:MANAGE',
  TIMESHEET_VIEW: 'TIMESHEET:VIEW',
  TIMESHEET_CREATE: 'TIMESHEET:CREATE',
  TIMESHEET_UPDATE: 'TIMESHEET:UPDATE',
  TIMESHEET_DELETE: 'TIMESHEET:DELETE',
  TIMESHEET_VIEW_ALL: 'TIMESHEET:VIEW_ALL',

  // PSA (Professional Services Automation)
  PSA_VIEW: 'PSA:VIEW',
  PSA_CREATE: 'PSA:CREATE',
  PSA_UPDATE: 'PSA:UPDATE',
  PSA_DELETE: 'PSA:DELETE',
  PSA_MANAGE: 'PSA:MANAGE',

  // Resource Management
  RESOURCE_VIEW: 'RESOURCE:VIEW',
  RESOURCE_CREATE: 'RESOURCE:CREATE',
  RESOURCE_UPDATE: 'RESOURCE:UPDATE',
  RESOURCE_DELETE: 'RESOURCE:DELETE',
  RESOURCE_MANAGE: 'RESOURCE:MANAGE',

  // Email/NU-Mail
  EMAIL_VIEW: 'EMAIL:VIEW',
  EMAIL_SEND: 'EMAIL:SEND',
  EMAIL_MANAGE: 'EMAIL:MANAGE',

  // Integrations
  INTEGRATION_VIEW: 'INTEGRATION:VIEW',
  INTEGRATION_CREATE: 'INTEGRATION:CREATE',
  INTEGRATION_UPDATE: 'INTEGRATION:UPDATE',
  INTEGRATION_DELETE: 'INTEGRATION:DELETE',
  INTEGRATION_MANAGE: 'INTEGRATION:MANAGE',

  // Helpdesk Knowledge Base
  HELPDESK_KB_VIEW: 'HELPDESK_KB:VIEW',
  HELPDESK_KB_CREATE: 'HELPDESK_KB:CREATE',
  HELPDESK_KB_UPDATE: 'HELPDESK_KB:UPDATE',
  HELPDESK_KB_DELETE: 'HELPDESK_KB:DELETE',

  // Calendar Integration
  CALENDAR_VIEW: 'CALENDAR:VIEW',
  CALENDAR_CREATE: 'CALENDAR:CREATE',
  CALENDAR_UPDATE: 'CALENDAR:UPDATE',
  CALENDAR_DELETE: 'CALENDAR:DELETE',
  CALENDAR_MANAGE: 'CALENDAR:MANAGE',
  CALENDAR_SYNC: 'CALENDAR:SYNC',

  // Multi-Currency Payroll
  CURRENCY_MANAGE: 'CURRENCY:MANAGE',
  EXCHANGE_RATE_MANAGE: 'EXCHANGE_RATE:MANAGE',
  GLOBAL_PAYROLL_VIEW: 'GLOBAL_PAYROLL:VIEW',
  GLOBAL_PAYROLL_MANAGE: 'GLOBAL_PAYROLL:MANAGE',

  // Multi-Channel Notifications
  NOTIFICATION_VIEW: 'NOTIFICATION:VIEW',
  NOTIFICATION_CREATE: 'NOTIFICATION:CREATE',
  NOTIFICATION_MANAGE: 'NOTIFICATION:MANAGE',
  NOTIFICATION_SEND: 'NOTIFICATION:SEND',

  // Predictive Analytics
  PREDICTIVE_ANALYTICS_VIEW: 'PREDICTIVE_ANALYTICS:VIEW',
  PREDICTIVE_ANALYTICS_MANAGE: 'PREDICTIVE_ANALYTICS:MANAGE',

  // Knowledge Management (NU-Fluence)
  KNOWLEDGE_VIEW: 'KNOWLEDGE:VIEW',
  KNOWLEDGE_CREATE: 'KNOWLEDGE:CREATE',
  KNOWLEDGE_UPDATE: 'KNOWLEDGE:UPDATE',
  KNOWLEDGE_DELETE: 'KNOWLEDGE:DELETE',
  KNOWLEDGE_MANAGE: 'KNOWLEDGE:MANAGE',
  WIKI_VIEW: 'WIKI:VIEW',
  WIKI_CREATE: 'WIKI:CREATE',
  WIKI_MANAGE: 'WIKI:MANAGE',
  BLOG_VIEW: 'BLOG:VIEW',
  BLOG_CREATE: 'BLOG:CREATE',
  BLOG_MANAGE: 'BLOG:MANAGE',
  WALL_FLUENCE_VIEW: 'WALL_FLUENCE:VIEW',
  WALL_FLUENCE_POST: 'WALL_FLUENCE:POST',
  WALL_FLUENCE_MANAGE: 'WALL_FLUENCE:MANAGE',

  // Fluence Wiki (detailed permissions)
  KNOWLEDGE_WIKI_CREATE: 'KNOWLEDGE:WIKI_CREATE',
  KNOWLEDGE_WIKI_READ: 'KNOWLEDGE:WIKI_READ',
  KNOWLEDGE_WIKI_UPDATE: 'KNOWLEDGE:WIKI_UPDATE',
  KNOWLEDGE_WIKI_DELETE: 'KNOWLEDGE:WIKI_DELETE',
  KNOWLEDGE_WIKI_PUBLISH: 'KNOWLEDGE:WIKI_PUBLISH',
  KNOWLEDGE_WIKI_APPROVE: 'KNOWLEDGE:WIKI_APPROVE',

  // Fluence Blog (detailed permissions)
  KNOWLEDGE_BLOG_CREATE: 'KNOWLEDGE:BLOG_CREATE',
  KNOWLEDGE_BLOG_READ: 'KNOWLEDGE:BLOG_READ',
  KNOWLEDGE_BLOG_UPDATE: 'KNOWLEDGE:BLOG_UPDATE',
  KNOWLEDGE_BLOG_DELETE: 'KNOWLEDGE:BLOG_DELETE',
  KNOWLEDGE_BLOG_PUBLISH: 'KNOWLEDGE:BLOG_PUBLISH',

  // Fluence Template (detailed permissions)
  KNOWLEDGE_TEMPLATE_CREATE: 'KNOWLEDGE:TEMPLATE_CREATE',
  KNOWLEDGE_TEMPLATE_READ: 'KNOWLEDGE:TEMPLATE_READ',
  KNOWLEDGE_TEMPLATE_UPDATE: 'KNOWLEDGE:TEMPLATE_UPDATE',
  KNOWLEDGE_TEMPLATE_DELETE: 'KNOWLEDGE:TEMPLATE_DELETE',

  // Agency Management
  AGENCY_VIEW: 'AGENCY:VIEW',
  AGENCY_CREATE: 'AGENCY:CREATE',
  AGENCY_UPDATE: 'AGENCY:UPDATE',
  AGENCY_DELETE: 'AGENCY:DELETE',
  AGENCY_MANAGE: 'AGENCY:MANAGE',
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

/**
 * Role constants matching backend roles
 */
export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  // Real backend role (rank 85) — senior HR leadership above HR_MANAGER
  HR_ADMIN: 'HR_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_EXECUTIVE: 'HR_EXECUTIVE',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
  // L-1: MANAGER is not a real backend role — use DEPARTMENT_MANAGER or TEAM_LEAD instead
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  PAYROLL_ADMIN: 'PAYROLL_ADMIN',
  RECRUITER: 'RECRUITER',
  RECRUITMENT_ADMIN: 'RECRUITMENT_ADMIN',
  TRAINER: 'TRAINER',
  PROJECT_ADMIN: 'PROJECT_ADMIN',
  ASSET_MANAGER: 'ASSET_MANAGER',
  EXPENSE_MANAGER: 'EXPENSE_MANAGER',
  HELPDESK_ADMIN: 'HELPDESK_ADMIN',
  TRAVEL_ADMIN: 'TRAVEL_ADMIN',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  LMS_ADMIN: 'LMS_ADMIN',
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
  const {user, hasHydrated} = useAuth();

  // Extract all permission codes from user's roles
  // Normalizes app-prefixed permissions (e.g., "HRMS:EMPLOYEE:READ" -> "EMPLOYEE:READ")
  // so both NU Platform and legacy RBAC paths produce MODULE:ACTION format.
  const permissions = useMemo(() => {
    if (!user?.roles) return [];
    const permSet = new Set<string>();
    for (const role of user.roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          const code = perm.code;
          permSet.add(code);

          // Normalize dot-separated lowercase format from backend (e.g. "employee.read" → "EMPLOYEE:READ")
          // V19 seeds permissions as resource.action (dots, lowercase) but frontend Permissions constants use MODULE:ACTION (colons, uppercase)
          if (code.includes('.')) {
            const dotParts = code.split('.');
            if (dotParts.length === 2) {
              permSet.add(dotParts[0].toUpperCase() + ':' + dotParts[1].toUpperCase());
            }
          }

          // Also add normalized version: strip app prefix if 3-part code (APP:MODULE:ACTION)
          const parts = code.split(':');
          if (parts.length === 3) {
            permSet.add(parts[1] + ':' + parts[2]);
          }
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

  // Check if user has SYSTEM_ADMIN (bypasses all permission checks, like backend SecurityContext)
  const isSystemAdmin = useMemo(
    () =>
      permissions.includes(Permissions.SYSTEM_ADMIN) ||
      permissions.includes('HRMS:SYSTEM:ADMIN') ||
      permissions.includes('system.admin'),
    [permissions]
  );

  // Check if user has admin role (SUPER_ADMIN or TENANT_ADMIN) — bypasses all permission checks
  const isAdmin = useMemo(
    () => roles.includes(Roles.SUPER_ADMIN) || roles.includes(Roles.TENANT_ADMIN),
    [roles]
  );

  // Permission check functions
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // SUPER_ADMIN / TENANT_ADMIN bypasses all permission checks (mirrors backend SecurityConfig filter chain)
      if (isAdmin) return true;
      // SYSTEM_ADMIN permission also bypasses all checks (mirrors backend SecurityContext.hasPermission)
      if (isSystemAdmin) return true;
      if (permissions.includes(permission)) return true;
      // Check permission hierarchy: MODULE:MANAGE implies all actions in that module
      const parts = permission.split(':');
      if (parts.length >= 2) {
        const permModule = parts[0];
        if (permissions.includes(`${permModule}:MANAGE`)) return true;
      }
      return false;
    },
    [permissions, isSystemAdmin, isAdmin]
  );

  const hasAnyPermission = useCallback(
    (...perms: string[]): boolean => {
      if (isAdmin || isSystemAdmin) return true;
      return perms.some((p) => hasPermission(p));
    },
    [hasPermission, isSystemAdmin, isAdmin]
  );

  const hasAllPermissions = useCallback(
    (...perms: string[]): boolean => {
      if (isAdmin || isSystemAdmin) return true;
      return perms.every((p) => hasPermission(p));
    },
    [hasPermission, isSystemAdmin, isAdmin]
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

  // Convenience checks — isAdmin already computed above (used by hasPermission bypass)

  const isHR = useMemo(
    () =>
      hasAnyRole(
        Roles.HR_ADMIN,
        Roles.HR_MANAGER,
        Roles.SUPER_ADMIN,
        Roles.TENANT_ADMIN,
        Roles.FINANCE_ADMIN,
        Roles.PAYROLL_ADMIN
      ),
    [hasAnyRole]
  );

  const isManager = useMemo(
    () =>
      hasAnyRole(
        Roles.MANAGER, // L-1: not a real backend role; kept for compat
        Roles.TEAM_LEAD,
        Roles.DEPARTMENT_HEAD,
        Roles.DEPARTMENT_MANAGER,
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
