package com.hrms.domain.user;

/**
 * Defines the type of target that can be used with CUSTOM scope.
 * When a permission has CUSTOM scope, it grants access to specific
 * entities identified by their type and ID.
 */
public enum TargetType {
    /**
     * Target is a specific employee.
     * Grants access to that employee's data only.
     */
    EMPLOYEE,

    /**
     * Target is a department.
     * Grants access to all employees in that department.
     */
    DEPARTMENT,

    /**
     * Target is an office location.
     * Grants access to all employees at that location.
     */
    LOCATION
}
