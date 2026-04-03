package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.expense.ExpenseClaim;
import com.hrms.domain.user.User;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.expense.repository.ExpenseClaimRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
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
import java.util.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration tests for Expense Claim scope enforcement.
 * Tests the complete flow from HTTP request through controller, service, and database.
 * <p>
 * Test Scenarios:
 * 1. SELF scope - user can only see their own expense claims
 * 2. TEAM scope - manager can see their reportees' expense claims
 * 3. LOCATION scope - location admin can see same location expense claims
 * 4. DEPARTMENT scope - department admin can see same department expense claims
 * 5. ALL scope - admin can see all expense claims
 * 6. CUSTOM scope - custom role can see custom target expense claims
 * 7. Super admin bypasses scope checks
 * 8. Access denied scenarios
 * 9. Approval/rejection scope validation
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Expense Claim Scope E2E Integration Tests")
class ExpenseClaimScopeIntegrationTest {

    private static final String BASE_URL = "/api/v1/expenses";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    // Employee IDs for testing
    private static final UUID CURRENT_EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID REPORTEE_EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID OTHER_EMPLOYEE_ID = UUID.randomUUID();
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private ExpenseClaimRepository expenseClaimRepository;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private UserRepository userRepository;
    private ExpenseClaim ownExpenseClaim;
    private ExpenseClaim reporteeExpenseClaim;
    private ExpenseClaim otherExpenseClaim;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        // Create expense claims for different employees
        ownExpenseClaim = createExpenseClaim(CURRENT_EMPLOYEE_ID, "My travel expense");
        reporteeExpenseClaim = createExpenseClaim(REPORTEE_EMPLOYEE_ID, "Reportee meal expense");
        otherExpenseClaim = createExpenseClaim(OTHER_EMPLOYEE_ID, "Other's accommodation");
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    // ==================== SELF Scope Tests ====================

    private ExpenseClaim createExpenseClaim(UUID employeeId, String description) {
        ExpenseClaim claim = ExpenseClaim.builder()
                .employeeId(employeeId)
                .claimNumber("EXP-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                .claimDate(LocalDate.now())
                .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                .description(description)
                .amount(BigDecimal.valueOf(500.00))
                .currency("USD")
                .status(ExpenseClaim.ExpenseStatus.DRAFT)
                .notes("Test expense claim")
                .build();
        claim.setTenantId(TENANT_ID);
        return expenseClaimRepository.save(claim);
    }

    // ==================== TEAM Scope Tests ====================

    private Employee createEmployee(String employeeCodePrefix, UUID locationId, UUID departmentId) {
        User user = User.builder()
                .email(employeeCodePrefix.toLowerCase() + "@example.com")
                .firstName("Test")
                .lastName("User")
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.save(user);

        Employee employee = Employee.builder()
                .employeeCode(employeeCodePrefix + "-" + UUID.randomUUID().toString().substring(0, 6))
                .firstName("Test")
                .lastName("Employee")
                .joiningDate(LocalDate.now().minusDays(30))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .officeLocationId(locationId)
                .departmentId(departmentId)
                .user(savedUser)
                .build();
        employee.setTenantId(TENANT_ID);
        return employeeRepository.save(employee);
    }

    // ==================== ALL Scope Tests ====================

    private void setupSelfScope(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ==================== System Admin Tests ====================

    private void setupTeamScope(UUID employeeId, Set<UUID> reporteeIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.TEAM);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.TEAM);
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.TEAM);
        permissions.put(Permission.EXPENSE_APPROVE, RoleScope.TEAM);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("MANAGER"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setAllReporteeIds(reporteeIds);
    }

    // ==================== LOCATION Scope Tests ====================

    private void setupAllScope(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_APPROVE, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ==================== DEPARTMENT Scope Tests ====================

    private void setupSystemAdmin(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ==================== CUSTOM Scope Tests ====================

    private void setupLocationScope(UUID employeeId, Set<UUID> locationIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.LOCATION);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.LOCATION);
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.LOCATION);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("LOCATION_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setCurrentLocationIds(locationIds);
    }

    // ==================== Super Admin Tests ====================

