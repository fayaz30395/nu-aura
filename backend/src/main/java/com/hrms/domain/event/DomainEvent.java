package com.hrms.domain.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base class for all domain events in the HRMS system.
 *
 * <p>Domain events represent significant occurrences within the business domain
 * that other parts of the system may need to react to. They enable loose coupling
 * between modules through an event-driven architecture.</p>
 *
 * <p><strong>Key properties:</strong></p>
 * <ul>
 *   <li>eventId - Unique identifier for idempotency and tracing</li>
 *   <li>tenantId - Multi-tenant context for event routing</li>
 *   <li>occurredAt - When the event happened in business time</li>
 *   <li>aggregateId - ID of the aggregate that produced this event</li>
 *   <li>aggregateType - Type name of the aggregate (e.g., "Employee")</li>
 * </ul>
 */
@Getter
public abstract class DomainEvent extends ApplicationEvent {

    private final String eventId;
    private final UUID tenantId;
    private final LocalDateTime occurredAt;
    private final UUID aggregateId;
    private final String aggregateType;

    protected DomainEvent(Object source, UUID tenantId, UUID aggregateId, String aggregateType) {
        super(source);
        this.eventId = UUID.randomUUID().toString();
        this.tenantId = tenantId;
        this.aggregateId = aggregateId;
        this.aggregateType = aggregateType;
        this.occurredAt = LocalDateTime.now();
    }

    /**
     * Returns the event type name for webhook routing.
     * Subclasses should override to provide a meaningful name.
     *
     * @return Event type identifier (e.g., "EMPLOYEE_CREATED")
     */
    public abstract String getEventType();

    /**
     * Returns the event payload as a map for serialization.
     * Used by webhook delivery to construct the event body.
     *
     * @return Map of event data
     */
    public abstract Object getEventPayload();
}
