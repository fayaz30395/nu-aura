package com.hrms.common.security;

import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.*;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for @RequiresPermission annotation.
 * Tests end-to-end permission enforcement via HTTP endpoints.
 * Target: 90%+ line coverage for annotation functionality
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(RequiresPermissionAnnotationTest.TestPermissionController.class)
class RequiresPermissionAnnotationTest {

    private static final UUID TEST_USER_ID = UUID.randomUUID();
    private static final UUID TEST_EMPLOYEE_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    @Nested
    @DisplayName("Basic Permission Enforcement")
    class BasicPermissionEnforcementTests {

        @Test
        @DisplayName("Should allow access to endpoint with required permission")
        void shouldAllowAccessWithPermission() throws Exception {
            // Given - User has EMPLOYEE_READ permission
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            mockMvc.perform(get("/test/permission/employee/read")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Success: EMPLOYEE:READ"));
        }

        @Test
        @DisplayName("Should deny access to endpoint without required permission")
        void shouldDenyAccessWithoutPermission() throws Exception {
            // Given - User has no permissions
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // When/Then
            mockMvc.perform(get("/test/permission/employee/read")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Should allow SuperAdmin to bypass permission checks")
        void shouldAllowSuperAdminToBypassChecks() throws Exception {
            // Given - User is SuperAdmin
            Map<String, RoleScope> permissions = Map.of(
                    Permission.SYSTEM_ADMIN, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of(RoleHierarchy.SUPER_ADMIN), permissions);

            // When/Then - Should access endpoint that requires PAYROLL_PROCESS
            mockMvc.perform(get("/test/permission/payroll/process")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Success: PAYROLL:PROCESS"));
        }
    }

    @Nested
    @DisplayName("anyOf Permission Logic")
    class AnyOfPermissionTests {

        @Test
        @DisplayName("Should allow access when user has first of anyOf permissions")
        void shouldAllowAccessWithFirstPermission() throws Exception {
            // Given - User has first permission (EMPLOYEE_READ)
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            mockMvc.perform(get("/test/permission/employee/anyof")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should allow access when user has second of anyOf permissions")
        void shouldAllowAccessWithSecondPermission() throws Exception {
            // Given - User has second permission (EMPLOYEE_CREATE)
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_CREATE, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            mockMvc.perform(get("/test/permission/employee/anyof")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should deny access when user lacks all anyOf permissions")
        void shouldDenyAccessWithoutAnyOfPermissions() throws Exception {
            // Given - User has no matching permissions
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // When/Then
            mockMvc.perform(get("/test/permission/employee/anyof")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("allOf Permission Logic")
    class AllOfPermissionTests {

        @Test
        @DisplayName("Should allow access when user has all allOf permissions")
        void shouldAllowAccessWithAllPermissions() throws Exception {
            // Given - User has both required permissions
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL,
                    Permission.EMPLOYEE_CREATE, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            mockMvc.perform(post("/test/permission/employee/allof")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should deny access when user lacks any allOf permission")
        void shouldDenyAccessWithoutAllPermissions() throws Exception {
            // Given - User has only one of two required permissions
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then
            mockMvc.perform(post("/test/permission/employee/allof")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Should deny access when user lacks all allOf permissions")
        void shouldDenyAccessWithoutAllOfPermissions() throws Exception {
            // Given - User has no permissions
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // When/Then
            mockMvc.perform(post("/test/permission/employee/allof")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Permission Hierarchy")
    class PermissionHierarchyTests {

        @Test
        @DisplayName("Should allow access via MANAGE permission hierarchy")
        void shouldAllowAccessViaManagePermission() throws Exception {
            // Given - User has EMPLOYEE:MANAGE (implies all EMPLOYEE actions)
            Map<String, RoleScope> permissions = Map.of(
                    "EMPLOYEE:MANAGE", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("ADMIN"), permissions);

            // When/Then - Should access endpoint requiring EMPLOYEE:DELETE
            mockMvc.perform(delete("/test/permission/employee/delete")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should allow VIEW access via READ permission")
        void shouldAllowViewAccessViaReadPermission() throws Exception {
            // Given - User has EMPLOYEE:READ
            Map<String, RoleScope> permissions = Map.of(
                    Permission.EMPLOYEE_READ, RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then - Should access endpoint requiring EMPLOYEE:VIEW_ALL
            mockMvc.perform(get("/test/permission/employee/view-all")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("App-Prefixed Permissions")
    class AppPrefixedPermissionTests {

        @Test
        @DisplayName("Should resolve app-prefixed permissions")
        void shouldResolveAppPrefixedPermissions() throws Exception {
            // Given
            SecurityContext.setCurrentApp("HRMS");
            Map<String, RoleScope> permissions = Map.of(
                    "HRMS:EMPLOYEE:READ", RoleScope.ALL
            );
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), permissions);

            // When/Then - Should allow access even though permission is prefixed
            mockMvc.perform(get("/test/permission/employee/read-appcode")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Error Handling")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should return 403 Forbidden for permission denial")
        void shouldReturnForbiddenForDenial() throws Exception {
            // Given - User without permissions
            SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID,
                    Set.of("USER"), new HashMap<>());

            // When
            mockMvc.perform(get("/test/permission/employee/read")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Should handle null security context gracefully")
        void shouldHandleNullSecurityContext() throws Exception {
            // Given - No security context set
            SecurityContext.clear();

            // When/Then - Should deny access
            mockMvc.perform(get("/test/permission/employee/read")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }
    }

    // ==================== Test Controller ====================

    @RestController
    @RequestMapping("/test/permission")
    public static class TestPermissionController {

        @GetMapping("/employee/read")
        @RequiresPermission(Permission.EMPLOYEE_READ)
        public String readEmployee() {
            return "Success: " + Permission.EMPLOYEE_READ;
        }

        @GetMapping("/employee/anyof")
        @RequiresPermission({Permission.EMPLOYEE_READ, Permission.EMPLOYEE_CREATE})
        public String anyOfEmployee() {
            return "Success: AnyOf permissions";
        }

        @PostMapping("/employee/allof")
        @RequiresPermission(
                value = {},
                allOf = {Permission.EMPLOYEE_READ, Permission.EMPLOYEE_CREATE}
        )
        public String allOfEmployee() {
            return "Success: AllOf permissions";
        }

        @DeleteMapping("/employee/delete")
        @RequiresPermission(Permission.EMPLOYEE_DELETE)
        public String deleteEmployee() {
            return "Success: " + Permission.EMPLOYEE_DELETE;
        }

        @GetMapping("/employee/view-all")
        @RequiresPermission("EMPLOYEE:VIEW_ALL")
        public String viewAllEmployee() {
            return "Success: EMPLOYEE:VIEW_ALL";
        }

        @GetMapping("/payroll/process")
        @RequiresPermission(Permission.PAYROLL_PROCESS)
        public String processPayroll() {
            return "Success: " + Permission.PAYROLL_PROCESS;
        }

        @DeleteMapping("/employee/revalidate")
        @RequiresPermission(value = Permission.EMPLOYEE_DELETE, revalidate = true)
        public String deleteEmployeeWithRevalidation() {
            return "Success: Revalidation passed";
        }

        @GetMapping("/employee/read-appcode")
        @RequiresPermission("EMPLOYEE:READ")
        public String readEmployeeWithAppCode() {
            return "Success: Read with app code";
        }
    }

    // ==================== Exception Handler ====================

    @RestControllerAdvice
    public static class PermissionExceptionHandler {

        @ExceptionHandler(AccessDeniedException.class)
        public String handleAccessDenied(AccessDeniedException e) {
            return "Error: " + e.getMessage();
        }
    }
}
