package com.hrms.common.security;

/**
 * Defines data access scope for users
 */
public enum DataScope {
    /**
     * Can access all data across all departments
     */
    ALL,

    /**
     * Can access data within own department
     */
    DEPARTMENT,

    /**
     * Can access data within own team
     */
    TEAM,

    /**
     * Can only access own data
     */
    SELF,

    /**
     * Custom scope (defined by specific rules)
     */
    CUSTOM
}
