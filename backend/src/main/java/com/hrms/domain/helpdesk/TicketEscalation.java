package com.hrms.domain.helpdesk;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_escalations", indexes = {
    @Index(name = "idx_escalation_tenant", columnList = "tenantId"),
    @Index(name = "idx_escalation_ticket", columnList = "ticketId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketEscalation {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "ticket_id", nullable = false)
    private UUID ticketId;

    @Enumerated(EnumType.STRING)
    @Column(name = "escalation_level", length = 20)
    @Builder.Default
    private EscalationLevel escalationLevel = EscalationLevel.FIRST;

    @Enumerated(EnumType.STRING)
    @Column(name = "escalation_reason", length = 30)
    private EscalationReason reason;

    @Column(name = "escalated_from")
    private UUID escalatedFrom;

    @Column(name = "escalated_to", nullable = false)
    private UUID escalatedTo;

    @Column(name = "escalated_at", nullable = false)
    private LocalDateTime escalatedAt;

    @Column(name = "is_auto_escalated")
    @Builder.Default
    private Boolean isAutoEscalated = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "acknowledged_by")
    private UUID acknowledgedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum EscalationLevel {
        FIRST,
        SECOND,
        CRITICAL
    }

    public enum EscalationReason {
        SLA_BREACH_RESPONSE,
        SLA_BREACH_RESOLUTION,
        MANUAL_ESCALATION,
        CUSTOMER_REQUEST,
        COMPLEXITY
    }
}
