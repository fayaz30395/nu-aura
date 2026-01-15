package com.hrms.common.security;

/**
 * Comprehensive permission constants for RBAC
 * Format: MODULE:ACTION (e.g., EMPLOYEE:READ, PAYROLL:APPROVE)
 */
public final class Permission {

    // Employee Management
    public static final String EMPLOYEE_READ = "EMPLOYEE:READ";
    public static final String EMPLOYEE_CREATE = "EMPLOYEE:CREATE";
    public static final String EMPLOYEE_UPDATE = "EMPLOYEE:UPDATE";
    public static final String EMPLOYEE_DELETE = "EMPLOYEE:DELETE";
    public static final String EMPLOYEE_VIEW_ALL = "EMPLOYEE:VIEW_ALL"; // Cross-department
    public static final String EMPLOYEE_VIEW_DEPARTMENT = "EMPLOYEE:VIEW_DEPARTMENT";
    public static final String EMPLOYEE_VIEW_TEAM = "EMPLOYEE:VIEW_TEAM";
    public static final String EMPLOYEE_VIEW_SELF = "EMPLOYEE:VIEW_SELF";

    // Employment Change Requests
    public static final String EMPLOYMENT_CHANGE_VIEW = "EMPLOYMENT_CHANGE:VIEW";
    public static final String EMPLOYMENT_CHANGE_VIEW_ALL = "EMPLOYMENT_CHANGE:VIEW_ALL";
    public static final String EMPLOYMENT_CHANGE_CREATE = "EMPLOYMENT_CHANGE:CREATE";
    public static final String EMPLOYMENT_CHANGE_APPROVE = "EMPLOYMENT_CHANGE:APPROVE";
    public static final String EMPLOYMENT_CHANGE_CANCEL = "EMPLOYMENT_CHANGE:CANCEL";

    // Leave Management
    public static final String LEAVE_REQUEST = "LEAVE:REQUEST";
    public static final String LEAVE_APPROVE = "LEAVE:APPROVE";
    public static final String LEAVE_REJECT = "LEAVE:REJECT";
    public static final String LEAVE_CANCEL = "LEAVE:CANCEL";
    public static final String LEAVE_VIEW_ALL = "LEAVE:VIEW_ALL";
    public static final String LEAVE_VIEW_TEAM = "LEAVE:VIEW_TEAM";
    public static final String LEAVE_VIEW_SELF = "LEAVE:VIEW_SELF";
    public static final String LEAVE_MANAGE = "LEAVE:MANAGE";

    // Department/Organizational Structure
    public static final String DEPARTMENT_MANAGE = "DEPARTMENT:MANAGE";
    public static final String DEPARTMENT_VIEW = "DEPARTMENT:VIEW";

    // Attendance Management
    public static final String ATTENDANCE_MARK = "ATTENDANCE:MARK";
    public static final String ATTENDANCE_APPROVE = "ATTENDANCE:APPROVE";
    public static final String ATTENDANCE_VIEW_ALL = "ATTENDANCE:VIEW_ALL";
    public static final String ATTENDANCE_VIEW_TEAM = "ATTENDANCE:VIEW_TEAM";
    public static final String ATTENDANCE_VIEW_SELF = "ATTENDANCE:VIEW_SELF";
    public static final String ATTENDANCE_REGULARIZE = "ATTENDANCE:REGULARIZE";
    public static final String ATTENDANCE_MANAGE = "ATTENDANCE:MANAGE";

    // Office Location & Geofencing
    public static final String OFFICE_LOCATION_VIEW = "OFFICE_LOCATION:VIEW";
    public static final String OFFICE_LOCATION_CREATE = "OFFICE_LOCATION:CREATE";
    public static final String OFFICE_LOCATION_UPDATE = "OFFICE_LOCATION:UPDATE";
    public static final String OFFICE_LOCATION_DELETE = "OFFICE_LOCATION:DELETE";
    public static final String GEOFENCE_MANAGE = "GEOFENCE:MANAGE";
    public static final String GEOFENCE_BYPASS = "GEOFENCE:BYPASS";

    // Payroll Management
    public static final String PAYROLL_VIEW = "PAYROLL:VIEW";
    public static final String PAYROLL_VIEW_ALL = "PAYROLL:VIEW_ALL";
    public static final String PAYROLL_PROCESS = "PAYROLL:PROCESS";
    public static final String PAYROLL_APPROVE = "PAYROLL:APPROVE";
    public static final String PAYROLL_VIEW_SELF = "PAYROLL:VIEW_SELF";

