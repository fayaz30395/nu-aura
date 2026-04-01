package com.hrms.api.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.user.dto.AssignRolesRequest;
import com.hrms.api.user.dto.RoleResponse;
import com.hrms.api.user.dto.UserResponse;
import com.hrms.application.user.service.RoleManagementService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.user.RoleScope;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Unit tests for UserController.
 * Tests CRUD endpoints, role assignment, and @RequiresPermission annotations.
 */
@WebMvcTest(UserController.class)
@ContextConfiguration(classes = {UserController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("UserController Unit Tests")
class UserControllerTest {

    private static final String BASE_URL = "/api/v1/users";
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

    private UserResponse sampleUserResponse;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.USER_VIEW, RoleScope.ALL,
                Permission.USER_MANAGE, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);

        sampleUserResponse = UserResponse.builder()
                .id(USER_ID)
                .email("john.doe@example.com")
                .firstName("John")
                .lastName("Doe")
                .userStatus("ACTIVE")
                .createdAt(LocalDateTime.now())
                .build();
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
        @DisplayName("getAllUsers should require USER_VIEW permission")
        void getAllUsers_shouldRequireUserViewPermission() throws NoSuchMethodException {
            Method method = UserController.class.getMethod("getAllUsers");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.USER_VIEW);
        }

        @Test
        @DisplayName("assignRoles should require USER_MANAGE permission")
        void assignRoles_shouldRequireUserManagePermission() throws NoSuchMethodException {
            Method method = UserController.class.getMethod("assignRoles", UUID.class, AssignRolesRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.USER_MANAGE);
        }

        @Test
        @DisplayName("USER_VIEW constant should have expected value")
        void userViewPermissionConstant_shouldHaveExpectedValue() {
            assertThat(Permission.USER_VIEW).isEqualTo("USER:VIEW");
        }

        @Test
        @DisplayName("USER_MANAGE constant should have expected value")
        void userManagePermissionConstant_shouldHaveExpectedValue() {
            assertThat(Permission.USER_MANAGE).isEqualTo("USER:MANAGE");
        }
    }

    // ==================== GET /api/v1/users ====================

    @Nested
    @DisplayName("GET /api/v1/users — List All Users")
    class GetAllUsersTests {

        @Test
        @DisplayName("Should return list of users with HTTP 200")
        void getAllUsers_returnsUserList() throws Exception {
            UserResponse secondUser = UserResponse.builder()
                    .id(UUID.randomUUID())
                    .email("jane.doe@example.com")
                    .firstName("Jane")
                    .lastName("Doe")
                    .userStatus("ACTIVE")
                    .build();

            when(roleManagementService.getAllUsers()).thenReturn(List.of(sampleUserResponse, secondUser));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].email").value("john.doe@example.com"))
                    .andExpect(jsonPath("$[0].id").value(USER_ID.toString()));

            verify(roleManagementService).getAllUsers();
        }

        @Test
        @DisplayName("Should return empty list when no users exist")
        void getAllUsers_returnsEmptyList_whenNoUsers() throws Exception {
            when(roleManagementService.getAllUsers()).thenReturn(List.of());

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(0));

            verify(roleManagementService).getAllUsers();
        }

        @Test
        @DisplayName("Should include user status in response")
        void getAllUsers_includesUserStatus() throws Exception {
            when(roleManagementService.getAllUsers()).thenReturn(List.of(sampleUserResponse));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].userStatus").value("ACTIVE"));
        }

        @Test
        @DisplayName("Should return 500 when service throws unexpected exception")
        void getAllUsers_returns500_onServiceException() throws Exception {
            when(roleManagementService.getAllUsers())
                    .thenThrow(new RuntimeException("Unexpected DB error"));

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }
    }

    // ==================== PUT /api/v1/users/{id}/roles ====================

    @Nested
    @DisplayName("PUT /api/v1/users/{id}/roles — Assign Roles")
    class AssignRolesTests {

        private AssignRolesRequest buildRequest(String... roleCodes) {
            AssignRolesRequest request = new AssignRolesRequest();
            request.setRoleCodes(Set.of(roleCodes));
            return request;
        }

        @Test
        @DisplayName("Should assign roles to user and return updated user with HTTP 200")
        void assignRoles_returnsUpdatedUser() throws Exception {
            AssignRolesRequest request = buildRequest("HR_MANAGER", "EMPLOYEE");
            RoleResponse hrRole = new RoleResponse();
            hrRole.setId(UUID.randomUUID());
            hrRole.setCode("HR_MANAGER");
            hrRole.setName("HR Manager");

            UserResponse updatedUser = UserResponse.builder()
                    .id(USER_ID)
                    .email("john.doe@example.com")
                    .firstName("John")
                    .lastName("Doe")
                    .userStatus("ACTIVE")
                    .roles(Set.of(hrRole))
                    .build();

            when(roleManagementService.assignRolesToUser(eq(USER_ID), any(AssignRolesRequest.class)))
                    .thenReturn(updatedUser);

            mockMvc.perform(put(BASE_URL + "/" + USER_ID + "/roles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(USER_ID.toString()))
                    .andExpect(jsonPath("$.email").value("john.doe@example.com"));

            verify(roleManagementService).assignRolesToUser(eq(USER_ID), any(AssignRolesRequest.class));
        }

        @Test
        @DisplayName("Should return 404 when user does not exist")
        void assignRoles_returns404_whenUserNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            AssignRolesRequest request = buildRequest("EMPLOYEE");

            when(roleManagementService.assignRolesToUser(eq(unknownId), any(AssignRolesRequest.class)))
                    .thenThrow(new ResourceNotFoundException("User not found with id: " + unknownId));

            mockMvc.perform(put(BASE_URL + "/" + unknownId + "/roles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should call service with correct user ID from path variable")
        void assignRoles_passesCorrectUserIdToService() throws Exception {
            UUID targetUserId = UUID.randomUUID();
            AssignRolesRequest request = buildRequest("EMPLOYEE");

            when(roleManagementService.assignRolesToUser(eq(targetUserId), any(AssignRolesRequest.class)))
                    .thenReturn(sampleUserResponse);

            mockMvc.perform(put(BASE_URL + "/" + targetUserId + "/roles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(roleManagementService).assignRolesToUser(eq(targetUserId), any(AssignRolesRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when request body is missing")
        void assignRoles_returns400_whenBodyMissing() throws Exception {
            mockMvc.perform(put(BASE_URL + "/" + USER_ID + "/roles")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }
}
