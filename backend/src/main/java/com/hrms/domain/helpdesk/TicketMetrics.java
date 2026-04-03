package com.hrms.domain.helpdesk;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_metrics", indexes = {
        @Index(name = "idx_metrics_tenant", columnList = "tenantId"),
        @Index(name = "idx_metrics_ticket", columnList = "ticketId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketMetrics {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "ticket_id", nullable = false, unique = true)
    private UUID ticketId;

    @Column(name = "sla_id")
    private UUID slaId;

    // First Response metrics
    @Column(name = "first_response_at")
    private LocalDateTime firstResponseAt;

    @Column(name = "first_response_minutes")
    private Integer firstResponseMinutes;

    @Column(name = "first_response_sla_breached")
    @Builder.Default
    private Boolean firstResponseSlaBreached = false;

    // Resolution metrics
    @Column(name = "resolution_at")
    private LocalDateTime resolutionAt;

    @Column(name = "resolution_minutes")
    private Integer resolutionMinutes;

    @Column(name = "resolution_sla_breached")
    @Builder.Default
    private Boolean resolutionSlaBreached = false;

    // Time tracking
    @Column(name = "total_handle_time_minutes")
    @Builder.Default
    private Integer totalHandleTimeMinutes = 0;

    @Column(name = "total_wait_time_minutes")
    @Builder.Default
    private Integer totalWaitTimeMinutes = 0;

    @Column(name = "reopen_count")
    @Builder.Default
    private Integer reopenCount = 0;

    @Column(name = "reassignment_count")
    @Builder.Default
    private Integer reassignmentCount = 0;

    @Column(name = "escalation_count")
    @Builder.Default
    private Integer escalationCount = 0;

    @Column(name = "comment_count")
    @Builder.Default
    private Integer commentCount = 0;

    // Customer satisfaction
    @Column(name = "csat_rating")
    private Integer csatRating; // 1-5

    @Column(name = "csat_feedback", columnDefinition = "TEXT")
    private String csatFeedback;

    @Column(name = "csat_submitted_at")
    private LocalDateTime csatSubmittedAt;

    // Calculated fields
    @Column(name = "first_contact_resolution")
    @Builder.Default
    private Boolean firstContactResolution = false;

    @Column(name = "sla_met")
    @Builder.Default
    private Boolean slaMet = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