    // Performance Management
    public static final String REVIEW_CREATE = "REVIEW:CREATE";
    public static final String REVIEW_VIEW = "REVIEW:VIEW";
    public static final String REVIEW_SUBMIT = "REVIEW:SUBMIT";
    public static final String REVIEW_APPROVE = "REVIEW:APPROVE";
    public static final String GOAL_CREATE = "GOAL:CREATE";
    public static final String GOAL_APPROVE = "GOAL:APPROVE";

    // Recruitment
    public static final String RECRUITMENT_VIEW = "RECRUITMENT:VIEW";
    public static final String RECRUITMENT_VIEW_ALL = "RECRUITMENT:VIEW_ALL";
    public static final String RECRUITMENT_VIEW_TEAM = "RECRUITMENT:VIEW_TEAM";
    public static final String RECRUITMENT_CREATE = "RECRUITMENT:CREATE";
    public static final String RECRUITMENT_MANAGE = "RECRUITMENT:MANAGE";
    public static final String CANDIDATE_VIEW = "CANDIDATE:VIEW";
    public static final String CANDIDATE_EVALUATE = "CANDIDATE:EVALUATE";

    // Training
    public static final String TRAINING_VIEW = "TRAINING:VIEW";
    public static final String TRAINING_CREATE = "TRAINING:CREATE";
    public static final String TRAINING_EDIT = "TRAINING:EDIT";
    public static final String TRAINING_ENROLL = "TRAINING:ENROLL";
    public static final String TRAINING_APPROVE = "TRAINING:APPROVE";

    // Learning Management System (LMS)
    public static final String LMS_COURSE_VIEW = "LMS:COURSE_VIEW";
    public static final String LMS_COURSE_CREATE = "LMS:COURSE_CREATE";
    public static final String LMS_COURSE_MANAGE = "LMS:COURSE_MANAGE";
    public static final String LMS_MODULE_CREATE = "LMS:MODULE_CREATE";
    public static final String LMS_QUIZ_CREATE = "LMS:QUIZ_CREATE";
    public static final String LMS_ENROLL = "LMS:ENROLL";
    public static final String LMS_CERTIFICATE_VIEW = "LMS:CERTIFICATE_VIEW";

    // OKR (Objectives & Key Results)
    public static final String OKR_VIEW = "OKR:VIEW";
    public static final String OKR_CREATE = "OKR:CREATE";
    public static final String OKR_UPDATE = "OKR:UPDATE";
    public static final String OKR_APPROVE = "OKR:APPROVE";
    public static final String OKR_VIEW_ALL = "OKR:VIEW_ALL";

    // 360 Feedback
    public static final String FEEDBACK_360_VIEW = "FEEDBACK_360:VIEW";
    public static final String FEEDBACK_360_CREATE = "FEEDBACK_360:CREATE";
    public static final String FEEDBACK_360_SUBMIT = "FEEDBACK_360:SUBMIT";
    public static final String FEEDBACK_360_MANAGE = "FEEDBACK_360:MANAGE";

    // Helpdesk
    public static final String HELPDESK_TICKET_CREATE = "HELPDESK:TICKET_CREATE";
    public static final String HELPDESK_TICKET_VIEW = "HELPDESK:TICKET_VIEW";
    public static final String HELPDESK_TICKET_ASSIGN = "HELPDESK:TICKET_ASSIGN";
    public static final String HELPDESK_TICKET_RESOLVE = "HELPDESK:TICKET_RESOLVE";
    public static final String HELPDESK_CATEGORY_MANAGE = "HELPDESK:CATEGORY_MANAGE";
    public static final String HELPDESK_SLA_MANAGE = "HELPDESK:SLA_MANAGE";

    // Reports & Analytics
    public static final String REPORT_VIEW = "REPORT:VIEW";
    public static final String REPORT_CREATE = "REPORT:CREATE";
    public static final String REPORT_SCHEDULE = "REPORT:SCHEDULE";
    public static final String ANALYTICS_VIEW = "ANALYTICS:VIEW";
    public static final String ANALYTICS_EXPORT = "ANALYTICS:EXPORT";

    // Document Management
    public static final String DOCUMENT_VIEW = "DOCUMENT:VIEW";
    public static final String DOCUMENT_UPLOAD = "DOCUMENT:UPLOAD";
    public static final String DOCUMENT_APPROVE = "DOCUMENT:APPROVE";
    public static final String DOCUMENT_DELETE = "DOCUMENT:DELETE";

