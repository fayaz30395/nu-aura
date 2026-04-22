package com.hrms.api.payroll.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.payroll.dto.*;
import com.hrms.application.payroll.service.GlobalPayrollService;
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
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GlobalPayrollController.class)
@ContextConfiguration(classes = {GlobalPayrollController.class, GlobalPayrollControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("GlobalPayrollController Unit Tests")
class GlobalPayrollControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private GlobalPayrollService payrollService;
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

    private UUID runId;
    private CurrencyDto currencyDto;
    private PayrollLocationDto locationDto;
    private GlobalPayrollRunDto payrollRunDto;

    @BeforeEach
    void setUp() {
        runId = UUID.randomUUID();

        currencyDto = CurrencyDto.builder()
                .id(UUID.randomUUID())
                .currencyCode("USD")
                .currencyName("US Dollar")
                .symbol("$")
                .decimalPlaces(2)
                .isBaseCurrency(true)
                .isActive(true)
                .countryCode("US")
                .exchangeRateToBase(BigDecimal.ONE)
                .build();

        locationDto = PayrollLocationDto.builder()
                .id(UUID.randomUUID())
                .locationCode("US-NY")
                .locationName("New York Office")
                .countryCode("US")
                .localCurrency("USD")
                .payFrequency("MONTHLY")
                .payDay(25)
                .isActive(true)
                .build();

        payrollRunDto = GlobalPayrollRunDto.builder()
                .id(runId)
                .runCode("GPR-2026-04")
                .description("April 2026 Global Payroll")
                .payPeriodStart(LocalDate.of(2026, 4, 1))
                .payPeriodEnd(LocalDate.of(2026, 4, 30))
                .status("DRAFT")
                .baseCurrency("USD")
                .employeeCount(50)
                .build();
    }

    @Test
    @DisplayName("Should return global payroll dashboard")
    void shouldReturnDashboard() throws Exception {
        GlobalPayrollDashboard dashboard = GlobalPayrollDashboard.builder()
                .totalLocations(5)
                .totalCurrencies(3)
                .totalEmployeesInPayroll(200)
                .baseCurrency("USD")
                .build();

        when(payrollService.getDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/global-payroll/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLocations").value(5))
                .andExpect(jsonPath("$.totalCurrencies").value(3))
                .andExpect(jsonPath("$.baseCurrency").value("USD"));

        verify(payrollService).getDashboard();
    }

    @Test
    @DisplayName("Should create currency successfully")
    void shouldCreateCurrency() throws Exception {
        when(payrollService.createCurrency(any(CurrencyDto.class))).thenReturn(currencyDto);

        mockMvc.perform(post("/api/v1/global-payroll/currencies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(currencyDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currencyCode").value("USD"))
                .andExpect(jsonPath("$.isBaseCurrency").value(true));

        verify(payrollService).createCurrency(any(CurrencyDto.class));
    }

    @Test
    @DisplayName("Should return active currencies")
    void shouldReturnActiveCurrencies() throws Exception {
        when(payrollService.getActiveCurrencies()).thenReturn(List.of(currencyDto));

        mockMvc.perform(get("/api/v1/global-payroll/currencies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].currencyCode").value("USD"));

        verify(payrollService).getActiveCurrencies();
    }

    @Test
    @DisplayName("Should return base currency")
    void shouldReturnBaseCurrency() throws Exception {
        when(payrollService.getBaseCurrency()).thenReturn(currencyDto);

        mockMvc.perform(get("/api/v1/global-payroll/currencies/base"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isBaseCurrency").value(true));

        verify(payrollService).getBaseCurrency();
    }

    @Test
    @DisplayName("Should convert amount between currencies")
    void shouldConvertAmount() throws Exception {
        BigDecimal converted = new BigDecimal("83000.00");
        when(payrollService.convertAmount(any(BigDecimal.class), eq("USD"), eq("INR"), any(LocalDate.class)))
                .thenReturn(converted);

        mockMvc.perform(get("/api/v1/global-payroll/exchange-rates/convert")
                        .param("amount", "1000")
                        .param("fromCurrency", "USD")
                        .param("toCurrency", "INR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(83000.00));

        verify(payrollService).convertAmount(any(BigDecimal.class), eq("USD"), eq("INR"), any(LocalDate.class));
    }

    @Test
    @DisplayName("Should create payroll run with request params")
    void shouldCreatePayrollRun() throws Exception {
        when(payrollService.createPayrollRun(any(LocalDate.class), any(LocalDate.class), any(), any()))
                .thenReturn(payrollRunDto);

        mockMvc.perform(post("/api/v1/global-payroll/runs")
                        .param("periodStart", "2026-04-01")
                        .param("periodEnd", "2026-04-30"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.runCode").value("GPR-2026-04"))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(payrollService).createPayrollRun(any(LocalDate.class), any(LocalDate.class), any(), any());
    }

    @Test
    @DisplayName("Should process payroll run by ID")
    void shouldProcessPayrollRun() throws Exception {
        GlobalPayrollRunDto processed = GlobalPayrollRunDto.builder()
                .id(runId)
                .status("PROCESSED")
                .build();

        when(payrollService.processPayrollRun(runId)).thenReturn(processed);

        mockMvc.perform(post("/api/v1/global-payroll/runs/{runId}/process", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));

        verify(payrollService).processPayrollRun(runId);
    }

    @Test
    @DisplayName("Should return paginated payroll locations")
    void shouldReturnPaginatedLocations() throws Exception {
        Page<PayrollLocationDto> page = new PageImpl<>(
                List.of(locationDto), PageRequest.of(0, 20), 1);

        when(payrollService.getAllLocations(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/global-payroll/locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].locationCode").value("US-NY"));

        verify(payrollService).getAllLocations(any(Pageable.class));
    }

    @Test
    @DisplayName("Should add employee to payroll run")
    void shouldAddEmployeeToPayrollRun() throws Exception {
        EmployeePayrollRecordDto recordDto = EmployeePayrollRecordDto.builder()
                .id(UUID.randomUUID())
                .payrollRunId(runId)
                .employeeId(UUID.randomUUID())
                .employeeName("John Doe")
                .localCurrency("USD")
                .grossPayLocal(new BigDecimal("5000.00"))
                .build();

        when(payrollService.addEmployeeToPayroll(eq(runId), any(EmployeePayrollRecordDto.class)))
                .thenReturn(recordDto);

        mockMvc.perform(post("/api/v1/global-payroll/runs/{runId}/employees", runId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recordDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeName").value("John Doe"));

        verify(payrollService).addEmployeeToPayroll(eq(runId), any(EmployeePayrollRecordDto.class));
    }

    @Test
    @DisplayName("Should return employee records for a payroll run")
    void shouldReturnEmployeeRecords() throws Exception {
        EmployeePayrollRecordDto recordDto = EmployeePayrollRecordDto.builder()
                .id(UUID.randomUUID())
                .employeeName("Jane Doe")
                .localCurrency("INR")
                .build();

        when(payrollService.getEmployeeRecords(runId)).thenReturn(List.of(recordDto));

        mockMvc.perform(get("/api/v1/global-payroll/runs/{runId}/employees", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeName").value("Jane Doe"));

        verify(payrollService).getEmployeeRecords(runId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
