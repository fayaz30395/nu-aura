package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.application.integration.service.IntegrationEventRouter;
import com.nulogic.application.notification.service.EmailService;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.integration.IntegrationEvent;
import com.nulogic.domain.notification.EmailNotification;
import com.nulogic.domain.notification.Notification;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.events.NotificationEvent;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link NotificationEventConsumer#process(NotificationEvent)}.
 *
 * <p>Branches covered:
 * <ul>
 *   <li>idempotency duplicate skip</li>
 *   <li>channel switch: EMAIL, PUSH, IN_APP, SMS, unknown (default → throw + release)</li>
 *   <li>EMAIL: recipient resolution (by tenant vs by id), null recipient, missing user,
 *       blank email, failed send result, integration routing best-effort swallow</li>
 *   <li>IN_APP: createNotification mapped args, integration routing swallow</li>
 *   <li>error path: release of idempotency claim on failure and re-throw</li>
 * </ul>
 * Channel is upper-cased before the switch, so lowercase input is exercised too.
 */
@ExtendWith(MockitoExtension.class)
class NotificationEventConsumerTest {

    @Mock
    private IdempotencyService idempotencyService;
    @Mock
    private EmailService emailService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private IntegrationEventRouter integrationEventRouter;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationEventConsumer consumer;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private NotificationEvent event(String channel) {
        NotificationEvent e = new NotificationEvent();
        e.setEventId(UUID.randomUUID().toString());
        e.setTenantId(UUID.randomUUID());
        e.setChannel(channel);
        e.setRecipientId(UUID.randomUUID());
        e.setSubject("Subject");
        e.setBody("Body");
        return e;
    }

    private User userWithEmail(String email, String fullName) {
        User user = mock(User.class);
        lenient().when(user.getEmail()).thenReturn(email);
        lenient().when(user.getFullName()).thenReturn(fullName);
        return user;
    }

    // ---------- idempotency ----------

    @Test
    @DisplayName("process skips when event already processed")
    void process_duplicate_skips() {
        NotificationEvent e = event("EMAIL");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(false);

        consumer.process(e);

        verifyNoInteractions(emailService, notificationService, userRepository, integrationEventRouter);
        verify(idempotencyService, never()).release(any());
    }

    // ---------- EMAIL ----------

    @Test
    @DisplayName("EMAIL: resolves recipient by tenant, sends, routes integration event")
    void email_happyPath_sendsAndRoutes() {
        NotificationEvent e = event("EMAIL");
        e.setTemplateName("welcome");
        Map<String, Object> data = new HashMap<>();
        data.put("approverName", "Alice");
        e.setTemplateData(data);
        User recipient = userWithEmail("bob@corp.io", "Bob Jones");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findByIdAndTenantId(e.getRecipientId(), e.getTenantId()))
                .thenReturn(Optional.of(recipient));
        when(emailService.sendEmail(eq("bob@corp.io"), eq("Bob Jones"),
                eq(EmailNotification.EmailType.ANNOUNCEMENT), any()))
                .thenReturn(EmailService.EmailSendResult.success(UUID.randomUUID()));

        consumer.process(e);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> varsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendEmail(eq("bob@corp.io"), eq("Bob Jones"),
                eq(EmailNotification.EmailType.ANNOUNCEMENT), varsCaptor.capture());
        Map<String, String> vars = varsCaptor.getValue();
        assertThat(vars).containsEntry("approverName", "Alice");
        assertThat(vars).containsEntry("title", "Subject");
        assertThat(vars).containsEntry("message", "Body");
        assertThat(vars).containsEntry("employeeName", "Bob Jones");

        ArgumentCaptor<IntegrationEvent> evtCaptor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(evtCaptor.capture());
        assertThat(evtCaptor.getValue().eventType()).isEqualTo("NOTIFICATION_SENT");
        assertThat(evtCaptor.getValue().entityType()).isEqualTo("Notification");
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("EMAIL: resolves recipient by id when tenantId is null")
    void email_nullTenant_resolvesById() {
        NotificationEvent e = event("EMAIL");
        e.setTenantId(null);
        User recipient = userWithEmail("x@corp.io", "X User");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findById(e.getRecipientId()))
                .thenReturn(Optional.of(recipient));
        when(emailService.sendEmail(anyString(), anyString(), any(), any()))
                .thenReturn(EmailService.EmailSendResult.success(UUID.randomUUID()));

        consumer.process(e);

