package com.hrms.domain.helpdesk;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_slas", indexes = {
        @Index(name = "idx_sla_tenant", columnList = "tenantId"),
        @Index(name = "idx_sla_category", columnList = "categoryId"),
        @Index(name = "idx_sla_priority", columnList = "priority")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketSLA {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "category_id")
    private UUID categoryId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Ticket.TicketPriority priority;

    // First Response SLA (in minutes)
    @Column(name = "first_response_minutes", nullable = false)
    @Builder.Default
    private Integer firstResponseMinutes = 60;

    // Resolution SLA (in minutes)
    @Column(name = "resolution_minutes", nullable = false)
    @Builder.Default
    private Integer resolutionMinutes = 480; // 8 hours default

    // Escalation settings
    @Column(name = "escalation_after_minutes")
    @Builder.Default
    private Integer escalationAfterMinutes = 240; // 4 hours

    @Column(name = "escalation_to")
    private UUID escalationTo; // User/Role to escalate to

    @Column(name = "second_escalation_minutes")
    private Integer secondEscalationMinutes;

    @Column(name = "second_escalation_to")
    private UUID secondEscalationTo;

    // Business hours settings
    @Column(name = "is_business_hours_only")
    @Builder.Default
    private Boolean isBusinessHoursOnly = true;

    @Column(name = "business_start_hour")
    @Builder.Default
    private Integer businessStartHour = 9;

    @Column(name = "business_end_hour")
    @Builder.Default
    private Integer businessEndHour = 18;

    @Column(name = "working_days", length = 50)
    @Builder.Default
    private String workingDays = "MON,TUE,WED,THU,FRI";

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "apply_to_all_categories")
    @Builder.Default
    private Boolean applyToAllCategories = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
