package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.loan.dto.ApproveLoanRequest;
import com.hrms.api.loan.dto.CreateLoanRequest;
import com.hrms.api.loan.dto.RejectLoanRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.loan.EmployeeLoan.LoanType;
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
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for LoanController.
 * Covers UC-LOAN-001 through UC-LOAN-006.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Loan Controller Integration Tests")
class LoanControllerTest {

    private static final String BASE_URL = "/api/v1/loans";
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

    // ========================= UC-LOAN-001: Apply for loan =========================

    @Test
    @DisplayName("ucLoanA1_applyForLoan_returns200")
    void ucLoanA1_applyForLoan_returns200() throws Exception {
        CreateLoanRequest request = CreateLoanRequest.builder()
                .loanType(LoanType.PERSONAL_LOAN)
                .principalAmount(new BigDecimal("50000.00"))
                .interestRate(new BigDecimal("6.0"))
                .tenureMonths(24)
                .purpose("Medical emergency")
                .isSalaryDeduction(true)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.principalAmount").value(50000.00))
                .andExpect(jsonPath("$.loanType").value("PERSONAL"));
    }

    @Test
    @DisplayName("ucLoanA2_applyForLoanMissingType_returns400")
    void ucLoanA2_applyForLoanMissingType_returns400() throws Exception {
        CreateLoanRequest request = CreateLoanRequest.builder()
                // missing loanType
                .principalAmount(new BigDecimal("10000.00"))
                .tenureMonths(12)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucLoanA3_applyForLoanNegativeAmount_returns400")
    void ucLoanA3_applyForLoanNegativeAmount_returns400() throws Exception {
        CreateLoanRequest request = CreateLoanRequest.builder()
                .loanType(LoanType.EDUCATION_LOAN)
                .principalAmount(new BigDecimal("-500.00"))  // invalid negative
                .tenureMonths(12)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucLoanA4_getLoanById_returns200")
    void ucLoanA4_getLoanById_returns200() throws Exception {
        // Create a loan first
        CreateLoanRequest request = CreateLoanRequest.builder()
                .loanType(LoanType.SALARY_ADVANCE)
                .principalAmount(new BigDecimal("5000.00"))
                .tenureMonths(6)
                .purpose("Festival advance")
                .build();

        String responseBody = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String loanId = objectMapper.readTree(responseBody).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/{id}", loanId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(loanId));
    }

    @Test
    @DisplayName("ucLoanA5_getMyLoans_returns200WithPage")
    void ucLoanA5_getMyLoans_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL + "/my")
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucLoanA6_getPendingApprovals_returns200WithPage")
    void ucLoanA6_getPendingApprovals_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL + "/pending")
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
