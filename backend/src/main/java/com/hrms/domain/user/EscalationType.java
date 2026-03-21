package com.hrms.domain.user;

/**
 * Defines escalation strategies for approval workflows when the primary approver
 * does not action a request within the configured timeout period.
 */
public enum EscalationType {
    /**
     * Escalate to the primary approver's manager (one level up).
     * Used for leaf-level approvers who need oversight.
     */
    SKIP_LEVEL_MANAGER("Escalate to the approver's manager"),

    /**
     * Escalate to the department head of the requestor.
     * Used when workflow requires department-level escalation.
     */
    DEPARTMENT_HEAD("Escalate to the requester's department head"),

    /**
     * Escalate to any user with a specific role.
     * Requires fallback_role_id to be set in ApprovalEscalationConfig.
     */
    SPECIFIC_ROLE("Escalate to anyone with a specific role"),

    /**
     * Escalate to a specific user (fallback approver).
     * Requires fallback_user_id to be set in ApprovalEscalationConfig.
     */
    SPECIFIC_USER("Escalate to a specific user");

    private final String description;

    EscalationType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
