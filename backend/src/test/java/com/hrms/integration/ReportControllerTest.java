package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.report.dto.ReportRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for ReportController.
 * Covers UC-REPORT-001 through UC-REPORT-010.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Report Controller Integration Tests")
class ReportControllerTest {

    private static final String BASE_URL = "/api/v1/reports";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ========================= UC-REPORT-001: Headcount report =========================

    @Test
    @DisplayName("ucReportA1_generateDepartmentHeadcountReport_returns200WithContent")
    void ucReportA1_generateDepartmentHeadcountReport_returns200WithContent() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/department-headcount")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String contentType = result.getResponse().getContentType();
                    assert contentType != null && contentType.contains("spreadsheetml");
                });
    }

    @Test
    @DisplayName("ucReportA2_generateEmployeeDirectoryReport_returns200")
    void ucReportA2_generateEmployeeDirectoryReport_returns200() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/employee-directory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucReportA3_generateAttendanceReport_returns200")
    void ucReportA3_generateAttendanceReport_returns200() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucReportA4_generateLeaveReport_returns200")
    void ucReportA4_generateLeaveReport_returns200() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/leave")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucReportA5_generatePayrollReport_returns200")
    void ucReportA5_generatePayrollReport_returns200() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/payroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucReportA6_generatePerformanceReport_returns200")
    void ucReportA6_generatePerformanceReport_returns200() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/performance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucReportA7_generateReportAsPDF_returns200WithPDFContent")
    void ucReportA7_generateReportAsPDF_returns200WithPDFContent() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.PDF);

        mockMvc.perform(post(BASE_URL + "/employee-directory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String contentType = result.getResponse().getContentType();
                    assert contentType != null && contentType.contains("pdf");
                });
    }

    @Test
    @DisplayName("ucReportA8_generateReportAsCSV_returns200WithCSVContent")
    void ucReportA8_generateReportAsCSV_returns200WithCSVContent() throws Exception {
        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.CSV);

        mockMvc.perform(post(BASE_URL + "/employee-directory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String contentType = result.getResponse().getContentType();
                    assert contentType != null && contentType.contains("csv");
                });
    }

    @Test
    @DisplayName("ucReportA9_employeeRole_cannotGenerateReports_returns403")
    void ucReportA9_employeeRole_cannotGenerateReports_returns403() throws Exception {
        // Switch to restricted employee
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.EMPLOYEE_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("EMPLOYEE"), restrictedPerms);

        ReportRequest request = buildDefaultReportRequest(ReportRequest.ExportFormat.EXCEL);

        mockMvc.perform(post(BASE_URL + "/employee-directory")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ucReportA10_generateHeadcountWithDateFilter_returns200")
    void ucReportA10_generateHeadcountWithDateFilter_returns200() throws Exception {
        ReportRequest request = ReportRequest.builder()
                .startDate(LocalDate.now().withDayOfYear(1))
                .endDate(LocalDate.now())
                .format(ReportRequest.ExportFormat.EXCEL)
                .employeeStatus("ACTIVE")
                .build();

        mockMvc.perform(post(BASE_URL + "/department-headcount")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    // ============================= Helpers =============================

    private ReportRequest buildDefaultReportRequest(ReportRequest.ExportFormat format) {
        return ReportRequest.builder()
                .startDate(LocalDate.now().minusMonths(3))
                .endDate(LocalDate.now())
                .format(format)
                .build();
    }
}
