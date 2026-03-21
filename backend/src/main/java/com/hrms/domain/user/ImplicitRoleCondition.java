package com.hrms.domain.user;

/**
 * Defines conditions under which a role is implicitly assigned to a user.
 * These conditions are evaluated by the ImplicitRoleRuleEngine based on org chart data.
 */
public enum ImplicitRoleCondition {
    /**
     * User has direct reports (is a reporting manager).
     * Typically assigned the "Reporting Manager" role.
     */
    IS_REPORTING_MANAGER("Employee has direct reports"),

    /**
     * User is a department head (manages a department).
     * Typically assigned the "Department Head" role.
     */
    IS_DEPARTMENT_HEAD("Employee heads a department"),

    /**
     * User has indirect reports (skip-level manager).
     * Evaluates organizational hierarchy depth.
     * Typically assigned the "Skip-Level Manager" role.
     */
    IS_SKIP_LEVEL_MANAGER("Employee has indirect reports (skip-level)"),

    /**
     * Backward-compatible alias for IS_REPORTING_MANAGER.
     * Should not be used in new code.
     */
    HAS_DIRECT_REPORTS("Alias for IS_REPORTING_MANAGER");

    private final String description;

    ImplicitRoleCondition(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
