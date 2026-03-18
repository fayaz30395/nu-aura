package com.hrms.application.event;

import com.hrms.application.webhook.service.WebhookDeliveryService;
import com.hrms.domain.event.DomainEvent;
import com.hrms.domain.event.employee.*;
import com.hrms.domain.webhook.WebhookEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listener that bridges domain events to the webhook delivery system.
 *
 * <p>Uses @TransactionalEventListener with AFTER_COMMIT phase to ensure
 * webhooks are only dispatched after the transaction successfully commits.
 * This prevents sending notifications for rolled-back changes.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookEventListener {

    private final WebhookDeliveryService webhookDeliveryService;

    // ==================== Employee Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeCreated(EmployeeCreatedEvent event) {
        log.debug("Handling EmployeeCreatedEvent for employee: {}", event.getAggregateId());
        dispatchWebhook(event, WebhookEventType.EMPLOYEE_CREATED);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeUpdated(EmployeeUpdatedEvent event) {
        log.debug("Handling EmployeeUpdatedEvent for employee: {}", event.getAggregateId());
        dispatchWebhook(event, WebhookEventType.EMPLOYEE_UPDATED);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeTerminated(EmployeeTerminatedEvent event) {
        log.debug("Handling EmployeeTerminatedEvent for employee: {}", event.getAggregateId());
        dispatchWebhook(event, WebhookEventType.EMPLOYEE_TERMINATED);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeStatusChanged(EmployeeStatusChangedEvent event) {
        log.debug("Handling EmployeeStatusChangedEvent for employee: {}", event.getAggregateId());
        dispatchWebhook(event, WebhookEventType.EMPLOYEE_STATUS_CHANGED);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeePromoted(EmployeePromotedEvent event) {
        log.debug("Handling EmployeePromotedEvent for employee: {}", event.getAggregateId());
        dispatchWebhook(event, WebhookEventType.EMPLOYEE_PROMOTED);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmployeeDepartmentChanged(EmployeeDepartmentChangedEvent event) {
        log.debug("Handling EmployeeDepartmentChangedEvent for employee: {}", event.getAggregateId());
        dispatchWebhook(event, WebhookEventType.EMPLOYEE_DEPARTMENT_CHANGED);
    }

    // ==================== Helper Methods ====================

    private void dispatchWebhook(DomainEvent event, WebhookEventType webhookEventType) {
        try {
            webhookDeliveryService.dispatchEvent(
                    event.getTenantId(),
                    webhookEventType,
                    event.getEventPayload()
            );
        } catch (RuntimeException e) {
            // Log but don't rethrow - webhook failures shouldn't affect the main operation
            log.error("Failed to dispatch webhook for event {}: {}",
                    event.getEventId(), e.getMessage(), e);
        }
    }
}
