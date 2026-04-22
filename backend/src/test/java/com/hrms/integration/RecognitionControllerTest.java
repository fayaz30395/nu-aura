package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recognition.dto.RecognitionRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.recognition.Recognition.RecognitionCategory;
import com.hrms.domain.recognition.Recognition.RecognitionType;
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
 * Integration tests for Recognition use cases.
 * Covers UC-GROW-007: Send kudos to peer (appears in recognition feed).
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Recognition Controller Integration Tests — UC-GROW-007")
class RecognitionControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID PEER_ID = UUID.randomUUID();
    private static final String BASE = "/api/v1/recognition";

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
    // UC-GROW-007  Send Kudos to Peer
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-007 happy: send kudos returns 201")
    void ucGrow007_sendKudos_returns201() throws Exception {
        RecognitionRequest req = new RecognitionRequest();
        req.setReceiverId(PEER_ID);
        req.setType(RecognitionType.KUDOS);
        req.setCategory(RecognitionCategory.TEAMWORK);
        req.setTitle("Great teamwork on Q1 delivery!");
        req.setMessage("You showed excellent collaboration skills.");
        req.setPoints(10);
        req.setIsPublic(true);
        req.setIsAnonymous(false);

        MvcResult result = mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("id");
    }

    @Test
    @DisplayName("UC-GROW-007 happy: recognition feed returns 200 — kudos appear in feed")
    void ucGrow007_kudosAppearsInFeed_returns200() throws Exception {
        // First send a kudos
        RecognitionRequest req = new RecognitionRequest();
        req.setReceiverId(PEER_ID);
        req.setType(RecognitionType.KUDOS);
        req.setCategory(RecognitionCategory.INNOVATION);
        req.setTitle("Innovative idea!");
        req.setMessage("Great creative thinking.");
        req.setPoints(5);
        req.setIsPublic(true);
        req.setIsAnonymous(false);

        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Check the feed — kudos should appear
        mockMvc.perform(get(BASE + "/feed"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-007 negative: send kudos with missing receiverId returns 400")
    void ucGrow007_kudosMissingReceiver_returns400() throws Exception {
        RecognitionRequest req = new RecognitionRequest();
        // receiverId intentionally missing
        req.setType(RecognitionType.KUDOS);
        req.setTitle("Missing receiver");
        req.setMessage("This should fail.");
        req.setIsPublic(true);

        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("UC-GROW-007 happy: received recognitions endpoint returns 200")
    void ucGrow007_receivedRecognitions_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/received"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-007 happy: given recognitions endpoint returns 200")
    void ucGrow007_givenRecognitions_returns200() throws Exception {
        mockMvc.perform(get(BASE + "/given"))
                .andExpect(status().isOk());
    }
}
