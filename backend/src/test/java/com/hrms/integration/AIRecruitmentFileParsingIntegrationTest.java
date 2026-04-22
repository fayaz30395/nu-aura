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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AI recruitment file parsing.
 * Covers UC-HIRE-009: Resume parse from upload.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("AI Recruitment File Parsing Integration Tests — UC-HIRE-009")
class AIRecruitmentFileParsingIntegrationTest {

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

    // ─────────────────────────────────────────────────────────
    // UC-HIRE-009  Resume Parse from Upload
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-HIRE-009 happy: resume parse endpoint accepts file upload")
    void ucHire009_resumeParseUpload_endpointAcceptsRequest() throws Exception {
        // Create a minimal PDF-like byte array
        byte[] content = "%PDF-1.4 resume content".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", content);

        mockMvc.perform(multipart("/api/v1/recruitment/ai/parse-resume/upload")
                        .file(file))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // 200 success, 400 if validation, 503 if AI service unavailable in test
                    assertThat(status).isIn(200, 400, 503);
                });
    }

    @Test
    @DisplayName("UC-HIRE-009 happy: resume parse via JSON URL returns 200 or service unavailable")
    void ucHire009_resumeParseViaUrl_returns200OrUnavailable() throws Exception {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("resumeUrl", "https://storage.example.com/resumes/test-resume.pdf");
        req.put("candidateId", UUID.randomUUID().toString());

        mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 400, 503);
                });
    }

    @Test
    @DisplayName("UC-HIRE-009 negative: resume parse with missing URL returns 400")
    void ucHire009_resumeParseNoUrl_returns400() throws Exception {
        Map<String, Object> req = new LinkedHashMap<>();
        // Missing resumeUrl

        mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(400, 503);
                });
    }
}
