package com.hrms.api.export;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.export.ExportFormat;
import com.hrms.common.export.ExportService;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExportController.class)
@ContextConfiguration(classes = {ExportController.class, ExportControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExportController Integration Tests")
class ExportControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExportService exportService;
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

    private ExportController.ExportRequest exportRequest;
    private byte[] exportedData;

    @BeforeEach
    void setUp() {
        exportRequest = new ExportController.ExportRequest(
                List.of("Name", "Email", "Department"),
                List.of(
                        Map.of("name", "John Doe", "email", "john@example.com", "department", "Engineering"),
                        Map.of("name", "Jane Smith", "email", "jane@example.com", "department", "HR")
                ),
                List.of("name", "email", "department")
        );

        exportedData = "mock-exported-bytes".getBytes();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should export employees as EXCEL")
    void shouldExportEmployeesAsExcel() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Employee Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "EXCEL")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().exists(HttpHeaders.CONTENT_DISPOSITION));

        verify(exportService).export(eq(ExportFormat.EXCEL), eq("Employee Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export employees as CSV")
    void shouldExportEmployeesAsCsv() throws Exception {
        when(exportService.export(eq(ExportFormat.CSV), eq("Employee Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "CSV")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "text/csv"));

        verify(exportService).export(eq(ExportFormat.CSV), eq("Employee Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export employees as PDF")
    void shouldExportEmployeesAsPdf() throws Exception {
        when(exportService.export(eq(ExportFormat.PDF), eq("Employee Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/employees")
                        .param("format", "PDF")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"));

        verify(exportService).export(eq(ExportFormat.PDF), eq("Employee Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export attendance data")
    void shouldExportAttendanceData() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Attendance Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/attendance")
                        .param("format", "EXCEL")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk())
                .andExpect(header().exists(HttpHeaders.CONTENT_DISPOSITION));

        verify(exportService).export(eq(ExportFormat.EXCEL), eq("Attendance Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export leave data")
    void shouldExportLeaveData() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Leave Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/leaves")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());

        verify(exportService).export(eq(ExportFormat.EXCEL), eq("Leave Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export payroll data")
    void shouldExportPayrollData() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Payroll Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/payroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());

        verify(exportService).export(eq(ExportFormat.EXCEL), eq("Payroll Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export timesheet data")
    void shouldExportTimesheetData() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Timesheet Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/timesheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());

        verify(exportService).export(eq(ExportFormat.EXCEL), eq("Timesheet Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should export project data")
    void shouldExportProjectData() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Project Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk());

        verify(exportService).export(eq(ExportFormat.EXCEL), eq("Project Report"),
                anyList(), anyList(), anyList());
    }

    @Test
    @DisplayName("Should default to EXCEL format when not specified")
    void shouldDefaultToExcelFormat() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Employee Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @DisplayName("Should include content-length header in response")
    void shouldIncludeContentLengthHeader() throws Exception {
        when(exportService.export(eq(ExportFormat.EXCEL), eq("Employee Report"),
                anyList(), anyList(), anyList())).thenReturn(exportedData);

        mockMvc.perform(post("/api/v1/export/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exportRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH,
                        String.valueOf(exportedData.length)));
    }
}