    // Expense Management
    public static final String EXPENSE_VIEW = "EXPENSE:VIEW";
    public static final String EXPENSE_CREATE = "EXPENSE:CREATE";
    public static final String EXPENSE_APPROVE = "EXPENSE:APPROVE";
    public static final String EXPENSE_MANAGE = "EXPENSE:MANAGE";
    public static final String EXPENSE_VIEW_ALL = "EXPENSE:VIEW_ALL";
    public static final String EXPENSE_VIEW_TEAM = "EXPENSE:VIEW_TEAM";

    // Projects & Timesheets
    public static final String PROJECT_VIEW = "PROJECT:VIEW";
    public static final String PROJECT_CREATE = "PROJECT:CREATE";
    public static final String PROJECT_MANAGE = "PROJECT:MANAGE";
    public static final String TIMESHEET_SUBMIT = "TIMESHEET:SUBMIT";
    public static final String TIMESHEET_APPROVE = "TIMESHEET:APPROVE";

    // Resource Allocation Management
    public static final String ALLOCATION_VIEW = "ALLOCATION:VIEW";
    public static final String ALLOCATION_CREATE = "ALLOCATION:CREATE";
    public static final String ALLOCATION_APPROVE = "ALLOCATION:APPROVE";
    public static final String ALLOCATION_MANAGE = "ALLOCATION:MANAGE";

    // Statutory Compliance
    public static final String STATUTORY_VIEW = "STATUTORY:VIEW";
    public static final String STATUTORY_MANAGE = "STATUTORY:MANAGE";
    public static final String TDS_DECLARE = "TDS:DECLARE";
    public static final String TDS_APPROVE = "TDS:APPROVE";

    // System Administration
    public static final String SYSTEM_ADMIN = "SYSTEM:ADMIN";
    public static final String ROLE_MANAGE = "ROLE:MANAGE";
    public static final String PERMISSION_MANAGE = "PERMISSION:MANAGE";
    public static final String USER_VIEW = "USER:VIEW";
    public static final String USER_MANAGE = "USER:MANAGE";
    public static final String TENANT_MANAGE = "TENANT:MANAGE";
    public static final String AUDIT_VIEW = "AUDIT:VIEW";

    // Custom Fields
    public static final String CUSTOM_FIELD_VIEW = "CUSTOM_FIELD:VIEW";
    public static final String CUSTOM_FIELD_CREATE = "CUSTOM_FIELD:CREATE";
    public static final String CUSTOM_FIELD_UPDATE = "CUSTOM_FIELD:UPDATE";
    public static final String CUSTOM_FIELD_DELETE = "CUSTOM_FIELD:DELETE";
    public static final String CUSTOM_FIELD_MANAGE = "CUSTOM_FIELD:MANAGE";

    // Settings
    public static final String SETTINGS_VIEW = "SETTINGS:VIEW";
    public static final String SETTINGS_UPDATE = "SETTINGS:UPDATE";

    // Notifications
    public static final String NOTIFICATIONS_VIEW = "NOTIFICATIONS:VIEW";
    public static final String NOTIFICATIONS_CREATE = "NOTIFICATIONS:CREATE";
    public static final String NOTIFICATIONS_DELETE = "NOTIFICATIONS:DELETE";

    // Dashboard
    public static final String DASHBOARD_VIEW = "DASHBOARD:VIEW";
    public static final String DASHBOARD_EXECUTIVE = "DASHBOARD:EXECUTIVE";
    public static final String DASHBOARD_HR_OPS = "DASHBOARD:HR_OPS";
    public static final String DASHBOARD_MANAGER = "DASHBOARD:MANAGER";
    public static final String DASHBOARD_EMPLOYEE = "DASHBOARD:EMPLOYEE";
    public static final String DASHBOARD_WIDGETS = "DASHBOARD:WIDGETS";

    // Pulse Surveys / Engagement
    public static final String SURVEY_VIEW = "SURVEY:VIEW";
    public static final String SURVEY_MANAGE = "SURVEY:MANAGE";
    public static final String SURVEY_SUBMIT = "SURVEY:SUBMIT";

    // 1-on-1 Meetings
    public static final String MEETING_VIEW = "MEETING:VIEW";
    public static final String MEETING_CREATE = "MEETING:CREATE";
    public static final String MEETING_MANAGE = "MEETING:MANAGE";

