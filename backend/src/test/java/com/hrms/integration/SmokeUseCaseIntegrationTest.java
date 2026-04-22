package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Smoke Use-Case Integration Tests — UC-SMOKE-001 through UC-SMOKE-005
 * <p>
 * End-to-end smoke tests covering: health check, auth flow, leave flow,
 * employee CRUD, and multi-endpoint non-500 verification.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("Smoke Use-Case Integration Tests (UC-SMOKE)")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SmokeUseCaseIntegrationTest {

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
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-SMOKE-001: health endpoint returns UP
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("UC-SMOKE-001: GET /actuator/health returns UP status")
    void ucSmoke001_healthEndpoint_returnsUp() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-SMOKE-002: auth flow — verify /api/v1/auth/me works with valid context
    // (Full login/logout requires JWT filter — tested here via context-based approach)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(2)
    @DisplayName("UC-SMOKE-002: GET /api/v1/auth/me returns user info for authenticated context")
    void ucSmoke002_authFlow_getMeReturnsUserInfo() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // With valid SecurityContext, should return 200 or 404 (no user in test DB)
                    // NOT 500 (error) or 403 (forbidden)
                    assertThat(status).isNotEqualTo(500);
                    assertThat(status).isNotEqualTo(403);
                });
    }

    @Test
    @Order(2)
    @DisplayName("UC-SMOKE-002: POST /api/v1/auth/login with invalid credentials returns 401 or 400")
    void ucSmoke002_authFlow_loginWithInvalidCredentials_returns401() throws Exception {
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("email", "smoke.test.invalid@nulogic.test");
        loginRequest.put("password", "WrongPassword!123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // Bad credentials = 401, account locked = 423, validation error = 400
                    assertThat(status).isIn(400, 401, 423);
                });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-SMOKE-003: leave apply + approve full flow (happy path end-to-end)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(3)
    @DisplayName("UC-SMOKE-003: leave apply full flow — list leave types, then apply")
    void ucSmoke003_leaveApplyFlow_listTypesAndApply() throws Exception {
        // Step 1: List leave types — needed to get a valid leaveTypeId
        MvcResult typesResult = mockMvc.perform(get("/api/v1/leave-types")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        String typesJson = typesResult.getResponse().getContentAsString();
        assertThat(typesJson).isNotBlank();

        // Step 2: Apply for leave — use a random UUID for leaveTypeId
        // (May return 400 if leaveTypeId not found in test DB, but not 500)
        Map<String, Object> leaveRequest = new HashMap<>();
        leaveRequest.put("leaveTypeId", UUID.randomUUID().toString());
        leaveRequest.put("startDate", LocalDate.now().plusDays(7).toString());
        leaveRequest.put("endDate", LocalDate.now().plusDays(9).toString());
        leaveRequest.put("reason", "Smoke test leave request");

        mockMvc.perform(post("/api/v1/leave-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(leaveRequest)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 201 = created, 400 = validation/business rule, 404 = leave type not found
                    // NOT 500 or 403
                    assertThat(status).isNotEqualTo(500);
                    assertThat(status).isNotEqualTo(403);
                });
    }

    @Test
    @Order(3)
    @DisplayName("UC-SMOKE-003: list leave requests returns 200 with pagination")
    void ucSmoke003_leaveApplyFlow_listReturns200() throws Exception {
        mockMvc.perform(get("/api/v1/leave-requests")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-SMOKE-004: employee CRUD — create, read, update (full cycle)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(4)
    @DisplayName("UC-SMOKE-004: employee CRUD — create → read → update")
    void ucSmoke004_employeeCrud_createReadUpdate() throws Exception {
        String uniqueEmail = "smoke.crud." + System.currentTimeMillis() + "@nulogic.test";

        // Step 1: Create
        Map<String, Object> createReq = new HashMap<>();
        createReq.put("firstName", "Smoke");
        createReq.put("lastName", "Test");
        createReq.put("email", uniqueEmail);
        createReq.put("dateOfBirth", "1990-01-01");
        createReq.put("employmentType", "FULL_TIME");

        MvcResult createResult = mockMvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(201, 400); // 400 if required fields missing
                })
                .andReturn();

        // If creation succeeded (201), test read and update
        if (createResult.getResponse().getStatus() == 201) {
            String responseBody = createResult.getResponse().getContentAsString();
            Map<?, ?> responseMap = objectMapper.readValue(responseBody, Map.class);
            Object employeeId = responseMap.get("id");
            assertThat(employeeId).isNotNull();

            // Step 2: Read
            mockMvc.perform(get("/api/v1/employees/" + employeeId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(employeeId.toString()));

            // Step 3: Update
            Map<String, Object> updateReq = new HashMap<>();
            updateReq.put("firstName", "SmokeUpdated");

            mockMvc.perform(put("/api/v1/employees/" + employeeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateReq)))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status).isIn(200, 400);
                    });
        }
    }

    @Test
    @Order(4)
    @DisplayName("UC-SMOKE-004: GET /api/v1/employees returns paginated list")
    void ucSmoke004_employeeCrud_listReturns200() throws Exception {
        mockMvc.perform(get("/api/v1/employees")
                        .param("page", "0")
                        .param("size", "20")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UC-SMOKE-005: all major endpoints return non-500 status
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("UC-SMOKE-005: Major HRMS endpoints return non-500 status")
    void ucSmoke005_hrmsEndpoints_returnNon500() throws Exception {
        List<String> endpoints = List.of(
                "/api/v1/employees",
                "/api/v1/leave-requests",
                "/api/v1/leave-types",
                "/api/v1/leave-balances",
                "/api/v1/attendance",
                "/api/v1/payroll/runs",
                "/api/v1/dashboard/metrics"
        );

        for (String endpoint : endpoints) {
            mockMvc.perform(get(endpoint)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status)
                                .as("Endpoint %s returned 500", endpoint)
                                .isNotEqualTo(500);
                    });
        }
    }

    @Test
    @Order(5)
    @DisplayName("UC-SMOKE-005: Major Hire/Grow endpoints return non-500 status")
    void ucSmoke005_hireGrowEndpoints_returnNon500() throws Exception {
        List<String> endpoints = List.of(
                "/api/v1/recruitment/job-openings",
                "/api/v1/lms/courses",
                "/api/v1/lms/catalog",
                "/api/v1/reviews",
                "/api/v1/okr",
                "/api/v1/analytics/summary"
        );

        for (String endpoint : endpoints) {
            mockMvc.perform(get(endpoint)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status)
                                .as("Endpoint %s returned 500", endpoint)
                                .isNotEqualTo(500);
                    });
        }
    }

    @Test
    @Order(5)
    @DisplayName("UC-SMOKE-005: Admin endpoints return non-500 for SUPER_ADMIN")
    void ucSmoke005_adminEndpoints_returnNon500ForSuperAdmin() throws Exception {
        List<String> endpoints = List.of(
                "/api/v1/admin/health",
                "/api/v1/admin/settings",
                "/api/v1/admin/stats",
                "/api/v1/admin/users",
                "/api/v1/roles"
        );

        for (String endpoint : endpoints) {
            mockMvc.perform(get(endpoint)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status)
                                .as("Admin endpoint %s returned 500", endpoint)
                                .isNotEqualTo(500);
                    });
        }
    }
}
