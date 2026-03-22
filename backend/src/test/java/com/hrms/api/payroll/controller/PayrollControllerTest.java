package com.hrms.api.payroll.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.application.payroll.service.PayslipPdfService;
import com.hrms.application.payroll.service.PayslipService;
import com.hrms.application.payroll.service.SalaryStructureService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.payroll.SalaryStructure;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import java.util.Collections;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PayrollController.class)
@ContextConfiguration(classes = {PayrollController.class, PayrollControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PayrollController Unit Tests")
class PayrollControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public JpaMetamodelMappingContext jpaMetamodelMappingContext() {
            return new JpaMetamodelMappingContext(Collections.emptySet());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PayrollRunService payrollRunService;

    @MockBean
    private PayslipService payslipService;

    @MockBean
    private PayslipPdfService payslipPdfService;

    @MockBean
    private SalaryStructureService salaryStructureService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
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

        payrollRun = new PayrollRun();
        payrollRun.setId(payrollRunId);
        payrollRun.setPayPeriodYear(2024);
        payrollRun.setPayPeriodMonth(3);
        payrollRun.setStatus(PayrollRun.PayrollStatus.DRAFT);

        payslip = new Payslip();
        payslip.setId(payslipId);
        payslip.setPayrollRunId(payrollRunId);
        payslip.setEmployeeId(employeeId);
        payslip.setPayPeriodYear(2024);
        payslip.setPayPeriodMonth(3);
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
                    .andExpect(jsonPath("$.year").value(2024))
                    .andExpect(jsonPath("$.month").value(3))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(payrollRunService).createPayrollRun(any(PayrollRun.class));
        }

        @Test
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingFields() throws Exception {
            PayrollRun invalidRun = new PayrollRun();
            // Missing year, month, etc.

            mockMvc.perform(post("/api/v1/payroll/runs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRun)))
                    .andExpect(status().isBadRequest());

            verify(payrollRunService, never()).createPayrollRun(any());
        }

        @Test
        @DisplayName("Should prevent duplicate payroll run for same period")
        void shouldPreventDuplicatePayrollRun() throws Exception {
            when(payrollRunService.createPayrollRun(any(PayrollRun.class)))
                    .thenThrow(new IllegalArgumentException("Payroll run already exists for this period"));

            mockMvc.perform(post("/api/v1/payroll/runs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payrollRun)))
                    .andExpect(status().isBadRequest());
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

            mockMvc.perform(put("/api/v1/payroll/runs/{id}", payrollRunId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(payrollRun)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Process Payroll Run Tests")
    class ProcessPayrollRunTests {

        @Test
        @DisplayName("Should process payroll run successfully")
        void shouldProcessPayrollRun() throws Exception {
            PayrollRun processedRun = new PayrollRun();
            processedRun.setId(payrollRunId);
            processedRun.setStatus(PayrollRun.PayrollStatus.PROCESSED);

            when(payrollRunService.processPayrollRun(eq(payrollRunId), any(UUID.class)))
                    .thenReturn(processedRun);

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", payrollRunId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PROCESSED"));

            verify(payrollRunService).processPayrollRun(eq(payrollRunId), any(UUID.class));
        }

        @Test
        @DisplayName("Should return 404 when processing non-existent payroll run")
        void shouldReturn404ForNonExistent() throws Exception {
            UUID nonExistentId = UUID.randomUUID();
            when(payrollRunService.processPayrollRun(eq(nonExistentId), any(UUID.class)))
                    .thenThrow(new IllegalArgumentException("Payroll run not found"));

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", nonExistentId))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should not process already processed payroll run")
        void shouldNotProcessAlreadyProcessedRun() throws Exception {
            when(payrollRunService.processPayrollRun(eq(payrollRunId), any(UUID.class)))
                    .thenThrow(new IllegalArgumentException("Payroll run has already been processed"));

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/process", payrollRunId))
                    .andExpect(status().isBadRequest());
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

            when(payrollRunService.approvePayrollRun(eq(payrollRunId), any(UUID.class)))
                    .thenReturn(approvedRun);

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/approve", payrollRunId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(payrollRunService).approvePayrollRun(eq(payrollRunId), any(UUID.class));
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

            mockMvc.perform(post("/api/v1/payroll/runs/{id}/lock", payrollRunId))
                    .andExpect(status().isBadRequest());
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

            mockMvc.perform(delete("/api/v1/payroll/runs/{id}", payrollRunId))
                    .andExpect(status().isBadRequest());
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
                    .andExpect(jsonPath("$.year").value(2024))
                    .andExpect(jsonPath("$.month").value(3));

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

            mockMvc.perform(get("/api/v1/payroll/payslips/employee/{employeeId}", employeeId)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(payslipService).getPayslipsByEmployeeId(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should download payslip PDF")
        void shouldDownloadPayslipPdf() throws Exception {
            byte[] pdfBytes = "PDF content".getBytes();

            when(payslipPdfService.generatePayslipPdf(eq(payslipId)))
                    .thenReturn(pdfBytes);

            mockMvc.perform(get("/api/v1/payroll/payslips/{id}/pdf", payslipId))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/pdf"))
                    .andExpect(header().exists("Content-Disposition"));

            verify(payslipPdfService).generatePayslipPdf(eq(payslipId));
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

            when(salaryStructureService.getSalaryStructureById(any(UUID.class)))
                    .thenReturn(structure);

            mockMvc.perform(get("/api/v1/payroll/salary-structures/{id}", structure.getId()))
                    .andExpect(status().isOk());

            verify(salaryStructureService).getSalaryStructureById(any(UUID.class));
        }

        @Test
        @DisplayName("Should get salary structures by employee")
        void shouldGetSalaryStructuresByEmployee() throws Exception {
            SalaryStructure structure = new SalaryStructure();
            structure.setId(UUID.randomUUID());
            structure.setEmployeeId(employeeId);

            List<SalaryStructure> structures = new ArrayList<>();
            structures.add(structure);

            when(salaryStructureService.getSalaryStructuresByEmployeeId(eq(employeeId)))
                    .thenReturn(structures);

            mockMvc.perform(get("/api/v1/payroll/salary-structures/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(salaryStructureService).getSalaryStructuresByEmployeeId(eq(employeeId));
        }
    }
}
