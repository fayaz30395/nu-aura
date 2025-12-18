package com.hrms.common.security;

import java.util.*;

/**
 * Defines role hierarchy and default permissions for each role
 */
public final class RoleHierarchy {

    // Role names
    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String TENANT_ADMIN = "TENANT_ADMIN";
    public static final String HR_MANAGER = "HR_MANAGER";
    public static final String HR_EXECUTIVE = "HR_EXECUTIVE";
    public static final String DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER";
    public static final String TEAM_LEAD = "TEAM_LEAD";
    public static final String EMPLOYEE = "EMPLOYEE";
    public static final String CONTRACTOR = "CONTRACTOR";

    /**
     * Get default permissions for a role
     */
    public static Set<String> getDefaultPermissions(String roleName) {
        return switch (roleName) {
            case SUPER_ADMIN -> getSuperAdminPermissions();
            case TENANT_ADMIN -> getTenantAdminPermissions();
            case HR_MANAGER -> getHRManagerPermissions();
            case HR_EXECUTIVE -> getHRExecutivePermissions();
            case DEPARTMENT_MANAGER -> getDepartmentManagerPermissions();
            case TEAM_LEAD -> getTeamLeadPermissions();
            case EMPLOYEE -> getEmployeePermissions();
            case CONTRACTOR -> getContractorPermissions();
            default -> Collections.emptySet();
        };
    }

