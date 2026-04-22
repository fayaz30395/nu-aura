package com.hrms.api.statutory.controller;

import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.*;
import com.hrms.domain.statutory.MonthlyStatutoryContribution;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StatutoryContributionController.class)
@ContextConfiguration(classes = {StatutoryContributionController.class, StatutoryContributionControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("StatutoryContributionController Unit Tests")
class StatutoryContributionControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private StatutoryService statutoryService;
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

    private UUID employeeId;
    private UUID payslipId;
    private MonthlyStatutoryContribution contribution;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        payslipId = UUID.randomUUID();

        contribution = new MonthlyStatutoryContribution();
        contribution.setId(UUID.randomUUID());
        contribution.setEmployeeId(employeeId);
        contribution.setPayslipId(payslipId);
        contribution.setMonth(4);
        contribution.setYear(2026);
        contribution.setTenantId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Should return employee contributions")
    void shouldReturnEmployeeContributions() throws Exception {
        when(statutoryService.getEmployeeContributions(employeeId))
                .thenReturn(List.of(contribution));

        mockMvc.perform(get("/api/v1/statutory/contributions/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

        verify(statutoryService).getEmployeeContributions(employeeId);
    }

    @Test
    @DisplayName("Should return monthly contributions by month and year")
    void shouldReturnMonthlyContributions() throws Exception {
        when(statutoryService.getMonthlyContributions(4, 2026))
                .thenReturn(List.of(contribution));

        mockMvc.perform(get("/api/v1/statutory/contributions/month/{month}/year/{year}", 4, 2026))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].month").value(4))
                .andExpect(jsonPath("$[0].year").value(2026));

        verify(statutoryService).getMonthlyContributions(4, 2026);
    }

    @Test
    @DisplayName("Should return contribution by payslip ID when found")
    void shouldReturnContributionByPayslip() throws Exception {
        when(statutoryService.getContributionByPayslip(payslipId))
                .thenReturn(Optional.of(contribution));

        mockMvc.perform(get("/api/v1/statutory/contributions/payslip/{payslipId}", payslipId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payslipId").value(payslipId.toString()));

        verify(statutoryService).getContributionByPayslip(payslipId);
    }

    @Test
    @DisplayName("Should return 404 when payslip contribution not found")
    void shouldReturn404WhenPayslipContributionNotFound() throws Exception {
        UUID unknownPayslipId = UUID.randomUUID();
        when(statutoryService.getContributionByPayslip(unknownPayslipId))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/statutory/contributions/payslip/{payslipId}", unknownPayslipId))
                .andExpect(status().isNotFound());

        verify(statutoryService).getContributionByPayslip(unknownPayslipId);
    }

    @Test
    @DisplayName("Should return empty list for employee with no contributions")
    void shouldReturnEmptyForEmployeeWithNoContributions() throws Exception {
        UUID newEmployeeId = UUID.randomUUID();
        when(statutoryService.getEmployeeContributions(newEmployeeId))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/statutory/contributions/employee/{employeeId}", newEmployeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(statutoryService).getEmployeeContributions(newEmployeeId);
    }

    @Test
    @DisplayName("Should return empty list for month with no contributions")
    void shouldReturnEmptyForMonthWithNoContributions() throws Exception {
        when(statutoryService.getMonthlyContributions(1, 2020))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/statutory/contributions/month/{month}/year/{year}", 1, 2020))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(statutoryService).getMonthlyContributions(1, 2020);
    }

    @Test
    @DisplayName("Should return multiple contributions for an employee")
    void shouldReturnMultipleContributionsForEmployee() throws Exception {
        MonthlyStatutoryContribution contribution2 = new MonthlyStatutoryContribution();
        contribution2.setId(UUID.randomUUID());
        contribution2.setEmployeeId(employeeId);
        contribution2.setMonth(3);
        contribution2.setYear(2026);

        when(statutoryService.getEmployeeContributions(employeeId))
                .thenReturn(List.of(contribution, contribution2));

        mockMvc.perform(get("/api/v1/statutory/contributions/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        verify(statutoryService).getEmployeeContributions(employeeId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
