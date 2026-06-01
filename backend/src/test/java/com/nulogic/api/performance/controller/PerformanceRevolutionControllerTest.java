package com.nulogic.api.performance.controller;

import com.nulogic.api.performance.dto.OKRGraphResponse;
import com.nulogic.api.performance.dto.PerformanceSpiderResponse;
import com.nulogic.application.performance.service.PerformanceRevolutionService;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
            OKRGraphResponse graphResponse = OKRGraphResponse.builder()
                    .nodes(List.of(OKRGraphResponse.OKRNode.builder()
                            .id("okr-1")
                            .title("Company Objective")
                            .type("COMPANY")
                            .progress(72.5)
                            .ownerName("Leadership")
                            .build()))
                    .links(List.of(OKRGraphResponse.OKRLink.builder()
                            .source("okr-1")
                            .target("okr-2")
                            .build()))
                    .build();
            when(performanceRevolutionService.getOKRGraph(tenantId)).thenReturn(graphResponse);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/performance/revolution/okr-graph"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.nodes[0].id").value("okr-1"))
                        .andExpect(jsonPath("$.nodes[0].title").value("Company Objective"))
                        .andExpect(jsonPath("$.nodes[0].type").value("COMPANY"))
                        .andExpect(jsonPath("$.nodes[0].progress").value(72.5))
                        .andExpect(jsonPath("$.nodes[0].ownerName").value("Leadership"))
                        .andExpect(jsonPath("$.links[0].source").value("okr-1"))
                        .andExpect(jsonPath("$.links[0].target").value("okr-2"));
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
            PerformanceSpiderResponse spiderResponse = PerformanceSpiderResponse.builder()
                    .metrics(List.of(PerformanceSpiderResponse.SpiderData.builder()
                            .subject("Leadership")
                            .self(80)
                            .peer(75)
                            .manager(85)
                            .fullMark(100)
                            .build()))
                    .build();
            when(performanceRevolutionService.getPerformanceSpider(employeeId, tenantId))
                    .thenReturn(spiderResponse);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/performance/revolution/spider/{employeeId}", employeeId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.metrics[0].subject").value("Leadership"))
                        .andExpect(jsonPath("$.metrics[0].self").value(80))
                        .andExpect(jsonPath("$.metrics[0].peer").value(75))
                        .andExpect(jsonPath("$.metrics[0].manager").value(85))
                        .andExpect(jsonPath("$.metrics[0].fullMark").value(100));
            }

            verify(performanceRevolutionService).getPerformanceSpider(employeeId, tenantId);
        }

        @Test
        @DisplayName("Should use tenant context for performance spider")
        void shouldUseTenantContextForSpider() throws Exception {
            PerformanceSpiderResponse spiderResponse = new PerformanceSpiderResponse();
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
