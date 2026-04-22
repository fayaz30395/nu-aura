package com.hrms.api.expense.controller;

import com.hrms.application.expense.service.ExpenseReportService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExpenseReportController.class)
@ContextConfiguration(classes = {ExpenseReportController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExpenseReportController Unit Tests")
class ExpenseReportControllerTest {

    private static final String BASE_URL = "/api/v1/expenses/reports";
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private ExpenseReportService reportService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    // ===================== Expense Report Tests =====================

    @Nested
    @DisplayName("GET /expenses/reports — Generate expense report")
    class GenerateExpenseReportTests {

        @Test
        @DisplayName("Should generate expense report for date range")
        void shouldGenerateExpenseReportForDateRange() throws Exception {
            LocalDate startDate = LocalDate.of(2024, 1, 1);
            LocalDate endDate = LocalDate.of(2024, 1, 31);

            Map<String, Object> report = new HashMap<>();
            report.put("totalExpenses", 15000.00);
            report.put("totalClaims", 42);
            report.put("approvedAmount", 12000.00);
            report.put("pendingAmount", 3000.00);

            when(reportService.generateReport(
                    eq(startDate), eq(endDate), isNull(), isNull(), isNull()))
                    .thenReturn(report);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-01-01")
                            .param("endDate", "2024-01-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalExpenses").value(15000.00))
                    .andExpect(jsonPath("$.totalClaims").value(42));

            verify(reportService).generateReport(
                    eq(startDate), eq(endDate), isNull(), isNull(), isNull());
        }

        @Test
        @DisplayName("Should generate report filtered by department")
        void shouldGenerateReportFilteredByDepartment() throws Exception {
            UUID departmentId = UUID.randomUUID();
            LocalDate startDate = LocalDate.of(2024, 3, 1);
            LocalDate endDate = LocalDate.of(2024, 3, 31);

            Map<String, Object> report = new HashMap<>();
            report.put("totalExpenses", 5000.00);
            report.put("departmentId", departmentId.toString());

            when(reportService.generateReport(
                    eq(startDate), eq(endDate), eq(departmentId), isNull(), isNull()))
                    .thenReturn(report);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-03-01")
                            .param("endDate", "2024-03-31")
                            .param("departmentId", departmentId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalExpenses").value(5000.00));

            verify(reportService).generateReport(
                    eq(startDate), eq(endDate), eq(departmentId), isNull(), isNull());
        }

        @Test
        @DisplayName("Should generate report filtered by category")
        void shouldGenerateReportFilteredByCategory() throws Exception {
            LocalDate startDate = LocalDate.of(2024, 2, 1);
            LocalDate endDate = LocalDate.of(2024, 2, 29);

            Map<String, Object> report = new HashMap<>();
            report.put("category", "TRAVEL");
            report.put("totalExpenses", 8000.00);

            when(reportService.generateReport(
                    eq(startDate), eq(endDate), isNull(), eq("TRAVEL"), isNull()))
                    .thenReturn(report);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-02-01")
                            .param("endDate", "2024-02-29")
                            .param("category", "TRAVEL"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.category").value("TRAVEL"));

            verify(reportService).generateReport(
                    eq(startDate), eq(endDate), isNull(), eq("TRAVEL"), isNull());
        }

        @Test
        @DisplayName("Should generate report filtered by status")
        void shouldGenerateReportFilteredByStatus() throws Exception {
            LocalDate startDate = LocalDate.of(2024, 1, 1);
            LocalDate endDate = LocalDate.of(2024, 12, 31);

            Map<String, Object> report = new HashMap<>();
            report.put("status", "APPROVED");
            report.put("approvedCount", 30);
            report.put("totalApprovedAmount", 22000.00);

            when(reportService.generateReport(
                    eq(startDate), eq(endDate), isNull(), isNull(), eq("APPROVED")))
                    .thenReturn(report);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-01-01")
                            .param("endDate", "2024-12-31")
                            .param("status", "APPROVED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"))
                    .andExpect(jsonPath("$.approvedCount").value(30));
        }

        @Test
        @DisplayName("Should generate report with all filters combined")
        void shouldGenerateReportWithAllFiltersCombined() throws Exception {
            UUID departmentId = UUID.randomUUID();
            LocalDate startDate = LocalDate.of(2024, 6, 1);
            LocalDate endDate = LocalDate.of(2024, 6, 30);

            Map<String, Object> report = new HashMap<>();
            report.put("totalExpenses", 3500.00);
            report.put("filteredResults", 8);

            when(reportService.generateReport(
                    eq(startDate), eq(endDate), eq(departmentId), eq("MEALS"), eq("SUBMITTED")))
                    .thenReturn(report);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-06-01")
                            .param("endDate", "2024-06-30")
                            .param("departmentId", departmentId.toString())
                            .param("category", "MEALS")
                            .param("status", "SUBMITTED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalExpenses").value(3500.00));

            verify(reportService).generateReport(
                    eq(startDate), eq(endDate), eq(departmentId), eq("MEALS"), eq("SUBMITTED"));
        }

        @Test
        @DisplayName("Should return 400 when startDate is missing")
        void shouldReturn400WhenStartDateMissing() throws Exception {
            mockMvc.perform(get(BASE_URL)
                            .param("endDate", "2024-01-31"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when endDate is missing")
        void shouldReturn400WhenEndDateMissing() throws Exception {
            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-01-01"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return empty report when no expenses in period")
        void shouldReturnEmptyReportWhenNoExpensesInPeriod() throws Exception {
            Map<String, Object> emptyReport = new HashMap<>();
            emptyReport.put("totalExpenses", 0.00);
            emptyReport.put("totalClaims", 0);

            when(reportService.generateReport(any(), any(), any(), any(), any()))
                    .thenReturn(emptyReport);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2020-01-01")
                            .param("endDate", "2020-01-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalClaims").value(0));
        }

        @Test
        @DisplayName("Should handle full year date range")
        void shouldHandleFullYearDateRange() throws Exception {
            LocalDate startDate = LocalDate.of(2024, 1, 1);
            LocalDate endDate = LocalDate.of(2024, 12, 31);

            Map<String, Object> annualReport = new HashMap<>();
            annualReport.put("year", 2024);
            annualReport.put("totalExpenses", 180000.00);
            annualReport.put("monthlyBreakdown", new ArrayList<>());

            when(reportService.generateReport(eq(startDate), eq(endDate), any(), any(), any()))
                    .thenReturn(annualReport);

            mockMvc.perform(get(BASE_URL)
                            .param("startDate", "2024-01-01")
                            .param("endDate", "2024-12-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.year").value(2024));
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getExpenseReport should require EXPENSE_VIEW_ALL or EXPENSE_MANAGE")
        void getExpenseReportShouldRequireExpenseViewOrManage() throws Exception {
            var method = ExpenseReportController.class.getMethod(
                    "getExpenseReport",
                    LocalDate.class, LocalDate.class, UUID.class, String.class, String.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation,
                    "getExpenseReport must have @RequiresPermission");
            var values = java.util.Arrays.asList(annotation.value()[0]);
            Assertions.assertTrue(
                    values.contains(Permission.EXPENSE_VIEW_ALL) || values.contains(Permission.EXPENSE_MANAGE),
                    "Must require EXPENSE_VIEW_ALL or EXPENSE_MANAGE");
        }
    }
}
