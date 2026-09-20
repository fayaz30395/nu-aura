package com.nulogic.application.document.scheduler;

import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.document.DocumentAccess;
import com.nulogic.domain.document.DocumentAccessRepository;
import com.nulogic.domain.document.DocumentExpiryTracking;
import com.nulogic.domain.document.DocumentExpiryTrackingRepository;
import com.nulogic.domain.notification.Notification;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentExpirySchedulerTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID DOCUMENT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();

    @Mock
    private DocumentExpiryTrackingRepository expiryTrackingRepository;
    @Mock
    private DocumentAccessRepository documentAccessRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private DocumentExpiryScheduler scheduler;

    @Test
    void notifiesUserGrantsAndMarksReminderSent_whenReminderDue() {
        DocumentExpiryTracking tracking = DocumentExpiryTracking.builder()
                .tenantId(TENANT_ID)
                .documentId(DOCUMENT_ID)
                .expiryDate(LocalDate.now().plusDays(1))
                .reminderDaysBefore(30)
                .isNotified(false)
                .build();

        DocumentAccess grant = DocumentAccess.builder()
                .tenantId(TENANT_ID)
                .documentId(DOCUMENT_ID)
                .userId(USER_ID)
                .accessLevel(DocumentAccess.AccessLevel.VIEW)
                .isActive(true)
                .build();

        when(expiryTrackingRepository.findByTenantIdAndIsNotifiedFalse(TENANT_ID))
                .thenReturn(List.of(tracking));
        when(documentAccessRepository.findByTenantIdAndDocumentId(TENANT_ID, DOCUMENT_ID))
                .thenReturn(List.of(grant));
        when(tenantTimeService.now(TENANT_ID)).thenReturn(LocalDateTime.now());

        int notified = scheduler.dispatchDueReminders(TENANT_ID);

        assertThat(notified).isEqualTo(1);
        assertThat(tracking.getIsNotified()).isTrue();
        verify(notificationService).createNotification(
                eq(USER_ID), eq(Notification.NotificationType.REMINDER), any(), any(),
                eq(DOCUMENT_ID), eq("Document"), any(), eq(Notification.Priority.NORMAL));
        verify(expiryTrackingRepository).save(tracking);
    }

    @Test
    void skipsTracking_whenReminderWindowNotReached() {
        DocumentExpiryTracking tracking = DocumentExpiryTracking.builder()
                .tenantId(TENANT_ID)
                .documentId(DOCUMENT_ID)
                .expiryDate(LocalDate.now().plusDays(60))
                .reminderDaysBefore(30)
                .isNotified(false)
                .build();

        when(expiryTrackingRepository.findByTenantIdAndIsNotifiedFalse(TENANT_ID))
                .thenReturn(List.of(tracking));

        int notified = scheduler.dispatchDueReminders(TENANT_ID);

        assertThat(notified).isZero();
        verifyNoInteractions(notificationService);
        verify(expiryTrackingRepository, never()).save(any());
    }
}
