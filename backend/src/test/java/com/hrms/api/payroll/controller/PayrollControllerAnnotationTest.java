package com.hrms.api.payroll.controller;

import com.hrms.common.security.RequiresPermission;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Reflection-based tests that verify {@code @RequiresPermission(revalidate = true)}
 * is present on the PayrollController's sensitive state-mutation endpoints.
 *
 * <p>These tests are security-critical: they ensure that payroll process, approve,
 * and lock operations force a fresh database permission check at runtime, preventing
 * stale JWT claims from authorising high-privilege operations.
 *
 * <p>No Spring context is loaded — pure reflection to keep the suite fast and focused.
 */
@DisplayName("PayrollController @RequiresPermission(revalidate) annotation tests")
class PayrollControllerAnnotationTest {

    private RequiresPermission getAnnotation(String methodName, Class<?>... paramTypes)
            throws NoSuchMethodException {
        Method method = PayrollController.class.getDeclaredMethod(methodName, paramTypes);
        return method.getAnnotation(RequiresPermission.class);
    }

    // -----------------------------------------------------------------------
    // process endpoint
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("processPayrollRun endpoint")
    class ProcessEndpointAnnotationTests {

        @Test
        @DisplayName("processPayrollRun has @RequiresPermission annotation")
        void processHasRequiresPermissionAnnotation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("processPayrollRun", UUID.class);

            assertThat(annotation).isNotNull();
        }

        @Test
        @DisplayName("processPayrollRun has revalidate = true")
        void processHasRevalidateTrue() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("processPayrollRun", UUID.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.revalidate())
                    .as("processPayrollRun must set revalidate=true to prevent stale-JWT abuse")
                    .isTrue();
        }
    }

    // -----------------------------------------------------------------------
    // approve endpoint
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("approvePayrollRun endpoint")
    class ApproveEndpointAnnotationTests {

        @Test
        @DisplayName("approvePayrollRun has @RequiresPermission annotation")
        void approveHasRequiresPermissionAnnotation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("approvePayrollRun", UUID.class);

            assertThat(annotation).isNotNull();
        }

        @Test
        @DisplayName("approvePayrollRun has revalidate = true")
        void approveHasRevalidateTrue() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("approvePayrollRun", UUID.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.revalidate())
                    .as("approvePayrollRun must set revalidate=true to prevent stale-JWT abuse")
                    .isTrue();
        }
    }

    // -----------------------------------------------------------------------
    // lock endpoint
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("lockPayrollRun endpoint")
    class LockEndpointAnnotationTests {

        @Test
        @DisplayName("lockPayrollRun has @RequiresPermission annotation")
        void lockHasRequiresPermissionAnnotation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("lockPayrollRun", UUID.class);

            assertThat(annotation).isNotNull();
        }

        @Test
        @DisplayName("lockPayrollRun has revalidate = true")
        void lockHasRevalidateTrue() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("lockPayrollRun", UUID.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.revalidate())
                    .as("lockPayrollRun must set revalidate=true to prevent stale-JWT abuse")
                    .isTrue();
        }
    }

    // -----------------------------------------------------------------------
    // Non-sensitive endpoints must NOT unconditionally require revalidation
    // (performance guard — we don't want revalidate on every GET)
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Read-only endpoints should not require revalidation")
    class ReadOnlyEndpointAnnotationTests {

        @Test
        @DisplayName("getPayrollRun (GET by id) does NOT have revalidate = true")
        void getByIdDoesNotRequireRevalidation() throws NoSuchMethodException {
            RequiresPermission annotation = getAnnotation("getPayrollRun", UUID.class);

            // Read endpoints should rely on JWT claims (no DB round-trip overhead)
            if (annotation != null) {
                assertThat(annotation.revalidate())
                        .as("Read-only getPayrollRun should not add DB overhead with revalidate=true")
                        .isFalse();
            }
            // If no annotation is present that is also acceptable (handled by class-level config)
        }
    }
}