    // Probation Management
    public static final String PROBATION_VIEW = "PROBATION:VIEW";
    public static final String PROBATION_MANAGE = "PROBATION:MANAGE";
    public static final String PROBATION_VIEW_ALL = "PROBATION:VIEW_ALL";
    public static final String PROBATION_VIEW_TEAM = "PROBATION:VIEW_TEAM";

    // Compensation Management
    public static final String COMPENSATION_VIEW = "COMPENSATION:VIEW";
    public static final String COMPENSATION_MANAGE = "COMPENSATION:MANAGE";
    public static final String COMPENSATION_APPROVE = "COMPENSATION:APPROVE";
    public static final String COMPENSATION_VIEW_ALL = "COMPENSATION:VIEW_ALL";

    // Data Migration
    public static final String MIGRATION_IMPORT = "MIGRATION:IMPORT";
    public static final String MIGRATION_EXPORT = "MIGRATION:EXPORT";

    // Self-Service Portal
    public static final String SELF_SERVICE_PROFILE_UPDATE = "SELF_SERVICE:PROFILE_UPDATE";
    public static final String SELF_SERVICE_DOCUMENT_REQUEST = "SELF_SERVICE:DOCUMENT_REQUEST";
    public static final String SELF_SERVICE_VIEW_PAYSLIP = "SELF_SERVICE:VIEW_PAYSLIP";
    public static final String SELF_SERVICE_VIEW_LETTERS = "SELF_SERVICE:VIEW_LETTERS";

    // Letter Generation
    public static final String LETTER_TEMPLATE_VIEW = "LETTER:TEMPLATE_VIEW";
    public static final String LETTER_TEMPLATE_CREATE = "LETTER:TEMPLATE_CREATE";
    public static final String LETTER_TEMPLATE_MANAGE = "LETTER:TEMPLATE_MANAGE";
    public static final String LETTER_GENERATE = "LETTER:GENERATE";
    public static final String LETTER_APPROVE = "LETTER:APPROVE";
    public static final String LETTER_ISSUE = "LETTER:ISSUE";

    // Recognition & Engagement
    public static final String RECOGNITION_VIEW = "RECOGNITION:VIEW";
    public static final String RECOGNITION_CREATE = "RECOGNITION:CREATE";
    public static final String RECOGNITION_MANAGE = "RECOGNITION:MANAGE";
    public static final String BADGE_MANAGE = "BADGE:MANAGE";
    public static final String POINTS_MANAGE = "POINTS:MANAGE";
    public static final String MILESTONE_VIEW = "MILESTONE:VIEW";
    public static final String MILESTONE_MANAGE = "MILESTONE:MANAGE";

    // Organization Structure
    public static final String ORG_STRUCTURE_VIEW = "ORG_STRUCTURE:VIEW";
    public static final String ORG_STRUCTURE_MANAGE = "ORG_STRUCTURE:MANAGE";
    public static final String POSITION_VIEW = "POSITION:VIEW";
    public static final String POSITION_MANAGE = "POSITION:MANAGE";
    public static final String SUCCESSION_VIEW = "SUCCESSION:VIEW";
    public static final String SUCCESSION_MANAGE = "SUCCESSION:MANAGE";
    public static final String TALENT_POOL_VIEW = "TALENT_POOL:VIEW";
    public static final String TALENT_POOL_MANAGE = "TALENT_POOL:MANAGE";

    // Compliance & Audit Management
    public static final String COMPLIANCE_VIEW = "COMPLIANCE:VIEW";
    public static final String COMPLIANCE_MANAGE = "COMPLIANCE:MANAGE";
    public static final String POLICY_MANAGE = "POLICY:MANAGE";
    public static final String CHECKLIST_VIEW = "CHECKLIST:VIEW";
    public static final String CHECKLIST_MANAGE = "CHECKLIST:MANAGE";
    public static final String ALERT_VIEW = "ALERT:VIEW";
    public static final String ALERT_MANAGE = "ALERT:MANAGE";

    // Employee Referral Program
    public static final String REFERRAL_VIEW = "REFERRAL:VIEW";
    public static final String REFERRAL_CREATE = "REFERRAL:CREATE";
    public static final String REFERRAL_MANAGE = "REFERRAL:MANAGE";

