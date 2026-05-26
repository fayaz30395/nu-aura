package com.nulogic.application.event.listener;

import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.application.notification.service.SlackNotificationService;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.event.workflow.ApprovalTaskAssignedEvent;
import com.nulogic.domain.notification.Notification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalNotificationListenerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID STEP_EXECUTION_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440001");
    private static final UUID ASSIGNED_USER_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440002");
    private static final UUID REQUESTER_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440003");
    private static final LocalDateTime ASSIGNED_AT = LocalDateTime.of(2026, 5, 27, 10, 30);

    @Mock
    private NotificationService notificationService;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;
    @Mock
    private SlackNotificationService slackNotificationService;
    @Mock
    private TenantTimeService tenantTimeService;

    private ApprovalNotificationListener listener;

    @BeforeEach
    void setUp() {
        listener = new ApprovalNotificationListener(
                notificationService,
                webSocketNotificationService,
                slackNotificationService,
                tenantTimeService);
    }

    @Test
    void approvalTaskAssignedEventRequiresTenantStepAndAssignedUser() {
        assertThatNullPointerException()
                .isThrownBy(() -> approvalEvent(null, STEP_EXECUTION_ID, ASSIGNED_USER_ID))
                .withMessage("tenantId must not be null");

        assertThatNullPointerException()
                .isThrownBy(() -> approvalEvent(TENANT_ID, null, ASSIGNED_USER_ID))
                .withMessage("stepExecutionId must not be null");

        assertThatNullPointerException()
                .isThrownBy(() -> approvalEvent(TENANT_ID, STEP_EXECUTION_ID, null))
                .withMessage("assignedToUserId must not be null");
    }

    @Test
    void onApprovalTaskAssignedPersistsAndPushesTenantScopedNotification() {
        ApprovalTaskAssignedEvent event = approvalEvent(TENANT_ID, STEP_EXECUTION_ID, ASSIGNED_USER_ID);
        Notification notification = Notification.builder()
                .userId(ASSIGNED_USER_ID)
                .type(Notification.NotificationType.TASK_ASSIGNED)
                .title("New Approval Task")
                .message("Requester submitted a Leave Request for approval")
                .relatedEntityId(STEP_EXECUTION_ID)
                .relatedEntityType("LEAVE_REQUEST")
                .actionUrl("/approvals/inbox?module=LEAVE")
                .priority(Notification.Priority.NORMAL)
                .build();

        when(notificationService.createNotification(
                eq(ASSIGNED_USER_ID),
                eq(Notification.NotificationType.TASK_ASSIGNED),
                eq("New Approval Task"),
                eq("Requester submitted a Leave Request for approval"),
                eq(STEP_EXECUTION_ID),
                eq("LEAVE_REQUEST"),
                eq("/approvals/inbox?module=LEAVE"),
                eq(Notification.Priority.NORMAL)
        )).thenReturn(notification);
        when(tenantTimeService.now(TENANT_ID)).thenReturn(ASSIGNED_AT);

        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            listener.onApprovalTaskAssigned(event);

            tenantContext.verify(() -> TenantContext.setCurrentTenant(TENANT_ID));
            tenantContext.verify(TenantContext::clear);
        }

        ArgumentCaptor<NotificationMessage> messageCaptor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(webSocketNotificationService).sendToUser(eq(ASSIGNED_USER_ID), messageCaptor.capture());

        NotificationMessage message = messageCaptor.getValue();
        assertThat(message.getType()).isEqualTo(NotificationMessage.NotificationType.TASK_ASSIGNED);
        assertThat(message.getTitle()).isEqualTo("New Approval Task");
        assertThat(message.getMessage()).isEqualTo("Requester submitted a Leave Request for approval");
        assertThat(message.getPriority()).isEqualTo(NotificationMessage.Priority.HIGH);
        assertThat(message.getActionUrl()).isEqualTo("/approvals/inbox?module=LEAVE");
        assertThat(message.getMetadata()).containsAllEntriesOf(Map.of(
                "stepExecutionId", STEP_EXECUTION_ID.toString(),
                "entityType", "LEAVE_REQUEST",
                "requesterName", "Requester",
                "requesterId", REQUESTER_ID.toString(),
                "assignedAt", ASSIGNED_AT.toString()
        ));
    }

    @Test
    void onApprovalTaskAssignedClearsTenantContextWhenRealtimePushFails() {
        ApprovalTaskAssignedEvent event = approvalEvent(TENANT_ID, STEP_EXECUTION_ID, ASSIGNED_USER_ID);
        Notification notification = Notification.builder()
                .userId(ASSIGNED_USER_ID)
                .type(Notification.NotificationType.TASK_ASSIGNED)
                .title("New Approval Task")
                .message("Requester submitted a Leave Request for approval")
                .relatedEntityId(STEP_EXECUTION_ID)
                .relatedEntityType("LEAVE_REQUEST")
                .actionUrl("/approvals/inbox?module=LEAVE")
                .priority(Notification.Priority.NORMAL)
                .build();

        when(notificationService.createNotification(
                eq(ASSIGNED_USER_ID),
                eq(Notification.NotificationType.TASK_ASSIGNED),
                any(),
                any(),
                eq(STEP_EXECUTION_ID),
                eq("LEAVE_REQUEST"),
                eq("/approvals/inbox?module=LEAVE"),
                eq(Notification.Priority.NORMAL)
        )).thenReturn(notification);
        when(tenantTimeService.now(TENANT_ID)).thenReturn(ASSIGNED_AT);
        doThrow(new IllegalStateException("broker down"))
                .when(webSocketNotificationService)
                .sendToUser(eq(ASSIGNED_USER_ID), any(NotificationMessage.class));

        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            listener.onApprovalTaskAssigned(event);

            tenantContext.verify(() -> TenantContext.setCurrentTenant(TENANT_ID));
            tenantContext.verify(TenantContext::clear);
        }
    }

    private ApprovalTaskAssignedEvent approvalEvent(UUID tenantId, UUID stepExecutionId, UUID assignedUserId) {
        return ApprovalTaskAssignedEvent.of(
                this,
                tenantId,
                stepExecutionId,
                assignedUserId,
                "LEAVE_REQUEST",
                "Requester",
                REQUESTER_ID);
    }
}
