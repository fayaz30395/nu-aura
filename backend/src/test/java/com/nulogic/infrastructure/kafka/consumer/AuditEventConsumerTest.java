package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.audit.AuditLog;
import com.nulogic.infrastructure.audit.repository.AuditLogRepository;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.events.AuditEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link AuditEventConsumer#process(AuditEvent)}.
 *
 * <p>{@code process()} is the OutboxEventProcessor single-insert path. It must
 * NEVER throw — audit must not block business operations. Branches covered:
 * <ul>
 *   <li>duplicate event id → idempotency skip, no DB write</li>
 *   <li>happy path → maps to {@link AuditLog} and persists, no release</li>
 *   <li>persist failure → exception swallowed, idempotency claim released</li>
 *   <li>mapToAuditLog changes-field: both null, only old, only new, both present</li>
 *   <li>mapToAuditLog action enum mapping (valueOf) including invalid value</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AuditEventConsumerTest {

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditEventConsumer consumer;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private AuditEvent baseEvent() {
        AuditEvent event = new AuditEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setTenantId(UUID.randomUUID());
        event.setUserId(UUID.randomUUID());
        event.setEntityId(UUID.randomUUID());
        event.setEntityType("Employee");
        event.setAction("CREATE");
        event.setDescription("created employee");
        event.setIpAddress("10.0.0.1");
        event.setUserAgent("JUnit");
        return event;
    }

    @Test
    @DisplayName("process skips persistence when event already processed")
    void process_duplicateEvent_skipsPersist() {
        AuditEvent event = baseEvent();
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(false);

        consumer.process(event);

        verifyNoInteractions(auditLogRepository);
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("process maps and persists a new audit event")
    void process_happyPath_persistsMappedAuditLog() {
        AuditEvent event = baseEvent();
        event.setOldValue("old");
        event.setNewValue("new");
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);

        consumer.process(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(UUID.fromString(event.getEventId()));
        assertThat(saved.getTenantId()).isEqualTo(event.getTenantId());
        assertThat(saved.getEntityType()).isEqualTo("Employee");
        assertThat(saved.getEntityId()).isEqualTo(event.getEntityId());
        assertThat(saved.getAction()).isEqualTo(AuditLog.AuditAction.CREATE);
        assertThat(saved.getActorId()).isEqualTo(event.getUserId());
        assertThat(saved.getDescription()).isEqualTo("created employee");
        assertThat(saved.getIpAddress()).isEqualTo("10.0.0.1");
        assertThat(saved.getUserAgent()).isEqualTo("JUnit");
        assertThat(saved.getChanges()).isEqualTo("old=old, new=new");
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("process leaves changes null when both old and new values are absent")
    void process_noOldOrNewValue_changesNull() {
        AuditEvent event = baseEvent();
        event.setOldValue(null);
        event.setNewValue(null);
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);

        consumer.process(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getChanges()).isNull();
    }

    @Test
    @DisplayName("process populates changes when only the old value is present")
    void process_onlyOldValue_changesPopulated() {
        AuditEvent event = baseEvent();
        event.setOldValue("before");
        event.setNewValue(null);
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);

        consumer.process(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getChanges()).isEqualTo("old=before, new=null");
    }

    @Test
    @DisplayName("process populates changes when only the new value is present")
    void process_onlyNewValue_changesPopulated() {
        AuditEvent event = baseEvent();
        event.setOldValue(null);
        event.setNewValue("after");
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);

        consumer.process(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getChanges()).isEqualTo("old=null, new=after");
    }

    @Test
    @DisplayName("process maps a non-default action enum value")
    void process_mapsActionEnum() {
        AuditEvent event = baseEvent();
        event.setAction("DELETE");
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);

        consumer.process(event);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo(AuditLog.AuditAction.DELETE);
    }

    @Test
    @DisplayName("process swallows and releases when persistence throws DataAccessException")
    void process_persistFailure_swallowsAndReleases() {
        AuditEvent event = baseEvent();
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);
        DataAccessException boom = new DataIntegrityViolationException("db down");
        doThrow(boom).when(auditLogRepository).save(any(AuditLog.class));

        assertThatCode(() -> consumer.process(event)).doesNotThrowAnyException();

        verify(idempotencyService).release(event.getEventId());
    }

    @Test
    @DisplayName("process swallows and releases when action enum is invalid")
    void process_invalidActionEnum_swallowsAndReleases() {
        AuditEvent event = baseEvent();
        event.setAction("NOT_A_REAL_ACTION");
        when(idempotencyService.tryProcess(event.getEventId())).thenReturn(true);

        // AuditAction.valueOf throws IllegalArgumentException inside mapToAuditLog;
        // process() must swallow it and release the idempotency claim.
        assertThatCode(() -> consumer.process(event)).doesNotThrowAnyException();

        verify(auditLogRepository, never()).save(any());
        verify(idempotencyService).release(event.getEventId());
    }
}
