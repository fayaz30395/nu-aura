package com.hrms.api.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.user.dto.*;
import com.hrms.application.user.service.RoleManagementService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.exception.ResourceNotFoundException;
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

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for RoleController.
 * Tests CRUD, permission assignment, effective permissions, and @RequiresPermission annotations.
 */
@WebMvcTest(RoleController.class)
@ContextConfiguration(classes = {RoleController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("RoleController Unit Tests")
class RoleControllerTest {

    private static final String BASE_URL = "/api/v1/roles";
    private static final UUID ROLE_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private RoleManagementService roleManagementService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private RoleResponse sampleRoleResponse;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.ROLE_MANAGE, RoleScope.ALL,
                Permission.ROLE_READ, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);

        sampleRoleResponse = new RoleResponse();
        sampleRoleResponse.setId(ROLE_ID);
        sampleRoleResponse.setCode("HR_MANAGER");
        sampleRoleResponse.setName("HR Manager");
        sampleRoleResponse.setDescription("HR Management role");
        sampleRoleResponse.setIsSystemRole(false);
        sampleRoleResponse.setTenantId(TENANT_ID);
        sampleRoleResponse.setPermissions(new HashSet<>());
        sampleRoleResponse.setCreatedAt(LocalDateTime.now());
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
        @DisplayName("getAllRoles should require ROLE_MANAGE permission")
        void getAllRoles_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = RoleController.class.getMethod("getAllRoles", org.springframework.data.domain.Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("getRoleById should require ROLE_MANAGE permission")
        void getRoleById_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = RoleController.class.getMethod("getRoleById", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("createRole should require ROLE_MANAGE permission")
        void createRole_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = RoleController.class.getMethod("createRole", CreateRoleRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("updateRole should require ROLE_MANAGE permission")
        void updateRole_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = RoleController.class.getMethod("updateRole", UUID.class, UpdateRoleRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("deleteRole should require ROLE_MANAGE permission")
        void deleteRole_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = RoleController.class.getMethod("deleteRole", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("getEffectivePermissions should require ROLE_READ permission (not ROLE_MANAGE)")
        void getEffectivePermissions_shouldRequireRoleReadPermission() throws NoSuchMethodException {
            Method method = RoleController.class.getMethod("getEffectivePermissions", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_READ);
            // Distinct from ROLE_MANAGE — read-only check
            assertThat(annotation.value()[0]).doesNotContain(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("ROLE_READ permission constant should have expected value")
        void roleReadPermissionConstant_shouldHaveExpectedValue() {
            assertThat(Permission.ROLE_READ).isEqualTo("ROLE:READ");
        }

        @Test
        @DisplayName("ROLE_MANAGE permission constant should have expected value")
        void roleManagePermissionConstant_shouldHaveExpectedValue() {
            assertThat(Permission.ROLE_MANAGE).isEqualTo("ROLE:MANAGE");
        }
    }

    // ==================== GET /api/v1/roles ====================

    @Nested
    @DisplayName("GET /api/v1/roles — List All Roles")
    class GetAllRolesTests {

        @Test
        @DisplayName("Should return list of roles with HTTP 200")
        void getAllRoles_returnsRoleList() throws Exception {
            when(roleManagementService.getAllRoles(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(sampleRoleResponse)));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].code").value("HR_MANAGER"))
                    .andExpect(jsonPath("$.content[0].name").value("HR Manager"));

            verify(roleManagementService).getAllRoles(any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty list when no roles exist")
        void getAllRoles_returnsEmptyList() throws Exception {
            when(roleManagementService.getAllRoles(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of()));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }

    // ==================== GET /api/v1/roles/{id} ====================

    @Nested
    @DisplayName("GET /api/v1/roles/{id} — Get Role By ID")
    class GetRoleByIdTests {

        @Test
        @DisplayName("Should return role when found")
        void getRoleById_returnsRole_whenFound() throws Exception {
            when(roleManagementService.getRoleById(ROLE_ID)).thenReturn(sampleRoleResponse);

            mockMvc.perform(get(BASE_URL + "/" + ROLE_ID).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ROLE_ID.toString()))
                    .andExpect(jsonPath("$.code").value("HR_MANAGER"));

            verify(roleManagementService).getRoleById(ROLE_ID);
        }

        @Test
        @DisplayName("Should return 404 when role not found")
        void getRoleById_returns404_whenNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(roleManagementService.getRoleById(unknownId))
                    .thenThrow(new ResourceNotFoundException("Role not found"));

            mockMvc.perform(get(BASE_URL + "/" + unknownId).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== POST /api/v1/roles ====================

    @Nested
    @DisplayName("POST /api/v1/roles — Create Role")
    class CreateRoleTests {

        private CreateRoleRequest buildCreateRequest() {
            CreateRoleRequest request = new CreateRoleRequest();
            request.setCode("NEW_ROLE");
            request.setName("New Role");
            request.setDescription("A brand new role");
            return request;
        }

        @Test
        @DisplayName("Should create role and return HTTP 201")
        void createRole_returns201_withCreatedRole() throws Exception {
            CreateRoleRequest request = buildCreateRequest();
            RoleResponse created = new RoleResponse();
            created.setId(UUID.randomUUID());
            created.setCode("NEW_ROLE");
            created.setName("New Role");
            created.setIsSystemRole(false);

            when(roleManagementService.createRole(any(CreateRoleRequest.class))).thenReturn(created);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.code").value("NEW_ROLE"))
                    .andExpect(jsonPath("$.name").value("New Role"));

            verify(roleManagementService).createRole(any(CreateRoleRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when request body is missing")
        void createRole_returns400_whenBodyMissing() throws Exception {
            mockMvc.perform(post(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== PUT /api/v1/roles/{id} ====================

    @Nested
    @DisplayName("PUT /api/v1/roles/{id} — Update Role")
    class UpdateRoleTests {

        @Test
        @DisplayName("Should update role and return HTTP 200")
        void updateRole_returnsUpdatedRole() throws Exception {
            UpdateRoleRequest request = new UpdateRoleRequest();
            request.setName("Updated HR Manager");
            request.setDescription("Updated description");

            RoleResponse updated = new RoleResponse();
            updated.setId(ROLE_ID);
            updated.setCode("HR_MANAGER");
            updated.setName("Updated HR Manager");

            when(roleManagementService.updateRole(eq(ROLE_ID), any(UpdateRoleRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put(BASE_URL + "/" + ROLE_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated HR Manager"));

            verify(roleManagementService).updateRole(eq(ROLE_ID), any(UpdateRoleRequest.class));
        }

        @Test
        @DisplayName("Should return 404 when role not found")
        void updateRole_returns404_whenNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            UpdateRoleRequest request = new UpdateRoleRequest();
            request.setName("Should not matter");

            when(roleManagementService.updateRole(eq(unknownId), any(UpdateRoleRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Role not found"));

            mockMvc.perform(put(BASE_URL + "/" + unknownId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== DELETE /api/v1/roles/{id} ====================

    @Nested
    @DisplayName("DELETE /api/v1/roles/{id} — Delete Role")
    class DeleteRoleTests {

        @Test
        @DisplayName("Should delete role and return HTTP 204")
        void deleteRole_returns204() throws Exception {
            mockMvc.perform(delete(BASE_URL + "/" + ROLE_ID))
                    .andExpect(status().isNoContent());

            verify(roleManagementService).deleteRole(ROLE_ID);
        }

        @Test
        @DisplayName("Should return 404 when role not found")
        void deleteRole_returns404_whenNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            org.mockito.Mockito.doThrow(new ResourceNotFoundException("Role not found"))
                    .when(roleManagementService).deleteRole(unknownId);

            mockMvc.perform(delete(BASE_URL + "/" + unknownId))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== GET /api/v1/roles/{id}/effective-permissions ====================

    @Nested
    @DisplayName("GET /api/v1/roles/{id}/effective-permissions — Effective Permissions")
    class GetEffectivePermissionsTests {

        @Test
        @DisplayName("Should return set of permissions for a role")
        void getEffectivePermissions_returnsPermissions() throws Exception {
            PermissionResponse perm = new PermissionResponse();
            perm.setId(UUID.randomUUID());
            perm.setCode("EMPLOYEE:READ");
            perm.setName("Read Employee");
            perm.setResource("EMPLOYEE");
            perm.setAction("READ");

            when(roleManagementService.getEffectivePermissions(eq(ROLE_ID), any(UUID.class)))
                    .thenReturn(Set.of(perm));

            mockMvc.perform(get(BASE_URL + "/" + ROLE_ID + "/effective-permissions")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(roleManagementService).getEffectivePermissions(eq(ROLE_ID), any(UUID.class));
        }

        @Test
        @DisplayName("Should return empty set when role has no permissions")
        void getEffectivePermissions_returnsEmptySet_whenNoPermissions() throws Exception {
            when(roleManagementService.getEffectivePermissions(eq(ROLE_ID), any(UUID.class)))
                    .thenReturn(Set.of());

            mockMvc.perform(get(BASE_URL + "/" + ROLE_ID + "/effective-permissions")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        @DisplayName("Should return 404 when role not found")
        void getEffectivePermissions_returns404_whenRoleNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(roleManagementService.getEffectivePermissions(eq(unknownId), any(UUID.class)))
                    .thenThrow(new ResourceNotFoundException("Role not found"));

            mockMvc.perform(get(BASE_URL + "/" + unknownId + "/effective-permissions")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== PUT/POST/DELETE /api/v1/roles/{id}/permissions ====================

    @Nested
    @DisplayName("Permission Assignment Endpoints")
    class PermissionAssignmentTests {

        private AssignPermissionsRequest buildPermissionsRequest(String... codes) {
            AssignPermissionsRequest req = new AssignPermissionsRequest();
            req.setPermissionCodes(new HashSet<>(Set.of(codes)));
            return req;
        }

        @Test
        @DisplayName("PUT /permissions should assign permissions to role")
        void assignPermissions_replacesPermissions() throws Exception {
            AssignPermissionsRequest request = buildPermissionsRequest("EMPLOYEE:READ", "EMPLOYEE:CREATE");
            when(roleManagementService.assignPermissions(eq(ROLE_ID), any(AssignPermissionsRequest.class)))
                    .thenReturn(sampleRoleResponse);

            mockMvc.perform(put(BASE_URL + "/" + ROLE_ID + "/permissions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(roleManagementService).assignPermissions(eq(ROLE_ID), any(AssignPermissionsRequest.class));
        }

        @Test
        @DisplayName("POST /permissions should add permissions to role")
        void addPermissions_addsPermissions() throws Exception {
            AssignPermissionsRequest request = buildPermissionsRequest("EMPLOYEE:UPDATE");
            when(roleManagementService.addPermissions(eq(ROLE_ID), any(AssignPermissionsRequest.class)))
                    .thenReturn(sampleRoleResponse);

            mockMvc.perform(post(BASE_URL + "/" + ROLE_ID + "/permissions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(roleManagementService).addPermissions(eq(ROLE_ID), any(AssignPermissionsRequest.class));
        }

        @Test
        @DisplayName("DELETE /permissions should remove permissions from role")
        void removePermissions_removesPermissions() throws Exception {
            AssignPermissionsRequest request = buildPermissionsRequest("EMPLOYEE:READ");
            when(roleManagementService.removePermissions(eq(ROLE_ID), any(AssignPermissionsRequest.class)))
                    .thenReturn(sampleRoleResponse);

            mockMvc.perform(delete(BASE_URL + "/" + ROLE_ID + "/permissions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(roleManagementService).removePermissions(eq(ROLE_ID), any(AssignPermissionsRequest.class));
        }
    }
}
