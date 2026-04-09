package com.hrms.api.platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.platform.dto.*;
import com.hrms.application.platform.service.NuPlatformService;
import com.hrms.application.platform.service.PermissionMigrationService;
import com.hrms.common.security.*;
import com.hrms.domain.platform.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PlatformController.class)
@ContextConfiguration(classes = {PlatformController.class, PlatformControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PlatformController Integration Tests")
class PlatformControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private NuPlatformService platformService;
    @MockitoBean
    private PermissionMigrationService migrationService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Application Endpoints Tests")
    class ApplicationEndpointsTests {

        @Test
        @DisplayName("Should return all applications")
        void shouldReturnAllApplications() throws Exception {
            NuApplication app = new NuApplication();
            app.setCode("HRMS");
            app.setName("NU-HRMS");
            app.setDescription("HR Management System");
            // active field inherited from entity hierarchy

            when(platformService.getAllApplications()).thenReturn(List.of(app));

            mockMvc.perform(get("/api/v1/platform/applications"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].code").value("HRMS"));

            verify(platformService).getAllApplications();
        }

        @Test
        @DisplayName("Should return tenant applications")
        void shouldReturnTenantApplications() throws Exception {
            NuApplication app = new NuApplication();
            app.setCode("HIRE");
            app.setName("NU-Hire");
            // active field inherited from entity hierarchy

            when(platformService.getTenantApplications()).thenReturn(List.of(app));

            mockMvc.perform(get("/api/v1/platform/applications/tenant"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(platformService).getTenantApplications();
        }

        @Test
        @DisplayName("Should return application by code")
        void shouldReturnApplicationByCode() throws Exception {
            NuApplication app = new NuApplication();
            app.setCode("HRMS");
            app.setName("NU-HRMS");
            app.setDescription("HR Management System");
            // active field inherited from entity hierarchy

            when(platformService.getApplication("HRMS")).thenReturn(Optional.of(app));

            mockMvc.perform(get("/api/v1/platform/applications/{code}", "HRMS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value("HRMS"))
                    .andExpect(jsonPath("$.name").value("NU-HRMS"));
        }

        @Test
        @DisplayName("Should return 404 for unknown application code")
        void shouldReturn404ForUnknownApplicationCode() throws Exception {
            when(platformService.getApplication("UNKNOWN")).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/platform/applications/{code}", "UNKNOWN"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Role Endpoints Tests")
    class RoleEndpointsTests {

        @Test
        @DisplayName("Should return application roles")
        void shouldReturnApplicationRoles() throws Exception {
            AppRole role = new AppRole();
            role.setId(UUID.randomUUID());
            role.setCode("HR_ADMIN");
            role.setName("HR Admin");
            role.setLevel(85);

            when(platformService.getApplicationRoles("HRMS")).thenReturn(List.of(role));

            mockMvc.perform(get("/api/v1/platform/applications/{appCode}/roles", "HRMS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(platformService).getApplicationRoles("HRMS");
        }

        @Test
        @DisplayName("Should return role by ID")
        void shouldReturnRoleById() throws Exception {
            UUID roleId = UUID.randomUUID();
            AppRole role = new AppRole();
            role.setId(roleId);
            role.setCode("EMPLOYEE");
            role.setName("Employee");
            role.setLevel(40);

            when(platformService.getRoleById(roleId)).thenReturn(Optional.of(role));

            mockMvc.perform(get("/api/v1/platform/roles/{roleId}", roleId))
                    .andExpect(status().isOk());

            verify(platformService).getRoleById(roleId);
        }

        @Test
        @DisplayName("Should return 404 for unknown role ID")
        void shouldReturn404ForUnknownRoleId() throws Exception {
            UUID roleId = UUID.randomUUID();
            when(platformService.getRoleById(roleId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/platform/roles/{roleId}", roleId))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should create role successfully")
        void shouldCreateRoleSuccessfully() throws Exception {
            CreateRoleRequest request = CreateRoleRequest.builder()
                    .appCode("HRMS")
                    .roleCode("CUSTOM_ROLE")
                    .name("Custom Role")
                    .description("A custom role for testing")
                    .level(60)
                    .permissionCodes(Set.of("EMPLOYEE:READ", "LEAVE:VIEW_SELF"))
                    .build();

            AppRole createdRole = new AppRole();
            createdRole.setId(UUID.randomUUID());
            createdRole.setCode("CUSTOM_ROLE");
            createdRole.setName("Custom Role");
            createdRole.setLevel(60);

            when(platformService.createRole(anyString(), anyString(), anyString(), anyString(), anyInt(), anySet()))
                    .thenReturn(createdRole);

            mockMvc.perform(post("/api/v1/platform/roles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(platformService).createRole(eq("HRMS"), eq("CUSTOM_ROLE"), eq("Custom Role"),
                    eq("A custom role for testing"), eq(60), anySet());
        }
    }

    @Nested
    @DisplayName("Permission Endpoints Tests")
    class PermissionEndpointsTests {

        @Test
        @DisplayName("Should return application permissions")
        void shouldReturnApplicationPermissions() throws Exception {
            AppPermission perm = new AppPermission();
            perm.setCode("EMPLOYEE:READ");
            perm.setName("Read Employees");
            perm.setModule("EMPLOYEE");

            when(platformService.getApplicationPermissions("HRMS")).thenReturn(List.of(perm));

            mockMvc.perform(get("/api/v1/platform/applications/{appCode}/permissions", "HRMS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(platformService).getApplicationPermissions("HRMS");
        }

        @Test
        @DisplayName("Should check single permission")
        void shouldCheckSinglePermission() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(() -> SecurityContext.hasPermission("EMPLOYEE:READ")).thenReturn(true);

                mockMvc.perform(get("/api/v1/platform/check-permission")
                                .param("permission", "EMPLOYEE:READ"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.hasPermission").value(true));
            }
        }
    }

    @Nested
    @DisplayName("User Access Endpoints Tests")
    class UserAccessEndpointsTests {

        @Test
        @DisplayName("Should grant access successfully")
        void shouldGrantAccessSuccessfully() throws Exception {
            UUID userId = UUID.randomUUID();
            GrantAccessRequest request = GrantAccessRequest.builder()
                    .userId(userId)
                    .appCode("HRMS")
                    .roleCodes(Set.of("HR_ADMIN"))
                    .build();

            UserAppAccess access = new UserAppAccess();
            access.setId(UUID.randomUUID());

            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                UUID grantedBy = UUID.randomUUID();
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(grantedBy);

                when(platformService.grantAccess(eq(userId), eq("HRMS"), anySet(), eq(grantedBy)))
                        .thenReturn(access);

                mockMvc.perform(post("/api/v1/platform/access/grant")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk());
            }
        }

        @Test
        @DisplayName("Should revoke access successfully")
        void shouldRevokeAccessSuccessfully() throws Exception {
            UUID userId = UUID.randomUUID();
            doNothing().when(platformService).revokeAccess(userId, "HRMS");

            mockMvc.perform(post("/api/v1/platform/access/revoke")
                            .param("userId", userId.toString())
                            .param("appCode", "HRMS"))
                    .andExpect(status().isOk());

            verify(platformService).revokeAccess(userId, "HRMS");
        }
    }
}
