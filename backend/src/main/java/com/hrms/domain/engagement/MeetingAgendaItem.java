package com.hrms.domain.engagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "meeting_agenda_items", indexes = {
        @Index(name = "idx_agenda_meeting", columnList = "meeting_id"),
        @Index(name = "idx_agenda_order", columnList = "meeting_id, item_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MeetingAgendaItem extends TenantAware {

    @Column(name = "meeting_id", nullable = false)
    private UUID meetingId;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "item_order", nullable = false)
    private Integer itemOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "added_by", nullable = false, length = 20)
    private AddedBy addedBy;

    @Column(name = "added_by_id", nullable = false)
    private UUID addedById;

    @Column(name = "is_discussed")
    @Builder.Default
    private Boolean isDiscussed = false;

    @Column(name = "discussion_notes", columnDefinition = "TEXT")
    private String discussionNotes;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private AgendaCategory category;

    public enum AddedBy {
        MANAGER,
        EMPLOYEE
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }

    public enum AgendaCategory {
        WORK_UPDATES,
        BLOCKERS,
        FEEDBACK,
        CAREER_GROWTH,
        GOALS,
        WELLBEING,
        RECOGNITION,
        OTHER
    }
}
