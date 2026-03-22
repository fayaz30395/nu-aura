package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for PermissionAspect.
 * Tests AOP permission enforcement including @RequiresPermission annotation handling.
 * Target: 90%+ line coverage
 */
@ExtendWith(MockitoExtension.class)
@Slf4j
class PermissionAspectTest {

    private static final UUID TEST_USER_ID = UUID.randomUUID();
    private static final UUID TEST_EMPLOYEE_ID = UUID.randomUUID();

    @Mock
    private SecurityService securityService;

    @Mock
    private ProceedingJoinPoint joinPoint;

    @Mock
    private MethodSignature methodSignature;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private PermissionAspect permissionAspect;

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Nested
    @DisplayName("SuperAdmin Bypass")
    class SuperAdminBypassTests {

        @BeforeEach
        void setUp() throws NoSuchMethodException {
            setupMethodSignature();
        }

        private void setupMethodSignature() throws NoSuchMethodException {
            Method testMethod = PermissionAspectTest.class.getMethod("toString");
            when(methodSignature.getMethod()).thenReturn(testMethod);
            when(joinPoint.getSignature()).thenReturn(methodSignature);
        }

        @Test
        @DisplayName("Should bypass all permission checks for SuperAdmin")
        void shouldBypassPermissionChecksForSuperAdmin() throws Throwable {
            // Given - SuperAdmin user
            Map<String, RoleScope> permissions = Map.of(
                    Permission.SYSTEM_ADMIN, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN), permissions);
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{Permission.EMPLOYEE_DELETE});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }

        @Test
        @DisplayName("Should bypass even with missing permissions for SUPER_ADMIN role")
        void shouldBypassWithSuperAdminRole() throws Throwable {
            // Given - User with SUPER_ADMIN role
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN), new HashMap<>());
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{Permission.PAYROLL_PROCESS});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }
    }

    @Nested
    @DisplayName("anyOf Permission Checks (OR logic)")
    class AnyOfPermissionTests {

        @BeforeEach
        void setUp() throws NoSuchMethodException {
            setupMethodSignature();
        }

        private void setupMethodSignature() throws NoSuchMethodException {
            Method testMethod = PermissionAspectTest.class.getMethod("toString");
            when(methodSignature.getMethod()).thenReturn(testMethod);
            when(joinPoint.getSignature()).thenReturn(methodSignature);
        }

        @Test
        @DisplayName("Should allow access when user has one of the required permissions")
        void shouldAllowAccessWithOnePermission() throws Throwable {
            // Given - User has EMPLOYEE_READ permission
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_DELETE
            });
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }

        @Test
        @DisplayName("Should deny access when user lacks all required permissions")
        void shouldDenyAccessWithoutPermissions() throws Throwable {
            // Given - User has no permissions
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_DELETE
            });
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Insufficient permissions");
            verify(joinPoint, never()).proceed();
        }

        @Test
        @DisplayName("Should allow access when no permissions required (empty array)")
        void shouldAllowAccessWithEmptyPermissions() throws Throwable {
            // Given
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }
    }

    @Nested
    @DisplayName("allOf Permission Checks (AND logic)")
    class AllOfPermissionTests {

        @BeforeEach
        void setUp() throws NoSuchMethodException {
            setupMethodSignature();
        }

        private void setupMethodSignature() throws NoSuchMethodException {
            Method testMethod = PermissionAspectTest.class.getMethod("toString");
            when(methodSignature.getMethod()).thenReturn(testMethod);
            when(joinPoint.getSignature()).thenReturn(methodSignature);
        }

        @Test
        @DisplayName("Should allow access when user has all required permissions")
        void shouldAllowAccessWithAllPermissions() throws Throwable {
            // Given - User has both required permissions
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL,
                    Permission.EMPLOYEE_CREATE, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{});
            when(annotation.allOf()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_CREATE
            });
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }

        @Test
        @DisplayName("Should deny access when user lacks any required permission")
        void shouldDenyAccessWhenLackingAnyPermission() throws Throwable {
            // Given - User has only one of two required permissions
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{});
            when(annotation.allOf()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_DELETE
            });
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Insufficient permissions");
            verify(joinPoint, never()).proceed();
        }
    }

    @Nested
    @DisplayName("Revalidation - Fresh Permission Lookup")
    class RevalidationTests {

        @BeforeEach
        void setUp() throws NoSuchMethodException {
            setupMethodSignature();
            setupAuthentication();
        }

        private void setupMethodSignature() throws NoSuchMethodException {
            Method testMethod = PermissionAspectTest.class.getMethod("toString");
            when(methodSignature.getMethod()).thenReturn(testMethod);
            when(joinPoint.getSignature()).thenReturn(methodSignature);
        }

        private void setupAuthentication() {
            Set<String> authorities = new HashSet<>();
            authorities.add("ROLE_USER");
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getAuthorities())
                    .thenReturn(() -> authorities.stream()
                            .map(SimpleGrantedAuthority::new)
                            .iterator());

            org.springframework.security.core.context.SecurityContext secCtx =
                    SecurityContextHolder.createEmptyContext();
            secCtx.setAuthentication(authentication);
            SecurityContextHolder.setContext(secCtx);
        }

        @Test
        @DisplayName("Should fetch fresh permissions from DB when revalidate=true")
        void shouldFetchFreshPermissionsOnRevalidate() throws Throwable {
            // Given - revalidate flag is true
            when(joinPoint.proceed()).thenReturn("success");
            when(securityService.getFreshPermissions(anyCollection()))
                    .thenReturn(Set.of(Permission.EMPLOYEE_READ));

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{Permission.EMPLOYEE_READ});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(true);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(securityService).getFreshPermissions(anyCollection());
            verify(joinPoint).proceed();
        }

        @Test
        @DisplayName("Should deny access on revalidation when fresh permissions lack required")
        void shouldDenyAccessOnRevalidationWithoutPermission() throws Throwable {
            // Given - Fresh permissions don't include the required one
            when(securityService.getFreshPermissions(anyCollection()))
                    .thenReturn(new HashSet<>()); // Empty permissions

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{Permission.EMPLOYEE_DELETE});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(true);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Insufficient permissions (revalidated)");
            verify(joinPoint, never()).proceed();
        }

        @Test
        @DisplayName("Should deny access when not authenticated during revalidation")
        void shouldDenyAccessWhenNotAuthenticatedDuringRevalidation() throws Throwable {
            // Given - No authentication
            SecurityContextHolder.clearContext();

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{Permission.EMPLOYEE_READ});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(true);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Not authenticated");
            verify(joinPoint, never()).proceed();
        }

        @Test
        @DisplayName("Should handle allOf logic during revalidation")
        void shouldHandleAllOfLogicDuringRevalidation() throws Throwable {
            // Given
            when(securityService.getFreshPermissions(anyCollection()))
                    .thenReturn(Set.of(Permission.EMPLOYEE_READ, Permission.EMPLOYEE_CREATE));
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{});
            when(annotation.allOf()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_CREATE
            });
            when(annotation.revalidate()).thenReturn(true);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }

        @Test
        @DisplayName("Should deny when allOf check fails during revalidation")
        void shouldDenyWhenAllOfFailsDuringRevalidation() throws Throwable {
            // Given - Missing one required permission
            when(securityService.getFreshPermissions(anyCollection()))
                    .thenReturn(Set.of(Permission.EMPLOYEE_READ)); // Missing EMPLOYEE_DELETE

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{});
            when(annotation.allOf()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ,
                    Permission.EMPLOYEE_DELETE
            });
            when(annotation.revalidate()).thenReturn(true);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Insufficient permissions (revalidated)");
            verify(joinPoint, never()).proceed();
        }
    }

    @Nested
    @DisplayName("Exception Handling and Edge Cases")
    class ExceptionHandlingTests {

        @BeforeEach
        void setUp() throws NoSuchMethodException {
            setupMethodSignature();
        }

        private void setupMethodSignature() throws NoSuchMethodException {
            Method testMethod = PermissionAspectTest.class.getMethod("toString");
            when(methodSignature.getMethod()).thenReturn(testMethod);
            when(joinPoint.getSignature()).thenReturn(methodSignature);
        }

        @Test
        @DisplayName("Should propagate exceptions from wrapped method")
        void shouldPropagateMethodExceptions() throws Throwable {
            // Given - Wrapped method throws exception
            when(joinPoint.proceed()).thenThrow(new RuntimeException("Method failed"));

            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN),
                    Map.of(Permission.SYSTEM_ADMIN, RoleScope.ALL));

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Method failed");
        }

        @Test
        @DisplayName("Should handle null annotation gracefully")
        void shouldHandleNullAnnotationGracefully() throws Throwable {
            // Given - Method has no annotation
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());
            when(joinPoint.proceed()).thenReturn("success");

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(null);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }

        @Test
        @DisplayName("Should deny access when SecurityContext is null")
        void shouldDenyAccessWhenNoSecurityContext() throws Throwable {
            // Given - No security context set
            SecurityContext.clear();

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{Permission.EMPLOYEE_READ});
            when(annotation.allOf()).thenReturn(new String[]{});
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When/Then
            assertThatThrownBy(() -> permissionAspect.checkPermission(joinPoint))
                    .isInstanceOf(AccessDeniedException.class);
            verify(joinPoint, never()).proceed();
        }
    }

    @Nested
    @DisplayName("Combined anyOf and allOf Logic")
    class CombinedLogicTests {

        @BeforeEach
        void setUp() throws NoSuchMethodException {
            setupMethodSignature();
        }

        private void setupMethodSignature() throws NoSuchMethodException {
            Method testMethod = PermissionAspectTest.class.getMethod("toString");
            when(methodSignature.getMethod()).thenReturn(testMethod);
            when(joinPoint.getSignature()).thenReturn(methodSignature);
        }

        @Test
        @DisplayName("Should enforce both anyOf and allOf together")
        void shouldEnforceBothAnyOfAndAllOf() throws Throwable {
            // Given - User has READ and CREATE but not UPDATE
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL,
                    Permission.EMPLOYEE_CREATE, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);
            when(joinPoint.proceed()).thenReturn("success");

            RequiresPermission annotation = mock(RequiresPermission.class);
            when(annotation.value()).thenReturn(new String[]{
                    Permission.EMPLOYEE_READ, // Satisfies anyOf
                    Permission.EMPLOYEE_DELETE
            });
            when(annotation.allOf()).thenReturn(new String[]{
                    Permission.EMPLOYEE_CREATE // Satisfies allOf
            });
            when(annotation.revalidate()).thenReturn(false);

            Method method = mock(Method.class);
            when(method.getAnnotation(RequiresPermission.class)).thenReturn(annotation);
            when(methodSignature.getMethod()).thenReturn(method);

            // When
            Object result = permissionAspect.checkPermission(joinPoint);

            // Then
            assertThat(result).isEqualTo("success");
            verify(joinPoint).proceed();
        }
    }
}
