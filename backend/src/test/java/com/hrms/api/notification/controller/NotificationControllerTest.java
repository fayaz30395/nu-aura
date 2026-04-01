package com.hrms.api.notification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.notification.dto.CreateNotificationRequest;
import com.hrms.api.notification.dto.NotificationResponse;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.notification.Notification;
import com.hrms.domain.user.RoleScope;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
@ContextConfiguration(classes = {NotificationController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("NotificationController Unit Tests")
class NotificationControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private NotificationService notificationService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;


    private static final String BASE_URL = "/api/v1/notifications";

    private UUID notificationId;
    private UUID userId;
    private NotificationResponse notificationResponse;
    private Notification notification;

    @BeforeEach
    void setUp() {
        notificationId = UUID.randomUUID();
        userId = UUID.randomUUID();

        // SecurityContext must have a current user for endpoints that call SecurityContext.getCurrentUserId()
        Map<String, RoleScope> emptyPermissions = new java.util.HashMap<>();
        SecurityContext.setCurrentUser(userId, UUID.randomUUID(), Set.of("EMPLOYEE"), emptyPermissions);

        notification = new Notification();
        notification.setId(notificationId);
        notification.setUserId(userId);
        notification.setTitle("Leave Approved");
        notification.setMessage("Your leave request has been approved.");
        notification.setType(Notification.NotificationType.LEAVE_APPROVED);
        notification.setPriority(Notification.Priority.NORMAL);
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        notificationResponse = NotificationResponse.builder()
                .id(notificationId)
                .userId(userId)
                .title("Leave Approved")
                .message("Your leave request has been approved.")
                .type(Notification.NotificationType.LEAVE_APPROVED.name())
                .priority(Notification.Priority.NORMAL.name())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    // ===================== List Notifications Tests =====================

    @Nested
    @DisplayName("GET /notifications — List my notifications")
    class ListNotificationsTests {

        @Test
        @DisplayName("Should return paginated notifications for current user")
        void shouldReturnPaginatedNotificationsForCurrentUser() throws Exception {
            Page<Notification> page = new PageImpl<>(
                    List.of(notification), Pageable.ofSize(20), 1
            );

            when(notificationService.getUserNotifications(eq(userId), eq(0), eq(20)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].title").value("Leave Approved"))
                    .andExpect(jsonPath("$.content[0].isRead").value(false));

            verify(notificationService).getUserNotifications(eq(userId), eq(0), eq(20));
        }

        @Test
        @DisplayName("Should use default pagination when params not provided")
        void shouldUseDefaultPaginationWhenParamsNotProvided() throws Exception {
            Page<Notification> page = new PageImpl<>(List.of(), Pageable.ofSize(20), 0);

            when(notificationService.getUserNotifications(any(UUID.class), eq(0), eq(20)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));

            verify(notificationService).getUserNotifications(any(UUID.class), eq(0), eq(20));
        }

        @Test
        @DisplayName("Should return notifications with custom page size")
        void shouldReturnNotificationsWithCustomPageSize() throws Exception {
            Page<Notification> page = new PageImpl<>(List.of(notification), Pageable.ofSize(10), 1);

            when(notificationService.getUserNotifications(any(UUID.class), eq(0), eq(10)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk());

            verify(notificationService).getUserNotifications(any(UUID.class), eq(0), eq(10));
        }
    }

    // ===================== Unread Notifications Tests =====================

    @Nested
    @DisplayName("GET /notifications/unread — Get unread notifications")
    class UnreadNotificationsTests {

        @Test
        @DisplayName("Should return unread notifications for current user")
        void shouldReturnUnreadNotifications() throws Exception {
            when(notificationService.getUnreadNotifications(userId))
                    .thenReturn(List.of(notification));

            mockMvc.perform(get(BASE_URL + "/unread"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].isRead").value(false));

            verify(notificationService).getUnreadNotifications(userId);
        }

        @Test
        @DisplayName("Should return empty list when no unread notifications")
        void shouldReturnEmptyListWhenNoUnreadNotifications() throws Exception {
            when(notificationService.getUnreadNotifications(any(UUID.class)))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL + "/unread"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // ===================== Unread Count Tests =====================

    @Nested
    @DisplayName("GET /notifications/unread/count — Get unread count")
    class UnreadCountTests {

        @Test
        @DisplayName("Should return correct unread count")
        void shouldReturnCorrectUnreadCount() throws Exception {
            when(notificationService.getUnreadCount(userId)).thenReturn(7L);

            mockMvc.perform(get(BASE_URL + "/unread/count"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").value(7));

            verify(notificationService).getUnreadCount(userId);
        }

        @Test
        @DisplayName("Should return zero when no unread notifications")
        void shouldReturnZeroWhenNoUnread() throws Exception {
            when(notificationService.getUnreadCount(any(UUID.class))).thenReturn(0L);

            mockMvc.perform(get(BASE_URL + "/unread/count"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").value(0));
        }
    }

    // ===================== Recent Notifications Tests =====================

    @Nested
    @DisplayName("GET /notifications/recent — Get recent notifications")
    class RecentNotificationsTests {

        @Test
        @DisplayName("Should return notifications from last 24 hours by default")
        void shouldReturnRecentNotificationsWithDefaultHours() throws Exception {
            when(notificationService.getRecentNotifications(userId, 24))
                    .thenReturn(List.of(notification));

            mockMvc.perform(get(BASE_URL + "/recent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(notificationService).getRecentNotifications(userId, 24);
        }

        @Test
        @DisplayName("Should return recent notifications with custom hours parameter")
        void shouldReturnRecentNotificationsWithCustomHours() throws Exception {
            when(notificationService.getRecentNotifications(userId, 48))
                    .thenReturn(List.of(notification));

            mockMvc.perform(get(BASE_URL + "/recent").param("hours", "48"))
                    .andExpect(status().isOk());

            verify(notificationService).getRecentNotifications(userId, 48);
        }
    }

    // ===================== Get By ID Tests =====================

    @Nested
    @DisplayName("GET /notifications/{id} — Get notification by ID")
    class GetNotificationByIdTests {

        @Test
        @DisplayName("Should return notification by ID")
        void shouldReturnNotificationById() throws Exception {
            when(notificationService.getNotificationById(notificationId)).thenReturn(notification);

            mockMvc.perform(get(BASE_URL + "/{id}", notificationId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(notificationId.toString()))
                    .andExpect(jsonPath("$.title").value("Leave Approved"));

            verify(notificationService).getNotificationById(notificationId);
        }
    }

    // ===================== Create Notification Tests =====================

    @Nested
    @DisplayName("POST /notifications — Create notification")
    class CreateNotificationTests {

        @Test
        @DisplayName("Should create notification successfully")
        void shouldCreateNotificationSuccessfully() throws Exception {
            CreateNotificationRequest request = CreateNotificationRequest.builder()
                    .userId(userId)
                    .type(Notification.NotificationType.LEAVE_APPROVED.name())
                    .title("Leave Approved")
                    .message("Your leave has been approved.")
                    .priority(Notification.Priority.NORMAL.name())
                    .build();

            when(notificationService.createNotification(
                    any(UUID.class), any(), anyString(), anyString(), any(), any(), any(), any()))
                    .thenReturn(notification);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("Leave Approved"))
                    .andExpect(jsonPath("$.type").value("LEAVE_APPROVED"));

            verify(notificationService).createNotification(
                    eq(userId),
                    eq(Notification.NotificationType.LEAVE_APPROVED),
                    eq("Leave Approved"),
                    eq("Your leave has been approved."),
                    isNull(), isNull(), isNull(),
                    eq(Notification.Priority.NORMAL));
        }

        @Test
        @DisplayName("Should create notification without optional fields")
        void shouldCreateNotificationWithoutOptionalFields() throws Exception {
            CreateNotificationRequest request = CreateNotificationRequest.builder()
                    .userId(userId)
                    .type(Notification.NotificationType.ATTENDANCE_ALERT.name())
                    .title("Attendance Alert")
                    .message("You forgot to check out.")
                    .build();

            when(notificationService.createNotification(
                    any(), any(), anyString(), anyString(), any(), any(), any(), any()))
                    .thenReturn(notification);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Should return 400 when required fields are missing")
        void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
            CreateNotificationRequest request = new CreateNotificationRequest();
            // Missing userId, type, title, message

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when title exceeds max length")
        void shouldReturn400WhenTitleExceedsMaxLength() throws Exception {
            CreateNotificationRequest request = CreateNotificationRequest.builder()
                    .userId(userId)
                    .type("LEAVE_APPROVED")
                    .title("A".repeat(201))   // exceeds 200 char limit
                    .message("Some message")
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ===================== Mark as Read Tests =====================

    @Nested
    @DisplayName("PUT /notifications/read-all — Mark all as read")
    class MarkAllAsReadTests {

        @Test
        @DisplayName("Should mark all notifications as read")
        void shouldMarkAllNotificationsAsRead() throws Exception {
            doNothing().when(notificationService).markAllAsRead(userId);

            mockMvc.perform(put(BASE_URL + "/read-all"))
                    .andExpect(status().isOk());

            verify(notificationService).markAllAsRead(userId);
        }
    }

    // ===================== Delete Notification Tests =====================

    @Nested
    @DisplayName("DELETE /notifications/{id} — Delete notification")
    class DeleteNotificationTests {

        @Test
        @DisplayName("Should delete notification successfully")
        void shouldDeleteNotificationSuccessfully() throws Exception {
            doNothing().when(notificationService).deleteNotification(notificationId);

            mockMvc.perform(delete(BASE_URL + "/{id}", notificationId))
                    .andExpect(status().isNoContent());

            verify(notificationService).deleteNotification(notificationId);
        }
    }

    // ===================== Bulk Operations Tests =====================

    @Nested
    @DisplayName("Bulk notification scenarios")
    class BulkOperationTests {

        @Test
        @DisplayName("Should handle large notification page")
        void shouldHandleLargeNotificationPage() throws Exception {
            List<Notification> notifications = new ArrayList<>();
            for (int i = 0; i < 50; i++) {
                Notification n = new Notification();
                n.setId(UUID.randomUUID());
                n.setUserId(userId);
                n.setTitle("Notification " + i);
                n.setMessage("Message " + i);
                n.setType(Notification.NotificationType.LEAVE_APPROVED);
                n.setPriority(Notification.Priority.NORMAL);
                n.setIsRead(false);
                notifications.add(n);
            }

            Page<Notification> page = new PageImpl<>(notifications, Pageable.ofSize(50), 50);
            when(notificationService.getUserNotifications(any(), eq(0), eq(50))).thenReturn(page);

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "50"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(50)));
        }

        @Test
        @DisplayName("Should return multiple unread notifications at once")
        void shouldReturnMultipleUnreadNotifications() throws Exception {
            List<Notification> unread = new ArrayList<>();
            for (int i = 0; i < 3; i++) {
                Notification n = new Notification();
                n.setId(UUID.randomUUID());
                n.setUserId(userId);
                n.setTitle("Unread " + i);
                n.setMessage("Message " + i);
                n.setType(Notification.NotificationType.ATTENDANCE_ALERT);
                n.setPriority(Notification.Priority.HIGH);
                n.setIsRead(false);
                unread.add(n);
            }

            when(notificationService.getUnreadNotifications(userId)).thenReturn(unread);

            mockMvc.perform(get(BASE_URL + "/unread"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(3)));
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getMyNotifications should require NOTIFICATIONS_VIEW")
        void getMyNotificationsShouldRequireView() throws Exception {
            var method = NotificationController.class.getMethod(
                    "getMyNotifications", int.class, int.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.NOTIFICATIONS_VIEW));
        }

        @Test
        @DisplayName("createNotification should require NOTIFICATIONS_CREATE")
        void createNotificationShouldRequireCreate() throws Exception {
            var method = NotificationController.class.getMethod(
                    "createNotification", CreateNotificationRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.NOTIFICATIONS_CREATE));
        }

        @Test
        @DisplayName("markAllAsRead should require NOTIFICATIONS_VIEW")
        void markAllAsReadShouldRequireView() throws Exception {
            var method = NotificationController.class.getMethod("markAllAsRead");
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.NOTIFICATIONS_VIEW));
        }
    }
}
