package com.hrms.api.user.controller;

import com.hrms.api.user.dto.PermissionResponse;
import com.hrms.application.user.service.PermissionService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.user.RoleScope;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for PermissionController.
 * Tests listing all permissions, filtering by resource, and @RequiresPermission annotations.
 */
@WebMvcTest(PermissionController.class)
@ContextConfiguration(classes = {PermissionController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PermissionController Unit Tests")
class PermissionControllerTest {

    private static final String BASE_URL = "/api/v1/permissions";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private PermissionService permissionService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;


    @Autowired
    private MockMvc mockMvc;


    private PermissionResponse employeeReadPerm;
    private PermissionResponse employeeCreatePerm;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.PERMISSION_MANAGE, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);

        employeeReadPerm = new PermissionResponse(
                UUID.randomUUID(), "EMPLOYEE:READ", "Read Employee",
                "View employee data", "EMPLOYEE", "READ");

        employeeCreatePerm = new PermissionResponse(
                UUID.randomUUID(), "EMPLOYEE:CREATE", "Create Employee",
                "Create new employees", "EMPLOYEE", "CREATE");
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ==================== @RequiresPermission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getAllPermissions should require PERMISSION_MANAGE")
        void getAllPermissions_shouldRequirePermissionManage() throws NoSuchMethodException {
            Method method = PermissionController.class.getMethod("getAllPermissions");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.PERMISSION_MANAGE);
        }

        @Test
        @DisplayName("getPermissionsByResource should require PERMISSION_MANAGE")
        void getPermissionsByResource_shouldRequirePermissionManage() throws NoSuchMethodException {
            Method method = PermissionController.class.getMethod("getPermissionsByResource", String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.PERMISSION_MANAGE);
        }

        @Test
        @DisplayName("PERMISSION_MANAGE constant should have expected value")
        void permissionManageConstant_shouldHaveExpectedValue() {
            assertThat(Permission.PERMISSION_MANAGE).isEqualTo("PERMISSION:MANAGE");
        }

        @Test
        @DisplayName("Neither endpoint should have revalidate=true (read-only operations)")
        void permissionEndpoints_shouldNotHaveRevalidation() throws NoSuchMethodException {
            Method listAll = PermissionController.class.getMethod("getAllPermissions");
            Method byResource = PermissionController.class.getMethod("getPermissionsByResource", String.class);

            assertThat(listAll.getAnnotation(RequiresPermission.class).revalidate()).isFalse();
            assertThat(byResource.getAnnotation(RequiresPermission.class).revalidate()).isFalse();
        }
    }

    // ==================== GET /api/v1/permissions ====================

    @Nested
    @DisplayName("GET /api/v1/permissions — List All Permissions")
    class GetAllPermissionsTests {

        @Test
        @DisplayName("Should return all permissions with HTTP 200")
        void getAllPermissions_returnsPermissionList() throws Exception {
            when(permissionService.getAllPermissions())
                    .thenReturn(List.of(employeeReadPerm, employeeCreatePerm));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].code").value("EMPLOYEE:READ"))
                    .andExpect(jsonPath("$[1].code").value("EMPLOYEE:CREATE"));

            verify(permissionService).getAllPermissions();
        }

        @Test
        @DisplayName("Should return empty list when no permissions exist")
        void getAllPermissions_returnsEmptyList() throws Exception {
            when(permissionService.getAllPermissions()).thenReturn(List.of());

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));

            verify(permissionService).getAllPermissions();
        }

        @Test
        @DisplayName("Should include resource and action fields in each permission")
        void getAllPermissions_includesResourceAndAction() throws Exception {
            when(permissionService.getAllPermissions()).thenReturn(List.of(employeeReadPerm));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].resource").value("EMPLOYEE"))
                    .andExpect(jsonPath("$[0].action").value("READ"))
                    .andExpect(jsonPath("$[0].name").value("Read Employee"));
        }

        @Test
        @DisplayName("Should return 500 when service throws unexpected error")
        void getAllPermissions_returns500_onServiceError() throws Exception {
            when(permissionService.getAllPermissions())
                    .thenThrow(new RuntimeException("Database connection lost"));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }
    }

    // ==================== GET /api/v1/permissions/resource/{resource} ====================

    @Nested
    @DisplayName("GET /api/v1/permissions/resource/{resource} — Get By Resource")
    class GetPermissionsByResourceTests {

        @Test
        @DisplayName("Should return permissions filtered by resource")
        void getPermissionsByResource_returnsFilteredPermissions() throws Exception {
            when(permissionService.getPermissionsByResource("EMPLOYEE"))
                    .thenReturn(List.of(employeeReadPerm, employeeCreatePerm));

            mockMvc.perform(get(BASE_URL + "/resource/EMPLOYEE").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].resource").value("EMPLOYEE"))
                    .andExpect(jsonPath("$[1].resource").value("EMPLOYEE"));

            verify(permissionService).getPermissionsByResource("EMPLOYEE");
        }

        @Test
        @DisplayName("Should return empty list when resource has no permissions")
        void getPermissionsByResource_returnsEmptyList_whenNoPermissionsForResource() throws Exception {
            when(permissionService.getPermissionsByResource("UNKNOWN_RESOURCE"))
                    .thenReturn(List.of());

            mockMvc.perform(get(BASE_URL + "/resource/UNKNOWN_RESOURCE").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("Should pass resource path variable to service unchanged")
        void getPermissionsByResource_passesResourceToService() throws Exception {
            when(permissionService.getPermissionsByResource("PAYROLL"))
                    .thenReturn(List.of());

            mockMvc.perform(get(BASE_URL + "/resource/PAYROLL").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(permissionService).getPermissionsByResource("PAYROLL");
        }

        @Test
        @DisplayName("Should return permissions for LEAVE resource")
        void getPermissionsByResource_returnsLeavePermissions() throws Exception {
            PermissionResponse leavePerm = new PermissionResponse(
                    UUID.randomUUID(), "LEAVE:READ", "Read Leave",
                    "View leave requests", "LEAVE", "READ");

            when(permissionService.getPermissionsByResource("LEAVE"))
                    .thenReturn(List.of(leavePerm));

            mockMvc.perform(get(BASE_URL + "/resource/LEAVE").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].code").value("LEAVE:READ"))
                    .andExpect(jsonPath("$[0].resource").value("LEAVE"));
        }
    }
}
