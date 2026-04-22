package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.payroll.service.*;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.payroll.PayrollComponent;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for PayrollController — covers UC-PAY-001 through UC-PAY-006.
 * Filters disabled; SYSTEM_ADMIN context bypasses all @RequiresPermission checks.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("Payroll Controller Integration Tests (UC-PAY-001 through UC-PAY-006)")
class PayrollControllerTest {

    private static final String BASE_URL = "/api/v1/payroll";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SalaryStructureService salaryStructureService;
    @MockitoBean
    private PayrollRunService payrollRunService;
    @MockitoBean
    private PayslipService payslipService;
    @MockitoBean
    private PayslipPdfService payslipPdfService;
    @MockitoBean
    private PayrollComponentService payrollComponentService;
    @MockitoBean
    private EmployeeService employeeService;
    @MockitoBean
    private EventPublisher eventPublisher;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ========================= UC-PAY-001: Create Salary Structure =========================

    @Test
    @DisplayName("UC-PAY-001: create salary structure returns 201 with created entity")
    void ucPay001_createSalaryStructure_returns201() throws Exception {
        SalaryStructure request = SalaryStructure.builder()
                .employeeId(EMPLOYEE_ID)
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .basicSalary(new BigDecimal("50000.00"))
                .hra(new BigDecimal("20000.00"))
                .build();

        SalaryStructure saved = SalaryStructure.builder()
                .employeeId(EMPLOYEE_ID)
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .basicSalary(new BigDecimal("50000.00"))
                .hra(new BigDecimal("20000.00"))
                .isActive(true)
                .build();
        saved.setId(UUID.randomUUID());
        saved.setTenantId(TENANT_ID);

        when(salaryStructureService.createSalaryStructure(any(SalaryStructure.class))).thenReturn(saved);

        mockMvc.perform(post(BASE_URL + "/salary-structures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()));
    }

    @Test
    @DisplayName("UC-PAY-001: duplicate salary structure name returns 409")
    void ucPay001_duplicateSalaryStructure_returns409() throws Exception {
        SalaryStructure request = SalaryStructure.builder()
                .employeeId(EMPLOYEE_ID)
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .basicSalary(new BigDecimal("50000.00"))
                .build();

        when(salaryStructureService.createSalaryStructure(any(SalaryStructure.class)))
                .thenThrow(new com.hrms.common.exception.DuplicateResourceException(
                        "Salary structure already exists for this employee and effective date"));

        mockMvc.perform(post(BASE_URL + "/salary-structures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("UC-PAY-001: missing required field basicSalary returns 400")
    void ucPay001_missingSalaryField_returns400() throws Exception {
        // No basicSalary — violates @Column(nullable=false)
        SalaryStructure request = SalaryStructure.builder()
                .employeeId(EMPLOYEE_ID)
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .build();

        when(salaryStructureService.createSalaryStructure(any(SalaryStructure.class)))
                .thenThrow(new com.hrms.common.exception.ValidationException("Basic salary is required"));

        mockMvc.perform(post(BASE_URL + "/salary-structures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ========================= UC-PAY-002: Initiate Payroll Run =========================

    @Test
    @DisplayName("UC-PAY-002: create payroll run (DRAFT) returns 201")
    void ucPay002_createPayrollRun_returns201() throws Exception {
        PayrollRun request = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .build();

        PayrollRun saved = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.DRAFT)
                .build();
        saved.setId(UUID.randomUUID());
        saved.setTenantId(TENANT_ID);

        when(payrollRunService.createPayrollRun(any(PayrollRun.class))).thenReturn(saved);

        mockMvc.perform(post(BASE_URL + "/runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @DisplayName("UC-PAY-002: initiate processing of payroll run returns 202 Accepted")
    void ucPay002_initiateProcessing_returns202() throws Exception {
        UUID runId = UUID.randomUUID();

        PayrollRun run = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.PROCESSING)
                .build();
        run.setId(runId);
        run.setTenantId(TENANT_ID);

        when(payrollRunService.initiateProcessing(eq(runId), any(UUID.class))).thenReturn(run);
        when(eventPublisher.publishPayrollProcessingEvent(any(), any(), any(), any(), any()))
                .thenReturn(CompletableFuture.completedFuture(null));

        mockMvc.perform(post(BASE_URL + "/runs/{id}/process", runId))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PROCESSING"));
    }

    @Test
    @DisplayName("UC-PAY-002: process run when already in progress returns 409")
    void ucPay002_processAlreadyInProgress_returns409() throws Exception {
        UUID runId = UUID.randomUUID();

        when(payrollRunService.initiateProcessing(eq(runId), any(UUID.class)))
                .thenThrow(new IllegalStateException("Payroll run cannot be submitted for processing in status: PROCESSING"));

        mockMvc.perform(post(BASE_URL + "/runs/{id}/process", runId))
                .andExpect(status().isConflict());
    }

    // ========================= UC-PAY-003: SpEL Formula Evaluation =========================

    @Test
    @DisplayName("UC-PAY-003: evaluate payroll components formula returns 200 with computed values")
    void ucPay003_evaluateComponents_returns200WithComputedSalary() throws Exception {
        Map<String, BigDecimal> inputValues = new HashMap<>();
        inputValues.put("BASIC", new BigDecimal("50000"));
        inputValues.put("HRA", new BigDecimal("20000"));

        Map<String, BigDecimal> evaluated = new HashMap<>();
        evaluated.put("BASIC", new BigDecimal("50000"));
        evaluated.put("HRA", new BigDecimal("20000"));
        evaluated.put("GROSS", new BigDecimal("70000"));  // BASIC + HRA

        when(payrollComponentService.evaluateComponents(any())).thenReturn(evaluated);

        mockMvc.perform(post(BASE_URL + "/components/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inputValues)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.GROSS").value(70000));
    }

    @Test
    @DisplayName("UC-PAY-003: formula evaluation with missing base component returns 200 with partial result")
    void ucPay003_evaluateComponentsPartial_returns200() throws Exception {
        Map<String, BigDecimal> inputValues = new HashMap<>();
        inputValues.put("BASIC", new BigDecimal("60000"));

        Map<String, BigDecimal> evaluated = new HashMap<>();
        evaluated.put("BASIC", new BigDecimal("60000"));

        when(payrollComponentService.evaluateComponents(any())).thenReturn(evaluated);

        mockMvc.perform(post(BASE_URL + "/components/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inputValues)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.BASIC").value(60000));
    }

    // ========================= UC-PAY-004: Payslip PDF Generation =========================

    @Test
    @DisplayName("UC-PAY-004: generate payslip PDF returns 200 with content-type application/pdf")
    void ucPay004_generatePayslipPdf_returns200WithPdfContentType() throws Exception {
        UUID payslipId = UUID.randomUUID();

        Payslip payslip = Payslip.builder()
                .employeeId(EMPLOYEE_ID)
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .grossSalary(new BigDecimal("70000"))
                .netSalary(new BigDecimal("62000"))
                .build();
        payslip.setId(payslipId);
        payslip.setTenantId(TENANT_ID);

        byte[] fakePdf = "%PDF-1.4 fake pdf content".getBytes();

        when(payslipService.getPayslipById(eq(payslipId))).thenReturn(payslip);
        when(payslipPdfService.generatePayslipPdf(eq(payslipId))).thenReturn(fakePdf);

        mockMvc.perform(get(BASE_URL + "/payslips/{id}/pdf", payslipId))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=payslip_" + payslipId + ".pdf"));
    }

    @Test
    @DisplayName("UC-PAY-004: payslip PDF for non-existent payslip returns 404")
    void ucPay004_generatePayslipPdf_notFound_returns404() throws Exception {
        UUID missingId = UUID.randomUUID();

        when(payslipService.getPayslipById(eq(missingId)))
                .thenThrow(new com.hrms.common.exception.ResourceNotFoundException("Payslip", "id", missingId.toString()));

        mockMvc.perform(get(BASE_URL + "/payslips/{id}/pdf", missingId))
                .andExpect(status().isNotFound());
    }

    // ========================= UC-PAY-005: Lock Payroll Run =========================

    @Test
    @DisplayName("UC-PAY-005: lock payroll run returns 200 with LOCKED status")
    void ucPay005_lockPayrollRun_returns200() throws Exception {
        UUID runId = UUID.randomUUID();

        PayrollRun locked = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.LOCKED)
                .build();
        locked.setId(runId);
        locked.setTenantId(TENANT_ID);

        when(payrollRunService.lockPayrollRun(eq(runId))).thenReturn(locked);

        mockMvc.perform(post(BASE_URL + "/runs/{id}/lock", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));
    }

    @Test
    @DisplayName("UC-PAY-005: lock already-locked payroll run returns 409")
    void ucPay005_lockAlreadyLockedRun_returns409() throws Exception {
        UUID runId = UUID.randomUUID();

        when(payrollRunService.lockPayrollRun(eq(runId)))
                .thenThrow(new IllegalStateException("Payroll run is already locked"));

        mockMvc.perform(post(BASE_URL + "/runs/{id}/lock", runId))
                .andExpect(status().isConflict());
    }

    // ========================= UC-PAY-006: Payroll Adjustment =========================

    @Test
    @DisplayName("UC-PAY-006: create payroll component (adjustment) returns 201")
    void ucPay006_addPayrollComponent_returns201() throws Exception {
        PayrollComponent component = PayrollComponent.builder()
                .code("BONUS")
                .name("Performance Bonus")
                .componentType(PayrollComponent.ComponentType.EARNING)
                .isActive(true)
                .evaluationOrder(10)
                .build();

        PayrollComponent saved = PayrollComponent.builder()
                .code("BONUS")
                .name("Performance Bonus")
                .componentType(PayrollComponent.ComponentType.EARNING)
                .isActive(true)
                .evaluationOrder(10)
                .build();
        saved.setId(UUID.randomUUID());
        saved.setTenantId(TENANT_ID);

        when(payrollComponentService.createComponent(any(PayrollComponent.class))).thenReturn(saved);

        mockMvc.perform(post(BASE_URL + "/components")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(component)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.code").value("BONUS"));
    }

    @Test
    @DisplayName("UC-PAY-006: get all payroll runs (paginated) returns 200")
    void ucPay006_getAllPayrollRuns_returns200() throws Exception {
        PayrollRun run = PayrollRun.builder()
                .payPeriodMonth(4)
                .payPeriodYear(2026)
                .payrollDate(LocalDate.of(2026, 4, 30))
                .status(PayrollRun.PayrollStatus.DRAFT)
                .build();
        run.setId(UUID.randomUUID());
        run.setTenantId(TENANT_ID);

        when(payrollRunService.getAllPayrollRuns(any()))
                .thenReturn(new PageImpl<>(List.of(run), PageRequest.of(0, 20), 1));

        mockMvc.perform(get(BASE_URL + "/runs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].status").value("DRAFT"));
    }

    @Test
    @DisplayName("UC-PAY-006: get active salary structures list returns 200")
    void ucPay006_getActiveSalaryStructures_returns200() throws Exception {
        SalaryStructure ss = SalaryStructure.builder()
                .employeeId(EMPLOYEE_ID)
                .effectiveDate(LocalDate.of(2026, 1, 1))
                .basicSalary(new BigDecimal("50000"))
                .isActive(true)
                .build();
        ss.setId(UUID.randomUUID());
        ss.setTenantId(TENANT_ID);

        when(salaryStructureService.getActiveSalaryStructures(any()))
                .thenReturn(new PageImpl<>(List.of(ss), PageRequest.of(0, 20), 1));

        mockMvc.perform(get(BASE_URL + "/salary-structures/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].isActive").value(true));
    }

    // ========================= RBAC boundary tests =========================

    @Test
    @DisplayName("UC-PAY-006: employee with PAYROLL:VIEW_SELF can access own payslips")
    void ucPay006_selfScopeEmployee_canAccessOwnPayslips() throws Exception {
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.PAYROLL_VIEW_SELF, RoleScope.SELF);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("EMPLOYEE"), restrictedPerms);

        Payslip payslip = Payslip.builder()
                .employeeId(EMPLOYEE_ID)
                .payPeriodMonth(3)
                .payPeriodYear(2026)
                .grossSalary(new BigDecimal("70000"))
                .netSalary(new BigDecimal("62000"))
                .build();
        payslip.setId(UUID.randomUUID());
        payslip.setTenantId(TENANT_ID);

        when(payslipService.getPayslipsByEmployeeId(eq(EMPLOYEE_ID), any()))
                .thenReturn(new PageImpl<>(List.of(payslip)));

        mockMvc.perform(get(BASE_URL + "/payslips/employee/{employeeId}", EMPLOYEE_ID))
                .andExpect(status().isOk());
    }
}
