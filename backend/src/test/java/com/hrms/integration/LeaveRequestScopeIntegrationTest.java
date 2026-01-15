package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
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
 * End-to-end integration tests for Leave Request scope enforcement.
 * Tests the complete flow from HTTP request through controller, service, and database.
 *
 * Test Scenarios:
 * 1. SELF scope - user can only see their own leave requests
 * 2. TEAM scope - manager can see their reportees' leave requests
 * 3. ALL scope - admin can see all leave requests
 * 4. Access denied scenarios
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Leave Request Scope E2E Integration Tests")
class LeaveRequestScopeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private LeaveTypeRepository leaveTypeRepository;

    private static final String BASE_URL = "/api/v1/leave-requests";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    // Employee IDs for testing
    private static final UUID CURRENT_EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID REPORTEE_EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID OTHER_EMPLOYEE_ID = UUID.randomUUID();

    private LeaveType casualLeave;
    private LeaveRequest ownLeaveRequest;
    private LeaveRequest reporteeLeaveRequest;
    private LeaveRequest otherLeaveRequest;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        // Create leave type
        casualLeave = createLeaveType("Casual Leave", "CL");

        // Create leave requests for different employees
        ownLeaveRequest = createLeaveRequest(CURRENT_EMPLOYEE_ID, "My vacation");
        reporteeLeaveRequest = createLeaveRequest(REPORTEE_EMPLOYEE_ID, "Reportee vacation");
        otherLeaveRequest = createLeaveRequest(OTHER_EMPLOYEE_ID, "Other's vacation");
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    // ==================== SELF Scope Tests ====================

    @Nested
    @DisplayName("SELF Scope Tests")
    class SelfScopeTests {

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Can access own leave request by ID")
        void canAccessOwnLeaveRequestById() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownLeaveRequest.getId().toString()))
                    .andExpect(jsonPath("$.reason").value("My vacation"));
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Cannot access other's leave request by ID - returns 403")
        void cannotAccessOthersLeaveRequestById() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Can access own leave requests by employee ID")
        void canAccessOwnLeaveRequestsByEmployeeId() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employee/" + CURRENT_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Cannot access other's leave requests by employee ID - returns 403")
        void cannotAccessOthersLeaveRequestsByEmployeeId() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employee/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }
    }

    // ==================== TEAM Scope Tests ====================

    @Nested
    @DisplayName("TEAM Scope Tests")
    class TeamScopeTests {

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access own leave request by ID")
        void canAccessOwnLeaveRequestById() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownLeaveRequest.getId().toString()));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access reportee's leave request by ID")
        void canAccessReporteeLeaveRequestById() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/" + reporteeLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeLeaveRequest.getId().toString()))
                    .andExpect(jsonPath("$.reason").value("Reportee vacation"));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot access non-reportee's leave request by ID - returns 403")
        void cannotAccessNonReporteeLeaveRequestById() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access reportee's leave requests by employee ID")
        void canAccessReporteeLeaveRequestsByEmployeeId() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/employee/" + REPORTEE_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot access non-reportee's leave requests by employee ID - returns 403")
        void cannotAccessNonReporteeLeaveRequestsByEmployeeId() throws Exception {
            setupTeamScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID));

            mockMvc.perform(get(BASE_URL + "/employee/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }
    }

    // ==================== ALL Scope Tests ====================

    @Nested
    @DisplayName("ALL Scope Tests")
    class AllScopeTests {

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can access any leave request by ID")
        void canAccessAnyLeaveRequestById() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            // Can access own
            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownLeaveRequest.getId().toString()));

            // Can access other's
            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(otherLeaveRequest.getId().toString()));

            // Can access reportee's
            mockMvc.perform(get(BASE_URL + "/" + reporteeLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeLeaveRequest.getId().toString()));
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can access any employee's leave requests by employee ID")
        void canAccessAnyEmployeesLeaveRequestsByEmployeeId() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employee/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can list all leave requests")
        void canListAllLeaveRequests() throws Exception {
            setupAllScope(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(3)); // All 3 leave requests
        }
    }

    // ==================== System Admin Tests ====================

    @Nested
    @DisplayName("System Admin Tests")
    class SystemAdminTests {

        @Test
        @WithMockUser(username = "sysadmin@test.com", roles = {"ADMIN"})
        @DisplayName("System admin: Bypasses scope checks and can access any leave request")
        void systemAdminBypassesScopeChecks() throws Exception {
            setupSystemAdmin(CURRENT_EMPLOYEE_ID);

            // Even with SELF scope, system admin can access others
            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(otherLeaveRequest.getId().toString()));
        }
    }

    // ==================== LOCATION Scope Tests ====================

    @Nested
    @DisplayName("LOCATION Scope Tests")
    class LocationScopeTests {
        /*
         * Note: LOCATION and DEPARTMENT scope require Employee records to exist in the database
         * to verify location/department matching. These tests verify the negative cases (access denied)
         * when employees don't exist. Positive LOCATION/DEPARTMENT scope tests with actual employees
         * are covered in dedicated integration tests that set up full User+Employee fixtures.
         *
         * The CUSTOM scope tests above demonstrate the positive case for scope enforcement.
         */

        private static final UUID SHARED_LOCATION_ID = UUID.randomUUID();

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access leave request when employee not found in DB")
        void cannotAccessLeaveRequestWhenEmployeeNotInDb() throws Exception {
            // LOCATION scope requires looking up the employee to check their location.
            // Since test employee IDs don't exist in DB, location check fails.
            // This tests the strict enforcement: no employee record = no access.
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access other's leave request (employee not in DB)")
        void cannotAccessOtherLocationLeaveRequest() throws Exception {
            // User has access to SHARED_LOCATION_ID, but other employee doesn't exist in DB.
            // Since employee lookup returns empty, location check returns false.
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access by employee ID when employee not in DB")
        void cannotAccessByEmployeeIdWhenNotInDb() throws Exception {
            // LOCATION scope validation requires employee to exist in DB.
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/employee/" + CURRENT_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Cannot access other employee's leave requests by employee ID")
        void cannotAccessOtherEmployeeLeaveRequestsByEmployeeId() throws Exception {
            // User has LOCATION scope but OTHER_EMPLOYEE_ID is not in user's locations (and not in DB)
            setupLocationScope(CURRENT_EMPLOYEE_ID, Set.of(SHARED_LOCATION_ID));

            mockMvc.perform(get(BASE_URL + "/employee/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isForbidden());
        }
    }

    // ==================== CUSTOM Scope Tests ====================

    @Nested
    @DisplayName("CUSTOM Scope Tests")
    class CustomScopeTests {

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access own leave request")
        void canAccessOwnLeaveRequest() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownLeaveRequest.getId().toString()));
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access leave request of custom target employee")
        void canAccessCustomTargetEmployeeLeaveRequest() throws Exception {
            // User has CUSTOM scope with REPORTEE_EMPLOYEE_ID in their custom targets
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/" + reporteeLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeLeaveRequest.getId().toString()))
                    .andExpect(jsonPath("$.reason").value("Reportee vacation"));
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Cannot access leave request of non-target employee")
        void cannotAccessNonTargetEmployeeLeaveRequest() throws Exception {
            // User has CUSTOM scope with REPORTEE_EMPLOYEE_ID, but not OTHER_EMPLOYEE_ID
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access custom target employee's leave requests by employee ID")
        void canAccessCustomTargetLeaveRequestsByEmployeeId() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/employee/" + REPORTEE_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }

        @Test
        @WithMockUser(username = "customuser@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Cannot access non-target employee's leave requests by employee ID")
        void cannotAccessNonTargetLeaveRequestsByEmployeeId() throws Exception {
            setupCustomScope(CURRENT_EMPLOYEE_ID, Set.of(REPORTEE_EMPLOYEE_ID), null, null);

            mockMvc.perform(get(BASE_URL + "/employee/" + OTHER_EMPLOYEE_ID)
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
            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk());

            // Cannot access others
            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
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
            mockMvc.perform(get(BASE_URL + "/" + reporteeLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.reason").value("Reportee vacation"));

            // Can access second target
            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.reason").value("Other's vacation"));

            // Can also access own
            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk());
        }
    }

    // ==================== Super Admin Tests ====================

    @Nested
    @DisplayName("Super Admin Tests")
    class SuperAdminTests {

        @Test
        @WithMockUser(username = "superadmin@test.com", roles = {"SUPER_ADMIN"})
        @DisplayName("Super admin role: Bypasses scope checks and can access any leave request")
        void superAdminRoleBypassesScopeChecks() throws Exception {
            setupSuperAdminByRole(CURRENT_EMPLOYEE_ID);

            // Even with SELF scope in permissions, SUPER_ADMIN role bypasses
            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(otherLeaveRequest.getId().toString()));
        }

        @Test
        @WithMockUser(username = "superadmin@test.com", roles = {"SUPER_ADMIN"})
        @DisplayName("Super admin role: Can access any employee's leave requests")
        void superAdminCanAccessAnyEmployeeLeaveRequests() throws Exception {
            setupSuperAdminByRole(CURRENT_EMPLOYEE_ID);

            mockMvc.perform(get(BASE_URL + "/employee/" + OTHER_EMPLOYEE_ID)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }
    }

    // ==================== Edge Cases ====================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCaseTests {

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("Non-existent leave request returns 404")
        void nonExistentLeaveRequestReturnsNotFound() throws Exception {
            setupSelfScope(CURRENT_EMPLOYEE_ID);
            UUID nonExistentId = UUID.randomUUID();

            mockMvc.perform(get(BASE_URL + "/" + nonExistentId))
                    .andExpect(status().isNotFound());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("TEAM scope with no reportees - can only access own")
        void teamScopeWithNoReporteesCanOnlyAccessOwn() throws Exception {
            // Setup TEAM scope with empty reportee set
            setupTeamScope(CURRENT_EMPLOYEE_ID, Collections.emptySet());

            // Can access own
            mockMvc.perform(get(BASE_URL + "/" + ownLeaveRequest.getId()))
                    .andExpect(status().isOk());

            // Cannot access others (even with TEAM scope)
            mockMvc.perform(get(BASE_URL + "/" + otherLeaveRequest.getId()))
                    .andExpect(status().isForbidden());
        }
    }

    // ==================== Helper Methods ====================

    private LeaveType createLeaveType(String name, String code) {
        LeaveType leaveType = LeaveType.builder()
                .leaveName(name)
                .leaveCode(code)
                .description("Test leave type")
                .annualQuota(BigDecimal.valueOf(20))
                .isCarryForwardAllowed(false)
                .isEncashable(false)
                .isPaid(true)
                .isActive(true)
                .build();
        leaveType.setTenantId(TENANT_ID);
        return leaveTypeRepository.save(leaveType);
    }

    private LeaveRequest createLeaveRequest(UUID employeeId, String reason) {
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .employeeId(employeeId)
                .leaveTypeId(casualLeave.getId())
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(3))
                .totalDays(BigDecimal.valueOf(3))
                .reason(reason)
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .isHalfDay(false)
                .build();
        leaveRequest.setRequestNumber("LR-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4));
        leaveRequest.setTenantId(TENANT_ID);
        return leaveRequestRepository.save(leaveRequest);
    }

    private void setupSelfScope(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.SELF);
        permissions.put(Permission.LEAVE_VIEW_TEAM, RoleScope.SELF);
        permissions.put(Permission.LEAVE_VIEW_ALL, RoleScope.SELF);
        permissions.put(Permission.LEAVE_REQUEST, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private void setupTeamScope(UUID employeeId, Set<UUID> reporteeIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.TEAM);
        permissions.put(Permission.LEAVE_VIEW_TEAM, RoleScope.TEAM);
        permissions.put(Permission.LEAVE_VIEW_ALL, RoleScope.TEAM);
        permissions.put(Permission.LEAVE_REQUEST, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("MANAGER"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setAllReporteeIds(reporteeIds);
    }

    private void setupAllScope(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.ALL);
        permissions.put(Permission.LEAVE_VIEW_TEAM, RoleScope.ALL);
        permissions.put(Permission.LEAVE_VIEW_ALL, RoleScope.ALL);
        permissions.put(Permission.LEAVE_REQUEST, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private void setupSystemAdmin(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private void setupLocationScope(UUID employeeId, Set<UUID> locationIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.LOCATION);
        permissions.put(Permission.LEAVE_VIEW_TEAM, RoleScope.LOCATION);
        permissions.put(Permission.LEAVE_VIEW_ALL, RoleScope.LOCATION);
        permissions.put(Permission.LEAVE_REQUEST, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("LOCATION_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setCurrentLocationIds(locationIds);
    }

    private void setupCustomScope(UUID employeeId, Set<UUID> customEmployeeIds,
                                   Set<UUID> customDepartmentIds, Set<UUID> customLocationIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.CUSTOM);
        permissions.put(Permission.LEAVE_VIEW_TEAM, RoleScope.CUSTOM);
        permissions.put(Permission.LEAVE_VIEW_ALL, RoleScope.CUSTOM);
        permissions.put(Permission.LEAVE_REQUEST, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("CUSTOM_ROLE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        // Set custom targets for leave view permissions
        if (customEmployeeIds != null || customDepartmentIds != null || customLocationIds != null) {
            SecurityContext.setCustomScopeTargets(Permission.LEAVE_VIEW_SELF,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
            SecurityContext.setCustomScopeTargets(Permission.LEAVE_VIEW_TEAM,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
            SecurityContext.setCustomScopeTargets(Permission.LEAVE_VIEW_ALL,
                    customEmployeeIds, customDepartmentIds, customLocationIds);
        }
    }

    private void setupSuperAdminByRole(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        // Give only SELF scope permissions - the SUPER_ADMIN role should bypass
        permissions.put(Permission.LEAVE_VIEW_SELF, RoleScope.SELF);
        permissions.put(Permission.LEAVE_VIEW_TEAM, RoleScope.SELF);
        permissions.put(Permission.LEAVE_REQUEST, RoleScope.SELF);

        // Use SUPER_ADMIN role - isSuperAdmin() checks for this role
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

}
