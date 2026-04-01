package com.hrms.common.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the HR_ADMIN role (rank 85).
 * HR_ADMIN is the senior HR leadership role — inherits all HR_MANAGER permissions
 * plus elevated permissions for role management, settings, audit, workflow config,
 * and field-level salary edit access.
 */
@DisplayName("HR_ADMIN Role Tests")
class HrAdminRoleTest {

    @Test
    @DisplayName("HR_ADMIN should exist as an explicit role")
    void hrAdminShouldExistAsExplicitRole() {
        assertThat(RoleHierarchy.ALL_EXPLICIT_ROLES)
                .contains(RoleHierarchy.HR_ADMIN);
        assertThat(RoleHierarchy.isExplicitRole(RoleHierarchy.HR_ADMIN)).isTrue();
    }

    @Test
    @DisplayName("HR_ADMIN should rank between TENANT_ADMIN (90) and HR_MANAGER (80)")
    void hrAdminShouldRankBetweenTenantAdminAndHrManager() {
        int hrAdminRank = RoleHierarchy.getRoleRank(RoleHierarchy.HR_ADMIN);
        int tenantAdminRank = RoleHierarchy.getRoleRank(RoleHierarchy.TENANT_ADMIN);
        int hrManagerRank = RoleHierarchy.getRoleRank(RoleHierarchy.HR_MANAGER);

        assertThat(hrAdminRank).isEqualTo(85);
        assertThat(hrAdminRank).isLessThan(tenantAdminRank);
        assertThat(hrAdminRank).isGreaterThan(hrManagerRank);
    }

    @Test
    @DisplayName("HR_ADMIN should have all HR_MANAGER permissions")
    void hrAdminShouldHaveAllHrManagerPermissions() {
        Set<String> hrAdminPerms = RoleHierarchy.getDefaultPermissions(RoleHierarchy.HR_ADMIN);
        Set<String> hrManagerPerms = RoleHierarchy.getDefaultPermissions(RoleHierarchy.HR_MANAGER);

        assertThat(hrAdminPerms).containsAll(hrManagerPerms);
    }

    @Test
    @DisplayName("HR_ADMIN should have elevated permissions beyond HR_MANAGER")
    void hrAdminShouldHaveElevatedPermissions() {
        Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.HR_ADMIN);

        assertThat(permissions).contains(
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
                Permission.INTEGRATION_MANAGE
        );
    }

    @Test
    @DisplayName("HR_ADMIN should have all 6 FieldPermission constants including salary edit")
    void hrAdminShouldHaveSalaryEditAccess() {
        Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.HR_ADMIN);

        assertThat(permissions).contains(
                FieldPermission.EMPLOYEE_SALARY_VIEW,
                FieldPermission.EMPLOYEE_SALARY_EDIT,
                FieldPermission.EMPLOYEE_BANK_VIEW,
                FieldPermission.EMPLOYEE_BANK_EDIT,
                FieldPermission.EMPLOYEE_TAX_ID_VIEW,
                FieldPermission.EMPLOYEE_ID_DOCS_VIEW
        );
    }

    @Test
    @DisplayName("HR_ADMIN is senior to HR_MANAGER")
    void hrAdminIsSeniorToHrManager() {
        assertThat(RoleHierarchy.isSeniorRole(RoleHierarchy.HR_ADMIN, RoleHierarchy.HR_MANAGER))
                .isTrue();
    }

    @Test
    @DisplayName("HR_ADMIN is junior to TENANT_ADMIN")
    void hrAdminIsJuniorToTenantAdmin() {
        assertThat(RoleHierarchy.isSeniorRole(RoleHierarchy.HR_ADMIN, RoleHierarchy.TENANT_ADMIN))
                .isFalse();
        assertThat(RoleHierarchy.isSeniorRole(RoleHierarchy.TENANT_ADMIN, RoleHierarchy.HR_ADMIN))
                .isTrue();
    }
}
