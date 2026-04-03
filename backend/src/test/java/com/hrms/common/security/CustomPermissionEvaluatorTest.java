package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for CustomPermissionEvaluator.
 * Tests Spring Security PermissionEvaluator integration and permission evaluation.
 * Target: 90%+ line coverage
 */
@ExtendWith(MockitoExtension.class)
class CustomPermissionEvaluatorTest {

    private static final UUID TEST_USER_ID = UUID.randomUUID();
    private static final UUID TEST_EMPLOYEE_ID = UUID.randomUUID();

    @Mock
    private SecurityService securityService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CustomPermissionEvaluator permissionEvaluator;

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    /**
     * Helper class for testing permission object conversion
     */
    private static class PermissionObject {
        private final String permissionCode;

        PermissionObject(String permissionCode) {
            this.permissionCode = permissionCode;
        }

        @Override
        public String toString() {
            return permissionCode;
        }
    }

    @Nested
    @DisplayName("hasPermission(Authentication, Object targetDomainObject, Object permission)")
    class HasPermissionObjectOverloadTests {

        @Test
        @DisplayName("Should return true when user has permission")
        void shouldReturnTrueWhenUserHasPermission() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when user lacks permission")
        void shouldReturnFalseWhenUserLacksPermission() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    Permission.EMPLOYEE_DELETE
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return true for SuperAdmin regardless of permission")
        void shouldReturnTrueForSuperAdmin() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.SYSTEM_ADMIN, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    Permission.PAYROLL_PROCESS
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when authentication is null")
        void shouldReturnFalseWhenAuthenticationNull() {
            // When
            boolean result = permissionEvaluator.hasPermission(
                    null,
                    "targetObject",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when not authenticated")
        void shouldReturnFalseWhenNotAuthenticated() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(false);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when permission is null")
        void shouldReturnFalseWhenPermissionNull() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    null
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should convert permission object to string")
        void shouldConvertPermissionObjectToString() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, "EMPLOYEE:READ"))
                    .thenReturn(true);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    new PermissionObject("EMPLOYEE:READ")
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should handle empty targetDomainObject")
        void shouldHandleEmptyTargetObject() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should handle null targetDomainObject")
        void shouldHandleNullTargetObject() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    null,
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }
    }

    @Nested
    @DisplayName("hasPermission(Authentication, Serializable targetId, String targetType, Object permission)")
    class HasPermissionSerializableOverloadTests {

        @Test
        @DisplayName("Should return true when user has permission with ID and type")
        void shouldReturnTrueWithIdAndType() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            UUID targetId = UUID.randomUUID();

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    targetId,
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when user lacks permission with ID and type")
        void shouldReturnFalseWithIdAndTypeNoPermission() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            UUID targetId = UUID.randomUUID();

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    targetId,
                    "EMPLOYEE",
                    Permission.EMPLOYEE_DELETE
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return true for SuperAdmin with ID and type")
        void shouldReturnTrueForSuperAdminWithIdAndType() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.SYSTEM_ADMIN, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN), permissions);

            UUID targetId = UUID.randomUUID();

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    targetId,
                    "EMPLOYEE",
                    Permission.PAYROLL_PROCESS
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when null authentication with ID and type")
        void shouldReturnFalseWhenNullAuthenticationWithIdAndType() {
            // When
            boolean result = permissionEvaluator.hasPermission(
                    null,
                    UUID.randomUUID(),
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when not authenticated with ID and type")
        void shouldReturnFalseWhenNotAuthenticatedWithIdAndType() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(false);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    UUID.randomUUID(),
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when permission is null with ID and type")
        void shouldReturnFalseWhenPermissionNullWithIdAndType() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    UUID.randomUUID(),
                    "EMPLOYEE",
                    null
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should handle various targetId types")
        void shouldHandleVariousTargetIdTypes() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then - test with String ID
            assertThat(permissionEvaluator.hasPermission(
                    authentication,
                    "123",
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            )).isTrue();

            // When/Then - test with Long ID
            assertThat(permissionEvaluator.hasPermission(
                    authentication,
                    123L,
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            )).isTrue();

            // When/Then - test with Integer ID
            assertThat(permissionEvaluator.hasPermission(
                    authentication,
                    123,
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            )).isTrue();
        }

        @Test
        @DisplayName("Should handle null targetId")
        void shouldHandleNullTargetId() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    null,
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should handle null targetType")
        void shouldHandleNullTargetType() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    UUID.randomUUID(),
                    null,
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }
    }

    @Nested
    @DisplayName("PermissionEvaluator Integration")
    class IntegrationTests {

        @Test
        @DisplayName("Should integrate with SecurityService for permission checks")
        void shouldIntegrateWithSecurityService() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ))
                    .thenReturn(true);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should handle permission hierarchy through SecurityContext")
        void shouldHandlePermissionHierarchyThroughSecurityContext() {
            // Given - User has MANAGE permission which implies all actions
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, "EMPLOYEE:DELETE")).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:MANAGE", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    "EMPLOYEE:DELETE"
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should handle app-prefixed permissions")
        void shouldHandleAppPrefixedPermissions() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, "EMPLOYEE:READ")).thenReturn(true);

            SecurityContext.setCurrentApp("HRMS");
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    "EMPLOYEE:READ"
            );

            // Then
            assertThat(result).isTrue();
        }
    }

    @Nested
    @DisplayName("Edge Cases and Boundary Conditions")
    class EdgeCasesTests {

        @Test
        @DisplayName("Should handle empty permission string")
        void shouldHandleEmptyPermissionString() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    ""
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should handle special characters in permission")
        void shouldHandleSpecialCharactersInPermission() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, "SPECIAL:PERM:*")).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    "SPECIAL:PERM:*", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    "SPECIAL:PERM:*"
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should handle case-sensitive permission matching")
        void shouldHandleCaseSensitivePermissionMatching() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When - different case
            boolean result = permissionEvaluator.hasPermission(
                    authentication,
                    "targetObject",
                    "employee:read"
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return true when both overloads called consecutively")
        void shouldReturnTrueWhenBothOverloadsCalled() {
            // Given
            when(authentication.isAuthenticated()).thenReturn(true);
            when(securityService.hasPermission(authentication, Permission.EMPLOYEE_READ)).thenReturn(true);

            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When - call first overload
            boolean result1 = permissionEvaluator.hasPermission(
                    authentication,
                    "target",
                    Permission.EMPLOYEE_READ
            );

            // When - call second overload
            boolean result2 = permissionEvaluator.hasPermission(
                    authentication,
                    UUID.randomUUID(),
                    "EMPLOYEE",
                    Permission.EMPLOYEE_READ
            );

            // Then
            assertThat(result1).isTrue();
            assertThat(result2).isTrue();
        }
    }
}
