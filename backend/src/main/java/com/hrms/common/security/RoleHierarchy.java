package com.hrms.common.security;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Defines role hierarchy and default permissions for each role.
 * Includes both explicit roles (assigned) and implicit roles (derived from relationships).
 */
public final class RoleHierarchy {

    // ==================== EXPLICIT ROLES ====================
    // Core Roles
    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String TENANT_ADMIN = "TENANT_ADMIN";
    public static final String HR_ADMIN = "HR_ADMIN";
    public static final String HR_MANAGER = "HR_MANAGER";
    public static final String HR_EXECUTIVE = "HR_EXECUTIVE";
    public static final String DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER";
    public static final String TEAM_LEAD = "TEAM_LEAD";
    public static final String EMPLOYEE = "EMPLOYEE";
    public static final String CONTRACTOR = "CONTRACTOR";

    // Specialized Roles (Keka-equivalent)
    public static final String PAYROLL_ADMIN = "PAYROLL_ADMIN";
    public static final String RECRUITMENT_ADMIN = "RECRUITMENT_ADMIN";
    public static final String PROJECT_ADMIN = "PROJECT_ADMIN";
    public static final String ASSET_MANAGER = "ASSET_MANAGER";
    public static final String EXPENSE_MANAGER = "EXPENSE_MANAGER";
    public static final String HELPDESK_ADMIN = "HELPDESK_ADMIN";
    public static final String TRAVEL_ADMIN = "TRAVEL_ADMIN";
    public static final String COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER";
    public static final String LMS_ADMIN = "LMS_ADMIN";
    public static final String INTERN = "INTERN";

    // ==================== IMPLICIT ROLES ====================
    // Auto-assigned based on employee relationships
    public static final String REPORTING_MANAGER = "REPORTING_MANAGER";
    public static final String SKIP_LEVEL_MANAGER = "SKIP_LEVEL_MANAGER";
    public static final String DEPARTMENT_HEAD = "DEPARTMENT_HEAD";
    public static final String MENTOR = "MENTOR";
    public static final String INTERVIEWER = "INTERVIEWER";
    public static final String PERFORMANCE_REVIEWER = "PERFORMANCE_REVIEWER";
    public static final String ONBOARDING_BUDDY = "ONBOARDING_BUDDY";

    // All explicit roles list (unmodifiable)
    public static final List<String> ALL_EXPLICIT_ROLES = List.of(
            SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN, HR_EXECUTIVE,
            RECRUITMENT_ADMIN, DEPARTMENT_MANAGER, PROJECT_ADMIN, ASSET_MANAGER,
            EXPENSE_MANAGER, HELPDESK_ADMIN, TRAVEL_ADMIN, COMPLIANCE_OFFICER,
            LMS_ADMIN, TEAM_LEAD, EMPLOYEE, CONTRACTOR, INTERN
    );

    // All implicit roles list (unmodifiable)
    public static final List<String> ALL_IMPLICIT_ROLES = List.of(
            REPORTING_MANAGER, SKIP_LEVEL_MANAGER, DEPARTMENT_HEAD,
            MENTOR, INTERVIEWER, PERFORMANCE_REVIEWER, ONBOARDING_BUDDY
    );

    private RoleHierarchy() {
        throw new AssertionError("Cannot instantiate constants class");
    }

    // ==================== CORE ROLE PERMISSIONS ====================

