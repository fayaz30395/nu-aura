package com.hrms.api.report.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.report.dto.ReportRequest;
import com.hrms.application.report.service.ReportService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReportController.class)
@ContextConfiguration(classes = {ReportController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ReportController Unit Tests")
class ReportControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ReportService reportService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private ReportRequest baseRequest;
    private byte[] excelBytes;
    private byte[] pdfBytes;
    private byte[] csvBytes;

    @BeforeEach
    void setUp() {
        baseRequest = ReportRequest.builder()
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 31))
                .format(ReportRequest.ExportFormat.EXCEL)
                .build();

        excelBytes = "Excel report content".getBytes();
        pdfBytes = "PDF report content".getBytes();
        csvBytes = "id,name,status\n1,John,PRESENT".getBytes();
    }

    @Nested
    @DisplayName("Employee Directory Report Tests")
    class EmployeeDirectoryReportTests {

        @Test
        @DisplayName("Should generate employee directory report as Excel")
        void shouldGenerateEmployeeDirectoryReportAsExcel() throws Exception {
            when(reportService.generateEmployeeDirectoryReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/employee-directory")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .andExpect(header().exists("Content-Disposition"));

            verify(reportService).generateEmployeeDirectoryReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate employee directory report as PDF")
        void shouldGenerateEmployeeDirectoryReportAsPdf() throws Exception {
            ReportRequest pdfRequest = ReportRequest.builder()
                    .format(ReportRequest.ExportFormat.PDF)
                    .build();

            when(reportService.generateEmployeeDirectoryReport(any(ReportRequest.class)))
                    .thenReturn(pdfBytes);

            mockMvc.perform(post("/api/v1/reports/employee-directory")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(pdfRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/pdf"));

            verify(reportService).generateEmployeeDirectoryReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate employee directory report as CSV")
        void shouldGenerateEmployeeDirectoryReportAsCsv() throws Exception {
            ReportRequest csvRequest = ReportRequest.builder()
                    .format(ReportRequest.ExportFormat.CSV)
                    .build();

            when(reportService.generateEmployeeDirectoryReport(any(ReportRequest.class)))
                    .thenReturn(csvBytes);

            mockMvc.perform(post("/api/v1/reports/employee-directory")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(csvRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "text/csv"));

            verify(reportService).generateEmployeeDirectoryReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should default to Excel when format is null")
        void shouldDefaultToExcelWhenFormatIsNull() throws Exception {
            ReportRequest noFormatRequest = ReportRequest.builder()
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now())
                    .build();
            // format is null — should default to EXCEL

            when(reportService.generateEmployeeDirectoryReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/employee-directory")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(noFormatRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        }

        @Test
        @DisplayName("Should filter by department IDs")
        void shouldFilterByDepartmentIds() throws Exception {
            UUID deptId = UUID.randomUUID();
            ReportRequest deptRequest = ReportRequest.builder()
                    .departmentIds(Collections.singletonList(deptId))
                    .format(ReportRequest.ExportFormat.EXCEL)
                    .build();

            when(reportService.generateEmployeeDirectoryReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/employee-directory")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(deptRequest)))
                    .andExpect(status().isOk());

            verify(reportService).generateEmployeeDirectoryReport(any(ReportRequest.class));
        }
    }

    @Nested
    @DisplayName("Attendance Report Tests")
    class AttendanceReportTests {

        @Test
        @DisplayName("Should generate attendance report as Excel")
        void shouldGenerateAttendanceReport() throws Exception {
            when(reportService.generateAttendanceReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/attendance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .andExpect(header().exists("Content-Disposition"));

            verify(reportService).generateAttendanceReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate attendance report with attendance status filter")
        void shouldGenerateAttendanceReportWithStatusFilter() throws Exception {
            ReportRequest attendanceRequest = ReportRequest.builder()
                    .startDate(LocalDate.of(2026, 10, 1))
                    .endDate(LocalDate.of(2026, 10, 31))
                    .attendanceStatus("PRESENT")
                    .format(ReportRequest.ExportFormat.EXCEL)
                    .build();

            when(reportService.generateAttendanceReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/attendance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(attendanceRequest)))
                    .andExpect(status().isOk());

            verify(reportService).generateAttendanceReport(any(ReportRequest.class));
        }
    }

    @Nested
    @DisplayName("Department Headcount Report Tests")
    class DepartmentHeadcountReportTests {

        @Test
        @DisplayName("Should generate department headcount report")
        void shouldGenerateDepartmentHeadcountReport() throws Exception {
            when(reportService.generateDepartmentHeadcountReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/department-headcount")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("Content-Disposition"));

            verify(reportService).generateDepartmentHeadcountReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate headcount report as PDF")
        void shouldGenerateHeadcountReportAsPdf() throws Exception {
            ReportRequest pdfRequest = ReportRequest.builder()
                    .format(ReportRequest.ExportFormat.PDF)
                    .build();

            when(reportService.generateDepartmentHeadcountReport(any(ReportRequest.class)))
                    .thenReturn(pdfBytes);

            mockMvc.perform(post("/api/v1/reports/department-headcount")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(pdfRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/pdf"));
        }
    }

    @Nested
    @DisplayName("Leave Report Tests")
    class LeaveReportTests {

        @Test
        @DisplayName("Should generate leave report with date range")
        void shouldGenerateLeaveReport() throws Exception {
            when(reportService.generateLeaveReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/leave")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("Content-Disposition"));

            verify(reportService).generateLeaveReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate leave report filtered by status")
        void shouldGenerateLeaveReportWithStatusFilter() throws Exception {
            ReportRequest leaveRequest = ReportRequest.builder()
                    .startDate(LocalDate.of(2026, 10, 1))
                    .endDate(LocalDate.of(2026, 10, 31))
                    .leaveStatus("APPROVED")
                    .format(ReportRequest.ExportFormat.EXCEL)
                    .build();

            when(reportService.generateLeaveReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/leave")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(leaveRequest)))
                    .andExpect(status().isOk());

            verify(reportService).generateLeaveReport(any(ReportRequest.class));
        }
    }

    @Nested
    @DisplayName("Payroll Report Tests")
    class PayrollReportTests {

        @Test
        @DisplayName("Should generate payroll report for a period")
        void shouldGeneratePayrollReport() throws Exception {
            when(reportService.generatePayrollReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/payroll")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("Content-Disposition"));

            verify(reportService).generatePayrollReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate payroll report for specific payroll run")
        void shouldGeneratePayrollReportForSpecificRun() throws Exception {
            UUID payrollRunId = UUID.randomUUID();
            ReportRequest payrollRequest = ReportRequest.builder()
                    .payrollRunId(payrollRunId)
                    .format(ReportRequest.ExportFormat.EXCEL)
                    .build();

            when(reportService.generatePayrollReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/payroll")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payrollRequest)))
                    .andExpect(status().isOk());

            verify(reportService).generatePayrollReport(any(ReportRequest.class));
        }
    }

    @Nested
    @DisplayName("Performance Report Tests")
    class PerformanceReportTests {

        @Test
        @DisplayName("Should generate performance report")
        void shouldGeneratePerformanceReport() throws Exception {
            when(reportService.generatePerformanceReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/performance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("Content-Disposition"));

            verify(reportService).generatePerformanceReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate performance report for specific review cycle")
        void shouldGeneratePerformanceReportForReviewCycle() throws Exception {
            UUID reviewCycleId = UUID.randomUUID();
            ReportRequest perfRequest = ReportRequest.builder()
                    .reviewCycleId(reviewCycleId)
                    .format(ReportRequest.ExportFormat.PDF)
                    .build();

            when(reportService.generatePerformanceReport(any(ReportRequest.class)))
                    .thenReturn(pdfBytes);

            mockMvc.perform(post("/api/v1/reports/performance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(perfRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/pdf"));

            verify(reportService).generatePerformanceReport(any(ReportRequest.class));
        }

        @Test
        @DisplayName("Should generate performance report as CSV")
        void shouldGeneratePerformanceReportAsCsv() throws Exception {
            ReportRequest csvRequest = ReportRequest.builder()
                    .startDate(LocalDate.of(2026, 10, 1))
                    .endDate(LocalDate.of(2026, 12, 31))
                    .format(ReportRequest.ExportFormat.CSV)
                    .build();

            when(reportService.generatePerformanceReport(any(ReportRequest.class)))
                    .thenReturn(csvBytes);

            mockMvc.perform(post("/api/v1/reports/performance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(csvRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "text/csv"));
        }
    }

    @Nested
    @DisplayName("Report Content-Disposition Tests")
    class ContentDispositionTests {

        @Test
        @DisplayName("Should include filename in Content-Disposition header for Excel")
        void shouldIncludeFilenameInContentDispositionForExcel() throws Exception {
            when(reportService.generateAttendanceReport(any(ReportRequest.class)))
                    .thenReturn(excelBytes);

            mockMvc.perform(post("/api/v1/reports/attendance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(baseRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition",
                            org.hamcrest.Matchers.containsString("attachment")))
                    .andExpect(header().string("Content-Disposition",
                            org.hamcrest.Matchers.containsString(".xlsx")));
        }

        @Test
        @DisplayName("Should include pdf extension in Content-Disposition for PDF reports")
        void shouldIncludePdfFilenameInContentDisposition() throws Exception {
            ReportRequest pdfRequest = ReportRequest.builder()
                    .format(ReportRequest.ExportFormat.PDF)
                    .build();

            when(reportService.generateAttendanceReport(any(ReportRequest.class)))
                    .thenReturn(pdfBytes);

            mockMvc.perform(post("/api/v1/reports/attendance")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(pdfRequest)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition",
                            org.hamcrest.Matchers.containsString(".pdf")));
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("generateEmployeeDirectoryReport should have REPORT_CREATE permission")
        void employeeDirectoryReportShouldRequireReportCreate() throws Exception {
            var method = ReportController.class.getMethod(
                    "generateEmployeeDirectoryReport", ReportRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation,
                    "generateEmployeeDirectoryReport must have @RequiresPermission");
            Assertions.assertEquals(Permission.REPORT_CREATE, annotation.value());
        }

        @Test
        @DisplayName("generateAttendanceReport should have REPORT_CREATE permission")
        void attendanceReportShouldRequireReportCreate() throws Exception {
            var method = ReportController.class.getMethod(
                    "generateAttendanceReport", ReportRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation,
                    "generateAttendanceReport must have @RequiresPermission");
            Assertions.assertEquals(Permission.REPORT_CREATE, annotation.value());
        }

        @Test
        @DisplayName("generatePayrollReport should have REPORT_CREATE permission")
        void payrollReportShouldRequireReportCreate() throws Exception {
            var method = ReportController.class.getMethod(
                    "generatePayrollReport", ReportRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation,
                    "generatePayrollReport must have @RequiresPermission");
            Assertions.assertEquals(Permission.REPORT_CREATE, annotation.value());
        }

        @Test
        @DisplayName("generatePerformanceReport should have REPORT_CREATE permission")
        void performanceReportShouldRequireReportCreate() throws Exception {
            var method = ReportController.class.getMethod(
                    "generatePerformanceReport", ReportRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation,
                    "generatePerformanceReport must have @RequiresPermission");
            Assertions.assertEquals(Permission.REPORT_CREATE, annotation.value());
        }

        @Test
        @DisplayName("generateLeaveReport should have REPORT_CREATE permission")
        void leaveReportShouldRequireReportCreate() throws Exception {
            var method = ReportController.class.getMethod(
                    "generateLeaveReport", ReportRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation,
                    "generateLeaveReport must have @RequiresPermission");
            Assertions.assertEquals(Permission.REPORT_CREATE, annotation.value());
        }
    }
}
