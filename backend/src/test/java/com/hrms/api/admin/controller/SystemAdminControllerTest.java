package com.hrms.api.admin.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.admin.dto.*;
import com.hrms.application.admin.service.SystemAdminService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for SystemAdminController.
 * Tests tenant management, growth metrics, impersonation (revalidate=true), and @RequiresPermission annotations.
 * All endpoints require SYSTEM_ADMIN permission (SuperAdmin only).
 */
@WebMvcTest(SystemAdminController.class)
@ContextConfiguration(classes = {SystemAdminController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SystemAdminController Unit Tests")
class SystemAdminControllerTest {

    private static final String BASE_URL = "/api/v1/admin/system";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID TARGET_TENANT_ID = UUID.randomUUID();

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private SystemAdminService systemAdminService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.SYSTEM_ADMIN, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of(RoleHierarchy.SUPER_ADMIN), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ==================== @RequiresPermission Annotation Tests ====================

    /**
     * Build a mock Tenant domain object.
     */
    private com.hrms.domain.tenant.Tenant buildMockTenant(String statusName) {
        com.hrms.domain.tenant.Tenant tenant = new com.hrms.domain.tenant.Tenant();
        tenant.setId(TARGET_TENANT_ID);
        tenant.setName("Acme Corp");
        tenant.setStatus(com.hrms.domain.tenant.Tenant.TenantStatus.valueOf(statusName));
        return tenant;
    }

    // ==================== GET /api/v1/admin/system/overview ====================

    @Nested
    @DisplayName("Permission Annotation Verification — All endpoints require SYSTEM_ADMIN")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getSystemOverview should require SYSTEM_ADMIN permission")
        void getSystemOverview_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("getSystemOverview");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("getTenantList should require SYSTEM_ADMIN permission")
        void getTenantList_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("getTenantList", Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("getTenantMetrics should require SYSTEM_ADMIN permission")
        void getTenantMetrics_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("getTenantMetrics", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("suspendTenant should require SYSTEM_ADMIN permission")
        void suspendTenant_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("suspendTenant", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("activateTenant should require SYSTEM_ADMIN permission")
        void activateTenant_shouldRequireSystemAdminPermission() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("activateTenant", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("generateImpersonationToken should require SYSTEM_ADMIN with revalidate=true")
        void generateImpersonationToken_shouldRequireSystemAdminWithRevalidation() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("generateImpersonationToken", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
            // Impersonation is a high-privilege operation — must revalidate fresh from DB
            assertThat(annotation.revalidate()).isTrue();
        }

        @Test
        @DisplayName("Non-impersonation endpoints should NOT have revalidate=true")
        void nonImpersonationEndpoints_shouldNotHaveRevalidation() throws NoSuchMethodException {
            Method overview = SystemAdminController.class.getMethod("getSystemOverview");
            Method tenants = SystemAdminController.class.getMethod("getTenantList", Pageable.class);
            Method suspend = SystemAdminController.class.getMethod("suspendTenant", UUID.class);

            assertThat(overview.getAnnotation(RequiresPermission.class).revalidate()).isFalse();
            assertThat(tenants.getAnnotation(RequiresPermission.class).revalidate()).isFalse();
            assertThat(suspend.getAnnotation(RequiresPermission.class).revalidate()).isFalse();
        }
    }

    // ==================== GET /api/v1/admin/system/tenants ====================

    @Nested
    @DisplayName("GET /overview — System Overview")
    class GetSystemOverviewTests {

        @Test
        @DisplayName("Should return system overview with HTTP 200")
        void getSystemOverview_returnsOverview() throws Exception {
            SystemOverviewDTO overview = SystemOverviewDTO.builder()
                    .totalTenants(15)
                    .activeTenants(12)
                    .totalEmployees(5000)
                    .totalActiveUsers(3200)
                    .storageUsageBytes(1_073_741_824L)
                    .pendingApprovals(42)
                    .build();

            when(systemAdminService.getSystemOverview()).thenReturn(overview);

            mockMvc.perform(get(BASE_URL + "/overview").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalTenants").value(15))
                    .andExpect(jsonPath("$.activeTenants").value(12))
                    .andExpect(jsonPath("$.totalEmployees").value(5000))
                    .andExpect(jsonPath("$.pendingApprovals").value(42));

            verify(systemAdminService).getSystemOverview();
        }

        @Test
        @DisplayName("Should return 500 when service fails")
        void getSystemOverview_returns500_onServiceError() throws Exception {
            when(systemAdminService.getSystemOverview())
                    .thenThrow(new RuntimeException("DB connection failed"));

            mockMvc.perform(get(BASE_URL + "/overview").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }
    }

    // ==================== GET /api/v1/admin/system/tenants/{tenantId}/metrics ====================

    @Nested
    @DisplayName("GET /tenants — Tenant List")
    class GetTenantListTests {

        @Test
        @DisplayName("Should return paginated tenant list with HTTP 200")
        void getTenantList_returnsPaginatedList() throws Exception {
            TenantListItemDTO tenant = TenantListItemDTO.builder()
                    .tenantId(TARGET_TENANT_ID)
                    .name("Acme Corp")
                    .employeeCount(200L)
                    .build();

            Page<TenantListItemDTO> page = new PageImpl<>(List.of(tenant), PageRequest.of(0, 20), 1);
            when(systemAdminService.getTenantList(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/tenants")
                            .param("page", "0")
                            .param("size", "20")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(systemAdminService).getTenantList(any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no tenants exist")
        void getTenantList_returnsEmptyPage_whenNoTenants() throws Exception {
            Page<TenantListItemDTO> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(systemAdminService.getTenantList(any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get(BASE_URL + "/tenants").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }

    // ==================== GET /api/v1/admin/system/growth-metrics ====================

    @Nested
    @DisplayName("GET /tenants/{tenantId}/metrics — Tenant Metrics")
    class GetTenantMetricsTests {

        @Test
        @DisplayName("Should return metrics for a specific tenant")
        void getTenantMetrics_returnsMetrics() throws Exception {
            TenantMetricsDTO metrics = TenantMetricsDTO.builder()
                    .tenantId(TARGET_TENANT_ID)
                    .tenantName("Acme Corp")
                    .activeUsers(150L)
                    .employeeCount(200L)
                    .pendingApprovals(5L)
                    .build();

            when(systemAdminService.getTenantMetrics(TARGET_TENANT_ID)).thenReturn(metrics);

            mockMvc.perform(get(BASE_URL + "/tenants/" + TARGET_TENANT_ID + "/metrics")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tenantId").value(TARGET_TENANT_ID.toString()))
                    .andExpect(jsonPath("$.activeUsers").value(150))
                    .andExpect(jsonPath("$.employeeCount").value(200));

            verify(systemAdminService).getTenantMetrics(TARGET_TENANT_ID);
        }

        @Test
        @DisplayName("Should return 404 when tenant not found")
        void getTenantMetrics_returns404_whenTenantNotFound() throws Exception {
            UUID unknownTenant = UUID.randomUUID();
            when(systemAdminService.getTenantMetrics(unknownTenant))
                    .thenThrow(new ResourceNotFoundException("Tenant not found"));

            mockMvc.perform(get(BASE_URL + "/tenants/" + unknownTenant + "/metrics")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== POST /api/v1/admin/system/tenants/{tenantId}/suspend ====================

    @Nested
    @DisplayName("GET /growth-metrics — Platform Growth Metrics")
    class GetGrowthMetricsTests {

        @Test
        @DisplayName("Should return growth metrics for default 6 months")
        void getGrowthMetrics_returnsDefaultSixMonths() throws Exception {
            GrowthMetricsDTO metrics = GrowthMetricsDTO.builder().build();
            when(systemAdminService.getGrowthMetrics(6)).thenReturn(metrics);

            mockMvc.perform(get(BASE_URL + "/growth-metrics").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(systemAdminService).getGrowthMetrics(6);
        }

        @Test
        @DisplayName("Should cap months at 24 for large values")
        void getGrowthMetrics_capsMonthsAt24() throws Exception {
            GrowthMetricsDTO metrics = GrowthMetricsDTO.builder().build();
            when(systemAdminService.getGrowthMetrics(24)).thenReturn(metrics);

            // Request 100 months — controller should cap at 24
            mockMvc.perform(get(BASE_URL + "/growth-metrics")
                            .param("months", "100")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            // The controller does Math.min(months, 24) — verify capped value passed
            verify(systemAdminService).getGrowthMetrics(24);
        }

        @Test
        @DisplayName("Should return metrics for custom months value within range")
        void getGrowthMetrics_returnsCustomMonths() throws Exception {
            GrowthMetricsDTO metrics = GrowthMetricsDTO.builder().build();
            when(systemAdminService.getGrowthMetrics(12)).thenReturn(metrics);

            mockMvc.perform(get(BASE_URL + "/growth-metrics")
                            .param("months", "12")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(systemAdminService).getGrowthMetrics(12);
        }
    }

    // ==================== POST /api/v1/admin/system/tenants/{tenantId}/activate ====================

    @Nested
    @DisplayName("POST /tenants/{tenantId}/suspend — Suspend Tenant")
    class SuspendTenantTests {

        @Test
        @DisplayName("Should suspend tenant and return TenantStatusDTO with HTTP 200")
        void suspendTenant_returnsSuspendedStatus() throws Exception {
            com.hrms.domain.tenant.Tenant mockTenant = buildMockTenant("SUSPENDED");
            when(systemAdminService.suspendTenant(TARGET_TENANT_ID)).thenReturn(mockTenant);

            mockMvc.perform(post(BASE_URL + "/tenants/" + TARGET_TENANT_ID + "/suspend")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tenantId").value(TARGET_TENANT_ID.toString()))
                    .andExpect(jsonPath("$.name").value("Acme Corp"))
                    .andExpect(jsonPath("$.status").value("SUSPENDED"));

            verify(systemAdminService).suspendTenant(TARGET_TENANT_ID);
        }

        @Test
        @DisplayName("Should return 404 when tenant not found")
        void suspendTenant_returns404_whenTenantNotFound() throws Exception {
            UUID unknownTenant = UUID.randomUUID();
            when(systemAdminService.suspendTenant(unknownTenant))
                    .thenThrow(new ResourceNotFoundException("Tenant not found"));

            mockMvc.perform(post(BASE_URL + "/tenants/" + unknownTenant + "/suspend")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== POST /api/v1/admin/system/tenants/{tenantId}/impersonate ====================

    @Nested
    @DisplayName("POST /tenants/{tenantId}/activate — Activate Tenant")
    class ActivateTenantTests {

        @Test
        @DisplayName("Should activate tenant and return TenantStatusDTO with HTTP 200")
        void activateTenant_returnsActiveStatus() throws Exception {
            com.hrms.domain.tenant.Tenant mockTenant = buildMockTenant("ACTIVE");
            when(systemAdminService.activateTenant(TARGET_TENANT_ID)).thenReturn(mockTenant);

            mockMvc.perform(post(BASE_URL + "/tenants/" + TARGET_TENANT_ID + "/activate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tenantId").value(TARGET_TENANT_ID.toString()))
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(systemAdminService).activateTenant(TARGET_TENANT_ID);
        }

        @Test
        @DisplayName("Should return 404 when tenant not found")
        void activateTenant_returns404_whenTenantNotFound() throws Exception {
            UUID unknownTenant = UUID.randomUUID();
            when(systemAdminService.activateTenant(unknownTenant))
                    .thenThrow(new ResourceNotFoundException("Tenant not found"));

            mockMvc.perform(post(BASE_URL + "/tenants/" + unknownTenant + "/activate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== Helpers ====================

    @Nested
    @DisplayName("POST /tenants/{tenantId}/impersonate — Generate Impersonation Token")
    class GenerateImpersonationTokenTests {

        @Test
        @DisplayName("Should return impersonation token DTO with JWT and tenant info")
        void generateImpersonationToken_returnsTokenDTO() throws Exception {
            ImpersonationTokenDTO tokenDTO = ImpersonationTokenDTO.builder()
                    .token("eyJhbGciOiJIUzI1NiJ9.impersonation.token")
                    .tokenType("Bearer")
                    .expiresIn(3600)
                    .tenantId(TARGET_TENANT_ID.toString())
                    .tenantName("Acme Corp")
                    .build();

            when(systemAdminService.generateImpersonationToken(TARGET_TENANT_ID)).thenReturn(tokenDTO);

            mockMvc.perform(post(BASE_URL + "/tenants/" + TARGET_TENANT_ID + "/impersonate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").exists())
                    .andExpect(jsonPath("$.tokenType").value("Bearer"))
                    .andExpect(jsonPath("$.expiresIn").value(3600))
                    .andExpect(jsonPath("$.tenantId").value(TARGET_TENANT_ID.toString()))
                    .andExpect(jsonPath("$.tenantName").value("Acme Corp"));

            verify(systemAdminService).generateImpersonationToken(TARGET_TENANT_ID);
        }

        @Test
        @DisplayName("Should return 404 when target tenant not found")
        void generateImpersonationToken_returns404_whenTenantNotFound() throws Exception {
            UUID unknownTenant = UUID.randomUUID();
            when(systemAdminService.generateImpersonationToken(unknownTenant))
                    .thenThrow(new ResourceNotFoundException("Tenant not found"));

            mockMvc.perform(post(BASE_URL + "/tenants/" + unknownTenant + "/impersonate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Impersonation endpoint must have revalidate=true — critical security guard")
        void impersonation_annotationMustHaveRevalidateTrue() throws NoSuchMethodException {
            Method method = SystemAdminController.class.getMethod("generateImpersonationToken", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            // CRITICAL: impersonation is the most sensitive endpoint in the platform.
            // revalidate=true forces a fresh DB permission check, preventing stale JWT abuse.
            assertThat(annotation.revalidate()).isTrue();
            assertThat(annotation.value()[0]).contains(Permission.SYSTEM_ADMIN);
        }

        @Test
        @DisplayName("Response should include non-empty token string")
        void generateImpersonationToken_responseContainsToken() throws Exception {
            ImpersonationTokenDTO tokenDTO = ImpersonationTokenDTO.builder()
                    .token("valid.jwt.token")
                    .tokenType("Bearer")
                    .expiresIn(1800)
                    .tenantId(TARGET_TENANT_ID.toString())
                    .tenantName("Test Tenant")
                    .build();

            when(systemAdminService.generateImpersonationToken(TARGET_TENANT_ID)).thenReturn(tokenDTO);

            mockMvc.perform(post(BASE_URL + "/tenants/" + TARGET_TENANT_ID + "/impersonate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isNotEmpty())
                    .andExpect(jsonPath("$.expiresIn").isNumber());
        }
    }
}
