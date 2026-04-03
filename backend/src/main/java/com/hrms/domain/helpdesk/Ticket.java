package com.hrms.domain.helpdesk;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tickets", indexes = {
        @Index(name = "idx_ticket_tenant", columnList = "tenant_id"),
        @Index(name = "idx_ticket_tenant_employee", columnList = "tenant_id,employee_id"),
        @Index(name = "idx_ticket_tenant_status", columnList = "tenant_id,status"),
        @Index(name = "idx_ticket_tenant_priority", columnList = "tenant_id,priority"),
        @Index(name = "idx_ticket_assigned_to", columnList = "assigned_to"),
        @Index(name = "idx_ticket_category", columnList = "category_id"),
        @Index(name = "idx_ticket_created_at", columnList = "created_at"),
        @Index(name = "idx_ticket_due_date", columnList = "due_date")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_ticket_tenant_number", columnNames = {"tenant_id", "ticket_number"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // Note: unique constraint is now tenant-scoped via @UniqueConstraint in @Table
    @Column(name = "ticket_number", nullable = false, length = 50)
    private String ticketNumber;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private TicketPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TicketStatus status;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "tags", length = 500)
    private String tags;

    @Column(name = "attachment_urls", columnDefinition = "TEXT")
    private String attachmentUrls;

    // SLA tracking fields
    @Column(name = "sla_id")
    private UUID slaId;

    @Column(name = "first_response_due")
    private LocalDateTime firstResponseDue;

    @Column(name = "first_response_at")
    private LocalDateTime firstResponseAt;

    @Column(name = "first_response_breached")
    private Boolean firstResponseBreached = false;

    @Column(name = "resolution_due")
    private LocalDateTime resolutionDue;

    @Column(name = "resolution_breached")
    private Boolean resolutionBreached = false;

    @Column(name = "current_escalation_level")
    private Integer currentEscalationLevel = 0;

    @Column(name = "is_escalated")
    private Boolean isEscalated = false;

    @Column(name = "source", length = 30)
    private String source; // WEB, EMAIL, SLACK, MOBILE

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating; // 1-5

    @Column(name = "satisfaction_feedback", columnDefinition = "TEXT")
    private String satisfactionFeedback;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum TicketPriority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    public enum TicketStatus {
        OPEN,
        IN_PROGRESS,
        WAITING_FOR_RESPONSE,
        RESOLVED,
        CLOSED,
        CANCELLED
    }
}
