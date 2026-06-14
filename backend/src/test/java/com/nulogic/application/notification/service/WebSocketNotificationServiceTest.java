package com.nulogic.application.notification.service;

import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.notification.repository.NotificationRepository;
import com.nulogic.infrastructure.websocket.RedisWebSocketRelay;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WebSocketNotificationServiceTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID DEPARTMENT_ID = UUID.fromString("333e8400-e29b-41d4-a716-446655440099");

    @Test
    void sendToDepartmentPublishesTenantScopedDestination() {
        RedisWebSocketRelay redisWebSocketRelay = mock(RedisWebSocketRelay.class);
        TenantTimeService tenantTimeService = mock(TenantTimeService.class);
        NotificationRepository notificationRepository = mock(NotificationRepository.class);
        WebSocketNotificationService service = new WebSocketNotificationService(redisWebSocketRelay, tenantTimeService, notificationRepository);
        LocalDateTime now = LocalDateTime.of(2026, 5, 27, 1, 30);
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                .title("Department Update")
                .message("Department-specific notification")
                .priority(NotificationMessage.Priority.NORMAL)
                .build();

        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
            when(tenantTimeService.now(TENANT_ID)).thenReturn(now);

            service.sendToDepartment(DEPARTMENT_ID, notification);
        }

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(redisWebSocketRelay).convertAndSend(
                eq("/topic/tenant/" + TENANT_ID + "/department/" + DEPARTMENT_ID + "/notifications"),
                captor.capture());
        assertThat(captor.getValue().getId()).isNotNull();
        assertThat(captor.getValue().getTimestamp()).isEqualTo(now);
    }

    @Test
    void sendToDepartmentFailsClosedWithoutTenantContext() {
        RedisWebSocketRelay redisWebSocketRelay = mock(RedisWebSocketRelay.class);
        TenantTimeService tenantTimeService = mock(TenantTimeService.class);
        NotificationRepository notificationRepository = mock(NotificationRepository.class);
        WebSocketNotificationService service = new WebSocketNotificationService(redisWebSocketRelay, tenantTimeService, notificationRepository);
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                .title("Department Update")
                .message("Department-specific notification")
                .priority(NotificationMessage.Priority.NORMAL)
                .build();

        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::requireCurrentTenant)
                    .thenThrow(new IllegalStateException("Tenant context is required"));

            assertThatThrownBy(() -> service.sendToDepartment(DEPARTMENT_ID, notification))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context is required");
        }

        verifyNoInteractions(redisWebSocketRelay);
    }
}