    private void setupDepartmentScope(UUID employeeId, UUID departmentId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.DEPARTMENT);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.DEPARTMENT);
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.DEPARTMENT);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("DEPT_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setOrgContext(null, departmentId, null);
    }

    // ==================== Edge Cases ====================

    private void setupCustomScope(UUID employeeId, Set<UUID> customEmployeeIds,
                                  Set<UUID> customDepartmentIds, Set<UUID> customLocationIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.CUSTOM);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.CUSTOM);
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.CUSTOM);
        permissions.put(Permission.EXPENSE_APPROVE, RoleScope.CUSTOM);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("CUSTOM_ROLE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        // Set custom targets for expense view permissions
        if (customEmployeeIds != null || customDepartmentIds != null || customLocationIds != null) {
            SecurityContext.setCustomScopeTargets(Permission.EXPENSE_VIEW,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
            SecurityContext.setCustomScopeTargets(Permission.EXPENSE_VIEW_TEAM,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
            SecurityContext.setCustomScopeTargets(Permission.EXPENSE_VIEW_ALL,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
            SecurityContext.setCustomScopeTargets(Permission.EXPENSE_APPROVE,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
        }
    }

    // ==================== Helper Methods ====================

    private void setupSuperAdminByRole(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        // Include explicit system-admin permission for current authorization model
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_VIEW_TEAM, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_APPROVE, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("SUPER_ADMIN", "SYSTEM_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    @Nested
    @DisplayName("SELF Scope Tests")
    class SelfScopeTests {

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Can access own expense claim by ID")
        void canAccessOwnExpenseClaimById() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownExpenseClaim.getId().toString()))
                    .andExpect(jsonPath("$.description").value("My travel expense"));
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Cannot access other's expense claim by ID - returns 403")
        void cannotAccessOthersExpenseClaimById() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Can access own expense claims by employee ID")
        void canAccessOwnExpenseClaimsByEmployeeId() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employees/" + CURRENT_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Cannot access other's expense claims by employee ID - returns 403")
        void cannotAccessOthersExpenseClaimsByEmployeeId() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employees/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope with only EXPENSE_VIEW permission: List endpoints return self results")
        void selfScopeWithOnlyExpenseViewPermission() throws Exception {
            // Setup: User has only EXPENSE_VIEW with SELF scope (no VIEW_TEAM/VIEW_ALL)
            Map<String, RoleScope> permissions = new HashMap<>();
            permissions.put(Permission.EXPENSE_VIEW, RoleScope.SELF);
            permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);
            SecurityContext.setCurrentUser(UUID.randomUUID(), CURRENT_EMPLOYEE_ID, Set.of("EMPLOYEE"), permissions);
            SecurityContext.setCurrentTenantId(TENANT_ID);

            // Test getAllExpenseClaims - should return only own expenses
            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content[?(@.employeeId == '" + CURRENT_EMPLOYEE_ID + "')]").exists());

            // Test getExpenseClaimsByStatus - should return only own expenses with that status
            mockMvc.perform(get(BASE_URL + "/status/DRAFT")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());

            // Test getExpenseClaimsByDateRange - should return only own expenses in date range
            LocalDate startDate = LocalDate.now().minusDays(30);
            LocalDate endDate = LocalDate.now();
            mockMvc.perform(get(BASE_URL + "/date-range")
                            .param("startDate", startDate.toString())
                            .param("endDate", endDate.toString())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());

            // Test getExpenseSummary - should return summary for only own expenses
            mockMvc.perform(get(BASE_URL + "/summary")
                            .param("startDate", startDate.toString())
                            .param("endDate", endDate.toString()))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("TEAM Scope Tests")
    class TeamScopeTests {

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access own expense claim by ID")
        void canAccessOwnExpenseClaimById() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownExpenseClaim.getId().toString()));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access reportee's expense claim by ID")
        void canAccessReporteeExpenseClaimById() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/" + reporteeExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeExpenseClaim.getId().toString()))
                    .andExpect(jsonPath("$.description").value("Reportee meal expense"));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot access non-reportee's expense claim by ID - returns 403")
        void cannotAccessNonReporteeExpenseClaimById() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access reportee's expense claims by employee ID")
        void canAccessReporteeExpenseClaimsByEmployeeId() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/employees/" + REPORTEE_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot access non-reportee's expense claims by employee ID - returns 403")
        void cannotAccessNonReporteeExpenseClaimsByEmployeeId() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/employees/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can approve reportee's expense claim")
        void canApproveReporteeExpenseClaim() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            // Submit the expense claim first
            reporteeExpenseClaim.submit();
            expenseClaimRepository.save(reporteeExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + reporteeExpenseClaim.getId() + "/approve"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot approve non-reportee's expense claim - returns 403")
        void cannotApproveNonReporteeExpenseClaim() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            // Submit the expense claim first
            otherExpenseClaim.submit();
            expenseClaimRepository.save(otherExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + otherExpenseClaim.getId() + "/approve"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can reject reportee's expense claim")
        void canRejectReporteeExpenseClaim() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            // Submit the expense claim first
            reporteeExpenseClaim.submit();
            expenseClaimRepository.save(reporteeExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + reporteeExpenseClaim.getId() + "/reject")
                            .param("reason", "Insufficient documentation"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot reject non-reportee's expense claim - returns 403")
        void cannotRejectNonReporteeExpenseClaim() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            // Submit the expense claim first
            otherExpenseClaim.submit();
            expenseClaimRepository.save(otherExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + otherExpenseClaim.getId() + "/reject")
                            .param("reason", "Invalid"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("ALL Scope Tests")
    class AllScopeTests {

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can access any expense claim by ID")
        void canAccessAnyExpenseClaimById() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            // Can access own
            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownExpenseClaim.getId().toString()));

            // Can access other's
            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(otherExpenseClaim.getId().toString()));

            // Can access reportee's
            mockMvc.perform(get(BASE_URL + "/" + reporteeExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeExpenseClaim.getId().toString()));
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can access any employee's expense claims by employee ID")
        void canAccessAnyEmployeesExpenseClaimsByEmployeeId() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employees/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can list all expense claims")
        void canListAllExpenseClaims() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(3)); // All 3 expense claims
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can get expense claims by status")
        void canGetExpenseClaimsByStatus() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/status/DRAFT")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can get expense claims by date range")
        void canGetExpenseClaimsByDateRange() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            LocalDate startDate = LocalDate.now().minusDays(30);
            LocalDate endDate = LocalDate.now().plusDays(30);

            mockMvc.perform(get(BASE_URL + "/date-range")
                            .param("startDate", startDate.toString())
                            .param("endDate", endDate.toString())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can get pending approvals")
        void canGetPendingApprovals() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            // Submit one expense claim
            ownExpenseClaim.submit();
            expenseClaimRepository.save(ownExpenseClaim);

            mockMvc.perform(get(BASE_URL + "/pending-approvals")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }
    }

    @Nested
    @DisplayName("System Admin Tests")
    class SystemAdminTests {

        @Test
        @WithMockUser(username = "sysadmin@test.com", roles = {"ADMIN"})
        @DisplayName("System admin: Bypasses scope checks and can access any expense claim")
        void systemAdminBypassesScopeChecks() throws Exception {
            setupSystemAdmin(CURRENT_EMPLOYEE_ID);

            // Even with SELF scope, system admin can access others
            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(otherExpenseClaim.getId().toString()));
        }
    }

    @Nested
    @DisplayName("LOCATION Scope Tests")
    class LocationScopeTests {
        /*
         * LOCATION scope requires Employee records to exist in the database
         * to verify location matching. These tests cover both positive and negative cases.
         */

        private static final UUID SHARED_LOCATION_ID = UUID.randomUUID();
        private static final UUID OTHER_LOCATION_ID = UUID.randomUUID();

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access expense claim when employee not found in DB")
        void cannotAccessExpenseClaimWhenEmployeeNotInDb() throws Exception {
            // LOCATION scope requires looking up the employee to check their location.
            // Since test employee IDs don't exist in DB, location check fails.
            // This tests the strict enforcement: no employee record = no access.
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access other's expense claim (employee not in DB)")
        void cannotAccessOtherLocationExpenseClaim() throws Exception {
            // User has access to SHARED_LOCATION_ID, but other employee doesn't exist in DB.
            // Since employee lookup returns empty, location check returns false.
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access by employee ID when employee not in DB")
        void cannotAccessByEmployeeIdWhenNotInDb() throws Exception {
            // LOCATION scope validation requires employee to exist in DB.
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/employees/" + CURRENT_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access other employee's expense claims by employee ID")
        void cannotAccessOtherEmployeeExpenseClaimsByEmployeeId() throws Exception {
            // User has LOCATION scope but OTHER_EMPLOYEE_ID is not in user's locations (and not in DB)
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/employees/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Can access same location expense claim by ID")
        void canAccessSameLocationExpenseClaimById() throws Exception {
            Employee locationEmployee = createEmployee("LOC-EMP-1", SHARED_LOCATION_ID, null);
            Employee otherLocationEmployee = createEmployee("LOC-EMP-2", OTHER_LOCATION_ID, null);
            ExpenseClaim locationClaim = createExpenseClaim(locationEmployee.getId(), "Location claim");
            ExpenseClaim otherClaim = createExpenseClaim(otherLocationEmployee.getId(), "Other location claim");

            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/" + locationClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(locationClaim.getId().toString()));

            mockMvc.perform(get(BASE_URL + "/" + otherClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Can access expense claims by employee ID in same location")
        void canAccessExpenseClaimsByEmployeeIdForSameLocation() throws Exception {
            Employee locationEmployee = createEmployee("LOC-EMP-3", SHARED_LOCATION_ID, null);
            createExpenseClaim(locationEmployee.getId(), "Location list claim");

            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/employees/" + locationEmployee.getId())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }
    }

    @Nested
    @DisplayName("DEPARTMENT Scope Tests")
    class DepartmentScopeTests {

        private static final UUID SHARED_DEPARTMENT_ID = UUID.randomUUID();
        private static final UUID OTHER_DEPARTMENT_ID = UUID.randomUUID();

        @Test
        @WithMockUser(username = "deptadmin@test.com", roles = {"DEPT_ADMIN"})
        @DisplayName("DEPARTMENT scope: Can access same department expense claim by ID")
        void canAccessSameDepartmentExpenseClaimById() throws Exception {
            Employee deptEmployee = createEmployee("DEPT-EMP-1", null, SHARED_DEPARTMENT_ID);
            Employee otherDeptEmployee = createEmployee("DEPT-EMP-2", null, OTHER_DEPARTMENT_ID);
            ExpenseClaim deptClaim = createExpenseClaim(deptEmployee.getId(), "Department claim");
            ExpenseClaim otherClaim = createExpenseClaim(otherDeptEmployee.getId(), "Other department claim");

            setupDepartmentScope(CURRENT_EMPLOYEE_ID, SHARED_DEPARTMENT_ID);

            mockMvc.perform(get(BASE_URL + "/" + deptClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(deptClaim.getId().toString()));

            mockMvc.perform(get(BASE_URL + "/" + otherClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "deptadmin@test.com", roles = {"DEPT_ADMIN"})
        @DisplayName("DEPARTMENT scope: Can access expense claims by employee ID in same department")
        void canAccessExpenseClaimsByEmployeeIdForSameDepartment() throws Exception {
            Employee deptEmployee = createEmployee("DEPT-EMP-3", null, SHARED_DEPARTMENT_ID);
            createExpenseClaim(deptEmployee.getId(), "Department list claim");

            setupDepartmentScope(CURRENT_EMPLOYEE_ID, SHARED_DEPARTMENT_ID);

            mockMvc.perform(get(BASE_URL + "/employees/" + deptEmployee.getId())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }
    }

    @Nested
    @DisplayName("CUSTOM Scope Tests")
    class CustomScopeTests {

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access own expense claim")
        void canAccessOwnExpenseClaim() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownExpenseClaim.getId().toString()));
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access expense claim of custom target employee")
        void canAccessCustomTargetEmployeeExpenseClaim() throws Exception {
            // User has CUSTOM scope with REPORTEE_EMPLOYEE_ID in their custom targets
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/" + reporteeExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeExpenseClaim.getId().toString()))
                    .andExpect(jsonPath("$.description").value("Reportee meal expense"));
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Cannot access expense claim of non-target employee")
        void cannotAccessNonTargetEmployeeExpenseClaim() throws Exception {
            // User has CUSTOM scope with REPORTEE_EMPLOYEE_ID, but not OTHER_EMPLOYEE_ID
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access custom target employee's expense claims by employee ID")
        void canAccessCustomTargetExpenseClaimsByEmployeeId() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/employees/" + REPORTEE_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Cannot access non-target employee's expense claims by employee ID")
        void cannotAccessNonTargetExpenseClaimsByEmployeeId() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/employees/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope with empty targets: Can only access own")
        void customScopeWithEmptyTargetsCanOnlyAccessOwn() throws Exception {
            // CUSTOM scope with no targets set - should only be able to access own data
            setupCustomScope(CURRENT_EMPLOYEE_ID, Collections.emptySet(), null, null);

            // Can access own
            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk());

            // Cannot access others
            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Multiple custom employee targets work correctly")
        void customScopeWithMultipleEmployeeTargets() throws Exception {
            // User has CUSTOM scope with both REPORTEE and OTHER employee as targets
            setupCustomScope(CURRENT_EMPLOYEE_ID,
                    Set.of(REPORTEE_EMPLOYEE_ID, OTHER_EMPLOYEE_ID), null, null);

            // Can access first target
            mockMvc.perform(get(BASE_URL + "/" + reporteeExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.description").value("Reportee meal expense"));

            // Can access second target
            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.description").value("Other's accommodation"));

            // Can also access own
            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can approve custom target employee's expense claim")
        void canApproveCustomTargetExpenseClaim() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            // Submit the expense claim first
            reporteeExpenseClaim.submit();
            expenseClaimRepository.save(reporteeExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + reporteeExpenseClaim.getId() + "/approve"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Cannot approve non-target employee's expense claim")
        void cannotApproveNonTargetExpenseClaim() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            // Submit the expense claim first
            otherExpenseClaim.submit();
            expenseClaimRepository.save(otherExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + otherExpenseClaim.getId() + "/approve"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Super Admin Tests")
    class SuperAdminTests {

        @Test
        @WithMockUser(username = "superadmin@test.com", roles = {"SUPER_ADMIN"})
        @DisplayName("Super admin role: Bypasses scope checks and can access any expense claim")
        void superAdminRoleBypassesScopeChecks() throws Exception {
            setupSuperAdminByRole(CURRENT_EMPLOYEE_ID);

            // Even with SELF scope in permissions, SUPER_ADMIN role bypasses
            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(otherExpenseClaim.getId().toString()));
        }

        @Test
        @WithMockUser(username = "superadmin@test.com", roles = {"SUPER_ADMIN"})
        @DisplayName("Super admin role: Can access any employee's expense claims")
        void superAdminCanAccessAnyEmployeeExpenseClaims() throws Exception {
            setupSuperAdminByRole(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employees/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "superadmin@test.com", roles = {"SUPER_ADMIN"})
        @DisplayName("Super admin role: Can approve any employee's expense claim")
        void superAdminCanApproveAnyExpenseClaim() throws Exception {
            setupSuperAdminByRole(CURRENT_EMPLOYEE_ID);

            // Submit the expense claim first
            otherExpenseClaim.submit();
            expenseClaimRepository.save(otherExpenseClaim);

            mockMvc.perform(post(BASE_URL + "/" + otherExpenseClaim.getId() + "/approve"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCaseTests {

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("Non-existent expense claim with SELF scope returns error")
        void nonExistentExpenseClaimReturnsError() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);
            UUID nonExistentId = UUID.randomUUID();

            // Non-existent resource returns error (EntityNotFoundException not yet mapped in GlobalExceptionHandler)
            // Future enhancement: Add EntityNotFoundException -> 404 mapping in GlobalExceptionHandler
            mockMvc.perform(get(BASE_URL + "/" + nonExistentId))
                    .andExpect(status().is5xxServerError());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("TEAM scope with no reportees - can only access own")
        void teamScopeWithNoReporteesCanOnlyAccessOwn() throws Exception {
            // Setup TEAM scope with empty reportee set
            setupTeamScope(CURRENT_EMPLOYEE_ID, Collections.emptySet());

            // Can access own
            mockMvc.perform(get(BASE_URL + "/" + ownExpenseClaim.getId()))
                    .andExpect(status().isOk());

            // Cannot access others (even with TEAM scope)
            mockMvc.perform(get(BASE_URL + "/" + otherExpenseClaim.getId()))
                    .andExpect(status().isForbidden());
        }
    }

}
