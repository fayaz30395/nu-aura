package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.performance.dto.CheckInRequest;
import com.hrms.domain.performance.OkrCheckIn.CheckInType;
import com.hrms.api.performance.dto.KeyResultRequest;
import com.hrms.api.performance.dto.ObjectiveRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.performance.Objective.ObjectiveLevel;
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
 * Integration tests for OKR use cases.
 * Covers UC-GROW-005, UC-GROW-015, UC-GROW-016.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("OKR Controller Integration Tests — UC-GROW-005, UC-GROW-015, UC-GROW-016")
class OkrControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final String BASE = "/api/v1/okr";

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

    // ─────────────────────────────────────────────────────────
    // UC-GROW-005  Create OKR & Cascade to Team
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-005 happy: create company-level OKR returns 201")
    void ucGrow005_createCompanyOkr_returns201() throws Exception {
        ObjectiveRequest req = buildObjectiveRequest("OKR-COMPANY-" + uuid6(), ObjectiveLevel.COMPANY);

        MvcResult result = mockMvc.perform(post(BASE + "/objectives")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(req.getTitle()))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("id");
    }

    @Test
    @DisplayName("UC-GROW-005 happy: create individual OKR returns 201")
    void ucGrow005_createIndividualOkr_returns201() throws Exception {
        ObjectiveRequest req = buildObjectiveRequest("OKR-IND-" + uuid6(), ObjectiveLevel.INDIVIDUAL);

        mockMvc.perform(post(BASE + "/objectives")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.objectiveLevel").value("INDIVIDUAL"));
    }

    @Test
    @DisplayName("UC-GROW-005 happy: list all objectives returns 200")
    void ucGrow005_listObjectives_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/objectives"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-005 happy: list company objectives (cascade source) returns 200")
    void ucGrow005_listCompanyObjectives_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/company/objectives"))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-015  OKR Cascade Company → Team
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-015 happy: create team OKR with parent company objective")
    void ucGrow015_cascadeCompanyToTeam_returns201() throws Exception {
        // Create parent company objective
        ObjectiveRequest parentReq = buildObjectiveRequest("COMPANY-OBJ-" + uuid6(), ObjectiveLevel.COMPANY);
        MvcResult parentResult = mockMvc.perform(post(BASE + "/objectives")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(parentReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String parentId = objectMapper.readTree(parentResult.getResponse().getContentAsString())
                .get("id").asText();

        // Create child team objective aligned to parent
        ObjectiveRequest teamReq = buildObjectiveRequest("TEAM-OBJ-" + uuid6(), ObjectiveLevel.TEAM);
        teamReq.setParentObjectiveId(UUID.fromString(parentId));
        teamReq.setAlignedToCompanyObjective(UUID.fromString(parentId));

        mockMvc.perform(post(BASE + "/objectives")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(teamReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.objectiveLevel").value("TEAM"));
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-016  OKR Progress Scoring
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-016 happy: OKR check-in records progress returns 201")
    void ucGrow016_okrProgressCheckin_returns201() throws Exception {
        // Create objective first
        ObjectiveRequest objReq = buildObjectiveRequest("OKR-PROGRESS-" + uuid6(), ObjectiveLevel.INDIVIDUAL);
        MvcResult objResult = mockMvc.perform(post(BASE + "/objectives")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(objReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String objectiveId = objectMapper.readTree(objResult.getResponse().getContentAsString())
                .get("id").asText();

        CheckInRequest checkIn = CheckInRequest.builder()
                .objectiveId(UUID.fromString(objectiveId))
                .newProgress(new BigDecimal("65.0"))
                .confidenceLevel(7)
                .notes("Making good progress")
                .nextSteps("Complete remaining milestones")
                .checkInType(CheckInType.PROGRESS_UPDATE)
                .build();

        mockMvc.perform(post(BASE + "/check-ins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkIn)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 201 success or 200
                    assertThat(status).isIn(200, 201);
                });
    }

    @Test
    @DisplayName("UC-GROW-016 happy: OKR dashboard summary returns 200")
    void ucGrow016_okrDashboardSummary_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/dashboard/summary"))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private String uuid6() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private ObjectiveRequest buildObjectiveRequest(String title, ObjectiveLevel level) {
        return ObjectiveRequest.builder()
                .title(title)
                .description("Objective for " + title)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .objectiveLevel(level)
                .weight(100)
                .visibility("PUBLIC")
                .checkInFrequency("WEEKLY")
                .build();
    }
}
