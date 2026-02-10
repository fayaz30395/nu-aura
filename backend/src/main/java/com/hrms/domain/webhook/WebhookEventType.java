package com.hrms.domain.webhook;

/**
 * Types of events that can trigger webhook notifications.
 */
public enum WebhookEventType {
    // Catch-all for all events
    ALL,

    // Employee lifecycle events
    EMPLOYEE_CREATED,
    EMPLOYEE_UPDATED,
    EMPLOYEE_TERMINATED,
    EMPLOYEE_PROMOTED,
    EMPLOYEE_TRANSFERRED,
    EMPLOYEE_STATUS_CHANGED,
    EMPLOYEE_DEPARTMENT_CHANGED,

    // Leave events
    LEAVE_REQUESTED,
    LEAVE_APPROVED,
    LEAVE_REJECTED,
    LEAVE_CANCELLED,

    // Attendance events
    ATTENDANCE_CHECK_IN,
    ATTENDANCE_CHECK_OUT,
    ATTENDANCE_REGULARIZED,

    // Payroll events
    PAYROLL_PROCESSED,
    PAYSLIP_GENERATED,

    // Performance events
    REVIEW_STARTED,
    REVIEW_COMPLETED,
    GOAL_CREATED,
    GOAL_UPDATED,

    // Recruitment events
    CANDIDATE_CREATED,
    CANDIDATE_STATUS_CHANGED,
    OFFER_CREATED,
    OFFER_ACCEPTED,
    OFFER_REJECTED,

    // Document events
    DOCUMENT_UPLOADED,
    DOCUMENT_SIGNED,

    // Expense events
    EXPENSE_SUBMITTED,
    EXPENSE_APPROVED,
    EXPENSE_REJECTED,

    // Asset events
    ASSET_ASSIGNED,
    ASSET_RETURNED,

    // Training events
    TRAINING_ENROLLED,
    TRAINING_COMPLETED
}
