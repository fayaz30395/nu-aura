package com.hrms.common.security;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.*;

import java.lang.annotation.Annotation;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * RBAC Annotation Coverage Test
 *
 * Verifies that ALL non-public REST endpoints have {@link RequiresPermission}
 * annotation at either the method or class level.
 *
 * <p>This is a compile-time safety net: if a developer adds a new endpoint
 * without RBAC annotation, this test fails and lists every ungated endpoint.</p>
 *
 * <p>Intentionally public controllers (auth, webhooks, public career pages)
 * are whitelisted — see {@link #WHITELISTED_CONTROLLERS}.</p>
 */
@DisplayName("RBAC Annotation Coverage — all endpoints must have @RequiresPermission")
class RbacAnnotationCoverageTest {

    /**
     * Controllers that are intentionally public and do not require
     * {@code @RequiresPermission}. Each entry is a simple class name.
     *
     * <p>Categories:
     * <ul>
     *   <li>Auth flow — unauthenticated by definition</li>
     *   <li>Public pages — career portal, offer acceptance</li>
     *   <li>Webhooks — verified by signature, not session</li>
     *   <li>External portals — token-based auth, no user session</li>
     *   <li>Monitoring — health/ping endpoints</li>
     *   <li>Device integration — API-key auth, not user session</li>
     * </ul>
     * </p>
     */
    private static final Set<String> WHITELISTED_CONTROLLERS = Set.of(
            // Auth flow — unauthenticated by definition
            "AuthController",
            "MfaController",
            // Public pages — no session required
            "PublicOfferController",
            "PublicCareerController",
            "TenantController",
            // Webhooks — signature-verified, not session-based
            "PaymentWebhookController",
            "DocuSignController",           // DocuSign webhook callback
            // External portals — token-based auth (no user session)
            "ESignatureController",         // /esignature/external/{token}/*
            "PreboardingController",        // /preboarding/portal/{token}/*
            // Monitoring — health check endpoints
            "MonitoringController",
            // Device integration — API-key or device-cert auth
            "BiometricDeviceController"     // biometric punch from devices
    );

    /**
     * Individual methods (ClassName#methodName) that are intentionally
     * ungated within otherwise gated controllers.
     *
     * <p>Use sparingly — prefer class-level whitelisting or adding
     * {@code @RequiresPermission} to the method.</p>
     */
    private static final Set<String> WHITELISTED_METHODS = Set.of(
            // /users/me — returns the currently authenticated user's own data;
            // access is gated by authentication (JWT required) but no specific
            // permission is needed because every logged-in user can view their own profile.
            "UserController#getCurrentUser",
            // /exit/interview/public/{token} — public exit interview form
            "FnFController#getPublicInterview",
            "FnFController#submitPublicInterview",
            // /feature-flags/check/{featureKey} — any authenticated user can check
            // whether a feature is enabled; the frontend needs this to toggle UI.
            "FeatureFlagController#checkFeature"
    );

    /**
     * The set of Spring MVC mapping annotations that mark a method as an HTTP endpoint.
     */
    private static final Set<Class<? extends Annotation>> MAPPING_ANNOTATIONS = Set.of(
            GetMapping.class,
            PostMapping.class,
            PutMapping.class,
            DeleteMapping.class,
            PatchMapping.class,
            RequestMapping.class
    );

    private static JavaClasses importedClasses;

    @BeforeAll
    static void setup() {
        importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.hrms");
    }

    @Test
    @DisplayName("Every non-whitelisted REST endpoint must have @RequiresPermission on method or class")
    void allEndpointsMustHaveRequiresPermission() {
        List<String> ungatedEndpoints = new ArrayList<>();

        for (JavaClass javaClass : importedClasses) {
            if (!isRestController(javaClass)) {
                continue;
            }

            String simpleName = javaClass.getSimpleName();
            if (WHITELISTED_CONTROLLERS.contains(simpleName)) {
                continue;
            }

            boolean classHasPermission = hasSecurityAnnotation(javaClass);

            for (JavaMethod method : javaClass.getMethods()) {
                if (!isEndpointMethod(method)) {
                    continue;
                }

                boolean methodHasPermission = hasSecurityAnnotation(method);

                if (!classHasPermission && !methodHasPermission) {
                    String methodKey = simpleName + "#" + method.getName();
                    if (WHITELISTED_METHODS.contains(methodKey)) {
                        continue;
                    }
                    String httpMethod = resolveHttpMethod(method);
                    String path = resolveRequestPath(javaClass, method);
                    ungatedEndpoints.add(String.format(
                            "%s#%s  [%s %s]",
                            javaClass.getFullName(),
                            method.getName(),
                            httpMethod,
                            path
                    ));
                }
            }
        }

        Collections.sort(ungatedEndpoints);

        assertThat(ungatedEndpoints)
                .as("Ungated endpoints found without @RequiresPermission.\n"
                        + "Either add @RequiresPermission to the method/class, "
                        + "or add the controller to WHITELISTED_CONTROLLERS if intentionally public.\n\n"
                        + "Ungated endpoints:\n"
                        + ungatedEndpoints.stream().collect(Collectors.joining("\n  - ", "  - ", "")))
                .isEmpty();
    }

    @Test
    @DisplayName("Whitelisted controllers should actually exist in the codebase")
    void whitelistedControllersMustExist() {
        Set<String> allControllerNames = importedClasses.stream()
                .filter(this::isRestController)
                .map(JavaClass::getSimpleName)
                .collect(Collectors.toSet());

        for (String whitelisted : WHITELISTED_CONTROLLERS) {
            assertThat(allControllerNames)
                    .as("Whitelisted controller '%s' not found in codebase — remove stale whitelist entry", whitelisted)
                    .contains(whitelisted);
        }
    }

    @Test
    @DisplayName("Should detect at least 100 controllers to confirm scanning works")
    void scanShouldFindExpectedControllerCount() {
        long controllerCount = importedClasses.stream()
                .filter(this::isRestController)
                .count();

        assertThat(controllerCount)
                .as("Expected at least 100 @RestController classes; found %d — is classpath scanning broken?", controllerCount)
                .isGreaterThanOrEqualTo(100);
    }

    // ==================== Helpers ====================

    /**
     * Accepted security annotations. A method/class with any of these is
     * considered properly gated for RBAC purposes.
     */
    private static final List<String> SECURITY_ANNOTATIONS = List.of(
            "com.hrms.common.security.RequiresPermission",
            "org.springframework.security.access.prepost.PreAuthorize",
            "org.springframework.security.access.annotation.Secured",
            "jakarta.annotation.security.RolesAllowed"
    );

    private boolean hasSecurityAnnotation(JavaClass javaClass) {
        return SECURITY_ANNOTATIONS.stream().anyMatch(javaClass::isAnnotatedWith);
    }

    private boolean hasSecurityAnnotation(JavaMethod method) {
        return SECURITY_ANNOTATIONS.stream().anyMatch(method::isAnnotatedWith);
    }

    private boolean isRestController(JavaClass javaClass) {
        return javaClass.isAnnotatedWith(RestController.class);
    }

    private boolean isEndpointMethod(JavaMethod method) {
        for (Class<? extends Annotation> ann : MAPPING_ANNOTATIONS) {
            if (method.isAnnotatedWith(ann)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Best-effort resolution of the HTTP method from mapping annotations.
     */
    private String resolveHttpMethod(JavaMethod method) {
        if (method.isAnnotatedWith(GetMapping.class)) return "GET";
        if (method.isAnnotatedWith(PostMapping.class)) return "POST";
        if (method.isAnnotatedWith(PutMapping.class)) return "PUT";
        if (method.isAnnotatedWith(DeleteMapping.class)) return "DELETE";
        if (method.isAnnotatedWith(PatchMapping.class)) return "PATCH";
        if (method.isAnnotatedWith(RequestMapping.class)) {
            try {
                RequestMapping rm = method.reflect().getAnnotation(RequestMapping.class);
                if (rm != null && rm.method().length > 0) {
                    return rm.method()[0].name();
                }
            } catch (Exception ignored) {
                // reflection may fail in edge cases — fall through
            }
        }
        return "REQUEST";
    }

    /**
     * Best-effort resolution of the full request path from class + method annotations.
     */
    private String resolveRequestPath(JavaClass javaClass, JavaMethod method) {
        String classPath = "";
        String methodPath = "";

        try {
            RequestMapping classMapping = javaClass.reflect().getAnnotation(RequestMapping.class);
            if (classMapping != null && classMapping.value().length > 0) {
                classPath = classMapping.value()[0];
            }
        } catch (Exception ignored) {
            // reflection may fail
        }

        try {
            java.lang.reflect.Method reflected = method.reflect();
            methodPath = extractPathFromMethod(reflected);
        } catch (Exception ignored) {
            // reflection may fail
        }

        return classPath + methodPath;
    }

    private String extractPathFromMethod(java.lang.reflect.Method method) {
        GetMapping get = method.getAnnotation(GetMapping.class);
        if (get != null && get.value().length > 0) return get.value()[0];

        PostMapping post = method.getAnnotation(PostMapping.class);
        if (post != null && post.value().length > 0) return post.value()[0];

        PutMapping put = method.getAnnotation(PutMapping.class);
        if (put != null && put.value().length > 0) return put.value()[0];

        DeleteMapping del = method.getAnnotation(DeleteMapping.class);
        if (del != null && del.value().length > 0) return del.value()[0];

        PatchMapping patch = method.getAnnotation(PatchMapping.class);
        if (patch != null && patch.value().length > 0) return patch.value()[0];

        RequestMapping rm = method.getAnnotation(RequestMapping.class);
        if (rm != null && rm.value().length > 0) return rm.value()[0];

        return "";
    }
}
