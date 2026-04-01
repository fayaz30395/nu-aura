package com.hrms.api.admin.controller;

import com.hrms.common.security.RequiresPermission;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Reflection-based tests that verify the {@code @RequiresPermission} annotation
 * configuration on {@link SystemAdminController} endpoints.
 *
 * <p>In particular this suite asserts that the impersonate endpoint carries
 * {@code revalidate = true}. Impersonation is a highest-privilege operation —
 * a SuperAdmin uses it to gain access to any tenant's data. Forcing a
 * database permission re-check ensures that if a user's SUPER_ADMIN role is
 * revoked between login and the impersonate request, access is still denied
 * (i.e., stale JWT claims cannot be exploited).
 *
 * <p>No Spring context is loaded — pure reflection keeps the suite fast.
 */
@DisplayName("SystemAdminController @RequiresPermission(revalidate) annotation tests")
class SystemAdminControllerAnnotationTest {

    private RequiresPermission getAnnotation(String methodName, Class<?>... paramTypes)
            throws NoSuchMethodException {
        Method method = SystemAdminController.class.getDeclaredMethod(methodName, paramTypes);
        return method.getAnnotation(RequiresPermission.class);
    }

    // -----------------------------------------------------------------------
    // impersonate endpoint — must require revalidation (CRIT-005)
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("generateImpersonationToken endpoint (CRIT-005)")
    class ImpersonateEndpointAnnotationTests {

        @Test
        @DisplayName("generateImpersonationToken has @RequiresPermission annotation")
        void impersonateHasRequiresPermissionAnnotation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("generateImpersonationToken", UUID.class);

            assertThat(annotation)
                    .as("generateImpersonationToken must be annotated with @RequiresPermission")
                    .isNotNull();
        }

        @Test
        @DisplayName("generateImpersonationToken has revalidate = true")
        void impersonateHasRevalidateTrue() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("generateImpersonationToken", UUID.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.revalidate())
                    .as("Impersonation is a highest-privilege action — " +
                        "revalidate=true is required to prevent stale-JWT exploitation (CRIT-005)")
                    .isTrue();
        }

        @Test
        @DisplayName("generateImpersonationToken requires SYSTEM_ADMIN permission")
        void impersonateRequiresSystemAdminPermission() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("generateImpersonationToken", UUID.class);

            assertThat(annotation).isNotNull();
            // Either value() or allOf() must contain SYSTEM_ADMIN
            boolean hasSystemAdmin =
                    containsSystemAdmin(annotation.value()[0]) ||
                    containsSystemAdmin(annotation.allOf());

            assertThat(hasSystemAdmin)
                    .as("generateImpersonationToken must require SYSTEM_ADMIN permission")
                    .isTrue();
        }
    }

    // -----------------------------------------------------------------------
    // Read-only endpoints — SYSTEM_ADMIN required but revalidation not expected
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Read-only endpoints (overview, tenants, growth-metrics)")
    class ReadOnlyEndpointAnnotationTests {

        @Test
        @DisplayName("getSystemOverview has @RequiresPermission annotation")
        void overviewHasRequiresPermissionAnnotation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("getSystemOverview");

            assertThat(annotation)
                    .as("getSystemOverview must require SYSTEM_ADMIN permission")
                    .isNotNull();
        }

        @Test
        @DisplayName("getSystemOverview requires SYSTEM_ADMIN permission")
        void overviewRequiresSystemAdminPermission() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("getSystemOverview");

            assertThat(annotation).isNotNull();
            boolean hasSystemAdmin =
                    containsSystemAdmin(annotation.value()[0]) ||
                    containsSystemAdmin(annotation.allOf());

            assertThat(hasSystemAdmin).isTrue();
        }

        @Test
        @DisplayName("getSystemOverview does NOT have revalidate = true (no unnecessary DB overhead)")
        void overviewDoesNotRequireRevalidation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("getSystemOverview");

            if (annotation != null) {
                assertThat(annotation.revalidate())
                        .as("Read-only overview endpoint should not add revalidation overhead")
                        .isFalse();
            }
        }
    }

    // -----------------------------------------------------------------------
    // Suspend / activate tenant endpoints — state-mutation (should require SYSTEM_ADMIN)
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Tenant lifecycle endpoints (suspend / activate)")
    class TenantLifecycleAnnotationTests {

        @Test
        @DisplayName("suspendTenant has @RequiresPermission annotation with SYSTEM_ADMIN")
        void suspendTenantHasSystemAdminPermission() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("suspendTenant", UUID.class);

            assertThat(annotation).isNotNull();
            boolean hasSystemAdmin =
                    containsSystemAdmin(annotation.value()[0]) ||
                    containsSystemAdmin(annotation.allOf());
            assertThat(hasSystemAdmin).isTrue();
        }

        @Test
        @DisplayName("activateTenant has @RequiresPermission annotation with SYSTEM_ADMIN")
        void activateTenantHasSystemAdminPermission() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("activateTenant", UUID.class);

            assertThat(annotation).isNotNull();
            boolean hasSystemAdmin =
                    containsSystemAdmin(annotation.value()[0]) ||
                    containsSystemAdmin(annotation.allOf());
            assertThat(hasSystemAdmin).isTrue();
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Accepts all known forms of the SYSTEM_ADMIN permission constant:
     * - "SYSTEM:ADMIN"  — the canonical value in {@code Permission.SYSTEM_ADMIN}
     * - "SYSTEM_ADMIN"  — bare constant name (used as static import alias)
     * - "system.admin"  — legacy dot-notation form
     */
    private static boolean containsSystemAdmin(String[] permissions) {
        for (String p : permissions) {
            if ("SYSTEM:ADMIN".equalsIgnoreCase(p) ||
                "SYSTEM_ADMIN".equalsIgnoreCase(p) ||
                "system.admin".equalsIgnoreCase(p)) {
                return true;
            }
        }
        return false;
    }
}
