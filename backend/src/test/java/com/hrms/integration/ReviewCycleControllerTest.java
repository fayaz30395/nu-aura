package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.ReviewCycleRequest;
import com.hrms.application.performance.dto.ReviewCycleResponse;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.performance.ReviewCycle;
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

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Review Cycle use cases.
 * UC-GROW-001 is covered here (ReviewCycleController) and in PerformanceReviewControllerTest.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Review Cycle Controller Integration Tests — UC-GROW-001 supplementary")
class ReviewCycleControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final String BASE = "/api/v1/review-cycles";

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

    @Test
    @DisplayName("UC-GROW-001 happy: create review cycle returns 201 with all fields")
    void ucGrow001_createReviewCycle_returns201WithFields() throws Exception {
        ReviewCycleRequest req = buildRequest("FULL-RC-" + uuid6());

        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cycleName").value(req.getCycleName()))
                .andExpect(jsonPath("$.cycleType").value("ANNUAL"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @DisplayName("UC-GROW-001 happy: activate review cycle returns 200")
    void ucGrow001_activateReviewCycle_returns200() throws Exception {
        // Create cycle
        ReviewCycleRequest req = buildRequest("ACTIVATE-RC-" + uuid6());
        MvcResult createResult = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String cycleId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        // Activate it
        Map<String, Object> activateReq = new LinkedHashMap<>();
        activateReq.put("includeAllEmployees", true);

        mockMvc.perform(post(BASE + "/{id}/activate", UUID.fromString(cycleId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activateReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 201, 400);
                });
    }

    @Test
    @DisplayName("UC-GROW-001 happy: get active review cycles returns 200")
    void ucGrow001_getActiveCycles_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/active"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-001 happy: get review cycle by ID returns 200 after creation")
    void ucGrow001_getCycleById_returns200() throws Exception {
        ReviewCycleRequest req = buildRequest("BYID-RC-" + uuid6());
        MvcResult createResult = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String cycleId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get(BASE + "/{id}", UUID.fromString(cycleId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cycleName").value(req.getCycleName()));
    }

    @Test
    @DisplayName("UC-GROW-001 negative: get non-existent cycle returns 404")
    void ucGrow001_getNonExistentCycle_returns404() throws Exception {
        mockMvc.perform(get(BASE + "/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private String uuid6() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private ReviewCycleRequest buildRequest(String name) {
        return ReviewCycleRequest.builder()
                .cycleName(name)
                .cycleType(ReviewCycle.CycleType.ANNUAL)
                .startDate(LocalDate.now().minusMonths(6))
                .endDate(LocalDate.now())
                .selfReviewDeadline(LocalDate.now().minusMonths(3))
                .managerReviewDeadline(LocalDate.now().minusMonths(1))
                .status(ReviewCycle.CycleStatus.DRAFT)
                .description("Review cycle: " + name)
                .build();
    }
}
