package com.hrms.api.report.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.report.dto.ReportTemplateDto;
import com.hrms.application.report.service.CustomReportService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CustomReportController.class)
@ContextConfiguration(classes = {CustomReportController.class, CustomReportControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("CustomReportController Tests")
class CustomReportControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private CustomReportService customReportService;
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

    private ReportTemplateDto sampleTemplate;

    @BeforeEach
    void setUp() {
        sampleTemplate = ReportTemplateDto.builder()
                .id(UUID.randomUUID())
                .name("Employee Report")
                .description("Monthly employee report")
                .module("EMPLOYEE")
                .selectedColumns(List.of("name", "email", "department"))
                .sortBy("name")
                .sortDirection("ASC")
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Template CRUD Tests")
    class TemplateCrudTests {

        @Test
        @DisplayName("Should list templates")
        void shouldListTemplates() throws Exception {
            when(customReportService.listTemplates(null)).thenReturn(List.of(sampleTemplate));

            mockMvc.perform(get("/api/v1/reports/custom/templates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].name").value("Employee Report"));
        }

        @Test
        @DisplayName("Should list templates filtered by module")
        void shouldListTemplatesByModule() throws Exception {
            when(customReportService.listTemplates("EMPLOYEE")).thenReturn(List.of(sampleTemplate));

            mockMvc.perform(get("/api/v1/reports/custom/templates")
                            .param("module", "EMPLOYEE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));
        }

        @Test
        @DisplayName("Should save template")
        void shouldSaveTemplate() throws Exception {
            when(customReportService.saveTemplate(any(ReportTemplateDto.class))).thenReturn(sampleTemplate);

            mockMvc.perform(post("/api/v1/reports/custom/templates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleTemplate)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Employee Report"))
                    .andExpect(jsonPath("$.module").value("EMPLOYEE"));
        }

        @Test
        @DisplayName("Should get template by ID")
        void shouldGetTemplateById() throws Exception {
            UUID templateId = sampleTemplate.getId();
            when(customReportService.getTemplate(templateId)).thenReturn(sampleTemplate);

            mockMvc.perform(get("/api/v1/reports/custom/templates/{id}", templateId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Employee Report"));
        }

        @Test
        @DisplayName("Should delete template")
        void shouldDeleteTemplate() throws Exception {
            UUID templateId = UUID.randomUUID();
            doNothing().when(customReportService).deleteTemplate(templateId);

            mockMvc.perform(delete("/api/v1/reports/custom/templates/{id}", templateId))
                    .andExpect(status().isNoContent());

            verify(customReportService).deleteTemplate(templateId);
        }
    }

    @Nested
    @DisplayName("Report Execution Tests")
    class ExecutionTests {

        @Test
        @DisplayName("Should execute report")
        void shouldExecuteReport() throws Exception {
            List<Map<String, Object>> results = List.of(
                    Map.of("name", "John", "email", "john@example.com"),
                    Map.of("name", "Jane", "email", "jane@example.com")
            );

            when(customReportService.executeReport(any(ReportTemplateDto.class))).thenReturn(results);

            mockMvc.perform(post("/api/v1/reports/custom/execute")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleTemplate)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name").value("John"));
        }

        @Test
        @DisplayName("Should export report as CSV")
        void shouldExportReportAsCsv() throws Exception {
            String csvContent = "name,email\nJohn,john@example.com\nJane,jane@example.com";
            when(customReportService.toCsv(any(ReportTemplateDto.class))).thenReturn(csvContent);

            mockMvc.perform(post("/api/v1/reports/custom/export")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleTemplate)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", containsString("custom-report-employee")))
                    .andExpect(content().contentType("text/csv"));
        }

        @Test
        @DisplayName("Should return empty results for report with no data")
        void shouldReturnEmptyResults() throws Exception {
            when(customReportService.executeReport(any(ReportTemplateDto.class))).thenReturn(Collections.emptyList());

            mockMvc.perform(post("/api/v1/reports/custom/execute")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(sampleTemplate)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }
}
