package com.hrms.domain.user;

/**
 * Defines the scope/granularity at which permissions can be applied.
 * Implements Keka-style row-level security in the application layer.
 * <p>
 * Scope Hierarchy (Most to Least Permissive):
 * ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM (varies)
 */
public enum RoleScope {
    /**
     * Global access across the entire tenant.
     * No filtering applied - user can access all records.
     */
    ALL,

    /**
     * Access limited to user's assigned office location(s).
     * Filter: record.locationId IN user.locationIds
     */
    LOCATION,

    /**
     * Access limited to user's department.
     * Filter: record.departmentId = user.departmentId
     */
    DEPARTMENT,

    /**
     * Access to direct and indirect reports (team hierarchy).
     * Includes all employees in the reporting chain below the user.
     * Filter: employee.id IN getAllReportees(currentUser.employeeId)
     */
    TEAM,

    /**
     * Access only to user's own data.
     * Filter: record.employeeId = currentUser.employeeId
     */
    SELF,

    /**
     * Access to explicitly selected entities.
     * Targets can be specific employees, departments, or locations.
     * Filter: record.id IN customTargetIds
     */
    CUSTOM;

    // Legacy aliases for backward compatibility
    public static final RoleScope GLOBAL = ALL;
    public static final RoleScope OWN = SELF;

    /**
     * Converts legacy scope names to new names.
     *
     * @param scopeName The scope name (may be legacy)
     * @return The corresponding RoleScope
     */
    public static RoleScope fromString(String scopeName) {
        if (scopeName == null) {
            return ALL;
        }
        return switch (scopeName.toUpperCase()) {
            case "GLOBAL" -> ALL;
            case "OWN" -> SELF;
            default -> valueOf(scopeName.toUpperCase());
        };
    }

    /**
     * Returns the scope rank for comparison (higher = more permissive).
     * Used when merging permissions from multiple roles.
     */
    public int getRank() {
        return switch (this) {
            case ALL -> 100;
            case LOCATION -> 80;
            case DEPARTMENT -> 60;
            case TEAM -> 40;
            case SELF -> 20;
            case CUSTOM -> 10; // CUSTOM rank depends on actual targets
        };
    }

    /**
     * Checks if this scope is more permissive than another.
     * Used when merging permissions across multiple roles.
     */
    public boolean isMorePermissiveThan(RoleScope other) {
        if (other == null) return true;
        return this.getRank() > other.getRank();
    }
}
