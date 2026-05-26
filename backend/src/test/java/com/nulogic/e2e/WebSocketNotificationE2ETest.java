package com.nulogic.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.UserPrincipal;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.websocket.RedisWebSocketRelay;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * End-to-End tests for WebSocket Notification functionality.
 * Tests the notification service and message delivery.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WebSocketNotificationE2ETest extends AbstractPostgresIntegrationTest {

    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID SECOND_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440100");
    private static final UUID TENANT_B_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440101");
    private static final UUID TEST_EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID TENANT_B_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID TEST_DEPARTMENT_ID = UUID.fromString("333e8400-e29b-41d4-a716-446655440099");
    private static final String USER_QUEUE_DESTINATION = "/user/queue/notifications";
    private static final long DELIVERY_TIMEOUT_SECONDS = 5;
    private static final long NEGATIVE_DELIVERY_WINDOW_MILLIS = 750;

    @LocalServerPort
    private int port;
    @Autowired
    private WebSocketNotificationService webSocketNotificationService;
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoSpyBean
    private RedisWebSocketRelay redisWebSocketRelay;
    private final List<StompSession> liveSessions = new ArrayList<>();
    private final List<WebSocketStompClient> liveClients = new ArrayList<>();

    @BeforeEach
    void setUp() {
        Set<String> roles = new HashSet<>(Arrays.asList("ADMIN"));
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);

        SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);

        reset(redisWebSocketRelay);
    }

    @AfterEach
    void tearDown() {
        liveSessions.forEach(session -> {
            if (session.isConnected()) {
                session.disconnect();
            }
        });
        liveClients.forEach(WebSocketStompClient::stop);
        liveSessions.clear();
        liveClients.clear();
        SecurityContext.clear();
        TenantContext.clear();
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

        verify(redisWebSocketRelay).convertAndSendToUser(
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
        verify(redisWebSocketRelay).convertAndSendToUser(
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

        verify(redisWebSocketRelay).convertAndSend(
                eq("/topic/tenant/" + TEST_TENANT_ID + "/notifications"),
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

        verify(redisWebSocketRelay).convertAndSend(
                eq("/topic/tenant/" + TEST_TENANT_ID + "/notifications"),
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

        verify(redisWebSocketRelay).convertAndSend(
                eq("/topic/tenant/" + TEST_TENANT_ID + "/department/" + TEST_DEPARTMENT_ID + "/notifications"),
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

        // Broadcast delegates to tenant-scoped to enforce tenant isolation
        verify(redisWebSocketRelay).convertAndSend(
                eq("/topic/tenant/" + TEST_TENANT_ID + "/notifications"),
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

        verify(redisWebSocketRelay).convertAndSendToUser(
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
        verify(redisWebSocketRelay).convertAndSendToUser(
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
        verify(redisWebSocketRelay).convertAndSendToUser(
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
        verify(redisWebSocketRelay).convertAndSendToUser(
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
        verify(redisWebSocketRelay).convertAndSendToUser(
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

        verify(redisWebSocketRelay).convertAndSend(
                eq("/topic/tenant/" + TEST_TENANT_ID + "/notifications"),
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
        verify(redisWebSocketRelay).convertAndSendToUser(
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

        verify(redisWebSocketRelay, times(NotificationMessage.Priority.values().length))
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

        verify(redisWebSocketRelay, times(NotificationMessage.NotificationType.values().length))
                .convertAndSendToUser(anyString(), anyString(), any(NotificationMessage.class));
    }

    // ==================== Realtime Release Smoke Tests ====================

    @Test
    @Order(16)
    @DisplayName("Release smoke: authenticated user receives business-event notification without refresh")
    void authenticatedUserReceivesBusinessEventNotificationWithoutRefresh() throws Exception {
        StompSession receiverSession = connectAuthenticated(TEST_USER_ID, TEST_TENANT_ID);
        StompSession bystanderSession = connectAuthenticated(SECOND_USER_ID, TEST_TENANT_ID);

        CountDownLatch receiverLatch = new CountDownLatch(1);
        CountDownLatch bystanderLatch = new CountDownLatch(1);
        AtomicReference<NotificationMessage> receiverNotification = new AtomicReference<>();
        AtomicReference<NotificationMessage> bystanderNotification = new AtomicReference<>();

        receiverSession.subscribe(USER_QUEUE_DESTINATION,
                notificationHandler(receiverLatch, receiverNotification));
        bystanderSession.subscribe(USER_QUEUE_DESTINATION,
                notificationHandler(bystanderLatch, bystanderNotification));
        waitForSubscriptionRegistration();

        webSocketNotificationService.notifyPayrollProcessed(TEST_USER_ID, "May 2026", 2);

        assertThat(receiverLatch.await(DELIVERY_TIMEOUT_SECONDS, TimeUnit.SECONDS))
                .as("target user's open WebSocket session receives the payroll event without REST refresh")
                .isTrue();
        assertThat(receiverNotification.get())
                .extracting(NotificationMessage::getType, NotificationMessage::getTitle, NotificationMessage::getActionUrl)
                .containsExactly(NotificationMessage.NotificationType.PAYROLL_PROCESSED,
                        "Payroll Processing Complete", "/payroll/runs");
        assertThat(receiverNotification.get().getMessage()).contains("May 2026");
        assertThat(receiverNotification.get().getId()).isNotNull();
        assertThat(receiverNotification.get().getTimestamp()).isNotNull();

        assertThat(bystanderLatch.await(NEGATIVE_DELIVERY_WINDOW_MILLIS, TimeUnit.MILLISECONDS))
                .as("same-tenant bystander subscribed to their own user queue must not receive another user's event")
                .isFalse();
        assertThat(bystanderNotification.get()).isNull();
    }

    @Test
    @Order(17)
    @DisplayName("Release smoke: tenant A cannot subscribe or receive tenant B notification")
    void tenantACannotSubscribeOrReceiveTenantBNotification() throws Exception {
        StompSession tenantASession = connectAuthenticated(TEST_USER_ID, TEST_TENANT_ID);
        StompSession tenantBSession = connectAuthenticated(TENANT_B_USER_ID, TENANT_B_ID);

        ErrorCapturingStompSessionHandler maliciousHandler = new ErrorCapturingStompSessionHandler();
        StompSession maliciousTenantASession = connectAuthenticated(TEST_USER_ID, TEST_TENANT_ID, maliciousHandler);

        CountDownLatch tenantALatch = new CountDownLatch(1);
        CountDownLatch tenantBLatch = new CountDownLatch(1);
        CountDownLatch maliciousLatch = new CountDownLatch(1);
        AtomicReference<NotificationMessage> tenantANotification = new AtomicReference<>();
        AtomicReference<NotificationMessage> tenantBNotification = new AtomicReference<>();
        AtomicReference<NotificationMessage> maliciousNotification = new AtomicReference<>();

        tenantASession.subscribe(tenantDestination(TEST_TENANT_ID),
                notificationHandler(tenantALatch, tenantANotification));
        tenantBSession.subscribe(tenantDestination(TENANT_B_ID),
                notificationHandler(tenantBLatch, tenantBNotification));

        maliciousTenantASession.subscribe(tenantDestination(TENANT_B_ID),
                notificationHandler(maliciousLatch, maliciousNotification));
        waitForSubscriptionRegistration();

        assertThat(maliciousHandler.awaitError(DELIVERY_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                || !maliciousTenantASession.isConnected())
                .as("tenant A session attempting to subscribe to tenant B topic is rejected")
                .isTrue();

        NotificationMessage tenantBMessage = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.ANNOUNCEMENT)
                .title("Tenant B only")
                .message("Tenant B scoped release smoke")
                .priority(NotificationMessage.Priority.HIGH)
                .build();

        webSocketNotificationService.sendToTenant(TENANT_B_ID, tenantBMessage);

        assertThat(tenantBLatch.await(DELIVERY_TIMEOUT_SECONDS, TimeUnit.SECONDS))
                .as("tenant B subscriber receives its own tenant notification")
                .isTrue();
        assertThat(tenantBNotification.get())
                .extracting(NotificationMessage::getTitle, NotificationMessage::getMessage)
                .containsExactly("Tenant B only", "Tenant B scoped release smoke");

        assertThat(tenantALatch.await(NEGATIVE_DELIVERY_WINDOW_MILLIS, TimeUnit.MILLISECONDS))
                .as("tenant A subscriber on tenant A topic must not receive tenant B notification")
                .isFalse();
        assertThat(maliciousLatch.await(NEGATIVE_DELIVERY_WINDOW_MILLIS, TimeUnit.MILLISECONDS))
                .as("rejected tenant A subscription to tenant B topic must not receive tenant B notification")
                .isFalse();
        assertThat(tenantANotification.get()).isNull();
        assertThat(maliciousNotification.get()).isNull();
    }

    private StompSession connectAuthenticated(UUID userId, UUID tenantId) throws Exception {
        return connectAuthenticated(userId, tenantId, new ErrorCapturingStompSessionHandler());
    }

    private StompSession connectAuthenticated(UUID userId, UUID tenantId,
                                             ErrorCapturingStompSessionHandler handler) throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new SockJsClient(List.of(
                new WebSocketTransport(new StandardWebSocketClient())
        )));
        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        client.setMessageConverter(converter);

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + tokenFor(userId, tenantId));

        StompSession session = client.connectAsync(
                        "http://localhost:" + port + "/ws",
                        new WebSocketHttpHeaders(),
                        connectHeaders,
                        handler
                )
                .get(DELIVERY_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        liveClients.add(client);
        liveSessions.add(session);
        return session;
    }

    private String tokenFor(UUID userId, UUID tenantId) {
        SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_EMPLOYEE");
        UserPrincipal principal = new UserPrincipal(
                userId,
                tenantId,
                userId + "@example.test",
                "n/a",
                List.of(authority)
        );
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, List.of(authority));
        return jwtTokenProvider.generateToken(authentication, tenantId, userId);
    }

    private StompFrameHandler notificationHandler(CountDownLatch latch,
                                                  AtomicReference<NotificationMessage> notificationRef) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return NotificationMessage.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                notificationRef.set((NotificationMessage) payload);
                latch.countDown();
            }
        };
    }

    private String tenantDestination(UUID tenantId) {
        return "/topic/tenant/" + tenantId + "/notifications";
    }

    private void waitForSubscriptionRegistration() throws InterruptedException {
        Thread.sleep(250);
    }

    private static final class ErrorCapturingStompSessionHandler extends StompSessionHandlerAdapter {
        private final CountDownLatch errorLatch = new CountDownLatch(1);
        private final AtomicReference<Throwable> error = new AtomicReference<>();

        @Override
        public void handleException(StompSession session, StompCommand command,
                                    StompHeaders headers, byte[] payload, Throwable exception) {
            error.compareAndSet(null, exception);
            errorLatch.countDown();
        }

        @Override
        public void handleTransportError(StompSession session, Throwable exception) {
            error.compareAndSet(null, exception);
            errorLatch.countDown();
        }

        private boolean awaitError(long timeout, TimeUnit unit) throws InterruptedException {
            return errorLatch.await(timeout, unit) && error.get() != null;
        }
    }
}
