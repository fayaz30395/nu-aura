package com.nulogic.api.payroll.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.application.payroll.dto.StatutoryDeductions;
import com.nulogic.application.payroll.service.PayslipService;
import com.nulogic.application.payroll.service.StatutoryDeductionService;
import com.nulogic.application.payroll.strategy.StatutoryCalculator;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.application.payroll.strategy.StatutoryResult;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.common.util.TenantTimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    private static final String BASE_URL = "/api/v1/payroll/statutory";
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private StatutoryDeductionService statutoryDeductionService;
    @MockitoBean
    private StatutoryCalculatorFactory statutoryCalculatorFactory;
    @MockitoBean
    private PayslipService payslipService;
    @MockitoBean
    private TenantTimeService tenantTimeService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;
    private StatutoryCalculator statutoryCalculator;
    private UUID employeeId;
    private UUID payslipId;
    private StatutoryDeductions deductions;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        payslipId = UUID.randomUUID();
        TenantContext.setCurrentTenant(UUID.randomUUID());
        statutoryCalculator = mock(StatutoryCalculator.class);

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

        lenient().when(tenantTimeService.today(any(UUID.class))).thenReturn(LocalDate.of(2026, 1, 31));
        lenient().when(statutoryCalculatorFactory.forTenant(any(UUID.class))).thenReturn(statutoryCalculator);
        lenient().when(statutoryCalculator.calculate(any())).thenReturn(StatutoryResult.builder()
                .employeeId(employeeId)
                .countryCode("IN")
                .currencyCode("INR")
                .deductions(Map.of(
                        "PF_EMPLOYEE", new BigDecimal("2400.00"),
                        "ESI_EMPLOYEE", BigDecimal.ZERO,
                        "PT", new BigDecimal("200.00"),
                        "TDS", new BigDecimal("1500.00"),
                        "LWF_EMPLOYEE", new BigDecimal("10.00")))
                .contributions(Map.of(
                        "PF_EMPLOYER", new BigDecimal("1800.00"),
                        "ESI_EMPLOYER", BigDecimal.ZERO,
                        "LWF_EMPLOYER", new BigDecimal("20.00")))
                .totalEmployeeDeductions(new BigDecimal("4110.00"))
                .totalEmployerContributions(new BigDecimal("1820.00"))
                .build());
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        TenantContext.clear();
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

            verify(statutoryCalculatorFactory).forTenant(any(UUID.class));
            verify(statutoryCalculator).calculate(argThat(input ->
                    employeeId.equals(input.employeeId())
                            && new BigDecimal("20000").compareTo(input.basicSalary()) == 0
                            && new BigDecimal("25000").compareTo(input.grossSalary()) == 0
                            && "KA".equals(input.state())));
        }

        @Test
        @DisplayName("Should use empty string as default state when state param omitted")
        void shouldUseDefaultEmptyStateWhenOmitted() throws Exception {
            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("basicSalary", "15000")
                            .param("grossSalary", "18000")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(statutoryCalculator).calculate(argThat(input -> "".equals(input.state())));
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
        @DisplayName("Should delegate to statutory calculator exactly once")
        void shouldDelegateToStatutoryCalculatorOnce() throws Exception {
            mockMvc.perform(get(BASE_URL + "/preview")
                            .param("employeeId", employeeId.toString())
                            .param("basicSalary", "20000")
                            .param("grossSalary", "25000"))
                    .andExpect(status().isOk());

            verify(statutoryCalculatorFactory, times(1)).forTenant(any(UUID.class));
            verify(statutoryCalculator, times(1)).calculate(any());
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
