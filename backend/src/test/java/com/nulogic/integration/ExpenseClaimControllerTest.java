package com.nulogic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.expense.dto.ExpenseClaimRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.expense.ExpenseClaim;
import com.nulogic.domain.user.AuthProvider;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for ExpenseClaimController.
 * Covers UC-EXP-001 through UC-EXP-010.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Expense Claim Controller Integration Tests")
class ExpenseClaimControllerTest {

    private static final String BASE_URL = "/api/v1/expenses";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;
    @Autowired
    UserRepository userRepository;
    @Autowired
    EmployeeRepository employeeRepository;
    private UUID USER_ID;
    private UUID EMPLOYEE_ID;

    @BeforeEach
    void setUpSuperAdminContext() {
        // Seed user + employee via JPA save() — avoids manual ID + null @Version trap
        User user = User.builder()
                .email("expense-test-" + UUID.randomUUID() + "@example.com")
                .firstName("Exp")
                .lastName("Tester")
                .passwordHash("$2a$10$dummyhashfortestingonlydummyhashfortestingdummyha")
                .status(User.UserStatus.ACTIVE)
                .authProvider(AuthProvider.LOCAL)
                .mfaEnabled(false)
                .build();
        user.setTenantId(TENANT_ID);
        user = userRepository.save(user);
        USER_ID = user.getId();

        Employee emp = Employee.builder()
                .employeeCode("EXP-" + UUID.randomUUID().toString().substring(0, 6))
                .user(user)
                .firstName("Exp")
                .lastName("Tester")
                .joiningDate(LocalDate.now().minusYears(1))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .build();
        emp.setTenantId(TENANT_ID);
        EMPLOYEE_ID = employeeRepository.save(emp).getId();

        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-EXP-001: Submit expense claim =========================

    @Test
    @DisplayName("ucExpA1_submitClaim_returns201WithPendingStatus")
    void ucExpA1_submitClaim_returns201WithPendingStatus() throws Exception {
        ExpenseClaimRequest request = ExpenseClaimRequest.builder()
                .claimDate(LocalDate.now())
                .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                .description("Business travel to client site")
                .amount(new BigDecimal("250.00"))
                .currency("USD")
                .notes("Taxi from airport to client office")
                .build();

        mockMvc.perform(post(BASE_URL + "/employees/{employeeId}", EMPLOYEE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()))
                .andExpect(jsonPath("$.category").value("TRAVEL"))
                .andExpect(jsonPath("$.amount").value(250.00));
    }

    @Test
    @DisplayName("ucExpA2_submitClaimMissingAmount_returns400")
    void ucExpA2_submitClaimMissingAmount_returns400() throws Exception {
        ExpenseClaimRequest request = ExpenseClaimRequest.builder()
                .claimDate(LocalDate.now())
                .category(ExpenseClaim.ExpenseCategory.MEALS)
                .description("Team lunch")
                // missing amount
                .build();

        mockMvc.perform(post(BASE_URL + "/employees/{employeeId}", EMPLOYEE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucExpA3_submitClaimFutureDate_returns400")
    void ucExpA3_submitClaimFutureDate_returns400() throws Exception {
        ExpenseClaimRequest request = ExpenseClaimRequest.builder()
                .claimDate(LocalDate.now().plusDays(5))   // future date — violates @PastOrPresent
                .category(ExpenseClaim.ExpenseCategory.ACCOMMODATION)
                .description("Hotel booking")
                .amount(new BigDecimal("150.00"))
                .build();

        mockMvc.perform(post(BASE_URL + "/employees/{employeeId}", EMPLOYEE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucExpA4_getExpenseClaim_returns200")
    void ucExpA4_getExpenseClaim_returns200() throws Exception {
        // Create a claim first
        ExpenseClaimRequest request = buildValidClaimRequest("Conference fee", ExpenseClaim.ExpenseCategory.TRAINING, "500.00");

        String responseBody = mockMvc.perform(post(BASE_URL + "/employees/{employeeId}", EMPLOYEE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String claimId = objectMapper.readTree(responseBody).get("id").asText();

        mockMvc.perform(get(BASE_URL + "/{claimId}", claimId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(claimId));
    }

    @Test
    @DisplayName("ucExpA5_getAllExpenseClaims_returns200WithPage")
    void ucExpA5_getAllExpenseClaims_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucExpA6_getExpenseClaimsByEmployee_returns200")
    void ucExpA6_getExpenseClaimsByEmployee_returns200() throws Exception {
        mockMvc.perform(get(BASE_URL + "/employees/{employeeId}", EMPLOYEE_ID)
                        .param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucExpA7_getStatuses_returns200WithStatusList")
    void ucExpA7_getStatuses_returns200WithStatusList() throws Exception {
        mockMvc.perform(get(BASE_URL + "/statuses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucExpA8_employeeRole_cannotAccessAnothersClaim_returns403")
    void ucExpA8_employeeRole_cannotAccessAnothersClaim_returns403() throws Exception {
        // Create a claim as super admin
        ExpenseClaimRequest request = buildValidClaimRequest("Office supplies", ExpenseClaim.ExpenseCategory.OTHER, "75.00");
        String responseBody = mockMvc.perform(post(BASE_URL + "/employees/{employeeId}", EMPLOYEE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String claimId = objectMapper.readTree(responseBody).get("id").asText();

        // Switch to restricted employee who owns nothing
        UUID otherEmployeeId = UUID.randomUUID();
        Map<String, RoleScope> restrictedPerms = new HashMap<>();
        restrictedPerms.put(Permission.EXPENSE_VIEW, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), otherEmployeeId, Set.of("EMPLOYEE"), restrictedPerms);

        mockMvc.perform(get(BASE_URL + "/{claimId}", claimId))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ucExpA9_validatePolicy_returns200")
    void ucExpA9_validatePolicy_returns200() throws Exception {
        mockMvc.perform(get(BASE_URL + "/validate-policy")
                        .param("employeeId", EMPLOYEE_ID.toString())
                        .param("amount", "1000.00"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ucExpA10_getExpenseSummary_returns200")
    void ucExpA10_getExpenseSummary_returns200() throws Exception {
        mockMvc.perform(get(BASE_URL + "/summary")
                        .param("startDate", LocalDate.now().minusMonths(1).toString())
                        .param("endDate", LocalDate.now().toString()))
                .andExpect(status().isOk());
    }

    // ============================= Helpers =============================

    private ExpenseClaimRequest buildValidClaimRequest(String description,
                                                       ExpenseClaim.ExpenseCategory category,
                                                       String amount) {
        return ExpenseClaimRequest.builder()
                .claimDate(LocalDate.now())
                .category(category)
                .description(description)
                .amount(new BigDecimal(amount))
                .currency("USD")
                .build();
    }
}
