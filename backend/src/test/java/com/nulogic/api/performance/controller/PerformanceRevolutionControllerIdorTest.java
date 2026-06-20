package com.nulogic.api.performance.controller;

import com.nulogic.api.performance.dto.PerformanceSpiderResponse;
import com.nulogic.application.performance.service.PerformanceRevolutionService;
import com.nulogic.common.config.TestMeterRegistryConfig;
import com.nulogic.common.exception.GlobalExceptionHandler;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TenantFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression tests for the IDOR scope guard on PerformanceRevolutionController.
 * Covers: self-only caller blocked for foreign employeeId; HR manager / VIEW_ALL / team allowed.
 */
@WebMvcTest(PerformanceRevolutionController.class)
@ContextConfiguration(classes = {PerformanceRevolutionController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PerformanceRevolutionController — IDOR scope guard regression tests")
class PerformanceRevolutionControllerIdorTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PerformanceRevolutionService performanceRevolutionService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    @Nested
    @DisplayName("GET /spider/{employeeId}")
    class GetPerformanceSpiderIdorTests {

        @Test
        @DisplayName("should_return_403_when_self_only_caller_requests_foreign_employee_spider")
        void should_return_403_when_self_only_caller_requests_foreign_employee_spider() throws Exception {
            UUID currentEmployeeId = UUID.randomUUID();
            UUID foreignEmployeeId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(false);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isForbidden());

                verify(performanceRevolutionService, never()).getPerformanceSpider(any(), any());
            }
        }

        @Test
        @DisplayName("should_return_200_when_employee_views_own_performance_spider")
        void should_return_200_when_employee_views_own_performance_spider() throws Exception {
            UUID tenantId = UUID.randomUUID();
            UUID currentEmployeeId = UUID.randomUUID();
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(performanceRevolutionService.getPerformanceSpider(currentEmployeeId, tenantId))
                        .thenReturn(spiderResponse);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", currentEmployeeId))
                        .andExpect(status().isOk());

                verify(performanceRevolutionService).getPerformanceSpider(currentEmployeeId, tenantId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_hr_manager_views_any_employee_spider")
        void should_return_200_when_hr_manager_views_any_employee_spider() throws Exception {
            UUID tenantId = UUID.randomUUID();
            UUID foreignEmployeeId = UUID.randomUUID();
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(true);
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(performanceRevolutionService.getPerformanceSpider(foreignEmployeeId, tenantId))
                        .thenReturn(spiderResponse);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isOk());

                verify(performanceRevolutionService).getPerformanceSpider(foreignEmployeeId, tenantId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_employee_view_all_holder_views_foreign_employee_spider")
        void should_return_200_when_employee_view_all_holder_views_foreign_employee_spider() throws Exception {
            UUID tenantId = UUID.randomUUID();
            UUID foreignEmployeeId = UUID.randomUUID();
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(true);
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(performanceRevolutionService.getPerformanceSpider(foreignEmployeeId, tenantId))
                        .thenReturn(spiderResponse);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", foreignEmployeeId))
                        .andExpect(status().isOk());

                verify(performanceRevolutionService).getPerformanceSpider(foreignEmployeeId, tenantId);
            }
        }

        @Test
        @DisplayName("should_return_200_when_team_manager_views_reportee_spider")
        void should_return_200_when_team_manager_views_reportee_spider() throws Exception {
            UUID tenantId = UUID.randomUUID();
            UUID currentEmployeeId = UUID.randomUUID();
            UUID reporteeId = UUID.randomUUID();
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
                 MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                sc.when(SecurityContext::isSuperAdmin).thenReturn(false);
                sc.when(SecurityContext::isTenantAdmin).thenReturn(false);
                sc.when(SecurityContext::isHRManager).thenReturn(false);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)).thenReturn(false);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(currentEmployeeId);
                sc.when(() -> SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)).thenReturn(true);
                sc.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(reporteeId));
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(performanceRevolutionService.getPerformanceSpider(reporteeId, tenantId))
                        .thenReturn(spiderResponse);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", reporteeId))
                        .andExpect(status().isOk());

                verify(performanceRevolutionService).getPerformanceSpider(reporteeId, tenantId);
            }
        }
    }
}
