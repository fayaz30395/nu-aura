package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests verifying that the admin-only update endpoint and the
 * self-service update endpoint are correctly separated.
 *
 * <p>Sprint-1 hardening: {@link com.hrms.api.employee.dto.AdminEmployeeUpdateRequest}
 * was split off from {@link com.hrms.api.employee.dto.UpdateEmployeeRequest} so
 * that mass-assignment via the self-service PUT cannot escalate privilege fields
 * (designation, manager, level, bank, tax). The admin endpoint
 * (PUT /api/v1/employees/{id}/admin) is gated by EMPLOYEE_VIEW_ALL with
 * revalidate=true — non-admins must get 403.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Admin Employee Update Endpoint — 403 & Mass-Assignment Guards")
class AdminEmployeeUpdateRequest403Test {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final String ORIGINAL_DESIGNATION = "Software Engineer";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    private Employee targetEmployee;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);
        targetEmployee = createEmployee(ORIGINAL_DESIGNATION);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private Employee createEmployee(String designation) {
        User user = User.builder()
                .email("target-" + System.currentTimeMillis() + "@nulogic.test")
                .firstName("Target")
                .lastName("Employee")
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.save(user);

        Employee employee = Employee.builder()
                .employeeCode("EMP-" + UUID.randomUUID().toString().substring(0, 8))
                .firstName("Target")
                .lastName("Employee")
                .designation(designation)
                .joiningDate(LocalDate.now().minusDays(30))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(savedUser)
                .build();
        employee.setTenantId(TENANT_ID);
        return employeeRepository.save(employee);
    }

    /** Plain employee — has EMPLOYEE:UPDATE for self-service only, no admin powers. */
    private void setupPlainEmployee(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EMPLOYEE_READ, RoleScope.SELF);
        permissions.put(Permission.EMPLOYEE_UPDATE, RoleScope.SELF);
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId,
                Set.of("EMPLOYEE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    /** Tenant admin — bypasses @RequiresPermission via SecurityContext#isTenantAdmin(). */
    private void setupTenantAdmin(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        permissions.put(Permission.EMPLOYEE_VIEW_ALL, RoleScope.ALL);
        permissions.put(Permission.EMPLOYEE_UPDATE, RoleScope.ALL);
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId,
                Set.of("TENANT_ADMIN", "SUPER_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    @Test
    @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
    @DisplayName("Non-admin EMPLOYEE cannot access PUT /{id}/admin — returns 403")
    void nonAdminCannotAccessAdminEndpoint_returns403() throws Exception {
        // Caller is a plain employee with NO SYSTEM_ADMIN / EMPLOYEE_VIEW_ALL.
        // The admin endpoint must reject — privilege escalation is the threat.
        setupPlainEmployee(UUID.randomUUID());

        String body = "{\"designation\":\"VP\"}";

        mockMvc.perform(put("/api/v1/employees/" + targetEmployee.getId() + "/admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "tenantadmin@test.com", roles = {"TENANT_ADMIN"})
    @DisplayName("TENANT_ADMIN can access PUT /{id}/admin — returns 200")
    void adminCanAccessAdminEndpoint_returns200() throws Exception {
        setupTenantAdmin(UUID.randomUUID());

        String body = "{\"designation\":\"VP\"}";

        mockMvc.perform(put("/api/v1/employees/" + targetEmployee.getId() + "/admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        // Admin endpoint applied the change.
        Employee reloaded = employeeRepository.findById(targetEmployee.getId()).orElseThrow();
        assertEquals("VP", reloaded.getDesignation(),
                "Admin endpoint must apply designation change");
    }

    @Test
    @WithMockUser(username = "tenantadmin@test.com", roles = {"TENANT_ADMIN"})
    @DisplayName("Self-service PUT /{id} ignores admin-only fields — designation unchanged")
    void selfServiceEndpointStripsAdminFields_returns200_designationUnchanged() throws Exception {
        // The point of the DTO split: a 'designation' field in the JSON body sent to
        // the self-service endpoint must NOT mutate the employee. Jackson silently
        // drops unknown fields (Spring Boot default), so the field reaches the
        // service as null and is never applied. We verify by reloading the entity.
        setupTenantAdmin(UUID.randomUUID());

        String body = "{\"firstName\":\"NewFirst\",\"designation\":\"VP\"}";

        mockMvc.perform(put("/api/v1/employees/" + targetEmployee.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        Employee reloaded = employeeRepository.findById(targetEmployee.getId()).orElseThrow();
        // Self-service field WAS applied:
        assertEquals("NewFirst", reloaded.getFirstName(),
                "Self-service endpoint must apply allowed fields");
        // Admin-only field was NOT applied (mass-assignment guard):
        assertEquals(ORIGINAL_DESIGNATION, reloaded.getDesignation(),
                "Self-service endpoint must NOT mutate admin-only fields (designation)");
    }
}
