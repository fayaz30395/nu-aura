package com.hrms.e2e;

import com.hrms.application.notification.dto.NotificationMessage;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.*;
import com.hrms.domain.user.RoleScope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * End-to-End tests for WebSocket Notification functionality.
 * Tests the notification service and message delivery.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WebSocketNotificationE2ETest {

    @Autowired
    private WebSocketNotificationService webSocketNotificationService;

    @SpyBean
    private SimpMessagingTemplate messagingTemplate;

    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_DEPARTMENT_ID = UUID.fromString("333e8400-e29b-41d4-a716-446655440099");

    @BeforeEach
    void setUp() {
        Set<String> roles = new HashSet<>(Arrays.asList("ADMIN"));
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);

        SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);

        // Reset mock
        reset(messagingTemplate);
    }

    // ==================== Send to User Tests ====================

    @Test
    @Order(1)
    @DisplayName("E2E: Send notification to specific user")
    void sendToUser_Success() {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                .title("Test Notification")
                .message("This is a test notification")
                .priority(NotificationMessage.Priority.NORMAL)
                .build();

        webSocketNotificationService.sendToUser(TEST_USER_ID, notification);

        verify(messagingTemplate).convertAndSendToUser(
                eq(TEST_USER_ID.toString()),
                eq("/queue/notifications"),
                argThat(arg -> {
                    NotificationMessage msg = (NotificationMessage) arg;
                    return "Test Notification".equals(msg.getTitle()) &&
                           msg.getId() != null &&
                           msg.getTimestamp() != null;
                })
        );
    }

    @Test
    @Order(2)
    @DisplayName("E2E: Notification has ID and timestamp set")
    void sendToUser_SetsIdAndTimestamp() {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.ANNOUNCEMENT)
                .title("ID Test")
                .message("Testing ID generation")
                .priority(NotificationMessage.Priority.LOW)
                .build();

        assertThat(notification.getId()).isNull();
        assertThat(notification.getTimestamp()).isNull();

        webSocketNotificationService.sendToUser(TEST_USER_ID, notification);

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(messagingTemplate).convertAndSendToUser(
                anyString(),
                anyString(),
                captor.capture()
        );

        NotificationMessage sent = captor.getValue();
        assertThat(sent.getId()).isNotNull();
        assertThat(sent.getTimestamp()).isNotNull();
    }

    // ==================== Send to Tenant Tests ====================

    @Test
    @Order(3)
    @DisplayName("E2E: Send notification to entire tenant")
    void sendToTenant_Success() {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.ANNOUNCEMENT)
                .title("Tenant Announcement")
                .message("Company-wide announcement")
                .priority(NotificationMessage.Priority.HIGH)
                .build();

        webSocketNotificationService.sendToTenant(TEST_TENANT_ID, notification);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/tenant." + TEST_TENANT_ID + ".notifications"),
                any(NotificationMessage.class)
        );
    }

    @Test
    @Order(4)
    @DisplayName("E2E: Send notification to current tenant")
    void sendToCurrentTenant_Success() {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.ANNOUNCEMENT)
                .title("Current Tenant Test")
                .message("Testing current tenant notification")
                .priority(NotificationMessage.Priority.NORMAL)
                .build();

        webSocketNotificationService.sendToCurrentTenant(notification);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/tenant." + TEST_TENANT_ID + ".notifications"),
                any(NotificationMessage.class)
        );
    }

    // ==================== Send to Department Tests ====================

    @Test
    @Order(5)
    @DisplayName("E2E: Send notification to department")
    void sendToDepartment_Success() {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                .title("Department Update")
                .message("Department-specific notification")
                .priority(NotificationMessage.Priority.NORMAL)
                .build();

        webSocketNotificationService.sendToDepartment(TEST_DEPARTMENT_ID, notification);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/department." + TEST_DEPARTMENT_ID + ".notifications"),
                any(NotificationMessage.class)
        );
    }

    // ==================== Broadcast Tests ====================

    @Test
    @Order(6)
    @DisplayName("E2E: Broadcast notification to all users")
    void broadcast_Success() {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                .title("System Broadcast")
                .message("Broadcasting to all users")
                .priority(NotificationMessage.Priority.URGENT)
                .build();

        webSocketNotificationService.broadcast(notification);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/broadcast"),
                any(NotificationMessage.class)
        );
    }

    // ==================== Leave Notification Tests ====================

    @Test
    @Order(7)
    @DisplayName("E2E: Notify leave request submitted")
    void notifyLeaveRequestSubmitted_Success() {
        UUID approverId = UUID.randomUUID();

        webSocketNotificationService.notifyLeaveRequestSubmitted(
                approverId,
                "John Doe",
                "Annual Leave",
                "Jan 15-17, 2024"
        );

        verify(messagingTemplate).convertAndSendToUser(
                eq(approverId.toString()),
                eq("/queue/notifications"),
                argThat(arg -> {
                    NotificationMessage msg = (NotificationMessage) arg;
                    return "New Leave Request".equals(msg.getTitle()) &&
                           msg.getMessage().contains("John Doe") &&
                           msg.getMessage().contains("Annual Leave") &&
                           NotificationMessage.NotificationType.LEAVE_REQUEST.equals(msg.getType());
                })
        );
    }

    @Test
    @Order(8)
    @DisplayName("E2E: Notify leave approved")
    void notifyLeaveApproved_Success() {
        UUID employeeId = UUID.randomUUID();

        webSocketNotificationService.notifyLeaveApproved(
                employeeId,
                "Sick Leave",
                "Feb 20, 2024"
        );

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq(employeeId.toString()),
                eq("/queue/notifications"),
                captor.capture()
        );

        NotificationMessage sent = captor.getValue();
        assertThat(sent.getTitle()).isEqualTo("Leave Request Approved");
        assertThat(sent.getMessage()).contains("Sick Leave");
        assertThat(sent.getMessage()).contains("approved");
        assertThat(sent.getType()).isEqualTo(NotificationMessage.NotificationType.LEAVE_APPROVED);
        assertThat(sent.getActionUrl()).isEqualTo("/leave/my-requests");
    }

    @Test
    @Order(9)
    @DisplayName("E2E: Notify leave rejected")
    void notifyLeaveRejected_Success() {
        UUID employeeId = UUID.randomUUID();

        webSocketNotificationService.notifyLeaveRejected(
                employeeId,
                "Casual Leave",
                "Project deadline"
        );

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq(employeeId.toString()),
                eq("/queue/notifications"),
                captor.capture()
        );

        NotificationMessage sent = captor.getValue();
        assertThat(sent.getTitle()).isEqualTo("Leave Request Rejected");
        assertThat(sent.getMessage()).contains("Project deadline");
        assertThat(sent.getType()).isEqualTo(NotificationMessage.NotificationType.LEAVE_REJECTED);
    }

    // ==================== Attendance Notification Tests ====================

    @Test
    @Order(10)
    @DisplayName("E2E: Notify attendance reminder")
    void notifyAttendanceReminder_Success() {
        UUID employeeId = UUID.randomUUID();

        webSocketNotificationService.notifyAttendanceReminder(employeeId);

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq(employeeId.toString()),
                eq("/queue/notifications"),
                captor.capture()
        );

        NotificationMessage sent = captor.getValue();
        assertThat(sent.getTitle()).isEqualTo("Attendance Reminder");
        assertThat(sent.getType()).isEqualTo(NotificationMessage.NotificationType.ATTENDANCE_REMINDER);
        assertThat(sent.getPriority()).isEqualTo(NotificationMessage.Priority.LOW);
    }

    // ==================== Payslip Notification Tests ====================

    @Test
    @Order(11)
    @DisplayName("E2E: Notify payslip available")
    void notifyPayslipAvailable_Success() {
        UUID employeeId = UUID.randomUUID();

        webSocketNotificationService.notifyPayslipAvailable(employeeId, "December", "2024");

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq(employeeId.toString()),
                eq("/queue/notifications"),
                captor.capture()
        );

        NotificationMessage sent = captor.getValue();
        assertThat(sent.getTitle()).isEqualTo("Payslip Available");
        assertThat(sent.getMessage()).contains("December");
        assertThat(sent.getMessage()).contains("2024");
        assertThat(sent.getType()).isEqualTo(NotificationMessage.NotificationType.PAYSLIP_AVAILABLE);
        assertThat(sent.getPriority()).isEqualTo(NotificationMessage.Priority.HIGH);
    }

    // ==================== Announcement Tests ====================

    @Test
    @Order(12)
    @DisplayName("E2E: Send announcement to tenant")
    void sendAnnouncement_Success() {
        webSocketNotificationService.sendAnnouncement(
                "Holiday Notice",
                "Office will be closed on Dec 25th",
                NotificationMessage.Priority.HIGH
        );

        verify(messagingTemplate).convertAndSend(
                eq("/topic/tenant." + TEST_TENANT_ID + ".notifications"),
                any(NotificationMessage.class)
        );
    }

    // ==================== System Alert Tests ====================

    @Test
    @Order(13)
    @DisplayName("E2E: Send system alert to admin")
    void sendSystemAlert_Success() {
        UUID adminId = UUID.randomUUID();

        webSocketNotificationService.sendSystemAlert(
                adminId,
                "System Maintenance",
                "Scheduled maintenance tonight at 11 PM"
        );

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(messagingTemplate).convertAndSendToUser(
                eq(adminId.toString()),
                eq("/queue/notifications"),
                captor.capture()
        );

        NotificationMessage sent = captor.getValue();
        assertThat(sent.getTitle()).isEqualTo("System Maintenance");
        assertThat(sent.getType()).isEqualTo(NotificationMessage.NotificationType.SYSTEM_ALERT);
        assertThat(sent.getPriority()).isEqualTo(NotificationMessage.Priority.URGENT);
    }

    // ==================== Notification Priority Tests ====================

    @Test
    @Order(14)
    @DisplayName("E2E: Verify all priority levels")
    void verifyAllPriorityLevels() {
        for (NotificationMessage.Priority priority : NotificationMessage.Priority.values()) {
            NotificationMessage notification = NotificationMessage.builder()
                    .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                    .title("Priority Test: " + priority)
                    .message("Testing priority: " + priority.name())
                    .priority(priority)
                    .build();

            webSocketNotificationService.sendToUser(TEST_USER_ID, notification);
        }

        verify(messagingTemplate, times(NotificationMessage.Priority.values().length))
                .convertAndSendToUser(anyString(), anyString(), any(NotificationMessage.class));
    }

    // ==================== Notification Type Tests ====================

    @Test
    @Order(15)
    @DisplayName("E2E: Verify all notification types")
    void verifyAllNotificationTypes() {
        for (NotificationMessage.NotificationType type : NotificationMessage.NotificationType.values()) {
            NotificationMessage notification = NotificationMessage.builder()
                    .type(type)
                    .title("Type Test: " + type)
                    .message("Testing type: " + type.name())
                    .priority(NotificationMessage.Priority.NORMAL)
                    .build();

            webSocketNotificationService.sendToUser(TEST_USER_ID, notification);
        }

        verify(messagingTemplate, times(NotificationMessage.NotificationType.values().length))
                .convertAndSendToUser(anyString(), anyString(), any(NotificationMessage.class));
    }
}