    private static Set<String> getSuperAdminPermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.SYSTEM_ADMIN,
            Permission.TENANT_MANAGE,
            Permission.ROLE_MANAGE,
            Permission.PERMISSION_MANAGE,
            Permission.USER_MANAGE,
            Permission.AUDIT_VIEW,
            Permission.SETTINGS_UPDATE
        ));
    }

    private static Set<String> getTenantAdminPermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_ALL,
            Permission.EMPLOYEE_CREATE,
            Permission.EMPLOYEE_UPDATE,
            Permission.EMPLOYEE_DELETE,
            Permission.ROLE_MANAGE,
            Permission.USER_MANAGE,
            Permission.PAYROLL_VIEW_ALL,
            Permission.PAYROLL_PROCESS,
            Permission.PAYROLL_APPROVE,
            Permission.REPORT_VIEW,
            Permission.REPORT_CREATE,
            Permission.ANALYTICS_VIEW,
            Permission.ANALYTICS_EXPORT,
            Permission.SETTINGS_VIEW,
            Permission.SETTINGS_UPDATE,
            Permission.AUDIT_VIEW,
            Permission.STATUTORY_MANAGE
        ));
    }

    private static Set<String> getHRManagerPermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_ALL,
            Permission.EMPLOYEE_CREATE,
            Permission.EMPLOYEE_UPDATE,
            Permission.LEAVE_APPROVE,
            Permission.LEAVE_VIEW_ALL,
            Permission.ATTENDANCE_VIEW_ALL,
            Permission.ATTENDANCE_APPROVE,
            Permission.PAYROLL_VIEW_ALL,
            Permission.PAYROLL_PROCESS,
            Permission.REVIEW_VIEW,
            Permission.REVIEW_APPROVE,
            Permission.RECRUITMENT_VIEW,
            Permission.RECRUITMENT_CREATE,
            Permission.RECRUITMENT_MANAGE,
            Permission.CANDIDATE_VIEW,
            Permission.CANDIDATE_EVALUATE,
            Permission.TRAINING_VIEW,
            Permission.TRAINING_CREATE,
            Permission.TRAINING_APPROVE,
            Permission.REPORT_VIEW,
            Permission.REPORT_CREATE,
            Permission.ANALYTICS_VIEW,
            Permission.DOCUMENT_APPROVE,
            Permission.EXPENSE_VIEW_ALL,
            Permission.EXPENSE_APPROVE,
            Permission.STATUTORY_VIEW,
            Permission.TDS_APPROVE
        ));
    }

    private static Set<String> getHRExecutivePermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_ALL,
            Permission.EMPLOYEE_CREATE,
            Permission.EMPLOYEE_UPDATE,
            Permission.LEAVE_VIEW_ALL,
            Permission.ATTENDANCE_VIEW_ALL,
            Permission.RECRUITMENT_VIEW,
            Permission.CANDIDATE_VIEW,
            Permission.TRAINING_VIEW,
            Permission.TRAINING_ENROLL,
            Permission.REPORT_VIEW,
            Permission.DOCUMENT_VIEW,
            Permission.DOCUMENT_UPLOAD,
            Permission.EXPENSE_VIEW_ALL
        ));
    }

    private static Set<String> getDepartmentManagerPermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_DEPARTMENT,
            Permission.LEAVE_APPROVE,
            Permission.LEAVE_VIEW_TEAM,
            Permission.ATTENDANCE_VIEW_TEAM,
            Permission.ATTENDANCE_APPROVE,
            Permission.REVIEW_CREATE,
            Permission.REVIEW_SUBMIT,
            Permission.REVIEW_APPROVE,
            Permission.GOAL_APPROVE,
            Permission.TRAINING_VIEW,
            Permission.REPORT_VIEW,
            Permission.DOCUMENT_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.EXPENSE_APPROVE,
            Permission.PROJECT_VIEW,
            Permission.TIMESHEET_APPROVE
        ));
    }

    private static Set<String> getTeamLeadPermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_TEAM,
            Permission.LEAVE_APPROVE,
            Permission.LEAVE_VIEW_TEAM,
            Permission.ATTENDANCE_VIEW_TEAM,
            Permission.REVIEW_CREATE,
            Permission.GOAL_APPROVE,
            Permission.TRAINING_VIEW,
            Permission.DOCUMENT_VIEW,
            Permission.EXPENSE_VIEW_TEAM,
            Permission.PROJECT_VIEW,
            Permission.TIMESHEET_SUBMIT,
            Permission.TIMESHEET_APPROVE
        ));
    }

    private static Set<String> getEmployeePermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_SELF,
            Permission.LEAVE_REQUEST,
            Permission.LEAVE_CANCEL,
            Permission.ATTENDANCE_MARK,
            Permission.ATTENDANCE_REGULARIZE,
            Permission.PAYROLL_VIEW_SELF,
            Permission.REVIEW_VIEW,
            Permission.GOAL_CREATE,
            Permission.TRAINING_VIEW,
            Permission.TRAINING_ENROLL,
            Permission.DOCUMENT_VIEW,
            Permission.DOCUMENT_UPLOAD,
            Permission.EXPENSE_CREATE,
            Permission.PROJECT_VIEW,
            Permission.TIMESHEET_SUBMIT,
            Permission.TDS_DECLARE
        ));
    }

    private static Set<String> getContractorPermissions() {
        return new HashSet<>(Arrays.asList(
            Permission.EMPLOYEE_VIEW_SELF,
            Permission.ATTENDANCE_MARK,
            Permission.DOCUMENT_VIEW,
            Permission.PROJECT_VIEW,
            Permission.TIMESHEET_SUBMIT
        ));
    }

    /**
     * Check if role A is senior to role B
     */
    public static boolean isSeniorRole(String roleA, String roleB) {
        int rankA = getRoleRank(roleA);
        int rankB = getRoleRank(roleB);
        return rankA > rankB;
    }

    private static int getRoleRank(String role) {
        return switch (role) {
            case SUPER_ADMIN -> 100;
            case TENANT_ADMIN -> 90;
            case HR_MANAGER -> 80;
            case HR_EXECUTIVE -> 70;
            case DEPARTMENT_MANAGER -> 60;
            case TEAM_LEAD -> 50;
            case EMPLOYEE -> 40;
            case CONTRACTOR -> 30;
            default -> 0;
        };
    }

    private RoleHierarchy() {
        throw new AssertionError("Cannot instantiate constants class");
    }
}
