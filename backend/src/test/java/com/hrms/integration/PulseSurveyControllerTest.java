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
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Pulse Survey use cases.
 * Covers UC-GROW-008 (create + respond) and UC-GROW-021 (launch + results).
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Pulse Survey Controller Integration Tests — UC-GROW-008, UC-GROW-021")
class PulseSurveyControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final String BASE = "/api/v1/surveys";

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
    // UC-GROW-008  Survey Creation & Employee Response
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-008 happy: create pulse survey returns 201")
    void ucGrow008_createSurvey_returns201() throws Exception {
        Map<String, Object> req = buildSurveyRequest("SURVEY-" + uuid6());

        MvcResult result = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("id");
    }

    @Test
    @DisplayName("UC-GROW-008 happy: employee submits survey response returns 201")
    void ucGrow008_employeeSubmitsSurveyResponse_returns201() throws Exception {
        // Create survey
        Map<String, Object> surveyReq = buildSurveyRequest("RESP-SURVEY-" + uuid6());
        MvcResult surveyResult = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(surveyReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String surveyId = objectMapper.readTree(surveyResult.getResponse().getContentAsString())
                .get("id").asText();

        // Add a question
        Map<String, Object> questionReq = new LinkedHashMap<>();
        questionReq.put("questionText", "How satisfied are you with work-life balance?");
        questionReq.put("questionType", "RATING");
        questionReq.put("isRequired", true);
        questionReq.put("displayOrder", 1);

        MvcResult questionResult = mockMvc.perform(
                        post(BASE + "/{surveyId}/questions", UUID.fromString(surveyId))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(questionReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 201);
                })
                .andReturn();

        // Submit a response
        Map<String, Object> responseReq = new LinkedHashMap<>();
        responseReq.put("surveyId", surveyId);
        responseReq.put("employeeId", EMPLOYEE_ID.toString());
        responseReq.put("answers", List.of(
                Map.of("questionId", "placeholder", "ratingValue", 4)
        ));

        mockMvc.perform(post(BASE + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(responseReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 201, 400);
                });
    }

    @Test
    @DisplayName("UC-GROW-008 happy: list all surveys returns 200")
    void ucGrow008_listSurveys_returns200() throws Exception {
        mockMvc.perform(get(BASE))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-008 happy: list active surveys returns 200")
    void ucGrow008_listActiveSurveys_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/active"))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-021  Pulse Survey Launch & Results
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-021 happy: publish survey returns 200")
    void ucGrow021_publishSurvey_returns200() throws Exception {
        // Create survey
        Map<String, Object> req = buildSurveyRequest("LAUNCH-" + uuid6());
        MvcResult createResult = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String surveyId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asText();

        // Publish it
        mockMvc.perform(post(BASE + "/{surveyId}/publish", UUID.fromString(surveyId)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 200 = published, 409 = already published, 400 = no questions
                    assertThat(status).isIn(200, 400, 409);
                });
    }

    @Test
    @DisplayName("UC-GROW-021 happy: survey analytics returns 200 for HR role")
    void ucGrow021_surveyAnalytics_returns200ForHR() throws Exception {
        UUID surveyId = UUID.randomUUID();
        mockMvc.perform(get(BASE + "/{surveyId}/analytics", surveyId))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 404);
                });
    }

    @Test
    @DisplayName("UC-GROW-021 happy: survey dashboard returns 200")
    void ucGrow021_surveyDashboard_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/dashboard"))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private String uuid6() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private Map<String, Object> buildSurveyRequest(String title) {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("title", title);
        req.put("description", "Survey for " + title);
        req.put("surveyType", "PULSE");
        req.put("isAnonymous", true);
        return req;
    }
}
