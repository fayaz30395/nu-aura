package com.hrms.api.notification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.notification.dto.*;
import com.hrms.application.notification.service.MultiChannelNotificationService;
import com.hrms.common.security.*;
import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationPriority;
import com.hrms.domain.notification.NotificationStatus;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MultiChannelNotificationController.class)
@ContextConfiguration(classes = {MultiChannelNotificationController.class, MultiChannelNotificationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MultiChannelNotificationController Tests")
class MultiChannelNotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MultiChannelNotificationService notificationService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Template Management Tests")
    class TemplateTests {

        @Test
        @DisplayName("Should create notification template")
        void shouldCreateTemplate() throws Exception {
            NotificationTemplateDto request = NotificationTemplateDto.builder()
                    .code("LEAVE_APPROVED")
                    .name("Leave Approved Template")
                    .category("LEAVE")
                    .eventType("LEAVE_APPROVED")
                    .emailSubject("Leave Approved")
                    .emailBody("Your leave has been approved")
                    .build();

            NotificationTemplateDto response = NotificationTemplateDto.builder()
                    .id(UUID.randomUUID())
                    .code("LEAVE_APPROVED")
                    .name("Leave Approved Template")
                    .category("LEAVE")
                    .eventType("LEAVE_APPROVED")
                    .build();

            when(notificationService.createTemplate(any(NotificationTemplateDto.class))).thenReturn(response);

            mockMvc.perform(post("/api/v1/notifications/templates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.code").value("LEAVE_APPROVED"));
        }

        @Test
        @DisplayName("Should update notification template")
        void shouldUpdateTemplate() throws Exception {
            UUID templateId = UUID.randomUUID();
            NotificationTemplateDto request = NotificationTemplateDto.builder()
                    .code("LEAVE_APPROVED")
                    .name("Updated Leave Template")
                    .category("LEAVE")
                    .eventType("LEAVE_APPROVED")
                    .build();

            when(notificationService.updateTemplate(eq(templateId), any(NotificationTemplateDto.class)))
                    .thenReturn(request);

            mockMvc.perform(put("/api/v1/notifications/templates/{templateId}", templateId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Leave Template"));
        }

        @Test
        @DisplayName("Should search templates with pagination")
        void shouldSearchTemplates() throws Exception {
            NotificationTemplateDto dto = NotificationTemplateDto.builder()
                    .id(UUID.randomUUID())
                    .code("LEAVE_APPROVED")
                    .name("Leave Approved")
                    .category("LEAVE")
                    .eventType("LEAVE_APPROVED")
                    .build();

            Page<NotificationTemplateDto> page = new PageImpl<>(
                    List.of(dto), PageRequest.of(0, 20), 1);

            when(notificationService.searchTemplates(eq("LEAVE"), isNull(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/notifications/templates")
                            .param("category", "LEAVE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].code").value("LEAVE_APPROVED"));
        }

        @Test
        @DisplayName("Should get template by code")
        void shouldGetTemplateByCode() throws Exception {
            NotificationTemplateDto dto = NotificationTemplateDto.builder()
                    .id(UUID.randomUUID())
                    .code("LEAVE_APPROVED")
                    .name("Leave Approved")
                    .category("LEAVE")
                    .eventType("LEAVE_APPROVED")
                    .build();

            when(notificationService.getTemplateByCode("LEAVE_APPROVED")).thenReturn(dto);

            mockMvc.perform(get("/api/v1/notifications/templates/code/LEAVE_APPROVED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value("LEAVE_APPROVED"));
        }
    }

    @Nested
    @DisplayName("Send Notification Tests")
    class SendNotificationTests {

        @Test
        @DisplayName("Should send notification to recipients")
        void shouldSendNotification() throws Exception {
            SendNotificationRequest request = SendNotificationRequest.builder()
                    .templateCode("LEAVE_APPROVED")
                    .recipients(List.of(
                            SendNotificationRequest.RecipientInfo.builder()
                                    .userId(UUID.randomUUID())
                                    .email("john@example.com")
                                    .build()
                    ))
                    .channels(Set.of(NotificationChannel.EMAIL))
                    .priority(NotificationPriority.NORMAL)
                    .build();

            MultiChannelNotificationDto responseDto = MultiChannelNotificationDto.builder()
                    .id(UUID.randomUUID())
                    .templateCode("LEAVE_APPROVED")
                    .channel(NotificationChannel.EMAIL)
                    .status(NotificationStatus.SENT)
                    .build();

            when(notificationService.sendNotification(any(SendNotificationRequest.class)))
                    .thenReturn(List.of(responseDto));

            mockMvc.perform(post("/api/v1/notifications/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].templateCode").value("LEAVE_APPROVED"));
        }
    }

    @Nested
    @DisplayName("User Notification Tests")
    class UserNotificationTests {

        @Test
        @DisplayName("Should get my notifications")
        void shouldGetMyNotifications() throws Exception {
            MultiChannelNotificationDto dto = MultiChannelNotificationDto.builder()
                    .id(UUID.randomUUID())
                    .title("New Leave Request")
                    .channel(NotificationChannel.IN_APP)
                    .status(NotificationStatus.DELIVERED)
                    .build();

            Page<MultiChannelNotificationDto> page = new PageImpl<>(
                    List.of(dto), PageRequest.of(0, 20), 1);

            when(notificationService.getUserNotifications(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/notifications/my"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));
        }

        @Test
        @DisplayName("Should get unread count")
        void shouldGetUnreadCount() throws Exception {
            when(notificationService.getUnreadCount()).thenReturn(5L);

            mockMvc.perform(get("/api/v1/notifications/my/unread-count"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("5"));
        }

        @Test
        @DisplayName("Should mark notification as read")
        void shouldMarkAsRead() throws Exception {
            UUID notificationId = UUID.randomUUID();
            doNothing().when(notificationService).markAsRead(notificationId);

            mockMvc.perform(put("/api/v1/notifications/{notificationId}/read", notificationId))
                    .andExpect(status().isOk());

            verify(notificationService).markAsRead(notificationId);
        }

        @Test
        @DisplayName("Should mark all as read")
        void shouldMarkAllAsRead() throws Exception {
            doNothing().when(notificationService).markAllAsRead();

            mockMvc.perform(put("/api/v1/notifications/my/read-all"))
                    .andExpect(status().isOk());

            verify(notificationService).markAllAsRead();
        }
    }

    @Nested
    @DisplayName("Dashboard Tests")
    class DashboardTests {

        @Test
        @DisplayName("Should get notification dashboard")
        void shouldGetDashboard() throws Exception {
            NotificationDashboard dashboard = NotificationDashboard.builder()
                    .totalNotificationsSent(100L)
                    .totalNotificationsDelivered(95L)
                    .totalNotificationsFailed(5L)
                    .deliveryRate(95.0)
                    .build();

            when(notificationService.getDashboard()).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/notifications/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalNotificationsSent").value(100))
                    .andExpect(jsonPath("$.deliveryRate").value(95.0));
        }
    }
}
