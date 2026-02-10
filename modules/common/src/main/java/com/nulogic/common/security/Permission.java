package com.nulogic.common.security;

/**
 * Comprehensive permission constants for RBAC
 * Format: MODULE:ACTION (e.g., EMPLOYEE:READ, PAYROLL:APPROVE)
 *
 * This class is shared across all modules (pm, hrms, etc.)
 */
public final class Permission {

    // Employee Management
    public static final String EMPLOYEE_READ = "EMPLOYEE:READ";
    public static final String EMPLOYEE_CREATE = "EMPLOYEE:CREATE";
    public static final String EMPLOYEE_UPDATE = "EMPLOYEE:UPDATE";
    public static final String EMPLOYEE_DELETE = "EMPLOYEE:DELETE";
    public static final String EMPLOYEE_VIEW_ALL = "EMPLOYEE:VIEW_ALL";
    public static final String EMPLOYEE_VIEW_DEPARTMENT = "EMPLOYEE:VIEW_DEPARTMENT";
    public static final String EMPLOYEE_VIEW_TEAM = "EMPLOYEE:VIEW_TEAM";
    public static final String EMPLOYEE_VIEW_SELF = "EMPLOYEE:VIEW_SELF";

    // Projects & Timesheets
    public static final String PROJECT_VIEW = "PROJECT:VIEW";
    public static final String PROJECT_CREATE = "PROJECT:CREATE";
    public static final String PROJECT_MANAGE = "PROJECT:MANAGE";
    public static final String TIMESHEET_SUBMIT = "TIMESHEET:SUBMIT";
    public static final String TIMESHEET_APPROVE = "TIMESHEET:APPROVE";
    public static final String TIMESHEET_VIEW = "TIMESHEET:VIEW";
    public static final String TIMESHEET_VIEW_ALL = "TIMESHEET:VIEW_ALL";

    // Task Management (PM Module)
    public static final String TASK_VIEW = "TASK:VIEW";
    public static final String TASK_CREATE = "TASK:CREATE";
    public static final String TASK_UPDATE = "TASK:UPDATE";
    public static final String TASK_DELETE = "TASK:DELETE";
    public static final String TASK_ASSIGN = "TASK:ASSIGN";

    // Milestone Management (PM Module)
    public static final String MILESTONE_VIEW = "MILESTONE:VIEW";
    public static final String MILESTONE_CREATE = "MILESTONE:CREATE";
    public static final String MILESTONE_UPDATE = "MILESTONE:UPDATE";
    public static final String MILESTONE_DELETE = "MILESTONE:DELETE";
    public static final String MILESTONE_MANAGE = "MILESTONE:MANAGE";

    // Comment Management (PM Module)
    public static final String COMMENT_VIEW = "COMMENT:VIEW";
    public static final String COMMENT_CREATE = "COMMENT:CREATE";
    public static final String COMMENT_UPDATE = "COMMENT:UPDATE";
    public static final String COMMENT_DELETE = "COMMENT:DELETE";

    // Project Member Management (PM Module)
    public static final String PROJECT_MEMBER_VIEW = "PROJECT_MEMBER:VIEW";
    public static final String PROJECT_MEMBER_ADD = "PROJECT_MEMBER:ADD";
    public static final String PROJECT_MEMBER_REMOVE = "PROJECT_MEMBER:REMOVE";
    public static final String PROJECT_MEMBER_MANAGE = "PROJECT_MEMBER:MANAGE";

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

    // Reports & Analytics
    public static final String REPORT_VIEW = "REPORT:VIEW";
    public static final String REPORT_CREATE = "REPORT:CREATE";
    public static final String ANALYTICS_VIEW = "ANALYTICS:VIEW";

    // Document Management
    public static final String DOCUMENT_VIEW = "DOCUMENT:VIEW";
    public static final String DOCUMENT_UPLOAD = "DOCUMENT:UPLOAD";
    public static final String DOCUMENT_APPROVE = "DOCUMENT:APPROVE";
    public static final String DOCUMENT_DELETE = "DOCUMENT:DELETE";

    // System Administration
    public static final String SYSTEM_ADMIN = "SYSTEM:ADMIN";
    public static final String ROLE_MANAGE = "ROLE:MANAGE";
    public static final String PERMISSION_MANAGE = "PERMISSION:MANAGE";
    public static final String USER_VIEW = "USER:VIEW";
    public static final String USER_MANAGE = "USER:MANAGE";
    public static final String TENANT_MANAGE = "TENANT:MANAGE";
    public static final String AUDIT_VIEW = "AUDIT:VIEW";

    // Dashboard
    public static final String DASHBOARD_VIEW = "DASHBOARD:VIEW";

    // Recognition & Engagement
    public static final String RECOGNITION_VIEW = "RECOGNITION:VIEW";
    public static final String RECOGNITION_CREATE = "RECOGNITION:CREATE";
    public static final String RECOGNITION_MANAGE = "RECOGNITION:MANAGE";

    // Organization Wall
    public static final String WALL_VIEW = "WALL:VIEW";
    public static final String WALL_POST = "WALL:POST";
    public static final String WALL_COMMENT = "WALL:COMMENT";
    public static final String WALL_REACT = "WALL:REACT";
    public static final String WALL_MANAGE = "WALL:MANAGE";
    public static final String WALL_PIN = "WALL:PIN";

    // Resource Allocation Management
    public static final String ALLOCATION_VIEW = "ALLOCATION:VIEW";
    public static final String ALLOCATION_CREATE = "ALLOCATION:CREATE";
    public static final String ALLOCATION_APPROVE = "ALLOCATION:APPROVE";
    public static final String ALLOCATION_MANAGE = "ALLOCATION:MANAGE";

    private Permission() {
        throw new AssertionError("Cannot instantiate constants class");
    }
}
