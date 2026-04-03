package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.statutory.dto.LWFCalculationRequest;
import com.hrms.api.statutory.dto.LWFConfigurationDto;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.statutory.LWFConfiguration.LWFFrequency;
import com.hrms.domain.statutory.EmployeeTDSDeclaration;
import com.hrms.domain.statutory.ProvidentFundConfig;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for statutory modules.
 * Covers UC-STAT-001 (PF calculation), UC-STAT-002 (TDS declaration), UC-STAT-003 (LWF deduction).
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Statutory Integration Tests")
class StatutoryIntegrationTest {

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
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-STAT-001: PF Calculation =========================

    @Test
    @DisplayName("ucStat1_createPFConfig_returns200")
    void ucStat1_createPFConfig_returns200() throws Exception {
        ProvidentFundConfig config = new ProvidentFundConfig();
        config.setEmployeeContributionPercentage(new BigDecimal("12.00"));
        config.setEmployerContributionPercentage(new BigDecimal("12.00"));
        config.setIsActive(true);
        config.setEffectiveFrom(LocalDate.now().minusMonths(1));

        mockMvc.perform(post("/api/v1/statutory/pf/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeContributionPercentage").value(12.00));
    }

    @Test
    @DisplayName("ucStat1_getActivePFConfigs_returns200")
    void ucStat1_getActivePFConfigs_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/statutory/pf/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucStat1_getEmployeePFRecord_returnsOkOrNotFound")
    void ucStat1_getEmployeePFRecord_returnsOkOrNotFound() throws Exception {
        // Employee may or may not have a PF record seeded; both 200 and 404 are acceptable here
        mockMvc.perform(get("/api/v1/statutory/pf/employee/{employeeId}", EMPLOYEE_ID))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 200 && status != 404) {
                        throw new AssertionError("Expected 200 or 404 but got: " + status);
                    }
                });
    }

    // ========================= UC-STAT-002: TDS Declaration =========================

    @Test
    @DisplayName("ucStat2_submitTDSDeclaration_returns200")
    void ucStat2_submitTDSDeclaration_returns200() throws Exception {
        EmployeeTDSDeclaration declaration = new EmployeeTDSDeclaration();
        declaration.setEmployeeId(EMPLOYEE_ID);
        declaration.setFinancialYear("2024-25");
        declaration.setTaxRegime(com.hrms.domain.statutory.TDSSlab.TaxRegime.NEW_REGIME);
        declaration.setSection80C(new BigDecimal("150000.00"));
        declaration.setSection80D(new BigDecimal("25000.00"));

        mockMvc.perform(post("/api/v1/statutory/tds/declaration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(declaration)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()))
                .andExpect(jsonPath("$.financialYear").value("2024-25"));
    }

    @Test
    @DisplayName("ucStat2_getTDSDeclaration_returnsOkOrNotFound")
    void ucStat2_getTDSDeclaration_returnsOkOrNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/statutory/tds/declaration/{employeeId}/{financialYear}",
                        EMPLOYEE_ID, "2024-25"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 200 && status != 404) {
                        throw new AssertionError("Expected 200 or 404 but got: " + status);
                    }
                });
    }

    // ========================= UC-STAT-003: LWF Deduction =========================

    @Test
    @DisplayName("ucStat3_createLWFConfiguration_returns200WithStateBasedAmounts")
    void ucStat3_createLWFConfiguration_returns200WithStateBasedAmounts() throws Exception {
        LWFConfigurationDto dto = LWFConfigurationDto.builder()
                .stateCode("KA")
                .stateName("Karnataka")
                .employeeContribution(new BigDecimal("20.00"))
                .employerContribution(new BigDecimal("40.00"))
                .frequency(LWFFrequency.MONTHLY)
                .applicableMonths("[1,2,3,4,5,6,7,8,9,10,11,12]")
                .effectiveFrom(LocalDate.now().minusMonths(3))
                .isActive(true)
                .build();

        mockMvc.perform(post("/api/v1/payroll/lwf/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stateCode").value("KA"))
                .andExpect(jsonPath("$.employeeContribution").value(20.00))
                .andExpect(jsonPath("$.employerContribution").value(40.00));
    }

    @Test
    @DisplayName("ucStat3_getLWFDeductions_returns200")
    void ucStat3_getLWFDeductions_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/lwf/deductions")
                        .param("month", "3")
                        .param("year", "2026")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucStat3_calculateLWF_returns200")
    void ucStat3_calculateLWF_returns200() throws Exception {
        LWFCalculationRequest request = LWFCalculationRequest.builder()
                .month(3)
                .year(2026)
                .build();

        mockMvc.perform(post("/api/v1/payroll/lwf/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucStat3_getLWFRemittanceReport_returns200")
    void ucStat3_getLWFRemittanceReport_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/lwf/report")
                        .param("month", "3")
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value(3))
                .andExpect(jsonPath("$.year").value(2026));
    }
}
