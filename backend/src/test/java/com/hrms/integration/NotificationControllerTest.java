package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.notification.dto.CreateNotificationRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for NotificationController.
 * Covers UC-NOTIF-001 through UC-NOTIF-006.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Notification Controller Integration Tests")
class NotificationControllerTest {

    private static final String BASE_URL = "/api/v1/notifications";
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
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // ========================= UC-NOTIF-001: User sees own notifications =========================

    @Test
    @DisplayName("ucNotifA1_getMyNotifications_returns200WithPage")
    void ucNotifA1_getMyNotifications_returns200WithPage() throws Exception {
        mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("ucNotifA2_getUnreadNotifications_returns200WithList")
    void ucNotifA2_getUnreadNotifications_returns200WithList() throws Exception {
        mockMvc.perform(get(BASE_URL + "/unread"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ucNotifA3_getUnreadCount_returns200WithCount")
    void ucNotifA3_getUnreadCount_returns200WithCount() throws Exception {
        mockMvc.perform(get(BASE_URL + "/unread/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isNumber());
    }

    @Test
    @DisplayName("ucNotifA4_markAllAsRead_returns200")
    void ucNotifA4_markAllAsRead_returns200() throws Exception {
        // Create a notification first
        CreateNotificationRequest createRequest = buildNotificationRequest(USER_ID);
        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        // Mark all as read
        mockMvc.perform(put(BASE_URL + "/read-all"))
                .andExpect(status().isOk());

        // Verify unread count is now 0
        mockMvc.perform(get(BASE_URL + "/unread/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(0));
    }

    @Test
    @DisplayName("ucNotifA5_createNotification_returns201")
    void ucNotifA5_createNotification_returns201() throws Exception {
        CreateNotificationRequest request = buildNotificationRequest(USER_ID);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Leave Request Approved"))
                .andExpect(jsonPath("$.isRead").value(false));
    }

    @Test
    @DisplayName("ucNotifA6_employeeSeesOnlyOwnNotifications_countMatchesExpectations")
    void ucNotifA6_employeeSeesOnlyOwnNotifications_countMatchesExpectations() throws Exception {
        // Create notification for USER_ID (super admin / current user)
        CreateNotificationRequest request = buildNotificationRequest(USER_ID);
        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Switch to an employee with same NOTIFICATIONS_VIEW permission but different USER_ID
        UUID otherUserId = UUID.randomUUID();
        Map<String, RoleScope> perms = new HashMap<>();
        perms.put(Permission.NOTIFICATIONS_VIEW, RoleScope.SELF);
        SecurityContext.setCurrentUser(otherUserId, UUID.randomUUID(), Set.of("EMPLOYEE"), perms);

        // This employee should see 0 notifications (their own, not others')
        String body = mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int totalElements = objectMapper.readTree(body).get("totalElements").asInt();
        // The notification created for USER_ID should NOT appear for otherUserId
        Assertions.assertEquals(0, totalElements,
                "Employee should only see their own notifications, not others'");
    }

    // ============================= Helpers =============================

    private CreateNotificationRequest buildNotificationRequest(UUID userId) {
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setUserId(userId);
        request.setType("LEAVE_APPROVED");
        request.setTitle("Leave Request Approved");
        request.setMessage("Your annual leave request for 3 days has been approved.");
        request.setPriority("NORMAL");
        return request;
    }
}
