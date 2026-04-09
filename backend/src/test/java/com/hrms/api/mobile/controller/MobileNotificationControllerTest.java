package com.hrms.api.mobile.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.mobile.dto.MobileNotificationDto;
import com.hrms.application.mobile.service.MobileNotificationService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MobileNotificationController.class)
@ContextConfiguration(classes = {MobileNotificationController.class, MobileNotificationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MobileNotificationController Integration Tests")
class MobileNotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MobileNotificationService mobileNotificationService;
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
    @DisplayName("Register Device Tests")
    class RegisterDeviceTests {

        @Test
        @DisplayName("Should register device successfully")
        void shouldRegisterDeviceSuccessfully() throws Exception {
            MobileNotificationDto.DeviceRegistrationRequest request =
                    MobileNotificationDto.DeviceRegistrationRequest.builder()
                            .deviceToken("fcm_token_abc123")
                            .deviceType("ANDROID")
                            .deviceModel("Pixel 8")
                            .osVersion("Android 14")
                            .appVersion("1.0.0")
                            .isActive(true)
                            .build();

            doNothing().when(mobileNotificationService).registerDevice(any(MobileNotificationDto.DeviceRegistrationRequest.class));

            mockMvc.perform(post("/api/v1/mobile/notifications/register-device")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(mobileNotificationService).registerDevice(any(MobileNotificationDto.DeviceRegistrationRequest.class));
        }

        @Test
        @DisplayName("Should register iOS device successfully")
        void shouldRegisterIosDeviceSuccessfully() throws Exception {
            MobileNotificationDto.DeviceRegistrationRequest request =
                    MobileNotificationDto.DeviceRegistrationRequest.builder()
                            .deviceToken("apns_token_xyz789")
                            .deviceType("IOS")
                            .deviceModel("iPhone 15 Pro")
                            .osVersion("iOS 17")
                            .appVersion("1.0.0")
                            .isActive(true)
                            .build();

            doNothing().when(mobileNotificationService).registerDevice(any(MobileNotificationDto.DeviceRegistrationRequest.class));

            mockMvc.perform(post("/api/v1/mobile/notifications/register-device")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Should return 400 when device token is blank")
        void shouldReturn400WhenDeviceTokenIsBlank() throws Exception {
            MobileNotificationDto.DeviceRegistrationRequest request =
                    MobileNotificationDto.DeviceRegistrationRequest.builder()
                            .deviceToken("")
                            .deviceType("ANDROID")
                            .isActive(true)
                            .build();

            mockMvc.perform(post("/api/v1/mobile/notifications/register-device")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Unread Notifications Tests")
    class GetUnreadNotificationsTests {

        @Test
        @DisplayName("Should return unread notifications successfully")
        void shouldReturnUnreadNotificationsSuccessfully() throws Exception {
            MobileNotificationDto.UnreadNotificationsResponse response =
                    MobileNotificationDto.UnreadNotificationsResponse.builder()
                            .unreadCount(3)
                            .notifications(List.of(
                                    MobileNotificationDto.NotificationItem.builder()
                                            .notificationId(UUID.randomUUID())
                                            .type("APPROVAL")
                                            .title("Leave Approved")
                                            .message("Your casual leave has been approved")
                                            .category("Leave approval")
                                            .createdAt(LocalDateTime.now().minusHours(1))
                                            .isRead(false)
                                            .priority("MEDIUM")
                                            .build(),
                                    MobileNotificationDto.NotificationItem.builder()
                                            .notificationId(UUID.randomUUID())
                                            .type("ANNOUNCEMENT")
                                            .title("Holiday Notice")
                                            .message("Office will be closed on Friday")
                                            .category("Announcement")
                                            .createdAt(LocalDateTime.now().minusHours(2))
                                            .isRead(false)
                                            .priority("LOW")
                                            .build()))
                            .build();

            when(mobileNotificationService.getUnreadNotifications()).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/notifications/unread"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.unreadCount").value(3))
                    .andExpect(jsonPath("$.notifications", hasSize(2)))
                    .andExpect(jsonPath("$.notifications[0].type").value("APPROVAL"))
                    .andExpect(jsonPath("$.notifications[0].isRead").value(false));

            verify(mobileNotificationService).getUnreadNotifications();
        }

        @Test
        @DisplayName("Should return empty notifications when all are read")
        void shouldReturnEmptyNotificationsWhenAllRead() throws Exception {
            MobileNotificationDto.UnreadNotificationsResponse response =
                    MobileNotificationDto.UnreadNotificationsResponse.builder()
                            .unreadCount(0)
                            .notifications(Collections.emptyList())
                            .build();

            when(mobileNotificationService.getUnreadNotifications()).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/notifications/unread"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.unreadCount").value(0))
                    .andExpect(jsonPath("$.notifications", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("Mark Notifications As Read Tests")
    class MarkNotificationsAsReadTests {

        @Test
        @DisplayName("Should mark specific notifications as read")
        void shouldMarkSpecificNotificationsAsRead() throws Exception {
            List<UUID> notificationIds = List.of(UUID.randomUUID(), UUID.randomUUID());
            MobileNotificationDto.MarkReadRequest request =
                    MobileNotificationDto.MarkReadRequest.builder()
                            .notificationIds(notificationIds)
                            .markAllAsRead(false)
                            .build();

            MobileNotificationDto.MarkReadResponse response =
                    MobileNotificationDto.MarkReadResponse.builder()
                            .updatedCount(2)
                            .message("2 notifications marked as read")
                            .build();

            when(mobileNotificationService.markNotificationsAsRead(any(MobileNotificationDto.MarkReadRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/notifications/mark-read")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.updatedCount").value(2))
                    .andExpect(jsonPath("$.message").value("2 notifications marked as read"));

            verify(mobileNotificationService).markNotificationsAsRead(any(MobileNotificationDto.MarkReadRequest.class));
        }

        @Test
        @DisplayName("Should mark all notifications as read")
        void shouldMarkAllNotificationsAsRead() throws Exception {
            MobileNotificationDto.MarkReadRequest request =
                    MobileNotificationDto.MarkReadRequest.builder()
                            .markAllAsRead(true)
                            .build();

            MobileNotificationDto.MarkReadResponse response =
                    MobileNotificationDto.MarkReadResponse.builder()
                            .updatedCount(15)
                            .message("All notifications marked as read")
                            .build();

            when(mobileNotificationService.markNotificationsAsRead(any(MobileNotificationDto.MarkReadRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/notifications/mark-read")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.updatedCount").value(15));
        }
    }
}