        verify(userRepository).findById(e.getRecipientId());
        // tenantId null → IntegrationEvent construction throws inside the swallowed block,
        // so routing never reaches the connector router.
        verifyNoInteractions(integrationEventRouter);
    }

    @Test
    @DisplayName("EMAIL: lowercase channel is upper-cased before dispatch")
    void email_lowercaseChannel_dispatches() {
        NotificationEvent e = event("email");
        User recipient = userWithEmail("y@corp.io", "Y User");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findByIdAndTenantId(any(), any()))
                .thenReturn(Optional.of(recipient));
        when(emailService.sendEmail(anyString(), anyString(), any(), any()))
                .thenReturn(EmailService.EmailSendResult.success(UUID.randomUUID()));

        consumer.process(e);

        verify(emailService).sendEmail(anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("EMAIL: null recipientId fails and releases idempotency claim")
    void email_nullRecipient_failsAndReleases() {
        NotificationEvent e = event("EMAIL");
        e.setRecipientId(null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("EMAIL: missing user fails and releases idempotency claim")
    void email_userNotFound_failsAndReleases() {
        NotificationEvent e = event("EMAIL");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findByIdAndTenantId(e.getRecipientId(), e.getTenantId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("EMAIL: recipient with blank email fails and releases")
    void email_blankEmail_failsAndReleases() {
        NotificationEvent e = event("EMAIL");
        User recipient = userWithEmail("  ", "No Email");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findByIdAndTenantId(e.getRecipientId(), e.getTenantId()))
                .thenReturn(Optional.of(recipient));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("EMAIL: failed send result fails and releases")
    void email_sendResultFailure_failsAndReleases() {
        NotificationEvent e = event("EMAIL");
        User recipient = userWithEmail("bob@corp.io", "Bob");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findByIdAndTenantId(e.getRecipientId(), e.getTenantId()))
                .thenReturn(Optional.of(recipient));
        when(emailService.sendEmail(anyString(), anyString(), any(), any()))
                .thenReturn(EmailService.EmailSendResult.failure("SMTP down"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verify(integrationEventRouter, never()).routeToConnectors(any());
    }

    @Test
    @DisplayName("EMAIL: integration routing failure is swallowed; main processing succeeds")
    void email_integrationRoutingThrows_swallowed() {
        NotificationEvent e = event("EMAIL");
        User recipient = userWithEmail("bob@corp.io", "Bob");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(userRepository.findByIdAndTenantId(e.getRecipientId(), e.getTenantId()))
                .thenReturn(Optional.of(recipient));
        when(emailService.sendEmail(anyString(), anyString(), any(), any()))
                .thenReturn(EmailService.EmailSendResult.success(UUID.randomUUID()));
        org.mockito.Mockito.doThrow(new RuntimeException("connector boom"))
                .when(integrationEventRouter).routeToConnectors(any());

        consumer.process(e);

        // No re-throw, no release — the send succeeded.
        verify(idempotencyService, never()).release(any());
    }

    // ---------- IN_APP ----------

    @Test
    @DisplayName("IN_APP: creates in-app notification with mapped args and routes")
    void inApp_happyPath_createsNotificationAndRoutes() {
        NotificationEvent e = event("IN_APP");
        UUID entityId = UUID.randomUUID();
        e.setRelatedEntityId(entityId);
        e.setRelatedEntityType("LEAVE_REQUEST");
        e.setActionUrl("/leave/1");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verify(notificationService).createNotification(
                eq(e.getRecipientId()),
                eq(Notification.NotificationType.GENERAL),
                eq("Subject"),
                eq("Body"),
                eq(entityId),
                eq("LEAVE_REQUEST"),
                eq("/leave/1"),
                eq(Notification.Priority.NORMAL));

        ArgumentCaptor<IntegrationEvent> captor = ArgumentCaptor.forClass(IntegrationEvent.class);
        verify(integrationEventRouter).routeToConnectors(captor.capture());
        assertThat(captor.getValue().eventType()).isEqualTo("NOTIFICATION_SENT");
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("IN_APP: null related entity still creates notification and skips entity metadata")
    void inApp_nullRelatedEntity_routesWithoutEntityMetadata() {
        NotificationEvent e = event("IN_APP");
        e.setRelatedEntityId(null);
        e.setRelatedEntityType(null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verify(notificationService).createNotification(
                eq(e.getRecipientId()), any(), anyString(), anyString(),
                eq(null), eq(null), any(), any());
        verify(integrationEventRouter).routeToConnectors(any());
    }

    @Test
    @DisplayName("IN_APP: createNotification failure releases idempotency claim and re-throws")
    void inApp_createFailure_failsAndReleases() {
        NotificationEvent e = event("IN_APP");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        org.mockito.Mockito.doThrow(new RuntimeException("db error"))
                .when(notificationService).createNotification(
                        any(), any(), any(), any(), any(), any(), any(), any());

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verify(integrationEventRouter, never()).routeToConnectors(any());
    }

    // ---------- PUSH / SMS (no-op delivery paths) ----------

    @Test
    @DisplayName("PUSH: queued without sending email or in-app, no integration routing")
    void push_isNoOpDelivery() {
        NotificationEvent e = event("PUSH");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(emailService, notificationService, userRepository, integrationEventRouter);
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("SMS: queued without sending email or in-app, no integration routing")
    void sms_isNoOpDelivery() {
        NotificationEvent e = event("SMS");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        consumer.process(e);

        verifyNoInteractions(emailService, notificationService, userRepository, integrationEventRouter);
        verify(idempotencyService, never()).release(any());
    }

    // ---------- unknown channel ----------

    @Test
    @DisplayName("unknown channel throws IllegalArgumentException and releases claim")
    void unknownChannel_throwsAndReleases() {
        NotificationEvent e = event("CARRIER_PIGEON");
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);

        assertThatThrownBy(() -> consumer.process(e))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown channel");

        verify(idempotencyService).release(e.getEventId());
    }
}
