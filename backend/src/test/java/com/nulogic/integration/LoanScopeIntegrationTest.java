package com.nulogic.integration;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.loan.EmployeeLoan;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.loan.repository.EmployeeLoanRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for IDOR guards on the Loan endpoints.
 *
 * <p>Sprint-1 hardening: Loan access is now enforced in
 * {@code LoanService#enforceLoanAccess(EmployeeLoan, String)} — a caller without
 * the elevated permission (typically {@link Permission#LOAN_VIEW_ALL} for reads
 * or {@link Permission#LOAN_MANAGE} for mutations) may only see/mutate their
 * own loan. Cross-employee access must return 403.</p>
 *
 * <p>Patterned after {@link ExpenseClaimScopeIntegrationTest}.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Loan Scope (IDOR) E2E Integration Tests")
class LoanScopeIntegrationTest {

    private static final String BASE_URL = "/api/v1/loans";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    // Two employees in the same tenant — A is the caller, B is the target whose
    // loan A should not be able to view or mutate.
    private static final UUID EMPLOYEE_A_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_B_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EmployeeLoanRepository loanRepository;

    private EmployeeLoan loanA;
    private EmployeeLoan loanB;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        loanA = createLoan(EMPLOYEE_A_ID, "LOAN-A-");
        loanB = createLoan(EMPLOYEE_B_ID, "LOAN-B-");
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private EmployeeLoan createLoan(UUID employeeId, String prefix) {
        EmployeeLoan loan = EmployeeLoan.builder()
                .employeeId(employeeId)
                .loanNumber(prefix + UUID.randomUUID().toString().substring(0, 8))
                .loanType(EmployeeLoan.LoanType.PERSONAL_LOAN)
                .principalAmount(new BigDecimal("10000.00"))
                .interestRate(new BigDecimal("5.0"))
                .tenureMonths(12)
                .purpose("Test loan")
                .requestedDate(LocalDate.now())
                .status(EmployeeLoan.LoanStatus.PENDING)
                .build();
        loan.calculateEmi();
        loan.setTenantId(TENANT_ID);
        return loanRepository.save(loan);
    }

    /**
     * Set up a plain employee SecurityContext with only LOAN_VIEW/LOAN_CREATE/LOAN_UPDATE
     * (NO LOAN_VIEW_ALL, NO LOAN_MANAGE) — used to verify the IDOR guard.
     */
    private void setupPlainEmployee(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LOAN_VIEW, RoleScope.SELF);
        permissions.put(Permission.LOAN_CREATE, RoleScope.SELF);
        permissions.put(Permission.LOAN_UPDATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId,
                Set.of("EMPLOYEE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    /**
     * HR Manager: holds LOAN_VIEW_ALL, which bypasses the per-employee IDOR guard
     * via {@link com.nulogic.application.loan.service.LoanService#enforceLoanAccess}.
     */
    private void setupHrManagerWithViewAll(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LOAN_VIEW, RoleScope.ALL);
        permissions.put(Permission.LOAN_VIEW_ALL, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId,
                Set.of("HR_MANAGER"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    @Test
    @WithMockUser(username = "employee-a@test.com", roles = {"EMPLOYEE"})
    @DisplayName("IDOR: employee cannot read other employee's loan by ID — returns 403")
    void employeeCannotReadOtherEmployeesLoan_returns403() throws Exception {
        setupPlainEmployee(EMPLOYEE_A_ID);

        mockMvc.perform(get(BASE_URL + "/" + loanB.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "employee-a@test.com", roles = {"EMPLOYEE"})
    @DisplayName("IDOR: employee can read own loan by ID — returns 200")
    void employeeCanReadOwnLoan_returns200() throws Exception {
        setupPlainEmployee(EMPLOYEE_A_ID);

        mockMvc.perform(get(BASE_URL + "/" + loanA.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(loanA.getId().toString()))
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_A_ID.toString()));
    }

    @Test
    @WithMockUser(username = "hr-manager@test.com", roles = {"HR_MANAGER"})
    @DisplayName("LOAN_VIEW_ALL bypasses IDOR guard — HR manager can read any employee's loan")
    void loanViewAllPermissionGrantsAccess_returns200() throws Exception {
        // Caller employee id is intentionally not B — only the elevated permission
        // should grant access to B's loan.
        setupHrManagerWithViewAll(UUID.randomUUID());

        mockMvc.perform(get(BASE_URL + "/" + loanB.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(loanB.getId().toString()))
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_B_ID.toString()));
    }

    @Test
    @WithMockUser(username = "employee-a@test.com", roles = {"EMPLOYEE"})
    @DisplayName("IDOR (mutation): employee cannot cancel other employee's loan — returns 403")
    void employeeCannotCancelOtherEmployeesLoan_returns403() throws Exception {
        setupPlainEmployee(EMPLOYEE_A_ID);

        mockMvc.perform(post(BASE_URL + "/" + loanB.getId() + "/cancel"))
                .andExpect(status().isForbidden());
    }
}
