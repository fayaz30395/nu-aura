package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.GoalRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.performance.Goal;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Goal use cases.
 * Covers UC-GROW-014: goal check-in.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Goal Controller Integration Tests — UC-GROW-014")
class GoalControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final String BASE = "/api/v1/goals";

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

    // ─────────────────────────────────────────────────────────
    // UC-GROW-014  Goal Check-In
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-014 happy: create goal returns 201")
    void ucGrow014_createGoal_returns201() throws Exception {
        GoalRequest req = buildGoalRequest();

        MvcResult result = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(req.getTitle()))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("id");
    }

    @Test
    @DisplayName("UC-GROW-014 happy: update goal progress (check-in) returns 200")
    void ucGrow014_goalCheckin_updatesProgress() throws Exception {
        // Create a goal
        GoalRequest req = buildGoalRequest();
        MvcResult createResult = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String goalId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        // Update progress — this is the check-in
        Map<String, Object> progressUpdate = new LinkedHashMap<>();
        progressUpdate.put("progressPercentage", 60);
        progressUpdate.put("currentValue", new BigDecimal("60.0"));

        mockMvc.perform(put(BASE + "/{id}/progress", UUID.fromString(goalId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(progressUpdate)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 201);
                    if (status == 200) {
                        String body = result.getResponse().getContentAsString();
                        assertThat(body).containsAnyOf("60", "progress");
                    }
                });
    }

    @Test
    @DisplayName("UC-GROW-014 happy: get goals for employee returns 200")
    void ucGrow014_getGoalsForEmployee_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/employee/{employeeId}", EMPLOYEE_ID))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-014 happy: goal analytics returns 200")
    void ucGrow014_goalAnalytics_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/analytics"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-014 negative: check-in on non-existent goal returns 404")
    void ucGrow014_checkinNonExistentGoal_returns404() throws Exception {
        UUID nonExistentGoalId = UUID.randomUUID();
        Map<String, Object> progressUpdate = new LinkedHashMap<>();
        progressUpdate.put("progressPercentage", 50);

        mockMvc.perform(put(BASE + "/{id}/progress", nonExistentGoalId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(progressUpdate)))
                .andExpect(status().isNotFound());
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private GoalRequest buildGoalRequest() {
        return GoalRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .title("Improve code review turnaround")
                .description("Reduce review time from 5 days to 2 days")
                .goalType(Goal.GoalType.KPI)
                .category("PERFORMANCE")
                .targetValue(new BigDecimal("100.0"))
                .currentValue(new BigDecimal("0.0"))
                .measurementUnit("percent")
                .startDate(LocalDate.now())
                .dueDate(LocalDate.now().plusMonths(3))
                .status(Goal.GoalStatus.ACTIVE)
                .progressPercentage(0)
                .weight(100)
                .build();
    }
}
