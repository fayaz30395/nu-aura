package com.hrms.application.attendance.service;

import com.hrms.infrastructure.kafka.producer.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Asynchronous publisher for attendance audit events.
 *
 * <p>Extracted from {@code AttendanceRecordService} to ensure {@code @Async} works.
 * Spring AOP cannot proxy private methods on the same class — the original
 * {@code @Async private void} ran synchronously, defeating the documented async
 * intent. By moving the method to a separate Spring-managed {@code @Component},
 * the AOP proxy is correctly applied and publication is truly off the caller
 * thread.</p>
 *
 * <p>Best-effort: failures are logged but never propagate to the business operation.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AttendanceAuditPublisher {

    private final EventPublisher eventPublisher;

    @Async
    public void publish(UUID userId, String action, String entityType,
                        UUID entityId, UUID tenantId, String description) {
        try {
            eventPublisher.publishAuditEvent(
                    userId, action, entityType, entityId, tenantId,
                    null, null, null, null, null, null, null, null,
                    description);
        } catch (Exception e) { // Intentional broad catch — async audit error boundary
            log.warn("Failed to publish attendance audit event (action={}, entityId={}): {}",
                    action, entityId, e.getMessage());
        }
    }
}
