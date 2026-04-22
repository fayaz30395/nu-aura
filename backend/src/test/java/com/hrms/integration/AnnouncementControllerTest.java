package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.announcement.dto.CreateAnnouncementRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.announcement.Announcement.AnnouncementCategory;
import com.hrms.domain.announcement.Announcement.AnnouncementPriority;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AnnouncementController.
 * Covers UC-ANNC-001 through UC-ANNC-004.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Announcement Controller Integration Tests")
class AnnouncementControllerTest {

    private static final String BASE_URL = "/api/v1/announcements";
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

    // ========================= UC-ANNC-001: Create announcement =========================

    @Test
    @DisplayName("ucAnncA1_createAnnouncement_returns201")
    void ucAnncA1_createAnnouncement_returns201() throws Exception {
        CreateAnnouncementRequest request = buildAnnouncementRequest("Q1 Company Update", "Our Q1 results are out.");

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Q1 Company Update"));
    }

    @Test
    @DisplayName("ucAnncA2_createAnnouncementMissingTitle_returns400")
    void ucAnncA2_createAnnouncementMissingTitle_returns400() throws Exception {
        CreateAnnouncementRequest request = CreateAnnouncementRequest.builder()
                // title intentionally omitted
                .content("Content without a title")
                .category(AnnouncementCategory.GENERAL)
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ucAnncA3_getAllAnnouncements_returns200WithPage")
    void ucAnncA3_getAllAnnouncements_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucAnncA4_pinAndUnpinAnnouncement_changesState")
    void ucAnncA4_pinAndUnpinAnnouncement_changesState() throws Exception {
        // Create announcement
        CreateAnnouncementRequest request = buildAnnouncementRequest("Pinnable Post", "This will be pinned.");
        String body = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String announcementId = objectMapper.readTree(body).get("id").asText();

        // Pin
        mockMvc.perform(post(BASE_URL + "/{announcementId}/pin", announcementId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPinned").value(true));

        // Unpin
        mockMvc.perform(post(BASE_URL + "/{announcementId}/unpin", announcementId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPinned").value(false));
    }

    // ============================= Helpers =============================

    private CreateAnnouncementRequest buildAnnouncementRequest(String title, String content) {
        return CreateAnnouncementRequest.builder()
                .title(title)
                .content(content)
                .category(AnnouncementCategory.GENERAL)
                .priority(AnnouncementPriority.MEDIUM)
                .publishedAt(LocalDateTime.now())
                .isPinned(false)
                .sendEmail(false)
                .requiresAcceptance(false)
                .build();
    }
}
