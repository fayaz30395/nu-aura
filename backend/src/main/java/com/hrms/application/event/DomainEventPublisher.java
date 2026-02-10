package com.hrms.application.event;

import com.hrms.domain.event.DomainEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * Publisher for domain events.
 *
 * <p>This component provides a clean API for publishing domain events
 * throughout the application. Events are dispatched through Spring's
 * ApplicationEventPublisher for synchronous processing within the
 * transaction, with async handlers for external integrations.</p>
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
     * Publishes a domain event to all registered listeners.
     *
     * @param event The domain event to publish
     */
    public void publish(DomainEvent event) {
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
}
