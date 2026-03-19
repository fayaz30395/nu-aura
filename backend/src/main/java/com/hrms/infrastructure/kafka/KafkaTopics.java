package com.hrms.infrastructure.kafka;

/**
 * Centralized Kafka topic names and constants for the NU-AURA platform.
 *
 * <p>All topics follow the naming convention: nu-aura.{domain}.{event-type}
 * Dead letter topics are automatically suffixed with .dlt</p>
 */
public final class KafkaTopics {

    // Approval workflow events
    public static final String APPROVALS = "nu-aura.approvals";
    public static final String APPROVALS_DLT = APPROVALS + ".dlt";

    // Notification events (email, push, in-app)
    public static final String NOTIFICATIONS = "nu-aura.notifications";
    public static final String NOTIFICATIONS_DLT = NOTIFICATIONS + ".dlt";

    // Audit log events
    public static final String AUDIT = "nu-aura.audit";
    public static final String AUDIT_DLT = AUDIT + ".dlt";

    // Employee lifecycle events (onboarding, offboarding, promotions, transfers)
    public static final String EMPLOYEE_LIFECYCLE = "nu-aura.employee-lifecycle";
    public static final String EMPLOYEE_LIFECYCLE_DLT = EMPLOYEE_LIFECYCLE + ".dlt";

    // Fluence content events (indexing for search)
    public static final String FLUENCE_CONTENT = "nu-aura.fluence-content";
    public static final String FLUENCE_CONTENT_DLT = FLUENCE_CONTENT + ".dlt";

    // Consumer group identifiers
    public static final String GROUP_APPROVALS_CONSUMER = "nu-aura-approvals-service";
    public static final String GROUP_NOTIFICATIONS_CONSUMER = "nu-aura-notifications-service";
    public static final String GROUP_AUDIT_CONSUMER = "nu-aura-audit-service";
    public static final String GROUP_EMPLOYEE_LIFECYCLE_CONSUMER = "nu-aura-employee-lifecycle-service";
    public static final String GROUP_FLUENCE_SEARCH = "nu-aura-fluence-search-service";
    public static final String GROUP_DLT_HANDLER = "nu-aura-dlt-handler";

    private KafkaTopics() {
        throw new AssertionError("Utility class; do not instantiate.");
    }
}