    /**
     * Get default permissions for a role
     */
    public static Set<String> getDefaultPermissions(String roleName) {
        return switch (roleName) {
            // Core Roles
            case SUPER_ADMIN -> getSuperAdminPermissions();
            case TENANT_ADMIN -> getTenantAdminPermissions();
            case HR_ADMIN -> getHRAdminPermissions();
            case HR_MANAGER -> getHRManagerPermissions();
            case HR_EXECUTIVE -> getHRExecutivePermissions();
            case DEPARTMENT_MANAGER -> getDepartmentManagerPermissions();
            case TEAM_LEAD -> getTeamLeadPermissions();
            case EMPLOYEE -> getEmployeePermissions();
            case CONTRACTOR -> getContractorPermissions();
            // Specialized Roles
            case PAYROLL_ADMIN -> getPayrollAdminPermissions();
            case RECRUITMENT_ADMIN -> getRecruitmentAdminPermissions();
            case PROJECT_ADMIN -> getProjectAdminPermissions();
            case ASSET_MANAGER -> getAssetManagerPermissions();
            case EXPENSE_MANAGER -> getExpenseManagerPermissions();
            case HELPDESK_ADMIN -> getHelpdeskAdminPermissions();
            case TRAVEL_ADMIN -> getTravelAdminPermissions();
            case COMPLIANCE_OFFICER -> getComplianceOfficerPermissions();
            case LMS_ADMIN -> getLmsAdminPermissions();
            case INTERN -> getInternPermissions();
            // Implicit Roles
            case REPORTING_MANAGER -> getReportingManagerPermissions();
            case SKIP_LEVEL_MANAGER -> getSkipLevelManagerPermissions();
            case DEPARTMENT_HEAD -> getDepartmentHeadPermissions();
            case MENTOR -> getMentorPermissions();
            case INTERVIEWER -> getInterviewerPermissions();
            case PERFORMANCE_REVIEWER -> getPerformanceReviewerPermissions();
            case ONBOARDING_BUDDY -> getOnboardingBuddyPermissions();
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
                Permission.SETTINGS_UPDATE,
                Permission.PLATFORM_MANAGE,
                Permission.MIGRATION_IMPORT,
                Permission.MIGRATION_EXPORT,
                // Self-service permissions for dashboard access
                Permission.EMPLOYEE_VIEW_SELF,
                Permission.DASHBOARD_VIEW,
                Permission.ANALYTICS_VIEW
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
                Permission.STATUTORY_MANAGE,
                Permission.CUSTOM_FIELD_MANAGE,
                Permission.WORKFLOW_MANAGE,
                Permission.LEAVE_TYPE_MANAGE,
                Permission.DEPARTMENT_MANAGE,
                // PIP, Calibration, Offboarding, Career - Tenant Admin has full access
                Permission.PIP_VIEW,
                Permission.PIP_CREATE,
                Permission.PIP_MANAGE,
                Permission.PIP_CLOSE,
                Permission.CALIBRATION_VIEW,
                Permission.CALIBRATION_MANAGE,
                Permission.OFFBOARDING_VIEW,
                Permission.OFFBOARDING_MANAGE,
                Permission.OFFBOARDING_FNF_CALCULATE,
                Permission.CAREER_VIEW,
                Permission.CAREER_MANAGE,
                FieldPermission.EMPLOYEE_SALARY_VIEW,
                FieldPermission.EMPLOYEE_SALARY_EDIT,
                FieldPermission.EMPLOYEE_BANK_VIEW,
                FieldPermission.EMPLOYEE_TAX_ID_VIEW,
                FieldPermission.EMPLOYEE_ID_DOCS_VIEW
        ));
    }

    private static Set<String> getHRAdminPermissions() {
        Set<String> perms = new HashSet<>(getHRManagerPermissions());
        perms.addAll(Arrays.asList(
                // Elevated permissions beyond HR_MANAGER
                Permission.ROLE_MANAGE,
                Permission.USER_MANAGE,
                Permission.SETTINGS_VIEW,
                Permission.SETTINGS_UPDATE,
                Permission.AUDIT_VIEW,
                Permission.CUSTOM_FIELD_MANAGE,
                Permission.WORKFLOW_MANAGE,
                Permission.DEPARTMENT_MANAGE,
                Permission.STATUTORY_MANAGE,
                Permission.LEAVE_TYPE_MANAGE,
                Permission.LEAVE_BALANCE_MANAGE,
                Permission.ANALYTICS_EXPORT,
                Permission.REPORT_SCHEDULE,
                Permission.INTEGRATION_MANAGE,
                // Field-level: salary/bank edit access (HR_MANAGER only has view)
                FieldPermission.EMPLOYEE_SALARY_EDIT,
                FieldPermission.EMPLOYEE_BANK_EDIT,
                FieldPermission.EMPLOYEE_ID_DOCS_VIEW
        ));
        return perms;
    }

    private static Set<String> getHRManagerPermissions() {
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_ALL,
                Permission.EMPLOYEE_CREATE,
                Permission.EMPLOYEE_UPDATE,
                Permission.LEAVE_APPROVE,
                Permission.LEAVE_VIEW_ALL,
                Permission.LEAVE_MANAGE,
                Permission.LEAVE_TYPE_MANAGE,
                Permission.LEAVE_BALANCE_MANAGE,
                Permission.ATTENDANCE_VIEW_ALL,
                Permission.ATTENDANCE_APPROVE,
                Permission.ATTENDANCE_MANAGE,
                Permission.PAYROLL_VIEW_ALL,
                Permission.PAYROLL_PROCESS,
                Permission.REVIEW_VIEW,
                Permission.REVIEW_APPROVE,
                Permission.RECRUITMENT_VIEW,
                Permission.RECRUITMENT_VIEW_ALL,
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
                Permission.TDS_APPROVE,
                Permission.ONBOARDING_MANAGE,
                Permission.EXIT_MANAGE,
                Permission.LETTER_GENERATE,
                Permission.LETTER_APPROVE,
                Permission.BENEFIT_MANAGE,
                Permission.ANNOUNCEMENT_CREATE,
                Permission.SHIFT_MANAGE,
                Permission.OVERTIME_MANAGE,
                // Wall management for HR
                Permission.WALL_VIEW,
                Permission.WALL_POST,
                Permission.WALL_COMMENT,
                Permission.WALL_REACT,
                Permission.WALL_MANAGE,
                Permission.WALL_PIN,
                Permission.DASHBOARD_VIEW,
                // PIP Management
                Permission.PIP_VIEW,
                Permission.PIP_CREATE,
                Permission.PIP_MANAGE,
                Permission.PIP_CLOSE,
                // Calibration & Bell Curve
                Permission.CALIBRATION_VIEW,
                Permission.CALIBRATION_MANAGE,
                // Offboarding & FnF
                Permission.OFFBOARDING_VIEW,
                Permission.OFFBOARDING_MANAGE,
                Permission.OFFBOARDING_FNF_CALCULATE,
                // Career Page Management
                Permission.CAREER_VIEW,
                Permission.CAREER_MANAGE,
                FieldPermission.EMPLOYEE_SALARY_VIEW,
                FieldPermission.EMPLOYEE_BANK_VIEW,
                FieldPermission.EMPLOYEE_TAX_ID_VIEW
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
                Permission.EXPENSE_VIEW_ALL,
                Permission.ONBOARDING_VIEW,
                Permission.ONBOARDING_CREATE,
                Permission.EXIT_VIEW,
                Permission.LETTER_GENERATE,
                Permission.BENEFIT_VIEW,
                Permission.SHIFT_VIEW,
                // PIP - HR Executives can view PIPs
                Permission.PIP_VIEW,
                Permission.CALIBRATION_VIEW,
                Permission.OFFBOARDING_VIEW
                // Note: NO salary/financial access
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
                Permission.TIMESHEET_APPROVE,
                Permission.BUDGET_VIEW,
                Permission.HEADCOUNT_VIEW,
                Permission.OVERTIME_APPROVE,
                Permission.PROBATION_VIEW_TEAM,
                // PIP - Department managers can view and create PIPs for their reports
                Permission.PIP_VIEW,
                Permission.PIP_CREATE,
                // Calibration - Department managers participate in calibration sessions
                Permission.CALIBRATION_VIEW,
                // Offboarding - Department managers can view offboarding for their dept
                Permission.OFFBOARDING_VIEW
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
                Permission.RECRUITMENT_VIEW_TEAM,
                Permission.PROJECT_VIEW,
                Permission.TIMESHEET_SUBMIT,
                Permission.TIMESHEET_APPROVE,
                Permission.OVERTIME_APPROVE
        ));
    }

    private static Set<String> getEmployeePermissions() {
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_SELF,
                Permission.LEAVE_REQUEST,
                Permission.LEAVE_CANCEL,
                Permission.LEAVE_VIEW_SELF,
                Permission.ATTENDANCE_MARK,
                Permission.ATTENDANCE_REGULARIZE,
                Permission.ATTENDANCE_VIEW_SELF,
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
                Permission.TDS_DECLARE,
                Permission.SELF_SERVICE_PROFILE_UPDATE,
                Permission.SELF_SERVICE_DOCUMENT_REQUEST,
                Permission.SELF_SERVICE_VIEW_PAYSLIP,
                Permission.SELF_SERVICE_VIEW_LETTERS,
                Permission.BENEFIT_VIEW_SELF,
                Permission.BENEFIT_ENROLL,
                Permission.BENEFIT_CLAIM_SUBMIT,
                Permission.HELPDESK_TICKET_CREATE,
                Permission.HELPDESK_TICKET_VIEW,
                Permission.RECOGNITION_VIEW,
                Permission.RECOGNITION_CREATE,
                Permission.SURVEY_SUBMIT,
                Permission.ANNOUNCEMENT_VIEW,
                Permission.WELLNESS_VIEW,
                Permission.OVERTIME_REQUEST,
                Permission.LMS_ENROLL,
                Permission.LMS_COURSE_VIEW,
                Permission.LMS_CERTIFICATE_VIEW,
                Permission.REFERRAL_CREATE,
                Permission.REFERRAL_VIEW,
                Permission.OKR_VIEW,
                Permission.OKR_CREATE,
                Permission.OKR_UPDATE,
                Permission.FEEDBACK_360_VIEW,
                Permission.FEEDBACK_360_SUBMIT,
                Permission.MEETING_VIEW,
                Permission.MEETING_CREATE,
                // Dashboard & Wall access for all employees
                Permission.DASHBOARD_VIEW,
                Permission.WALL_VIEW,
                Permission.WALL_POST,
                Permission.WALL_COMMENT,
                Permission.WALL_REACT
        ));
    }

    // ==================== SPECIALIZED ROLE PERMISSIONS ====================

    private static Set<String> getContractorPermissions() {
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_SELF,
                Permission.ATTENDANCE_MARK,
                Permission.DOCUMENT_VIEW,
                Permission.PROJECT_VIEW,
                Permission.TIMESHEET_SUBMIT,
                Permission.EXPENSE_CREATE,
                Permission.HELPDESK_TICKET_CREATE
        ));
    }

    private static Set<String> getPayrollAdminPermissions() {
        return new HashSet<>(Arrays.asList(
                // Payroll & Compensation - Full Access
                Permission.PAYROLL_VIEW_ALL,
                Permission.PAYROLL_PROCESS,
                Permission.PAYROLL_APPROVE,
                Permission.COMPENSATION_VIEW_ALL,
                Permission.COMPENSATION_MANAGE,
                Permission.COMPENSATION_APPROVE,
                // Statutory Compliance
                Permission.STATUTORY_VIEW,
                Permission.STATUTORY_MANAGE,
                Permission.TDS_APPROVE,
                // Global/Multi-Currency Payroll
                Permission.GLOBAL_PAYROLL_VIEW,
                Permission.GLOBAL_PAYROLL_MANAGE,
                Permission.CURRENCY_MANAGE,
                Permission.EXCHANGE_RATE_MANAGE,
                // Benefits (Financial aspects)
                Permission.BENEFIT_MANAGE,
                Permission.BENEFIT_CLAIM_PROCESS,
                // Reports
                Permission.REPORT_VIEW,
                Permission.REPORT_CREATE,
                Permission.ANALYTICS_VIEW,
                // Field-level permissions
                FieldPermission.EMPLOYEE_SALARY_VIEW,
                FieldPermission.EMPLOYEE_SALARY_EDIT,
                FieldPermission.EMPLOYEE_BANK_VIEW,
                FieldPermission.EMPLOYEE_BANK_EDIT,
                FieldPermission.EMPLOYEE_TAX_ID_VIEW,
                // View only for payroll processing
                Permission.EMPLOYEE_VIEW_ALL
        ));
    }

    private static Set<String> getRecruitmentAdminPermissions() {
        return new HashSet<>(Arrays.asList(
                // Recruitment - Full Access
                Permission.RECRUITMENT_VIEW,
                Permission.RECRUITMENT_CREATE,
                Permission.RECRUITMENT_MANAGE,
                Permission.CANDIDATE_VIEW,
                Permission.CANDIDATE_EVALUATE,
                // Onboarding
                Permission.ONBOARDING_VIEW,
                Permission.ONBOARDING_CREATE,
                Permission.ONBOARDING_MANAGE,
                // Referrals
                Permission.REFERRAL_VIEW,
                Permission.REFERRAL_MANAGE,
                // Documents for candidates
                Permission.DOCUMENT_VIEW,
                Permission.DOCUMENT_UPLOAD,
                // Letters (Offer letters)
                Permission.LETTER_TEMPLATE_VIEW,
                Permission.LETTER_GENERATE,
                // Employee view for context
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW
        ));
    }

    private static Set<String> getProjectAdminPermissions() {
        return new HashSet<>(Arrays.asList(
                // Projects - Full Access
                Permission.PROJECT_VIEW,
                Permission.PROJECT_CREATE,
                // Timesheets
                Permission.TIMESHEET_SUBMIT,
                Permission.TIMESHEET_APPROVE,
                // Budget (Project budgets)
                Permission.BUDGET_VIEW,
                Permission.BUDGET_CREATE,
                // Employee view for allocation
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW,
                Permission.ANALYTICS_VIEW
        ));
    }

    private static Set<String> getAssetManagerPermissions() {
        return new HashSet<>(Arrays.asList(
                // Assets - Full Access
                Permission.ASSET_VIEW,
                Permission.ASSET_CREATE,
                Permission.ASSET_ASSIGN,
                Permission.ASSET_MANAGE,
                // Employee view for assignment
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW
        ));
    }

    private static Set<String> getExpenseManagerPermissions() {
        return new HashSet<>(Arrays.asList(
                // Expenses - Full Access
                Permission.EXPENSE_VIEW_ALL,
                Permission.EXPENSE_APPROVE,
                Permission.EXPENSE_MANAGE,
                // Budget view
                Permission.BUDGET_VIEW,
                // Reports
                Permission.REPORT_VIEW,
                Permission.ANALYTICS_VIEW
        ));
    }

    private static Set<String> getHelpdeskAdminPermissions() {
        return new HashSet<>(Arrays.asList(
                // Helpdesk - Full Access
                Permission.HELPDESK_TICKET_CREATE,
                Permission.HELPDESK_TICKET_VIEW,
                Permission.HELPDESK_TICKET_ASSIGN,
                Permission.HELPDESK_TICKET_RESOLVE,
                Permission.HELPDESK_CATEGORY_MANAGE,
                Permission.HELPDESK_SLA_MANAGE,
                // Employee view for tickets
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW
        ));
    }

    private static Set<String> getTravelAdminPermissions() {
        return new HashSet<>(Arrays.asList(
                // Travel - Full Access (M-2: was missing from original set)
                Permission.TRAVEL_VIEW,
                Permission.TRAVEL_CREATE,
                Permission.TRAVEL_UPDATE,
                Permission.TRAVEL_APPROVE,
                Permission.TRAVEL_VIEW_ALL,
                Permission.TRAVEL_MANAGE,
                // Expense Management
                Permission.EXPENSE_VIEW_ALL,
                Permission.EXPENSE_APPROVE,
                // Employee view
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW
        ));
    }

    private static Set<String> getComplianceOfficerPermissions() {
        return new HashSet<>(Arrays.asList(
                // Compliance - Full Access
                Permission.COMPLIANCE_VIEW,
                Permission.COMPLIANCE_MANAGE,
                Permission.POLICY_MANAGE,
                Permission.CHECKLIST_VIEW,
                Permission.CHECKLIST_MANAGE,
                Permission.ALERT_VIEW,
                Permission.ALERT_MANAGE,
                // Audit
                Permission.AUDIT_VIEW,
                // Documents
                Permission.DOCUMENT_VIEW,
                Permission.DOCUMENT_APPROVE,
                // Statutory
                Permission.STATUTORY_VIEW,
                // Employee view
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW,
                Permission.ANALYTICS_VIEW
        ));
    }

    private static Set<String> getLmsAdminPermissions() {
        return new HashSet<>(Arrays.asList(
                // LMS - Full Access
                Permission.LMS_COURSE_VIEW,
                Permission.LMS_COURSE_CREATE,
                Permission.LMS_COURSE_MANAGE,
                Permission.LMS_MODULE_CREATE,
                Permission.LMS_QUIZ_CREATE,
                // Training
                Permission.TRAINING_VIEW,
                Permission.TRAINING_CREATE,
                Permission.TRAINING_APPROVE,
                // Employee view for enrollment
                Permission.EMPLOYEE_VIEW_ALL,
                // Reports
                Permission.REPORT_VIEW,
                Permission.ANALYTICS_VIEW
        ));
    }

    // ==================== IMPLICIT ROLE PERMISSIONS ====================

    private static Set<String> getInternPermissions() {
        return new HashSet<>(Arrays.asList(
                // Minimal self-service
                Permission.EMPLOYEE_VIEW_SELF,
                Permission.ATTENDANCE_MARK,
                Permission.LEAVE_REQUEST,
                Permission.LEAVE_VIEW_SELF,
                Permission.DOCUMENT_VIEW,
                // Learning only
                Permission.LMS_ENROLL,
                Permission.LMS_COURSE_VIEW,
                Permission.TRAINING_VIEW,
                Permission.TRAINING_ENROLL
        ));
    }

    private static Set<String> getReportingManagerPermissions() {
        // Auto-granted when employee has direct reports
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_TEAM,
                Permission.LEAVE_APPROVE,
                Permission.LEAVE_VIEW_TEAM,
                Permission.ATTENDANCE_VIEW_TEAM,
                Permission.ATTENDANCE_APPROVE,
                Permission.REVIEW_CREATE,
                Permission.GOAL_APPROVE,
                Permission.EXPENSE_VIEW_TEAM,
                Permission.EXPENSE_APPROVE,
                Permission.TIMESHEET_APPROVE,
                Permission.OVERTIME_APPROVE,
                Permission.PROBATION_VIEW_TEAM
        ));
    }

    private static Set<String> getSkipLevelManagerPermissions() {
        // Auto-granted when employee has skip-level reports
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_TEAM,
                Permission.LEAVE_VIEW_TEAM,
                Permission.ATTENDANCE_VIEW_TEAM,
                Permission.REVIEW_VIEW
        ));
    }

    private static Set<String> getDepartmentHeadPermissions() {
        // Auto-granted when employee heads a department
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_DEPARTMENT,
                Permission.LEAVE_VIEW_ALL,
                Permission.ATTENDANCE_VIEW_ALL,
                Permission.BUDGET_VIEW,
                Permission.HEADCOUNT_VIEW,
                Permission.REPORT_VIEW
        ));
    }

    private static Set<String> getMentorPermissions() {
        // Auto-granted when assigned as mentor
        return new HashSet<>(Arrays.asList(
                Permission.EMPLOYEE_VIEW_TEAM,
                Permission.REVIEW_VIEW,
                Permission.GOAL_APPROVE,
                Permission.TRAINING_VIEW
        ));
    }

    private static Set<String> getInterviewerPermissions() {
        // Auto-granted when assigned to interview panel
        return new HashSet<>(Arrays.asList(
                Permission.CANDIDATE_VIEW,
                Permission.CANDIDATE_EVALUATE,
                Permission.RECRUITMENT_VIEW
        ));
    }

    private static Set<String> getPerformanceReviewerPermissions() {
        // Auto-granted when assigned as performance reviewer
        return new HashSet<>(Arrays.asList(
                Permission.REVIEW_CREATE,
                Permission.REVIEW_SUBMIT,
                Permission.FEEDBACK_360_CREATE,
                Permission.FEEDBACK_360_SUBMIT
        ));
    }

    // ==================== ROLE UTILITIES ====================

    private static Set<String> getOnboardingBuddyPermissions() {
        // Auto-granted when assigned as onboarding buddy
        return new HashSet<>(Arrays.asList(
                Permission.ONBOARDING_VIEW,
                Permission.EMPLOYEE_VIEW_TEAM
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

    /**
     * Get role rank for hierarchy comparison
     */
    public static int getRoleRank(String role) {
        return switch (role) {
            case SUPER_ADMIN -> 100;
            case TENANT_ADMIN -> 90;
            case HR_ADMIN -> 85;
            case HR_MANAGER -> 80;
            case PAYROLL_ADMIN -> 75;
            case HR_EXECUTIVE -> 70;
            case RECRUITMENT_ADMIN -> 65;
            case DEPARTMENT_MANAGER -> 60;
            case PROJECT_ADMIN -> 58;
            case ASSET_MANAGER -> 56;
            case EXPENSE_MANAGER -> 55;
            case HELPDESK_ADMIN -> 54;
            case TRAVEL_ADMIN -> 53;
            case COMPLIANCE_OFFICER -> 52;
            case LMS_ADMIN -> 51;
            case TEAM_LEAD -> 50;
            case EMPLOYEE -> 40;
            case CONTRACTOR -> 30;
            case INTERN -> 20;
            default -> 0;
        };
    }

    /**
     * Check if a role is an implicit role
     */
    public static boolean isImplicitRole(String role) {
        return ALL_IMPLICIT_ROLES.contains(role);
    }

    /**
     * Check if a role is an explicit role
     */
    public static boolean isExplicitRole(String role) {
        return ALL_EXPLICIT_ROLES.contains(role);
    }

    /**
     * Get role description
     */
    public static String getRoleDescription(String role) {
        return switch (role) {
            case SUPER_ADMIN -> "Complete system control across all tenants";
            case TENANT_ADMIN -> "Full organization administration";
            case HR_ADMIN -> "Senior HR leadership with elevated permissions and salary edit access";
            case HR_MANAGER -> "Complete HR operations including salary access";
            case PAYROLL_ADMIN -> "Payroll and compensation management only";
            case HR_EXECUTIVE -> "HR operations without salary access";
            case RECRUITMENT_ADMIN -> "Talent acquisition and onboarding";
            case DEPARTMENT_MANAGER -> "Department-level employee management";
            case PROJECT_ADMIN -> "Project and timesheet management";
            case ASSET_MANAGER -> "IT asset tracking and allocation";
            case EXPENSE_MANAGER -> "Expense approval and management";
            case HELPDESK_ADMIN -> "Support ticket management";
            case TRAVEL_ADMIN -> "Travel request management";
            case COMPLIANCE_OFFICER -> "Compliance and policy management";
            case LMS_ADMIN -> "Learning management system administration";
            case TEAM_LEAD -> "Team-level management";
            case EMPLOYEE -> "Regular employee self-service";
            case CONTRACTOR -> "Limited contractor access";
            case INTERN -> "Trainee with minimal access";
            case REPORTING_MANAGER -> "Auto-granted for employees with direct reports";
            case SKIP_LEVEL_MANAGER -> "Auto-granted for employees with indirect reports";
            case DEPARTMENT_HEAD -> "Auto-granted for department heads";
            case MENTOR -> "Auto-granted when assigned as mentor";
            case INTERVIEWER -> "Auto-granted when on interview panel";
            case PERFORMANCE_REVIEWER -> "Auto-granted for performance reviewers";
            case ONBOARDING_BUDDY -> "Auto-granted for onboarding buddies";
            default -> "Unknown role";
        };
    }
}
