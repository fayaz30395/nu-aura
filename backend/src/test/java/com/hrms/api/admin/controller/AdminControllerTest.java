package com.hrms.api.admin.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.admin.dto.AdminStatsResponse;
import com.hrms.api.admin.dto.AdminUserResponse;
import com.hrms.api.admin.dto.UpdateUserRoleRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.application.admin.service.AdminService;
import com.hrms.application.auth.service.EmployeeLinkerService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@ContextConfiguration(classes = {AdminController.class, AdminControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AdminController Integration Tests")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private AdminService adminService;
    @MockitoBean
    private EmployeeLinkerService employeeLinkerService;
    @MockitoBean
    private HealthEndpoint healthEndpoint;
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

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("System Health Tests")
    class SystemHealthTests {

        @Test
        @DisplayName("Should return system health successfully")
        void shouldReturnSystemHealthSuccessfully() throws Exception {
            HealthComponent health = Health.up().build();
            when(healthEndpoint.health()).thenReturn(health);

            mockMvc.perform(get("/api/v1/admin/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"));

            verify(healthEndpoint).health();
        }
    }

    @Nested
    @DisplayName("Platform Settings Tests")
    class PlatformSettingsTests {

        @Test
        @DisplayName("Should return platform settings successfully")
        void shouldReturnPlatformSettingsSuccessfully() throws Exception {
            Map<String, Object> settings = new HashMap<>();
            settings.put("defaultLanguage", "en");
            settings.put("maxFileUploadSize", 10485760);

            when(adminService.getPlatformSettings()).thenReturn(settings);

            mockMvc.perform(get("/api/v1/admin/settings"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.defaultLanguage").value("en"))
                    .andExpect(jsonPath("$.maxFileUploadSize").value(10485760));

            verify(adminService).getPlatformSettings();
        }
    }

    @Nested
    @DisplayName("Platform Statistics Tests")
    class PlatformStatsTests {

        @Test
        @DisplayName("Should return global platform statistics")
        void shouldReturnGlobalPlatformStatistics() throws Exception {
            AdminStatsResponse stats = AdminStatsResponse.builder()
                    .totalTenants(5)
                    .totalEmployees(250)
                    .pendingApprovals(12)
                    .activeUsers(180)
                    .build();

            when(adminService.getGlobalStats()).thenReturn(stats);

            mockMvc.perform(get("/api/v1/admin/stats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalTenants").value(5))
                    .andExpect(jsonPath("$.totalEmployees").value(250))
                    .andExpect(jsonPath("$.pendingApprovals").value(12))
                    .andExpect(jsonPath("$.activeUsers").value(180));

            verify(adminService).getGlobalStats();
        }
    }

    @Nested
    @DisplayName("User Management Tests")
    class UserManagementTests {

        @Test
        @DisplayName("Should return paginated user list")
        void shouldReturnPaginatedUserList() throws Exception {
            AdminUserResponse user = AdminUserResponse.builder()
                    .id(userId)
                    .email("admin@nulogic.com")
                    .firstName("Admin")
                    .lastName("User")
                    .userStatus("ACTIVE")
                    .tenantId(UUID.randomUUID())
                    .tenantName("NULogic")
                    .createdAt(LocalDateTime.now())
                    .build();

            Page<AdminUserResponse> page = new PageImpl<>(
                    List.of(user), PageRequest.of(0, 20), 1);

            when(adminService.getAllUsers(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].email").value("admin@nulogic.com"))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(adminService).getAllUsers(any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no users exist")
        void shouldReturnEmptyPageWhenNoUsers() throws Exception {
            Page<AdminUserResponse> page = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 20), 0);

            when(adminService.getAllUsers(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("Should update user role successfully")
        void shouldUpdateUserRoleSuccessfully() throws Exception {
            UpdateUserRoleRequest request = UpdateUserRoleRequest.builder()
                    .roleCodes(Set.of("HR_ADMIN", "EMPLOYEE"))
                    .build();

            AdminUserResponse updatedUser = AdminUserResponse.builder()
                    .id(userId)
                    .email("user@nulogic.com")
                    .firstName("Test")
                    .lastName("User")
                    .userStatus("ACTIVE")
                    .build();

            when(adminService.updateUserRole(eq(userId), any(UpdateUserRoleRequest.class)))
                    .thenReturn(updatedUser);

            mockMvc.perform(patch("/api/v1/admin/users/{userId}/role", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(userId.toString()))
                    .andExpect(jsonPath("$.email").value("user@nulogic.com"));

            verify(adminService).updateUserRole(eq(userId), any(UpdateUserRoleRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when role codes are empty")
        void shouldReturn400WhenRoleCodesEmpty() throws Exception {
            UpdateUserRoleRequest request = UpdateUserRoleRequest.builder()
                    .roleCodes(Collections.emptySet())
                    .build();

            mockMvc.perform(patch("/api/v1/admin/users/{userId}/role", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Link Employee Tests")
    class LinkEmployeeTests {

        @Test
        @DisplayName("Should link or create employee for user successfully")
        void shouldLinkOrCreateEmployeeSuccessfully() throws Exception {
            EmployeeResponse employeeResponse = EmployeeResponse.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .firstName("Admin")
                    .lastName("User")
                    .workEmail("admin@nulogic.com")
                    .build();

            when(employeeLinkerService.linkOrCreateEmployeeForUser(userId))
                    .thenReturn(employeeResponse);

            mockMvc.perform(post("/api/v1/admin/users/{userId}/link-employee", userId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.userId").value(userId.toString()))
                    .andExpect(jsonPath("$.firstName").value("Admin"));

            verify(employeeLinkerService).linkOrCreateEmployeeForUser(userId);
        }
    }
}