    // Employee Wellness
    public static final String WELLNESS_VIEW = "WELLNESS:VIEW";
    public static final String WELLNESS_CREATE = "WELLNESS:CREATE";
    public static final String WELLNESS_MANAGE = "WELLNESS:MANAGE";

    // Budget & Headcount Planning
    public static final String BUDGET_VIEW = "BUDGET:VIEW";
    public static final String BUDGET_CREATE = "BUDGET:CREATE";
    public static final String BUDGET_APPROVE = "BUDGET:APPROVE";
    public static final String BUDGET_MANAGE = "BUDGET:MANAGE";
    public static final String HEADCOUNT_VIEW = "HEADCOUNT:VIEW";
    public static final String HEADCOUNT_MANAGE = "HEADCOUNT:MANAGE";

    // Predictive Analytics
    public static final String PREDICTIVE_ANALYTICS_VIEW = "PREDICTIVE_ANALYTICS:VIEW";
    public static final String PREDICTIVE_ANALYTICS_MANAGE = "PREDICTIVE_ANALYTICS:MANAGE";

    // Multi-Currency Payroll
    public static final String CURRENCY_MANAGE = "CURRENCY:MANAGE";
    public static final String EXCHANGE_RATE_MANAGE = "EXCHANGE_RATE:MANAGE";
    public static final String GLOBAL_PAYROLL_VIEW = "GLOBAL_PAYROLL:VIEW";
    public static final String GLOBAL_PAYROLL_MANAGE = "GLOBAL_PAYROLL:MANAGE";

    // Multi-Channel Notifications
    public static final String NOTIFICATION_VIEW = "NOTIFICATION:VIEW";
    public static final String NOTIFICATION_CREATE = "NOTIFICATION:CREATE";
    public static final String NOTIFICATION_MANAGE = "NOTIFICATION:MANAGE";
    public static final String NOTIFICATION_SEND = "NOTIFICATION:SEND";

    // Benefits Management
    public static final String BENEFIT_VIEW = "BENEFIT:VIEW";
    public static final String BENEFIT_VIEW_SELF = "BENEFIT:VIEW_SELF";
    public static final String BENEFIT_ENROLL = "BENEFIT:ENROLL";
    public static final String BENEFIT_MANAGE = "BENEFIT:MANAGE";
    public static final String BENEFIT_APPROVE = "BENEFIT:APPROVE";
    public static final String BENEFIT_CLAIM_SUBMIT = "BENEFIT:CLAIM_SUBMIT";
    public static final String BENEFIT_CLAIM_PROCESS = "BENEFIT:CLAIM_PROCESS";

    // Exit/Offboarding Management
    public static final String EXIT_VIEW = "EXIT:VIEW";
    public static final String EXIT_INITIATE = "EXIT:INITIATE";
    public static final String EXIT_MANAGE = "EXIT:MANAGE";
    public static final String EXIT_APPROVE = "EXIT:APPROVE";

    // Announcement Management
    public static final String ANNOUNCEMENT_VIEW = "ANNOUNCEMENT:VIEW";
    public static final String ANNOUNCEMENT_CREATE = "ANNOUNCEMENT:CREATE";
    public static final String ANNOUNCEMENT_MANAGE = "ANNOUNCEMENT:MANAGE";

    // Asset Management
    public static final String ASSET_VIEW = "ASSET:VIEW";
    public static final String ASSET_CREATE = "ASSET:CREATE";
    public static final String ASSET_ASSIGN = "ASSET:ASSIGN";
    public static final String ASSET_MANAGE = "ASSET:MANAGE";

    // Onboarding Management
    public static final String ONBOARDING_VIEW = "ONBOARDING:VIEW";
    public static final String ONBOARDING_CREATE = "ONBOARDING:CREATE";
    public static final String ONBOARDING_MANAGE = "ONBOARDING:MANAGE";

    // Shift Management
    public static final String SHIFT_VIEW = "SHIFT:VIEW";
    public static final String SHIFT_CREATE = "SHIFT:CREATE";
    public static final String SHIFT_ASSIGN = "SHIFT:ASSIGN";
    public static final String SHIFT_MANAGE = "SHIFT:MANAGE";

    // Overtime Management
    public static final String OVERTIME_VIEW = "OVERTIME:VIEW";
    public static final String OVERTIME_REQUEST = "OVERTIME:REQUEST";
    public static final String OVERTIME_APPROVE = "OVERTIME:APPROVE";
    public static final String OVERTIME_MANAGE = "OVERTIME:MANAGE";

