package com.hrms.application.event;

import com.hrms.domain.event.DomainEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Publisher for domain events.
 *
 * <p>This component provides a clean API for publishing domain events
 * throughout the application. Events are dispatched through Spring's
 * ApplicationEventPublisher.</p>
 *
 * <p><strong>R2-012 FIX — AFTER_COMMIT semantics:</strong></p>
 * <p>Previously, {@code publish()} called {@link ApplicationEventPublisher#publishEvent}
 * synchronously inside the caller's transaction. If the transaction rolled back after the
 * event was dispatched, any listener that had already acted on the event (sent an email,
 * queued a Kafka message, etc.) could not undo its work — classic dual-write problem.</p>
 *
 * <p>The fix: when a transaction is active, the event publication is deferred via
 * {@link TransactionSynchronizationManager} to the {@code afterCommit} phase. This
 * guarantees that listeners never observe an event whose corresponding DB change was
 * never committed. If no transaction is active (e.g. during tests or batch jobs that
 * run outside a transaction), the event is published immediately as before.</p>
 *
 * <p><strong>Usage:</strong></p>
 * <pre>{@code
 * @Autowired DomainEventPublisher eventPublisher;
 *
 * public void createEmployee(Employee employee) {
 *     // ... save employee
 *     eventPublisher.publish(EmployeeCreatedEvent.of(this, employee));
 * }
 * }</pre>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DomainEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    /**
     * Publishes a domain event.
     *
     * <p>If a transaction is active the publication is deferred to {@code afterCommit};
     * otherwise it is published immediately.</p>
     *
     * @param event The domain event to publish
     */
    public void publish(DomainEvent event) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            log.debug("Transaction active — deferring domain event {} until AFTER_COMMIT",
                    event.getEventType());
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doPublish(event);
                }
            });
        } else {
            // No active transaction (scheduled job, test, etc.) — publish immediately.
            doPublish(event);
        }
    }

    /**
     * Publishes multiple domain events in order.
     *
     * @param events The domain events to publish
     */
    public void publishAll(Iterable<? extends DomainEvent> events) {
        for (DomainEvent event : events) {
            publish(event);
        }
    }

    private void doPublish(DomainEvent event) {
        log.debug("Publishing domain event: {} for aggregate {} ({})",
                event.getEventType(),
                event.getAggregateType(),
                event.getAggregateId());

        applicationEventPublisher.publishEvent(event);

        log.info("Domain event published: eventId={} type={} aggregateId={}",
                event.getEventId(),
                event.getEventType(),
                event.getAggregateId());
    }
}
