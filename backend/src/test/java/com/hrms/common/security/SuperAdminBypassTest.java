package com.hrms.common.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashMap;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * F-01 (P0) regression tests: SuperAdmin bypass must fire regardless of whether
 * the JWT role claim carries Spring's {@code ROLE_} prefix or not.
 * <p>
 * Background: {@code JwtTokenProvider.generateToken(Authentication, ...)}
 * serializes roles via {@code GrantedAuthority::getAuthority}, which emits
 * {@code "ROLE_SUPER_ADMIN"}. {@code generateTokenWithAppPermissions} stores
 * role codes raw ({@code "SUPER_ADMIN"}). Cross-worker cookie sharing or a
 * mixed-issuer pipeline can therefore produce either claim shape. Both must
 * trigger the SuperAdmin bypass in {@link PermissionAspect} and
 * {@link PermissionHandlerInterceptor}, which both gate on
 * {@link SecurityContext#isTenantAdmin()}.
 */
class SuperAdminBypassTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    @Nested
    @DisplayName("hasRole — role-claim shape tolerance")
    class HasRoleShapeTolerance {

        @Test
        @DisplayName("bare SUPER_ADMIN claim matches hasRole(\"SUPER_ADMIN\")")
        void bareClaim_matches_bareLookup() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("SUPER_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.hasRole(RoleHierarchy.SUPER_ADMIN)).isTrue();
        }

        @Test
        @DisplayName("ROLE_-prefixed claim also matches hasRole(\"SUPER_ADMIN\") — prevents 403 on 10 endpoints (F-01)")
        void rolePrefixedClaim_matches_bareLookup() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("ROLE_SUPER_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.hasRole(RoleHierarchy.SUPER_ADMIN))
                    .as("hasRole must normalise the ROLE_ prefix so SuperAdmin bypass fires regardless of token issuer")
                    .isTrue();
        }

        @Test
        @DisplayName("bare claim matches hasRole(\"ROLE_SUPER_ADMIN\") — symmetry")
        void bareClaim_matches_rolePrefixedLookup() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("SUPER_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.hasRole("ROLE_SUPER_ADMIN")).isTrue();
        }

        @Test
        @DisplayName("unrelated role must NOT match — bypass stays strict on role code value")
        void unrelatedRole_doesNotMatch() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("ROLE_EMPLOYEE"), new HashMap<>());

            assertThat(SecurityContext.hasRole(RoleHierarchy.SUPER_ADMIN)).isFalse();
            assertThat(SecurityContext.hasRole(RoleHierarchy.TENANT_ADMIN)).isFalse();
        }

        @Test
        @DisplayName("null role returns false")
        void nullRole_returnsFalse() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("SUPER_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.hasRole(null)).isFalse();
        }

        @Test
        @DisplayName("empty role set returns false")
        void emptyRoles_returnsFalse() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Collections.emptySet(), new HashMap<>());

            assertThat(SecurityContext.hasRole(RoleHierarchy.SUPER_ADMIN)).isFalse();
        }
    }

    @Nested
    @DisplayName("isSuperAdmin / isTenantAdmin — @RequiresPermission bypass gate")
    class AdminBypassGate {

        @Test
        @DisplayName("isSuperAdmin() true for bare SUPER_ADMIN claim")
        void isSuperAdmin_bareClaim() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("SUPER_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.isSuperAdmin()).isTrue();
            assertThat(SecurityContext.isTenantAdmin()).isTrue(); // implies SuperAdmin
        }

        @Test
        @DisplayName("isSuperAdmin() true for ROLE_SUPER_ADMIN claim — F-01 regression")
        void isSuperAdmin_rolePrefixedClaim() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("ROLE_SUPER_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.isSuperAdmin())
                    .as("ROLE_-prefixed claim must still trigger SuperAdmin bypass")
                    .isTrue();
            assertThat(SecurityContext.isTenantAdmin())
                    .as("isTenantAdmin() delegates to isSuperAdmin(); bypass in PermissionAspect/Interceptor depends on this")
                    .isTrue();
        }

        @Test
        @DisplayName("isTenantAdmin() true for bare TENANT_ADMIN claim")
        void isTenantAdmin_bareClaim() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("TENANT_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.isTenantAdmin()).isTrue();
            assertThat(SecurityContext.isSuperAdmin()).isFalse();
        }

        @Test
        @DisplayName("isTenantAdmin() true for ROLE_TENANT_ADMIN claim")
        void isTenantAdmin_rolePrefixedClaim() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("ROLE_TENANT_ADMIN"), new HashMap<>());

            assertThat(SecurityContext.isTenantAdmin()).isTrue();
        }

        @Test
        @DisplayName("EMPLOYEE role does NOT trigger admin bypass (regression guard)")
        void employee_noBypass() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("ROLE_EMPLOYEE"), new HashMap<>());

            assertThat(SecurityContext.isSuperAdmin()).isFalse();
            assertThat(SecurityContext.isTenantAdmin()).isFalse();
        }
    }

    @Nested
    @DisplayName("hasAnyRole — shape tolerance")
    class HasAnyRoleShapeTolerance {

        @Test
        @DisplayName("hasAnyRole matches ROLE_-prefixed claim")
        void hasAnyRole_matches_rolePrefixedClaim() {
            SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
                    Set.of("ROLE_HR_MANAGER"), new HashMap<>());

            assertThat(SecurityContext.hasAnyRole(
                    RoleHierarchy.SUPER_ADMIN,
                    RoleHierarchy.HR_MANAGER,
                    RoleHierarchy.TENANT_ADMIN)).isTrue();
        }
    }
}
