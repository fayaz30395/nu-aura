package com.hrms.application.notification.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.domain.notification.Notification;
import com.hrms.infrastructure.notification.repository.NotificationRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService Tests")
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;
    private UUID userId;
    private Notification notification;

    @BeforeAll
    static void setUpClass() {
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);

        notification = Notification.builder()
                .userId(userId)
                .type(Notification.NotificationType.LEAVE_APPROVED)
                .title("Leave Approved")
                .message("Your leave request has been approved")
                .relatedEntityId(UUID.randomUUID())
                .relatedEntityType("LEAVE_REQUEST")
                .actionUrl("/leave/requests/123")
                .priority(Notification.Priority.NORMAL)
                .isRead(false)
                .build();
        notification.setId(UUID.randomUUID());
        notification.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Notification Tests")
    class CreateNotificationTests {

        @Test
        @DisplayName("Should create notification with all fields")
        void shouldCreateNotificationWithAllFields() {
            UUID relatedEntityId = UUID.randomUUID();
            when(notificationRepository.save(any(Notification.class)))
                    .thenAnswer(invocation -> {
                        Notification n = invocation.getArgument(0);
                        n.setId(UUID.randomUUID());
                        return n;
                    });

            Notification result = notificationService.createNotification(
                    userId,
                    Notification.NotificationType.LEAVE_APPROVED,
                    "Leave Approved",
                    "Your leave request has been approved",
                    relatedEntityId,
                    "LEAVE_REQUEST",
                    "/leave/requests/123",
                    Notification.Priority.HIGH
            );

            assertThat(result).isNotNull();
            assertThat(result.getUserId()).isEqualTo(userId);
            assertThat(result.getType()).isEqualTo(Notification.NotificationType.LEAVE_APPROVED);
            assertThat(result.getTitle()).isEqualTo("Leave Approved");
            assertThat(result.getPriority()).isEqualTo(Notification.Priority.HIGH);
            assertThat(result.getIsRead()).isFalse();
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(notificationRepository).save(any(Notification.class));
        }

        @Test
        @DisplayName("Should default priority to NORMAL when null")
        void shouldDefaultPriorityToNormalWhenNull() {
            when(notificationRepository.save(any(Notification.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            Notification result = notificationService.createNotification(
                    userId,
                    Notification.NotificationType.SYSTEM_ALERT,
                    "System Update",
                    "System maintenance scheduled",
                    null,
                    null,
                    null,
                    null
            );

            assertThat(result.getPriority()).isEqualTo(Notification.Priority.NORMAL);
        }

        @Test
        @DisplayName("Should create notification for different types")
        void shouldCreateNotificationForDifferentTypes() {
            when(notificationRepository.save(any(Notification.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            for (Notification.NotificationType type : Notification.NotificationType.values()) {
                Notification result = notificationService.createNotification(
                        userId, type, "Title", "Message", null, null, null, null
                );
                assertThat(result.getType()).isEqualTo(type);
            }
        }
    }

    @Nested
    @DisplayName("Get User Notifications Tests")
    class GetUserNotificationsTests {

        @Test
        @DisplayName("Should get user notifications with pagination")
        void shouldGetUserNotificationsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Notification> page = new PageImpl<>(List.of(notification));
            when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Pageable.class)))
                    .thenReturn(page);

            Page<Notification> result = notificationService.getUserNotifications(userId, 0, 10);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getUserId()).isEqualTo(userId);
        }

        @Test
        @DisplayName("Should return empty page when no notifications")
        void shouldReturnEmptyPageWhenNoNotifications() {
            when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Pageable.class)))
                    .thenReturn(Page.empty());

            Page<Notification> result = notificationService.getUserNotifications(userId, 0, 10);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
        }

        @Test
        @DisplayName("Should handle different page sizes")
        void shouldHandleDifferentPageSizes() {
            List<Notification> notifications = new ArrayList<>();
            for (int i = 0; i < 25; i++) {
                Notification n = Notification.builder()
                        .userId(userId)
                        .type(Notification.NotificationType.GENERAL)
                        .title("Notification " + i)
                        .message("Message " + i)
                        .isRead(false)
                        .build();
                notifications.add(n);
            }

            when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(notifications.subList(0, 5), PageRequest.of(0, 5), 25));

            Page<Notification> result = notificationService.getUserNotifications(userId, 0, 5);

            assertThat(result.getContent()).hasSize(5);
            assertThat(result.getTotalElements()).isEqualTo(25);
        }
    }

    @Nested
    @DisplayName("Get Unread Notifications Tests")
    class GetUnreadNotificationsTests {

        @Test
        @DisplayName("Should get unread notifications")
        void shouldGetUnreadNotifications() {
            when(notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId))
                    .thenReturn(List.of(notification));

            List<Notification> result = notificationService.getUnreadNotifications(userId);

            assertThat(result).isNotNull();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getIsRead()).isFalse();
        }

        @Test
        @DisplayName("Should return empty list when all notifications are read")
        void shouldReturnEmptyListWhenAllRead() {
            when(notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId))
                    .thenReturn(Collections.emptyList());

            List<Notification> result = notificationService.getUnreadNotifications(userId);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("Get Unread Count Tests")
    class GetUnreadCountTests {

        @Test
        @DisplayName("Should return correct unread count")
        void shouldReturnCorrectUnreadCount() {
            when(notificationRepository.countByUserIdAndIsReadFalse(userId))
                    .thenReturn(5L);

            Long count = notificationService.getUnreadCount(userId);

            assertThat(count).isEqualTo(5L);
        }

        @Test
        @DisplayName("Should return zero when no unread notifications")
        void shouldReturnZeroWhenNoUnread() {
            when(notificationRepository.countByUserIdAndIsReadFalse(userId))
                    .thenReturn(0L);

            Long count = notificationService.getUnreadCount(userId);

            assertThat(count).isZero();
        }
    }

    @Nested
    @DisplayName("Get Recent Notifications Tests")
    class GetRecentNotificationsTests {

        @Test
        @DisplayName("Should get recent notifications within specified hours")
        void shouldGetRecentNotificationsWithinHours() {
            when(notificationRepository.findRecentNotifications(eq(userId), any(LocalDateTime.class)))
                    .thenReturn(List.of(notification));

            List<Notification> result = notificationService.getRecentNotifications(userId, 24);

            assertThat(result).isNotNull();
            assertThat(result).hasSize(1);
            verify(notificationRepository).findRecentNotifications(eq(userId), any(LocalDateTime.class));
        }

        @Test
        @DisplayName("Should handle different hour ranges")
        void shouldHandleDifferentHourRanges() {
            when(notificationRepository.findRecentNotifications(eq(userId), any(LocalDateTime.class)))
                    .thenReturn(Collections.emptyList());

            notificationService.getRecentNotifications(userId, 1);
            notificationService.getRecentNotifications(userId, 12);
            notificationService.getRecentNotifications(userId, 48);

            verify(notificationRepository, times(3)).findRecentNotifications(eq(userId), any(LocalDateTime.class));
        }
    }

    @Nested
    @DisplayName("Mark As Read Tests")
    class MarkAsReadTests {

        @Test
        @DisplayName("Should mark notification as read")
        void shouldMarkNotificationAsRead() {
            UUID notificationId = notification.getId();
            doNothing().when(notificationRepository).markAsRead(eq(notificationId), any(LocalDateTime.class));

            notificationService.markAsRead(notificationId);

            verify(notificationRepository).markAsRead(eq(notificationId), any(LocalDateTime.class));
        }
    }

    @Nested
    @DisplayName("Mark All As Read Tests")
    class MarkAllAsReadTests {

        @Test
        @DisplayName("Should mark all notifications as read for user")
        void shouldMarkAllNotificationsAsReadForUser() {
            doNothing().when(notificationRepository).markAllAsReadForUser(eq(userId), any(LocalDateTime.class));

            notificationService.markAllAsRead(userId);

            verify(notificationRepository).markAllAsReadForUser(eq(userId), any(LocalDateTime.class));
        }
    }

    @Nested
    @DisplayName("Delete Notification Tests")
    class DeleteNotificationTests {

        @Test
        @DisplayName("Should delete notification by ID")
        void shouldDeleteNotificationById() {
            UUID notificationId = notification.getId();
            doNothing().when(notificationRepository).deleteById(notificationId);

            notificationService.deleteNotification(notificationId);

            verify(notificationRepository).deleteById(notificationId);
        }
    }

    @Nested
    @DisplayName("Delete Old Notifications Tests")
    class DeleteOldNotificationsTests {

        @Test
        @DisplayName("Should delete old notifications")
        void shouldDeleteOldNotifications() {
            doNothing().when(notificationRepository).deleteOldNotifications(eq(userId), any(LocalDateTime.class));

            notificationService.deleteOldNotifications(userId, 30);

            verify(notificationRepository).deleteOldNotifications(eq(userId), any(LocalDateTime.class));
        }

        @Test
        @DisplayName("Should handle different days old values")
        void shouldHandleDifferentDaysOldValues() {
            doNothing().when(notificationRepository).deleteOldNotifications(eq(userId), any(LocalDateTime.class));

            notificationService.deleteOldNotifications(userId, 7);
            notificationService.deleteOldNotifications(userId, 30);
            notificationService.deleteOldNotifications(userId, 90);

            verify(notificationRepository, times(3)).deleteOldNotifications(eq(userId), any(LocalDateTime.class));
        }
    }

    @Nested
    @DisplayName("Get Notification By Id Tests")
    class GetNotificationByIdTests {

        @Test
        @DisplayName("Should get notification by ID")
        void shouldGetNotificationById() {
            UUID notificationId = notification.getId();
            when(notificationRepository.findById(notificationId))
                    .thenReturn(Optional.of(notification));

            Notification result = notificationService.getNotificationById(notificationId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(notificationId);
        }

        @Test
        @DisplayName("Should throw exception when notification not found")
        void shouldThrowExceptionWhenNotFound() {
            UUID notificationId = UUID.randomUUID();
            when(notificationRepository.findById(notificationId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> notificationService.getNotificationById(notificationId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("not found");
        }
    }
}
