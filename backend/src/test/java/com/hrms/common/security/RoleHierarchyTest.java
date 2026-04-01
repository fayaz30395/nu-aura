package com.hrms.common.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for RoleHierarchy.
 * Validates role permission sets, hierarchy rankings, and TRAVEL_ADMIN permissions.
 */
@DisplayName("RoleHierarchy Tests")
class RoleHierarchyTest {

    @Nested
    @DisplayName("TRAVEL_ADMIN permissions")
    class TravelAdminPermissionsTests {

        @Test
        @DisplayName("getTravelAdminPermissions includes all TRAVEL:* permissions")
        void shouldIncludeAllTravelPermissions() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.TRAVEL_ADMIN);

            // Then
            assertThat(permissions)
                    .contains(
                            Permission.TRAVEL_VIEW,
                            Permission.TRAVEL_CREATE,
                            Permission.TRAVEL_UPDATE,
                            Permission.TRAVEL_APPROVE,
                            Permission.TRAVEL_VIEW_ALL,
                            Permission.TRAVEL_MANAGE
                    );
        }

        @Test
        @DisplayName("TRAVEL_ADMIN includes expense approval permissions")
        void shouldIncludeExpenseApprovalPermissions() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.TRAVEL_ADMIN);

            // Then
            assertThat(permissions).contains(
                    Permission.EXPENSE_VIEW_ALL,
                    Permission.EXPENSE_APPROVE
            );
        }

        @Test
        @DisplayName("TRAVEL_ADMIN includes employee view for travel booking context")
        void shouldIncludeEmployeeViewPermission() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.TRAVEL_ADMIN);

            // Then
            assertThat(permissions).contains(Permission.EMPLOYEE_VIEW_ALL);
        }

        @Test
        @DisplayName("TRAVEL_ADMIN permissions set is non-empty")
        void shouldHaveNonEmptyPermissionSet() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.TRAVEL_ADMIN);

            // Then
            assertThat(permissions).isNotEmpty();
        }
    }

    @Nested
    @DisplayName("SuperAdmin permissions")
    class SuperAdminPermissionsTests {

        @Test
        @DisplayName("getSuperAdminPermissions returns expected system-level permissions")
        void shouldReturnExpectedSuperAdminPermissions() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.SUPER_ADMIN);

            // Then
            assertThat(permissions)
                    .contains(
                            Permission.SYSTEM_ADMIN,
                            Permission.TENANT_MANAGE,
                            Permission.ROLE_MANAGE,
                            Permission.PERMISSION_MANAGE,
                            Permission.USER_MANAGE,
                            Permission.AUDIT_VIEW,
                            Permission.SETTINGS_UPDATE,
                            Permission.PLATFORM_MANAGE
                    );
        }

        @Test
        @DisplayName("SuperAdmin includes self-service permissions for dashboard access")
        void shouldIncludeSelfServicePermissionsForDashboard() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.SUPER_ADMIN);

            // Then
            assertThat(permissions)
                    .contains(
                            Permission.EMPLOYEE_VIEW_SELF,
                            Permission.DASHBOARD_VIEW,
                            Permission.ANALYTICS_VIEW
                    );
        }

        @Test
        @DisplayName("SuperAdmin permission set is not empty")
        void shouldReturnNonEmptySetForSuperAdmin() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(RoleHierarchy.SUPER_ADMIN);

            // Then
            assertThat(permissions).isNotEmpty();
        }
    }

    @Nested
    @DisplayName("All roles have at least one permission")
    class AllRolesHavePermissionsTests {

        @ParameterizedTest(name = "Role {0} should have at least one permission")
        @ValueSource(strings = {
                RoleHierarchy.SUPER_ADMIN,
                RoleHierarchy.TENANT_ADMIN,
                RoleHierarchy.HR_ADMIN,
                RoleHierarchy.HR_MANAGER,
                RoleHierarchy.HR_EXECUTIVE,
                RoleHierarchy.DEPARTMENT_MANAGER,
                RoleHierarchy.TEAM_LEAD,
                RoleHierarchy.EMPLOYEE,
                RoleHierarchy.CONTRACTOR,
                RoleHierarchy.PAYROLL_ADMIN,
                RoleHierarchy.RECRUITMENT_ADMIN,
                RoleHierarchy.PROJECT_ADMIN,
                RoleHierarchy.ASSET_MANAGER,
                RoleHierarchy.EXPENSE_MANAGER,
                RoleHierarchy.HELPDESK_ADMIN,
                RoleHierarchy.TRAVEL_ADMIN,
                RoleHierarchy.COMPLIANCE_OFFICER,
                RoleHierarchy.LMS_ADMIN,
                RoleHierarchy.INTERN,
                RoleHierarchy.REPORTING_MANAGER,
                RoleHierarchy.SKIP_LEVEL_MANAGER,
                RoleHierarchy.DEPARTMENT_HEAD,
                RoleHierarchy.MENTOR,
                RoleHierarchy.INTERVIEWER,
                RoleHierarchy.PERFORMANCE_REVIEWER,
                RoleHierarchy.ONBOARDING_BUDDY
        })
        @DisplayName("should have at least one permission")
        void allRolesShouldHaveAtLeastOnePermission(String role) {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions(role);

            // Then
            assertThat(permissions)
                    .as("Role '%s' must have at least one permission", role)
                    .isNotEmpty();
        }

        @Test
        @DisplayName("Unknown role returns empty permission set")
        void unknownRoleShouldReturnEmptySet() {
            // When
            Set<String> permissions = RoleHierarchy.getDefaultPermissions("UNKNOWN_ROLE");

            // Then
            assertThat(permissions).isEmpty();
        }
    }

    @Nested
    @DisplayName("Role hierarchy ranking")
    class RoleRankingTests {

        @Test
        @DisplayName("SUPER_ADMIN has the highest rank")
        void superAdminShouldHaveHighestRank() {
            // Then
            assertThat(RoleHierarchy.getRoleRank(RoleHierarchy.SUPER_ADMIN)).isEqualTo(100);
        }

        @Test
        @DisplayName("INTERN has the lowest explicit rank")
        void internShouldHaveLowestExplicitRank() {
            // Then
            assertThat(RoleHierarchy.getRoleRank(RoleHierarchy.INTERN)).isEqualTo(20);
        }

        @Test
        @DisplayName("SUPER_ADMIN is senior to TENANT_ADMIN")
        void superAdminShouldBeSeniorToTenantAdmin() {
            // When / Then
            assertThat(RoleHierarchy.isSeniorRole(RoleHierarchy.SUPER_ADMIN, RoleHierarchy.TENANT_ADMIN)).isTrue();
        }

        @Test
        @DisplayName("EMPLOYEE is not senior to DEPARTMENT_MANAGER")
        void employeeShouldNotBeSeniorToDepartmentManager() {
            // When / Then
            assertThat(RoleHierarchy.isSeniorRole(RoleHierarchy.EMPLOYEE, RoleHierarchy.DEPARTMENT_MANAGER)).isFalse();
        }

        @Test
        @DisplayName("HR_MANAGER is senior to TEAM_LEAD")
        void hrManagerShouldBeSeniorToTeamLead() {
            // When / Then
            assertThat(RoleHierarchy.isSeniorRole(RoleHierarchy.HR_MANAGER, RoleHierarchy.TEAM_LEAD)).isTrue();
        }

        @Test
        @DisplayName("TRAVEL_ADMIN has rank 53")
        void travelAdminShouldHaveRank53() {
            // Then
            assertThat(RoleHierarchy.getRoleRank(RoleHierarchy.TRAVEL_ADMIN)).isEqualTo(53);
        }

        @Test
        @DisplayName("Unknown role has rank 0")
        void unknownRoleShouldHaveRank0() {
            // Then
            assertThat(RoleHierarchy.getRoleRank("UNKNOWN_ROLE")).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("Role classification")
    class RoleClassificationTests {

        @Test
        @DisplayName("SUPER_ADMIN is an explicit role")
        void superAdminShouldBeExplicit() {
            assertThat(RoleHierarchy.isExplicitRole(RoleHierarchy.SUPER_ADMIN)).isTrue();
        }

        @Test
        @DisplayName("REPORTING_MANAGER is an implicit role")
        void reportingManagerShouldBeImplicit() {
            assertThat(RoleHierarchy.isImplicitRole(RoleHierarchy.REPORTING_MANAGER)).isTrue();
        }

        @Test
        @DisplayName("TRAVEL_ADMIN is an explicit role")
        void travelAdminShouldBeExplicit() {
            assertThat(RoleHierarchy.isExplicitRole(RoleHierarchy.TRAVEL_ADMIN)).isTrue();
        }

        @Test
        @DisplayName("Explicit roles are not implicit roles")
        void explicitRolesShouldNotBeImplicit() {
            for (String role : RoleHierarchy.ALL_EXPLICIT_ROLES) {
                assertThat(RoleHierarchy.isImplicitRole(role))
                        .as("Explicit role '%s' should not be implicit", role)
                        .isFalse();
            }
        }

        @Test
        @DisplayName("Implicit roles are not explicit roles")
        void implicitRolesShouldNotBeExplicit() {
            for (String role : RoleHierarchy.ALL_IMPLICIT_ROLES) {
                assertThat(RoleHierarchy.isExplicitRole(role))
                        .as("Implicit role '%s' should not be explicit", role)
                        .isFalse();
            }
        }
    }

    @Nested
    @DisplayName("Constructor protection")
    class ConstructorProtectionTests {

        @Test
        @DisplayName("Should not be instantiable")
        void shouldNotBeInstantiable() {
            assertThatThrownBy(() -> {
                var constructor = RoleHierarchy.class.getDeclaredConstructor();
                constructor.setAccessible(true);
                constructor.newInstance();
            }).hasCauseInstanceOf(AssertionError.class);
        }
    }
}
