package com.hrms.domain.shift;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "rosters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Roster extends TenantAware {


    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "team_id")
    private UUID teamId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private RosterStatus status = RosterStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "pattern_type")
    private PatternType patternType;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "published_by")
    private UUID publishedBy;

    @Column(name = "published_date")
    private LocalDate publishedDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_recurring")
    @Builder.Default
    private Boolean isRecurring = false;

    @Column(name = "recurrence_weeks")
    private Integer recurrenceWeeks;

    public enum RosterStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        PUBLISHED,
        ARCHIVED
    }

    public enum PatternType {
        FIXED,
        ROTATING,
        FLEXIBLE,
        CUSTOM
    }
}
