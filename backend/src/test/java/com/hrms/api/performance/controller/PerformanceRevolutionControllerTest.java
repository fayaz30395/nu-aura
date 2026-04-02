package com.hrms.api.performance.controller;

import com.hrms.api.performance.dto.OKRGraphResponse;
import com.hrms.api.performance.dto.PerformanceSpiderResponse;
import com.hrms.application.performance.service.PerformanceRevolutionService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PerformanceRevolutionController.class)
@ContextConfiguration(classes = {PerformanceRevolutionController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PerformanceRevolutionController Unit Tests")
class PerformanceRevolutionControllerTest {

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

    private UUID tenantId;
    private UUID employeeId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("OKR Graph Tests")
    class OkrGraphTests {

        @Test
        @DisplayName("Should return OKR graph for tenant")
        void shouldReturnOkrGraph() throws Exception {
            OKRGraphResponse graphResponse = new OKRGraphResponse();
            graphResponse.setTotalObjectives(10);
            graphResponse.setCompletedObjectives(4);
            graphResponse.setOverallProgress(40.0);

            when(performanceRevolutionService.getOKRGraph(tenantId)).thenReturn(graphResponse);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/performance/revolution/okr-graph"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalObjectives").value(10))
                        .andExpect(jsonPath("$.completedObjectives").value(4))
                        .andExpect(jsonPath("$.overallProgress").value(40.0));
            }

            verify(performanceRevolutionService).getOKRGraph(tenantId);
        }

        @Test
        @DisplayName("Should use tenant context for OKR graph")
        void shouldUseTenantContextForOkrGraph() throws Exception {
            OKRGraphResponse graphResponse = new OKRGraphResponse();
            when(performanceRevolutionService.getOKRGraph(tenantId)).thenReturn(graphResponse);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/performance/revolution/okr-graph"))
                        .andExpect(status().isOk());

                tc.verify(TenantContext::getCurrentTenant);
            }
        }
    }

    @Nested
    @DisplayName("Performance Spider Tests")
    class PerformanceSpiderTests {

        @Test
        @DisplayName("Should return performance spider for employee")
        void shouldReturnPerformanceSpider() throws Exception {
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();
            spiderResponse.setEmployeeId(employeeId);
            spiderResponse.setDimensions(List.of("Communication", "Technical", "Leadership"));
            spiderResponse.setScores(List.of(4.2, 3.8, 4.0));

            when(performanceRevolutionService.getPerformanceSpider(employeeId, tenantId))
                    .thenReturn(spiderResponse);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", employeeId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                        .andExpect(jsonPath("$.dimensions.length()").value(3))
                        .andExpect(jsonPath("$.scores.length()").value(3));
            }

            verify(performanceRevolutionService).getPerformanceSpider(employeeId, tenantId);
        }

        @Test
        @DisplayName("Should use tenant context for performance spider")
        void shouldUseTenantContextForSpider() throws Exception {
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();
            spiderResponse.setEmployeeId(employeeId);
            when(performanceRevolutionService.getPerformanceSpider(employeeId, tenantId))
                    .thenReturn(spiderResponse);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", employeeId))
                        .andExpect(status().isOk());

                tc.verify(TenantContext::getCurrentTenant);
            }

            verify(performanceRevolutionService).getPerformanceSpider(employeeId, tenantId);
        }
    }
}
