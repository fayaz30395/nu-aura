package com.hrms.api.payroll.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.payroll.dto.StatutoryDeductions;
import com.hrms.application.payroll.service.PayslipService;
import com.hrms.application.payroll.service.StatutoryDeductionService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for PayrollStatutoryController.
 * Tests statutory deduction preview and apply endpoints.
 */
@WebMvcTest(PayrollStatutoryController.class)
@ContextConfiguration(classes = {PayrollStatutoryController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PayrollStatutoryController Unit Tests")
class PayrollStatutoryControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private StatutoryDeductionService statutoryDeductionService;

    @MockitoBean
    private PayslipService payslipService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private static final String BASE_URL = "/api/v1/payroll/statutory";

    private UUID employeeId;
    private UUID payslipId;
    private StatutoryDeductions deductions;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        payslipId = UUID.randomUUID();

        deductions = StatutoryDeductions.builder()
                .employeeId(employeeId)
                .employeePf(new BigDecimal("2400.00"))
                .employerPf(new BigDecimal("1800.00"))
                .employeeEsi(BigDecimal.ZERO)
                .employerEsi(BigDecimal.ZERO)
                .professionalTax(new BigDecimal("200.00"))
                .tdsMonthly(new BigDecimal("1500.00"))
                .employeeLwf(new BigDecimal("10.00"))
                .employerLwf(new BigDecimal("20.00"))
                .totalEmployeeDeductions(new BigDecimal("4110.00"))
                .totalEmployerContributions(new BigDecimal("1820.00"))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/payroll/statutory/preview
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /preview — Statutory Deduction Preview")
    class PreviewEndpoint {

        @Test
        @DisplayName("Should return 200 with deductions DTO on valid params")
        void shouldReturn200WithDeductionsOnValidParams() throws Exception {
            when(statutoryDeductionService.calculate(
                    eq(employeeId),
                    eq(new BigDecimal("20000")),
                    eq(new BigDecimal("25000")),
                    eq("KA")))
                    .thenReturn(deductions);

            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("basicSalary", "20000")
                            .param("grossSalary", "25000")
                            .param("state", "KA")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                    .andExpect(jsonPath("$.employeePf").value(2400.00))
                    .andExpect(jsonPath("$.employerPf").value(1800.00))
                    .andExpect(jsonPath("$.professionalTax").value(200.00))
                    .andExpect(jsonPath("$.tdsMonthly").value(1500.00))
                    .andExpect(jsonPath("$.totalEmployeeDeductions").value(4110.00))
                    .andExpect(jsonPath("$.totalEmployerContributions").value(1820.00));

            verify(statutoryDeductionService).calculate(eq(employeeId),
                    eq(new BigDecimal("20000")), eq(new BigDecimal("25000")), eq("KA"));
        }

        @Test
        @DisplayName("Should use empty string as default state when state param omitted")
        void shouldUseDefaultEmptyStateWhenOmitted() throws Exception {
            when(statutoryDeductionService.calculate(any(), any(), any(), eq("")))
                    .thenReturn(deductions);

            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("basicSalary", "15000")
                            .param("grossSalary", "18000")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(statutoryDeductionService).calculate(any(), any(), any(), eq(""));
        }

        @Test
        @DisplayName("Should return 400 when employeeId param is missing")
        void shouldReturn400WhenEmployeeIdMissing() throws Exception {
            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("basicSalary", "20000")
                            .param("grossSalary", "25000"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when basicSalary param is missing")
        void shouldReturn400WhenBasicSalaryMissing() throws Exception {
            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("grossSalary", "25000"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when grossSalary param is missing")
        void shouldReturn400WhenGrossSalaryMissing() throws Exception {
            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("basicSalary", "20000"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Preview endpoint has @RequiresPermission(PAYROLL_VIEW)")
        void previewEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = PayrollStatutoryController.class.getMethod(
                    "preview", UUID.class, BigDecimal.class, BigDecimal.class, String.class);

            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.PAYROLL_VIEW);
        }

        @Test
        @DisplayName("Should delegate to StatutoryDeductionService exactly once")
        void shouldDelegateToStatutoryDeductionServiceOnce() throws Exception {
            when(statutoryDeductionService.calculate(any(), any(), any(), any()))
                    .thenReturn(deductions);

            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("basicSalary", "20000")
                            .param("grossSalary", "25000"))
                    .andExpect(status().isOk());

            verify(statutoryDeductionService, times(1)).calculate(any(), any(), any(), any());
            verifyNoInteractions(payslipService);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/payroll/statutory/{payslipId}/apply
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{payslipId}/apply — Apply Statutory Deductions")
    class ApplyEndpoint {

        @Test
        @DisplayName("Should return 200 with applied deductions for valid payslipId")
        void shouldReturn200WithAppliedDeductions() throws Exception {
            when(payslipService.applyStatutoryDeductions(eq(payslipId), eq("MH")))
                    .thenReturn(deductions);

            mockMvc.perform(post(BASE_URL + "/{payslipId}/apply", payslipId)
                            .param("state", "MH")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalEmployeeDeductions").value(4110.00));

            verify(payslipService).applyStatutoryDeductions(eq(payslipId), eq("MH"));
        }

        @Test
        @DisplayName("Should use default empty state when state param omitted on apply")
        void shouldUseDefaultEmptyStateOnApply() throws Exception {
            when(payslipService.applyStatutoryDeductions(eq(payslipId), eq("")))
                    .thenReturn(deductions);

            mockMvc.perform(post(BASE_URL + "/{payslipId}/apply", payslipId)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(payslipService).applyStatutoryDeductions(eq(payslipId), eq(""));
        }

        @Test
        @DisplayName("Should return 400 for malformed UUID in path")
        void shouldReturn400ForMalformedUuid() throws Exception {
            mockMvc.perform(post(BASE_URL + "/not-a-uuid/apply"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Apply endpoint has @RequiresPermission(PAYROLL_PROCESS)")
        void applyEndpointHasRequiresPermissionAnnotation() throws Exception {
            Method method = PayrollStatutoryController.class.getMethod(
                    "apply", UUID.class, String.class);

            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.PAYROLL_PROCESS);
        }

        @Test
        @DisplayName("Should delegate to PayslipService and not call StatutoryDeductionService directly")
        void shouldDelegateToPayslipServiceOnly() throws Exception {
            when(payslipService.applyStatutoryDeductions(any(), any()))
                    .thenReturn(deductions);

            mockMvc.perform(post(BASE_URL + "/{payslipId}/apply", payslipId))
                    .andExpect(status().isOk());

            verify(payslipService, times(1)).applyStatutoryDeductions(any(), any());
            verifyNoInteractions(statutoryDeductionService);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Permission annotation checks on the class level
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Controller-level annotation validation")
    class AnnotationValidation {

        @Test
        @DisplayName("Controller has @RestController annotation")
        void controllerHasRestControllerAnnotation() {
            assertThat(PayrollStatutoryController.class
                    .isAnnotationPresent(org.springframework.web.bind.annotation.RestController.class))
                    .isTrue();
        }

        @Test
        @DisplayName("Controller maps to /api/v1/payroll/statutory base path")
        void controllerMapsToCorrectBasePath() {
            org.springframework.web.bind.annotation.RequestMapping mapping =
                    PayrollStatutoryController.class.getAnnotation(
                            org.springframework.web.bind.annotation.RequestMapping.class);

            assertThat(mapping).isNotNull();
            assertThat(mapping.value()).contains("/api/v1/payroll/statutory");
        }
    }
}
