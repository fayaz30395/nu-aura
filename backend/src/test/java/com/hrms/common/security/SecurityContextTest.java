package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;

/**
 * Comprehensive unit tests for SecurityContext.
 * Tests user, permission, role, and org context management.
 * Target: 90%+ line coverage
 */
@ExtendWith(MockitoExtension.class)
class SecurityContextTest {

    private static final UUID TEST_USER_ID = UUID.randomUUID();
    private static final UUID TEST_EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TEST_TENANT_ID = UUID.randomUUID();
    private static final UUID TEST_LOCATION_ID = UUID.randomUUID();
    private static final UUID TEST_DEPARTMENT_ID = UUID.randomUUID();
    private static final UUID TEST_TEAM_ID = UUID.randomUUID();

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    @Nested
    @DisplayName("setCurrentUser() and Getters")
    class CurrentUserTests {

        @Test
        @DisplayName("Should set and retrieve current user ID")
        void shouldSetAndRetrieveUserId() {
            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), new HashMap<>());

            // Then
            assertThat(SecurityContext.getCurrentUserId()).isEqualTo(TEST_USER_ID);
        }

        @Test
        @DisplayName("Should set and retrieve current employee ID")
        void shouldSetAndRetrieveEmployeeId() {
            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), new HashMap<>());

            // Then
            assertThat(SecurityContext.getCurrentEmployeeId()).isEqualTo(TEST_EMPLOYEE_ID);
        }

        @Test
        @DisplayName("Should handle null roles by defaulting to empty set")
        void shouldHandleNullRoles() {
            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, null, new HashMap<>());

            // Then
            assertThat(SecurityContext.getCurrentRoles()).isEmpty();
        }

        @Test
        @DisplayName("Should handle null permissions by defaulting to empty map")
        void shouldHandleNullPermissions() {
            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, Set.of(), null);

            // Then
            assertThat(SecurityContext.getCurrentPermissions()).isEmpty();
        }

        @Test
        @DisplayName("Should return null when user context not set")
        void shouldReturnNullWhenContextNotSet() {
            // When/Then
            assertThat(SecurityContext.getCurrentUserId()).isNull();
            assertThat(SecurityContext.getCurrentEmployeeId()).isNull();
        }
    }

    @Nested
    @DisplayName("setCurrentTenantId() and Delegation")
    class TenantContextDelegationTests {

        @Test
        @DisplayName("Should delegate to TenantContext.setCurrentTenant()")
        void shouldDelegateToTenantContext() {
            // When
            SecurityContext.setCurrentTenantId(TEST_TENANT_ID);

            // Then
            assertThat(TenantContext.getCurrentTenant()).isEqualTo(TEST_TENANT_ID);
        }

        @Test
        @DisplayName("Should retrieve tenant ID from TenantContext")
        void shouldRetrieveTenantIdFromTenantContext() {
            // Given
            TenantContext.setCurrentTenant(TEST_TENANT_ID);

            // When/Then
            assertThat(SecurityContext.getCurrentTenantId()).isEqualTo(TEST_TENANT_ID);
        }
    }

    @Nested
    @DisplayName("setOrgContext() and Org Getters")
    class OrgContextTests {

        @Test
        @DisplayName("Should set organization context")
        void shouldSetOrgContext() {
            // When
            SecurityContext.setOrgContext(TEST_LOCATION_ID, TEST_DEPARTMENT_ID, TEST_TEAM_ID);

            // Then
            assertThat(SecurityContext.getCurrentLocationId()).isEqualTo(TEST_LOCATION_ID);
            assertThat(SecurityContext.getCurrentDepartmentId()).isEqualTo(TEST_DEPARTMENT_ID);
            assertThat(SecurityContext.getCurrentTeamId()).isEqualTo(TEST_TEAM_ID);
        }

        @Test
        @DisplayName("Should return null for unset org context")
        void shouldReturnNullForUnsetOrgContext() {
            // When/Then
            assertThat(SecurityContext.getCurrentLocationId()).isNull();
            assertThat(SecurityContext.getCurrentDepartmentId()).isNull();
            assertThat(SecurityContext.getCurrentTeamId()).isNull();
        }
    }

    @Nested
    @DisplayName("setCurrentLocationIds() and getCurrentLocationIds()")
    class LocationIdsTests {

        @Test
        @DisplayName("Should set and retrieve multiple location IDs")
        void shouldSetAndRetrieveMultipleLocationIds() {
            // Given
            UUID loc1 = UUID.randomUUID();
            UUID loc2 = UUID.randomUUID();
            Set<UUID> locationIds = Set.of(loc1, loc2);

            // When
            SecurityContext.setCurrentLocationIds(locationIds);

            // Then
            assertThat(SecurityContext.getCurrentLocationIds()).containsExactlyInAnyOrder(loc1, loc2);
        }

        @Test
        @DisplayName("Should fallback to single location when multiple not set")
        void shouldFallbackToSingleLocation() {
            // Given
            SecurityContext.setOrgContext(TEST_LOCATION_ID, null, null);

            // When
            Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();

            // Then
            assertThat(locationIds).containsExactly(TEST_LOCATION_ID);
        }

        @Test
        @DisplayName("Should return empty set when no locations set")
        void shouldReturnEmptySetWhenNoLocationsSet() {
            // When/Then
            assertThat(SecurityContext.getCurrentLocationIds()).isEmpty();
        }

        @Test
        @DisplayName("Should handle null location IDs by defaulting to empty set")
        void shouldHandleNullLocationIds() {
            // When
            SecurityContext.setCurrentLocationIds(null);

            // Then
            assertThat(SecurityContext.getCurrentLocationIds()).isEmpty();
        }

        @Test
        @DisplayName("Prefer multiple locations over single location")
        void shouldPreferMultipleLocationsOverSingle() {
            // Given
            UUID loc1 = UUID.randomUUID();
            UUID loc2 = UUID.randomUUID();
            SecurityContext.setOrgContext(TEST_LOCATION_ID, null, null);
            SecurityContext.setCurrentLocationIds(Set.of(loc1, loc2));

            // When
            Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();

            // Then - Should return the explicitly set multiple locations, not the fallback
            assertThat(locationIds).containsExactlyInAnyOrder(loc1, loc2);
            assertThat(locationIds).doesNotContain(TEST_LOCATION_ID);
        }
    }

    @Nested
    @DisplayName("setAllReporteeIds() and getAllReporteeIds()")
    class ReporteeIdsTests {

        @Test
        @DisplayName("Should set and retrieve all reportee IDs")
        void shouldSetAndRetrieveReporteeIds() {
            // Given
            UUID reportee1 = UUID.randomUUID();
            UUID reportee2 = UUID.randomUUID();
            Set<UUID> reporteeIds = Set.of(reportee1, reportee2);

            // When
            SecurityContext.setAllReporteeIds(reporteeIds);

            // Then
            assertThat(SecurityContext.getAllReporteeIds()).containsExactlyInAnyOrder(reportee1, reportee2);
        }

        @Test
        @DisplayName("Should handle null reportee IDs")
        void shouldHandleNullReporteeIds() {
            // When
            SecurityContext.setAllReporteeIds(null);

            // Then
            assertThat(SecurityContext.getAllReporteeIds()).isEmpty();
        }

        @Test
        @DisplayName("Should return empty set for unset reportees")
        void shouldReturnEmptySetForUnsetReportees() {
            // When/Then
            assertThat(SecurityContext.getAllReporteeIds()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Custom Scope Targets")
    class CustomScopeTargetsTests {

        @Test
        @DisplayName("Should set and retrieve custom employee IDs for a permission")
        void shouldSetAndRetrieveCustomEmployeeIds() {
            // Given
            String permission = "EMPLOYEE:VIEW";
            UUID empId1 = UUID.randomUUID();
            UUID empId2 = UUID.randomUUID();
            Set<UUID> employeeIds = Set.of(empId1, empId2);

            // When
            SecurityContext.setCustomScopeTargets(permission, employeeIds, null, null);

            // Then
            assertThat(SecurityContext.getCustomEmployeeIds(permission))
                    .containsExactlyInAnyOrder(empId1, empId2);
        }

        @Test
        @DisplayName("Should set and retrieve custom department IDs for a permission")
        void shouldSetAndRetrieveCustomDepartmentIds() {
            // Given
            String permission = "EMPLOYEE:MANAGE";
            UUID deptId1 = UUID.randomUUID();
            UUID deptId2 = UUID.randomUUID();
            Set<UUID> departmentIds = Set.of(deptId1, deptId2);

            // When
            SecurityContext.setCustomScopeTargets(permission, null, departmentIds, null);

            // Then
            assertThat(SecurityContext.getCustomDepartmentIds(permission))
                    .containsExactlyInAnyOrder(deptId1, deptId2);
        }

        @Test
        @DisplayName("Should set and retrieve custom location IDs for a permission")
        void shouldSetAndRetrieveCustomLocationIds() {
            // Given
            String permission = "ATTENDANCE:MARK";
            UUID locId1 = UUID.randomUUID();
            Set<UUID> locationIds = Set.of(locId1);

            // When
            SecurityContext.setCustomScopeTargets(permission, null, null, locationIds);

            // Then
            assertThat(SecurityContext.getCustomLocationIds(permission))
                    .containsExactly(locId1);
        }

        @Test
        @DisplayName("Should return empty set for unset custom targets")
        void shouldReturnEmptySetForUnsetCustomTargets() {
            // When/Then
            assertThat(SecurityContext.getCustomEmployeeIds("ANY_PERMISSION")).isEmpty();
            assertThat(SecurityContext.getCustomDepartmentIds("ANY_PERMISSION")).isEmpty();
            assertThat(SecurityContext.getCustomLocationIds("ANY_PERMISSION")).isEmpty();
        }

        @Test
        @DisplayName("Should handle null custom scope targets gracefully")
        void shouldHandleNullCustomScopeTargets() {
            // When
            SecurityContext.setCustomScopeTargets("PERMISSION", null, null, null);

            // Then
            assertThat(SecurityContext.getCustomEmployeeIds("PERMISSION")).isEmpty();
        }

        @Test
        @DisplayName("Should support multiple permissions with different targets")
        void shouldSupportMultiplePermissionsWithDifferentTargets() {
            // Given
            String perm1 = "PERMISSION:ONE";
            String perm2 = "PERMISSION:TWO";
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();

            // When
            SecurityContext.setCustomScopeTargets(perm1, Set.of(id1), null, null);
            SecurityContext.setCustomScopeTargets(perm2, Set.of(id2), null, null);

            // Then
            assertThat(SecurityContext.getCustomEmployeeIds(perm1)).containsExactly(id1);
            assertThat(SecurityContext.getCustomEmployeeIds(perm2)).containsExactly(id2);
        }
    }

    @Nested
    @DisplayName("hasPermission() - Permission Checks")
    class PermissionCheckTests {

        @BeforeEach
        void setUp() {
            SecurityContext.setCurrentApp("HRMS");
        }

        @Test
        @DisplayName("Should grant permission when user has exact permission")
        void shouldGrantExactPermission() {
            // Given
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission(Permission.EMPLOYEE_READ)).isTrue();
        }

        @Test
        @DisplayName("Should deny permission when user lacks it")
        void shouldDenyPermissionWhenLacking() {
            // Given
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission(Permission.EMPLOYEE_DELETE)).isFalse();
        }

        @Test
        @DisplayName("Should grant permission with app prefix match")
        void shouldGrantPermissionWithAppPrefixMatch() {
            // Given
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission("EMPLOYEE:READ")).isTrue();
        }

        @Test
        @DisplayName("Should grant permission for SYSTEM:ADMIN")
        void shouldGrantPermissionForSystemAdmin() {
            // Given
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:SYSTEM:ADMIN", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission(Permission.EMPLOYEE_DELETE)).isTrue();
            assertThat(SecurityContext.hasPermission("ANY:PERMISSION")).isTrue();
        }

        @Test
        @DisplayName("Should grant permission for legacy SYSTEM_ADMIN")
        void shouldGrantPermissionForLegacySystemAdmin() {
            // Given
            Map<String, RoleScope> permissions = Map.of(
                    Permission.SYSTEM_ADMIN, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission("ANY:MODULE:ACTION")).isTrue();
        }

        @Test
        @DisplayName("Should apply MANAGE permission hierarchy")
        void shouldApplyManagePermissionHierarchy() {
            // Given - User has EMPLOYEE:MANAGE
            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:MANAGE", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), permissions);

            // When/Then - Should grant READ, UPDATE, DELETE (any action under EMPLOYEE)
            assertThat(SecurityContext.hasPermission("EMPLOYEE:READ")).isTrue();
            assertThat(SecurityContext.hasPermission("EMPLOYEE:UPDATE")).isTrue();
            assertThat(SecurityContext.hasPermission("EMPLOYEE:DELETE")).isTrue();
        }

        @Test
        @DisplayName("Should apply READ implies VIEW hierarchy")
        void shouldApplyReadImpliesViewHierarchy() {
            // Given - User has EMPLOYEE:READ
            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then - VIEW permissions should be granted
            assertThat(SecurityContext.hasPermission("EMPLOYEE:VIEW_ALL")).isTrue();
            assertThat(SecurityContext.hasPermission("EMPLOYEE:VIEW_TEAM")).isTrue();
            assertThat(SecurityContext.hasPermission("EMPLOYEE:VIEW_SELF")).isTrue();
        }

        @Test
        @DisplayName("Should deny non-VIEW actions with READ permission")
        void shouldDenyNonViewActionsWithReadPermission() {
            // Given - User has EMPLOYEE:READ
            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission("EMPLOYEE:DELETE")).isFalse();
            assertThat(SecurityContext.hasPermission("EMPLOYEE:UPDATE")).isFalse();
        }

        @Test
        @DisplayName("Should return false when no permissions set")
        void shouldReturnFalseWhenNoPermissionsSet() {
            // Given
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // When/Then
            assertThat(SecurityContext.hasPermission("EMPLOYEE:READ")).isFalse();
        }

        @Test
        @DisplayName("Should handle null permission gracefully")
        void shouldHandleNullPermissionGracefully() {
            // Given
            Map<String, RoleScope> permissions = Map.of(Permission.EMPLOYEE_READ, RoleScope.ALL);
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission(null)).isFalse();
        }
    }

    @Nested
    @DisplayName("hasAnyPermission() - OR Logic")
    class AnyPermissionTests {

        @BeforeEach
        void setUp() {
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL,
                    Permission.EMPLOYEE_CREATE, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);
        }

        @Test
        @DisplayName("Should return true when user has at least one permission")
        void shouldReturnTrueWithAtLeastOnePermission() {
            // When/Then
            assertThat(SecurityContext.hasAnyPermission(
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_DELETE
            )).isTrue();
        }

        @Test
        @DisplayName("Should return true when user has multiple permissions")
        void shouldReturnTrueWithMultiplePermissions() {
            // When/Then
            assertThat(SecurityContext.hasAnyPermission(
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_CREATE
            )).isTrue();
        }

        @Test
        @DisplayName("Should return false when user lacks all permissions")
        void shouldReturnFalseWhenLackingAllPermissions() {
            // When/Then
            assertThat(SecurityContext.hasAnyPermission(
                    Permission.EMPLOYEE_DELETE,
                    Permission.EMPLOYEE_UPDATE
            )).isFalse();
        }

        @Test
        @DisplayName("Should return false with empty permission array")
        void shouldReturnTrueWithEmptyPermissionArray() {
            // When/Then - no permissions to check means none matched
            assertThat(SecurityContext.hasAnyPermission()).isFalse();
        }
    }

    @Nested
    @DisplayName("hasAllPermissions() - AND Logic")
    class AllPermissionsTests {

        @BeforeEach
        void setUp() {
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL,
                    Permission.EMPLOYEE_CREATE, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);
        }

        @Test
        @DisplayName("Should return true when user has all permissions")
        void shouldReturnTrueWhenHasAllPermissions() {
            // When/Then
            assertThat(SecurityContext.hasAllPermissions(
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_CREATE
            )).isTrue();
        }

        @Test
        @DisplayName("Should return false when user lacks any permission")
        void shouldReturnFalseWhenLackingAnyPermission() {
            // When/Then
            assertThat(SecurityContext.hasAllPermissions(
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_DELETE
            )).isFalse();
        }

        @Test
        @DisplayName("Should return true with empty permission array")
        void shouldReturnTrueWithEmptyPermissionArray() {
            // When/Then
            assertThat(SecurityContext.hasAllPermissions()).isTrue();
        }
    }

    @Nested
    @DisplayName("Role Checks")
    class RoleCheckTests {

        @BeforeEach
        void setUp() {
            Set<String> roles = Set.of("ADMIN", "MANAGER");
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    roles, new HashMap<>());
        }

        @Test
        @DisplayName("Should return true for hasRole when role exists")
        void shouldReturnTrueForExistingRole() {
            // When/Then
            assertThat(SecurityContext.hasRole("ADMIN")).isTrue();
        }

        @Test
        @DisplayName("Should return false for hasRole when role absent")
        void shouldReturnFalseForAbsentRole() {
            // When/Then
            assertThat(SecurityContext.hasRole("SUPER_ADMIN")).isFalse();
        }

        @Test
        @DisplayName("Should return true for hasAnyRole with matching role")
        void shouldReturnTrueForHasAnyRoleWithMatch() {
            // When/Then
            assertThat(SecurityContext.hasAnyRole("ADMIN", "OTHER")).isTrue();
        }

        @Test
        @DisplayName("Should return false for hasAnyRole with no match")
        void shouldReturnFalseForHasAnyRoleNoMatch() {
            // When/Then
            assertThat(SecurityContext.hasAnyRole("SUPER_ADMIN", "OTHER")).isFalse();
        }
    }

    @Nested
    @DisplayName("App Access Checks")
    class AppAccessTests {

        @BeforeEach
        void setUp() {
            SecurityContext.setAccessibleApps(Set.of("HRMS", "HIRE"));
        }

        @Test
        @DisplayName("Should return true for hasAppAccess when app exists")
        void shouldReturnTrueForAccessibleApp() {
            // When/Then
            assertThat(SecurityContext.hasAppAccess("HRMS")).isTrue();
        }

        @Test
        @DisplayName("Should return false for hasAppAccess when app absent")
        void shouldReturnFalseForInaccessibleApp() {
            // When/Then
            assertThat(SecurityContext.hasAppAccess("GROW")).isFalse();
        }
    }

    @Nested
    @DisplayName("isSystemAdmin() and isAdmin Role Hierarchy")
    class AdminRoleHierarchyTests {

        @Test
        @DisplayName("Should return true for isSystemAdmin with SYSTEM:ADMIN permission")
        void shouldReturnTrueForSystemAdminPermission() {
            // Given
            SecurityContext.setCurrentApp("HRMS");
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:SYSTEM:ADMIN", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(), permissions);

            // When/Then
            assertThat(SecurityContext.isSystemAdmin()).isTrue();
        }

        @Test
        @DisplayName("Should return true for isSuperAdmin with SUPER_ADMIN role")
        void shouldReturnTrueForSuperAdminRole() {
            // Given
            Map<String, RoleScope> permissions = Map.of(Permission.SYSTEM_ADMIN, RoleScope.ALL);
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN), permissions);

            // When/Then
            assertThat(SecurityContext.isSuperAdmin()).isTrue();
        }

        @Test
        @DisplayName("Should return true for isTenantAdmin with TENANT_ADMIN role")
        void shouldReturnTrueForTenantAdminRole() {
            // Given
            Map<String, RoleScope> permissions = new HashMap<>();
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.TENANT_ADMIN), permissions);

            // When/Then
            assertThat(SecurityContext.isTenantAdmin()).isTrue();
        }

        @Test
        @DisplayName("Should return true for isHRManager with HR_MANAGER role")
        void shouldReturnTrueForHRManagerRole() {
            // Given
            Map<String, RoleScope> permissions = new HashMap<>();
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.HR_MANAGER), permissions);

            // When/Then
            assertThat(SecurityContext.isHRManager()).isTrue();
        }

        @Test
        @DisplayName("Should return true for isManager with DEPARTMENT_MANAGER role")
        void shouldReturnTrueForManagerRoles() {
            // Given
            Map<String, RoleScope> permissions = new HashMap<>();
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.DEPARTMENT_MANAGER), permissions);

            // When/Then
            assertThat(SecurityContext.isManager()).isTrue();
        }

        @Test
        @DisplayName("Should return true for isManager with TEAM_LEAD role")
        void shouldReturnTrueForTeamLeadRole() {
            // Given
            Map<String, RoleScope> permissions = new HashMap<>();
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.TEAM_LEAD), permissions);

            // When/Then
            assertThat(SecurityContext.isManager()).isTrue();
        }
    }

    @Nested
    @DisplayName("Permission and App Permission Extraction")
    class PermissionExtractionTests {

        @BeforeEach
        void setUp() {
            SecurityContext.setCurrentApp("HRMS");
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:EMPLOYEE:READ", RoleScope.ALL,
                    "HRMS:EMPLOYEE:CREATE", RoleScope.ALL,
                    "HIRE:RECRUITMENT:VIEW", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);
        }

        @Test
        @DisplayName("Should extract module permissions for current app")
        void shouldExtractModulePermissions() {
            // When
            Set<String> modulePerms = SecurityContext.getModulePermissions("EMPLOYEE");

            // Then
            assertThat(modulePerms).containsExactlyInAnyOrder(
                    "HRMS:EMPLOYEE:READ",
                    "HRMS:EMPLOYEE:CREATE"
            );
        }

        @Test
        @DisplayName("Should extract app permissions")
        void shouldExtractAppPermissions() {
            // When
            Set<String> appPerms = SecurityContext.getAppPermissions("HRMS");

            // Then
            assertThat(appPerms).containsExactlyInAnyOrder(
                    "HRMS:EMPLOYEE:READ",
                    "HRMS:EMPLOYEE:CREATE"
            );
        }

        @Test
        @DisplayName("Should return empty set when no matching module permissions")
        void shouldReturnEmptySetForNoMatchingModule() {
            // When
            Set<String> modulePerms = SecurityContext.getModulePermissions("PAYROLL");

            // Then
            assertThat(modulePerms).isEmpty();
        }
    }

    @Nested
    @DisplayName("clear() - Context Cleanup")
    class ClearContextTests {

        @BeforeEach
        void setUp() {
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), Map.of(Permission.SYSTEM_ADMIN, RoleScope.ALL));
            SecurityContext.setCurrentApp("HRMS");
            SecurityContext.setOrgContext(TEST_LOCATION_ID, TEST_DEPARTMENT_ID, TEST_TEAM_ID);
            SecurityContext.setCurrentLocationIds(Set.of(TEST_LOCATION_ID));
            SecurityContext.setAllReporteeIds(Set.of(UUID.randomUUID()));
            SecurityContext.setAccessibleApps(Set.of("HRMS"));
        }

        @Test
        @DisplayName("Should clear all thread locals on clear()")
        void shouldClearAllContexts() {
            // When
            SecurityContext.clear();

            // Then
            assertThat(SecurityContext.getCurrentUserId()).isNull();
            assertThat(SecurityContext.getCurrentEmployeeId()).isNull();
            assertThat(SecurityContext.getCurrentAppCode()).isNull();
            assertThat(SecurityContext.getCurrentRoles()).isEmpty();
            assertThat(SecurityContext.getCurrentPermissions()).isEmpty();
            assertThat(SecurityContext.getCurrentLocationId()).isNull();
            assertThat(SecurityContext.getCurrentDepartmentId()).isNull();
            assertThat(SecurityContext.getCurrentTeamId()).isNull();
            assertThat(SecurityContext.getCurrentLocationIds()).isEmpty();
            assertThat(SecurityContext.getAllReporteeIds()).isEmpty();
            assertThat(SecurityContext.getAccessibleApps()).isEmpty();
        }

        @Test
        @DisplayName("Should allow re-setting context after clear()")
        void shouldAllowReSettingAfterClear() {
            // Given
            SecurityContext.clear();

            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // Then
            assertThat(SecurityContext.getCurrentUserId()).isEqualTo(TEST_USER_ID);
            assertThat(SecurityContext.getCurrentEmployeeId()).isEqualTo(TEST_EMPLOYEE_ID);
        }
    }

    @Nested
    @DisplayName("Edge Cases and Boundary Conditions")
    class EdgeCasesTests {

        @Test
        @DisplayName("Should handle empty role set")
        void shouldHandleEmptyRoleSet() {
            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(), new HashMap<>());

            // Then
            assertThat(SecurityContext.getCurrentRoles()).isEmpty();
            assertThat(SecurityContext.hasRole("ANY")).isFalse();
        }

        @Test
        @DisplayName("Should handle empty permission map")
        void shouldHandleEmptyPermissionMap() {
            // When
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(), new HashMap<>());

            // Then
            assertThat(SecurityContext.getCurrentPermissions()).isEmpty();
            assertThat(SecurityContext.hasPermission("ANY:PERMISSION")).isFalse();
        }

        @Test
        @DisplayName("Should handle permission with null app code")
        void shouldHandlePermissionWithNullAppCode() {
            // Given - No app code set
            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(), permissions);

            // When/Then
            assertThat(SecurityContext.hasPermission("EMPLOYEE:READ")).isTrue();
        }

        @Test
        @DisplayName("Should retrieve permission scope correctly")
        void shouldRetrievePermissionScopeCorrectly() {
            // Given
            SecurityContext.setCurrentApp("HRMS");
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:EMPLOYEE:READ", RoleScope.DEPARTMENT
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(), permissions);

            // When
            RoleScope scope = SecurityContext.getPermissionScope("EMPLOYEE:READ");

            // Then
            assertThat(scope).isEqualTo(RoleScope.DEPARTMENT);
        }

        @Test
        @DisplayName("Should return null for non-existent permission scope")
        void shouldReturnNullForNonExistentPermissionScope() {
            // Given
            Map<String, RoleScope> permissions = new HashMap<>();
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(), permissions);

            // When
            RoleScope scope = SecurityContext.getPermissionScope("NONEXISTENT:PERMISSION");

            // Then
            assertThat(scope).isNull();
        }
    }
}