    // E-Signature Management
    public static final String ESIGNATURE_VIEW = "ESIGNATURE:VIEW";
    public static final String ESIGNATURE_REQUEST = "ESIGNATURE:REQUEST";
    public static final String ESIGNATURE_SIGN = "ESIGNATURE:SIGN";
    public static final String ESIGNATURE_MANAGE = "ESIGNATURE:MANAGE";

    // Workflow Management
    public static final String WORKFLOW_VIEW = "WORKFLOW:VIEW";
    public static final String WORKFLOW_CREATE = "WORKFLOW:CREATE";
    public static final String WORKFLOW_MANAGE = "WORKFLOW:MANAGE";
    public static final String WORKFLOW_EXECUTE = "WORKFLOW:EXECUTE";

    // Platform Administration
    public static final String PLATFORM_VIEW = "PLATFORM:VIEW";
    public static final String PLATFORM_MANAGE = "PLATFORM:MANAGE";

    // Leave Type Management
    public static final String LEAVE_TYPE_VIEW = "LEAVE_TYPE:VIEW";
    public static final String LEAVE_TYPE_MANAGE = "LEAVE_TYPE:MANAGE";

    // Leave Balance Management
    public static final String LEAVE_BALANCE_VIEW = "LEAVE_BALANCE:VIEW";
    public static final String LEAVE_BALANCE_VIEW_ALL = "LEAVE_BALANCE:VIEW_ALL";
    public static final String LEAVE_BALANCE_MANAGE = "LEAVE_BALANCE:MANAGE";

    // Pre-boarding
    public static final String PREBOARDING_VIEW = "PREBOARDING:VIEW";
    public static final String PREBOARDING_CREATE = "PREBOARDING:CREATE";
    public static final String PREBOARDING_MANAGE = "PREBOARDING:MANAGE";

    // Travel Management
    public static final String TRAVEL_VIEW = "TRAVEL:VIEW";
    public static final String TRAVEL_CREATE = "TRAVEL:CREATE";
    public static final String TRAVEL_UPDATE = "TRAVEL:UPDATE";
    public static final String TRAVEL_APPROVE = "TRAVEL:APPROVE";
    public static final String TRAVEL_VIEW_ALL = "TRAVEL:VIEW_ALL";
    public static final String TRAVEL_MANAGE = "TRAVEL:MANAGE";

    // Employee Loans
    public static final String LOAN_VIEW = "LOAN:VIEW";
    public static final String LOAN_CREATE = "LOAN:CREATE";
    public static final String LOAN_UPDATE = "LOAN:UPDATE";
    public static final String LOAN_APPROVE = "LOAN:APPROVE";
    public static final String LOAN_VIEW_ALL = "LOAN:VIEW_ALL";
    public static final String LOAN_MANAGE = "LOAN:MANAGE";

    // Time Tracking
    public static final String TIME_TRACKING_VIEW = "TIME_TRACKING:VIEW";
    public static final String TIME_TRACKING_CREATE = "TIME_TRACKING:CREATE";
    public static final String TIME_TRACKING_UPDATE = "TIME_TRACKING:UPDATE";
    public static final String TIME_TRACKING_APPROVE = "TIME_TRACKING:APPROVE";
    public static final String TIME_TRACKING_VIEW_ALL = "TIME_TRACKING:VIEW_ALL";
    public static final String TIME_TRACKING_MANAGE = "TIME_TRACKING:MANAGE";

    // Calendar Integration
    public static final String CALENDAR_VIEW = "CALENDAR:VIEW";
    public static final String CALENDAR_CREATE = "CALENDAR:CREATE";
    public static final String CALENDAR_UPDATE = "CALENDAR:UPDATE";
    public static final String CALENDAR_DELETE = "CALENDAR:DELETE";
    public static final String CALENDAR_MANAGE = "CALENDAR:MANAGE";
    public static final String CALENDAR_SYNC = "CALENDAR:SYNC";

    // Organization Wall
    public static final String WALL_VIEW = "WALL:VIEW";
    public static final String WALL_POST = "WALL:POST";
    public static final String WALL_COMMENT = "WALL:COMMENT";
    public static final String WALL_REACT = "WALL:REACT";
    public static final String WALL_MANAGE = "WALL:MANAGE";
    public static final String WALL_PIN = "WALL:PIN";

    private Permission() {
        throw new AssertionError("Cannot instantiate constants class");
    }
}
