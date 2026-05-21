package com.nulogic.api.payroll.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.application.payroll.service.PayrollRunService;
import com.nulogic.application.payroll.service.PayslipPdfService;
import com.nulogic.application.payroll.service.PayslipService;
import com.nulogic.application.payroll.service.SalaryStructureService;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.domain.payroll.SalaryStructure;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PayrollController.class)
@ContextConfiguration(classes = {PayrollController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PayrollController Unit Tests")
class PayrollControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PayrollRunService payrollRunService;

    @MockitoBean
    private PayslipService payslipService;

    @MockitoBean
    private PayslipPdfService payslipPdfService;

    @MockitoBean
    private SalaryStructureService salaryStructureService;

    @MockitoBean
    private com.nulogic.application.payroll.service.PayrollComponentService payrollComponentService;

    @MockitoBean
    private com.nulogic.application.employee.service.EmployeeService employeeService;

    @MockitoBean
    private EventPublisher eventPublisher;

    @MockitoBean
    private TenantTimeService tenantTimeService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID payrollRunId;
    private UUID payslipId;
    private UUID employeeId;
    private PayrollRun payrollRun;
    private Payslip payslip;

    @BeforeEach
    void setUp() {
        payrollRunId = UUID.randomUUID();
        payslipId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        TenantContext.setCurrentTenant(UUID.randomUUID());
        lenient().when(tenantTimeService.now(any(UUID.class))).thenReturn(java.time.LocalDateTime.now());
        lenient().when(tenantTimeService.today(any(UUID.class))).thenReturn(LocalDate.now());

        payrollRun = new PayrollRun();
        payrollRun.setId(payrollRunId);
        payrollRun.setPayPeriodYear(2024);
        payrollRun.setPayPeriodMonth(3);
        payrollRun.setPayrollDate(LocalDate.of(2024, 3, 31));
        payrollRun.setStatus(PayrollRun.PayrollStatus.DRAFT);

        payslip = new Payslip();
        payslip.setId(payslipId);
        payslip.setPayrollRunId(payrollRunId);
        payslip.setEmployeeId(employeeId);
        payslip.setPayPeriodYear(2024);
        payslip.setPayPeriodMonth(3);
        payslip.setPayDate(LocalDate.of(2024, 3, 31));
        payslip.setBasicSalary(new BigDecimal("50000.00"));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    @Nested
    @DisplayName("Create Payroll Run Tests")
    class CreatePayrollRunTests {

        @Test
        @DisplayName("Should create payroll run successfully")
        void shouldCreatePayrollRunSuccessfully() throws Exception {
            when(payrollRunService.createPayrollRun(any(PayrollRun.class)))
                    .thenReturn(payrollRun);

            mockMvc.perform(post("/api/v1/payroll/runs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payrollRun)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(payrollRunId.toString()))
                    .andExpect(jsonPath("$.payPeriodYear").value(2024))
                    .andExpect(jsonPath("$.payPeriodMonth").value(3))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(payrollRunService).createPayrollRun(any(PayrollRun.class));
        }

        @Test
        @DisplayName("Should return 400 when required fields are missing")
        void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
            PayrollRun invalidRun = new PayrollRun();

            mockMvc.perform(post("/api/v1/payroll/runs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRun)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(payrollRunService);
        }

        @Test
        @DisplayName("Should prevent duplicate payroll run for same period")
        void shouldPreventDuplicatePayrollRun() throws Exception {
            when(payrollRunService.createPayrollRun(any(PayrollRun.class)))
                    .thenThrow(new IllegalArgumentException("Payroll run already exists for this period"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(post("/api/v1/payroll/runs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payrollRun))));
        }
    }

    @Nested
    @DisplayName("Update Payroll Run Tests")
    class UpdatePayrollRunTests {

        @Test
        @DisplayName("Should update payroll run successfully")
        void shouldUpdatePayrollRun() throws Exception {
            PayrollRun updatedRun = new PayrollRun();
            updatedRun.setId(payrollRunId);
            updatedRun.setPayPeriodYear(2024);
            updatedRun.setPayPeriodMonth(3);
            updatedRun.setPayrollDate(LocalDate.of(2024, 3, 31));
            updatedRun.setStatus(PayrollRun.PayrollStatus.DRAFT);

            when(payrollRunService.updatePayrollRun(eq(payrollRunId), any(PayrollRun.class)))
                    .thenReturn(updatedRun);

            mockMvc.perform(put("/api/v1/payroll/runs/{id}", payrollRunId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updatedRun)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(payrollRunId.toString()));

            verify(payrollRunService).updatePayrollRun(eq(payrollRunId), any(PayrollRun.class));
        }

        @Test
        @DisplayName("Should not allow update of locked payroll run")
        void shouldNotAllowUpdateOfLockedRun() throws Exception {
            when(payrollRunService.updatePayrollRun(eq(payrollRunId), any(PayrollRun.class)))
                    .thenThrow(new IllegalArgumentException("Cannot update locked payroll run"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(put("/api/v1/payroll/runs/{id}", payrollRunId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payrollRun))));
        }
    }

    @Nested
    @DisplayName("Process Payroll Run Tests")
    class ProcessPayrollRunTests {

        @Test
        @DisplayName("Should accept payroll run for async processing (202)")
        void shouldProcessPayrollRun() throws Exception {
            PayrollRun processingRun = new PayrollRun();
            processingRun.setId(payrollRunId);
            processingRun.setStatus(PayrollRun.PayrollStatus.PROCESSING);
            processingRun.setPayPeriodMonth(4);
            processingRun.setPayPeriodYear(2026);

            when(payrollRunService.initiateProcessing(eq(payrollRunId), any()))
                    .thenReturn(processingRun);
            when(eventPublisher.publishPayrollProcessingEvent(
                    any(UUID.class), any(), any(), anyInt(), anyInt()))
                    .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(null));

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", payrollRunId))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.status").value("PROCESSING"));

            verify(payrollRunService).initiateProcessing(eq(payrollRunId), any());
            verify(eventPublisher).publishPayrollProcessingEvent(
                    eq(payrollRunId), any(), any(), anyInt(), anyInt());
        }

        @Test
        @DisplayName("Should throw when processing non-existent payroll run")
        void shouldReturn404ForNonExistent() throws Exception {
            UUID nonExistentId = UUID.randomUUID();
            when(payrollRunService.initiateProcessing(eq(nonExistentId), any()))
                    .thenThrow(new IllegalArgumentException("Payroll run not found"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", nonExistentId)));
        }

        @Test
        @DisplayName("Should throw when processing already processed payroll run")
        void shouldNotProcessAlreadyProcessedRun() throws Exception {
            when(payrollRunService.initiateProcessing(eq(payrollRunId), any()))
                    .thenThrow(new IllegalArgumentException("Payroll run has already been processed"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", payrollRunId)));
        }
    }

    @Nested
    @DisplayName("Approve Payroll Run Tests")
    class ApprovePayrollRunTests {

        @Test
        @DisplayName("Should approve payroll run successfully")
        void shouldApprovePayrollRun() throws Exception {
            PayrollRun approvedRun = new PayrollRun();
            approvedRun.setId(payrollRunId);
            approvedRun.setStatus(PayrollRun.PayrollStatus.APPROVED);

            when(payrollRunService.approvePayrollRun(eq(payrollRunId), any()))
                    .thenReturn(approvedRun);

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/approve", payrollRunId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(payrollRunService).approvePayrollRun(eq(payrollRunId), any());
        }
    }

    @Nested
    @DisplayName("Lock Payroll Run Tests")
    class LockPayrollRunTests {

        @Test
        @DisplayName("Should lock payroll run successfully")
        void shouldLockPayrollRun() throws Exception {
            PayrollRun lockedRun = new PayrollRun();
            lockedRun.setId(payrollRunId);
            lockedRun.setStatus(PayrollRun.PayrollStatus.LOCKED);

            when(payrollRunService.lockPayrollRun(eq(payrollRunId)))
                    .thenReturn(lockedRun);

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/lock", payrollRunId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("LOCKED"));

            verify(payrollRunService).lockPayrollRun(eq(payrollRunId));
        }

        @Test
        @DisplayName("Should only lock approved payroll runs")
        void shouldOnlyLockApprovedRuns() throws Exception {
            when(payrollRunService.lockPayrollRun(eq(payrollRunId)))
                    .thenThrow(new IllegalArgumentException("Only approved payroll runs can be locked"));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(post("/api/v1/payroll/runs/{id}/lock", payrollRunId)));
        }
    }

    @Nested
    @DisplayName("Delete Payroll Run Tests")
    class DeletePayrollRunTests {

        @Test
        @DisplayName("Should delete payroll run successfully")
        void shouldDeletePayrollRun() throws Exception {
            doNothing().when(payrollRunService).deletePayrollRun(eq(payrollRunId));

            mockMvc.perform(delete("/api/v1/payroll/runs/{id}", payrollRunId))
                    .andExpect(status().isNoContent());

            verify(payrollRunService).deletePayrollRun(eq(payrollRunId));
        }

        @Test
        @DisplayName("Should not allow deletion of locked payroll run")
        void shouldNotDeleteLockedRun() throws Exception {
            doThrow(new IllegalArgumentException("Cannot delete locked payroll run"))
                    .when(payrollRunService).deletePayrollRun(eq(payrollRunId));

            assertThrows(Exception.class, () ->
                    mockMvc.perform(delete("/api/v1/payroll/runs/{id}", payrollRunId)));
        }
    }

    @Nested
    @DisplayName("Get Payroll Run Tests")
    class GetPayrollRunTests {

        @Test
        @DisplayName("Should get payroll run by ID")
        void shouldGetPayrollRunById() throws Exception {
            when(payrollRunService.getPayrollRunById(eq(payrollRunId)))
                    .thenReturn(payrollRun);

            mockMvc.perform(get("/api/v1/payroll/runs/{id}", payrollRunId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(payrollRunId.toString()));

            verify(payrollRunService).getPayrollRunById(eq(payrollRunId));
        }

        @Test
        @DisplayName("Should get all payroll runs with pagination")
        void shouldGetAllPayrollRuns() throws Exception {
            List<PayrollRun> runs = new ArrayList<>();
            runs.add(payrollRun);

            Page<PayrollRun> page = new PageImpl<>(runs, PageRequest.of(0, 20), 1);
            when(payrollRunService.getAllPayrollRuns(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/payroll/runs")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(payrollRunService).getAllPayrollRuns(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get payroll run by period")
        void shouldGetPayrollRunByPeriod() throws Exception {
            when(payrollRunService.getPayrollRunByPeriod(eq(2024), eq(3)))
                    .thenReturn(payrollRun);

            mockMvc.perform(get("/api/v1/payroll/runs/period")
                            .param("year", "2024")
                            .param("month", "3"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.payPeriodYear").value(2024))
                    .andExpect(jsonPath("$.payPeriodMonth").value(3));

            verify(payrollRunService).getPayrollRunByPeriod(eq(2024), eq(3));
        }

        @Test
        @DisplayName("Should get payroll runs by status")
        void shouldGetPayrollRunsByStatus() throws Exception {
            List<PayrollRun> runs = new ArrayList<>();
            runs.add(payrollRun);

            Page<PayrollRun> page = new PageImpl<>(runs, PageRequest.of(0, 20), 1);
            when(payrollRunService.getPayrollRunsByStatus(eq(PayrollRun.PayrollStatus.DRAFT), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/payroll/runs/status/DRAFT")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(payrollRunService).getPayrollRunsByStatus(eq(PayrollRun.PayrollStatus.DRAFT), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Payslip Tests")
    class PayslipTests {

        @Test
        @DisplayName("Should create payslip successfully")
        void shouldCreatePayslip() throws Exception {
            when(payslipService.createPayslip(any(Payslip.class)))
                    .thenReturn(payslip);

            mockMvc.perform(post("/api/v1/payroll/payslips")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payslip)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(payslipId.toString()));

            verify(payslipService).createPayslip(any(Payslip.class));
        }

        @Test
        @DisplayName("Should get payslip by ID")
        void shouldGetPayslipById() throws Exception {
            when(payslipService.getPayslipById(eq(payslipId)))
                    .thenReturn(payslip);

            mockMvc.perform(get("/api/v1/payroll/payslips/{id}", payslipId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(payslipId.toString()));

            verify(payslipService).getPayslipById(eq(payslipId));
        }

        @Test
        @DisplayName("Should get payslips by employee")
        void shouldGetPayslipsByEmployee() throws Exception {
            List<Payslip> payslips = new ArrayList<>();
            payslips.add(payslip);

            Page<Payslip> page = new PageImpl<>(payslips, PageRequest.of(0, 20), 1);
            when(payslipService.getPayslipsByEmployeeId(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(() -> SecurityContext.getPermissionScope(anyString())).thenReturn(RoleScope.ALL);
                sc.when(SecurityContext::isSuperAdmin).thenReturn(true);

                mockMvc.perform(get("/api/v1/payroll/payslips/employee/{employeeId}", employeeId)
                                .param("page", "0")
                                .param("size", "20"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1));

                verify(payslipService).getPayslipsByEmployeeId(eq(employeeId), any(Pageable.class));
            }
        }

        @Test
        @DisplayName("Should download payslip PDF")
        void shouldDownloadPayslipPdf() throws Exception {
            byte[] pdfBytes = "PDF content".getBytes();

            when(payslipService.getPayslipById(eq(payslipId))).thenReturn(payslip);
            when(payslipPdfService.generatePayslipPdf(eq(payslipId)))
                    .thenReturn(pdfBytes);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(() -> SecurityContext.getPermissionScope(anyString())).thenReturn(RoleScope.ALL);
                sc.when(SecurityContext::isSuperAdmin).thenReturn(true);

                mockMvc.perform(get("/api/v1/payroll/payslips/{id}/pdf", payslipId))
                        .andExpect(status().isOk())
                        .andExpect(header().string("Content-Type", "application/pdf"))
                        .andExpect(header().exists("Content-Disposition"));

                verify(payslipPdfService).generatePayslipPdf(eq(payslipId));
            }
        }

        @Test
        @DisplayName("Should delete payslip")
        void shouldDeletePayslip() throws Exception {
            doNothing().when(payslipService).deletePayslip(eq(payslipId));

            mockMvc.perform(delete("/api/v1/payroll/payslips/{id}", payslipId))
                    .andExpect(status().isNoContent());

            verify(payslipService).deletePayslip(eq(payslipId));
        }
    }

    @Nested
    @DisplayName("Salary Structure Tests")
    class SalaryStructureTests {

        @Test
        @DisplayName("Should create salary structure successfully")
        void shouldCreateSalaryStructure() throws Exception {
            SalaryStructure structure = new SalaryStructure();
            structure.setId(UUID.randomUUID());
            structure.setEmployeeId(employeeId);
            structure.setBasicSalary(new BigDecimal("50000"));
            structure.setEffectiveDate(LocalDate.now());

            when(salaryStructureService.createSalaryStructure(any(SalaryStructure.class)))
                    .thenReturn(structure);

            mockMvc.perform(post("/api/v1/payroll/salary-structures")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(structure)))
                    .andExpect(status().isCreated());

            verify(salaryStructureService).createSalaryStructure(any(SalaryStructure.class));
        }

        @Test
        @DisplayName("Should get salary structure by ID")
        void shouldGetSalaryStructureById() throws Exception {
            SalaryStructure structure = new SalaryStructure();
            structure.setId(UUID.randomUUID());
            structure.setEmployeeId(employeeId);
            structure.setBasicSalary(new BigDecimal("50000"));
            structure.setEffectiveDate(LocalDate.now());

            when(salaryStructureService.getSalaryStructureById(any()))
                    .thenReturn(structure);

            mockMvc.perform(get("/api/v1/payroll/salary-structures/{id}", structure.getId()))
                    .andExpect(status().isOk());

            verify(salaryStructureService).getSalaryStructureById(any());
        }

        @Test
        @DisplayName("Should get salary structures by employee")
        void shouldGetSalaryStructuresByEmployee() throws Exception {
            SalaryStructure structure = new SalaryStructure();
            structure.setId(UUID.randomUUID());
            structure.setEmployeeId(employeeId);
            structure.setBasicSalary(new BigDecimal("50000"));
            structure.setEffectiveDate(LocalDate.now());

            List<SalaryStructure> structures = new ArrayList<>();
            structures.add(structure);

            when(salaryStructureService.getSalaryStructuresByEmployeeId(eq(employeeId)))
                    .thenReturn(structures);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(() -> SecurityContext.getPermissionScope(anyString())).thenReturn(RoleScope.ALL);
                sc.when(SecurityContext::isSuperAdmin).thenReturn(true);

                mockMvc.perform(get("/api/v1/payroll/salary-structures/employee/{employeeId}", employeeId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$").isArray())
                        .andExpect(jsonPath("$.length()").value(1));

                verify(salaryStructureService).getSalaryStructuresByEmployeeId(eq(employeeId));
            }
        }
    }
}
